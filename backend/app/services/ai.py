"""Client RodiumAI (API compatible OpenAI) : analyse de style, idées de thèmes, rédaction.

Chaque appel utilise la clé RodiumAI de l'utilisateur (voir services/keys.py).
"""
import json
import re
from datetime import datetime, timezone

import httpx

from ..config import settings
from ..schemas import ProfileOut, StyleAnalysis


class AIError(Exception):
    pass


class AIKeyMissing(AIError):
    """L'utilisateur n'a pas (ou plus) de clé RodiumAI enregistrée."""


class AIKeyRejected(AIError):
    """RodiumAI a refusé la clé de l'utilisateur (invalide, révoquée…)."""


SYSTEM = (
    "Tu es un expert de la rédaction de posts LinkedIn. Tu écris de façon naturelle, concrète et sans jargon creux. "
    "Tu n'utilises jamais d'emoji. Tu ne parles jamais de toi-même comme d'une IA."
)

_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0000FE0F\U0000200D\U00002190-\U000021FF]"
)


def _base_url() -> str:
    return settings.rodium_api_url.rstrip("/")


def _raise_for_status(r: httpx.Response) -> None:
    if r.status_code in (401, 403):
        raise AIKeyRejected("RodiumAI a refusé ta clé. Vérifie-la dans ton profil.")
    if r.status_code == 402:
        raise AIError("Ton crédit RodiumAI est insuffisant. Recharge-le puis réessaie.")
    if r.status_code == 429:
        raise AIError("RodiumAI limite le nombre de requêtes. Réessaie dans un instant.")
    if r.status_code >= 400:
        raise AIError(f"RodiumAI a répondu {r.status_code} : {r.text[:300]}")


def validate_key(api_key: str) -> None:
    """Vérifie une clé avec un appel gratuit (liste des modèles)."""
    try:
        r = httpx.get(f"{_base_url()}/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=20)
    except httpx.HTTPError as exc:
        raise AIError(f"RodiumAI injoignable : {exc}") from exc
    if r.status_code in (401, 403):
        raise AIKeyRejected("Cette clé n'est pas valide. Vérifie-la sur ton compte RodiumAI.")
    _raise_for_status(r)


# Les modèles à raisonnement (Gemini 3.x) comptent leur réflexion dans max_tokens : on garde de la marge.
def _chat(
    messages: list[dict], *, api_key: str, max_tokens: int = 4000, temperature: float = 0.8, json_mode: bool = False
) -> str:
    payload: dict = {
        "model": settings.rodium_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    url = f"{_base_url()}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}

    def call(body: dict) -> httpx.Response:
        try:
            return httpx.post(url, headers=headers, json=body, timeout=90)
        except httpx.HTTPError as exc:
            raise AIError(f"RodiumAI injoignable : {exc}") from exc

    r = call(payload)
    if r.status_code == 400 and json_mode:
        # Le modèle ne gère peut-être pas le mode JSON : on réessaie sans.
        payload.pop("response_format")
        r = call(payload)
    _raise_for_status(r)

    try:
        return (r.json()["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, ValueError) as exc:
        raise AIError("Réponse RodiumAI inattendue.") from exc


def _parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except ValueError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except ValueError:
                pass
    raise AIError("L'IA n'a pas renvoyé un JSON exploitable.")


def strip_emojis(text: str) -> str:
    return _EMOJI.sub("", text).strip()


def _persona(profile: ProfileOut) -> str:
    lines = [
        f"Nom : {profile.full_name or 'non précisé'}",
        f"Poste : {profile.job_title or 'non précisé'}",
        f"Secteur : {profile.industry or 'non précisé'}",
        f"Présentation : {profile.bio or 'non précisée'}",
        f"Langue d'écriture : {'français' if profile.language == 'fr' else 'anglais'}",
        f"Tons souhaités : {', '.join(profile.tones) or 'naturel'}",
    ]
    return "\n".join(lines)


def _style_block(style: StyleAnalysis | None, examples: list[str]) -> str:
    parts = []
    if style and style.summary:
        parts.append(
            "Style de l'auteur (analyse) :\n"
            f"- Résumé : {style.summary}\n"
            f"- Mots-clés de ton : {', '.join(style.tone_keywords)}\n"
            f"- Longueur habituelle : {style.typical_length}\n"
            f"- Structure : {style.structure}\n"
            f"- Vocabulaire typique : {', '.join(style.vocabulary)}\n"
            f"- À éviter : {', '.join(style.avoid)}"
        )
    if examples:
        shown = "\n\n---\n\n".join(examples[:5])
        parts.append(f"Exemples de vrais posts de l'auteur (imite ce style) :\n{shown}")
    return "\n\n".join(parts) or "Aucun exemple fourni : reste sur un style simple et direct."


def analyze_style(profile: ProfileOut, examples: list[str], *, api_key: str) -> StyleAnalysis:
    if not examples:
        raise AIError("Ajoute au moins un post d'exemple pour analyser ton style.")
    shown = "\n\n---\n\n".join(examples[:10])
    prompt = (
        f"Analyse le style d'écriture de cet auteur à partir de ses posts LinkedIn.\n\n{_persona(profile)}\n\n"
        f"Posts :\n{shown}\n\n"
        "Réponds uniquement avec un objet JSON de cette forme :\n"
        '{"summary": "2 phrases décrivant la voix", "tone_keywords": ["..."], '
        '"typical_length": "ex: 600 caractères, 3 paragraphes courts", '
        '"structure": "ex: accroche, anecdote, leçon, question finale", '
        '"vocabulary": ["tournures ou mots récurrents"], "avoid": ["ce que l\'auteur ne fait jamais"]}\n'
        "Rédige les valeurs dans la langue des posts."
    )
    data = _parse_json(
        _chat(
            [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            api_key=api_key,
            temperature=0.3,
            json_mode=True,
        )
    )

    def as_list(v) -> list[str]:
        return [str(x) for x in v][:10] if isinstance(v, list) else []

    return StyleAnalysis(
        summary=str(data.get("summary", ""))[:600],
        tone_keywords=as_list(data.get("tone_keywords")),
        typical_length=str(data.get("typical_length", ""))[:200],
        structure=str(data.get("structure", ""))[:300],
        vocabulary=as_list(data.get("vocabulary")),
        avoid=as_list(data.get("avoid")),
        examples_count=len(examples),
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )


def suggest_themes(profile: ProfileOut, *, api_key: str, count: int = 8) -> list[str]:
    prompt = (
        f"Propose {count} thèmes de posts LinkedIn pertinents et variés pour cet auteur.\n\n{_persona(profile)}\n"
        f"Thèmes déjà choisis (à ne pas répéter) : {', '.join(profile.themes) or 'aucun'}\n\n"
        'Réponds uniquement avec un objet JSON : {"themes": ["thème court (2 à 5 mots)", "..."]}'
    )
    data = _parse_json(
        _chat(
            [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            api_key=api_key,
            temperature=0.9,
            json_mode=True,
        )
    )
    themes = data.get("themes")
    if not isinstance(themes, list):
        raise AIError("L'IA n'a pas proposé de thèmes.")
    taken = {t.lower() for t in profile.themes}
    return [str(t).strip() for t in themes if str(t).strip() and str(t).strip().lower() not in taken][:count]


def generate_post(
    profile: ProfileOut,
    examples: list[str],
    theme: str,
    *,
    api_key: str,
    style: StyleAnalysis | None = None,
    instruction: str = "",
    previous: str | None = None,
) -> str:
    if previous:
        task = (
            f"Réécris ce post sur le thème « {theme} » en appliquant cette consigne : "
            f"{instruction or 'améliore-le'}.\n\nPost actuel :\n{previous}"
        )
    else:
        task = f"Écris un nouveau post LinkedIn sur le thème : {theme}."
        if instruction:
            task += f"\nConsigne supplémentaire : {instruction}"

    prompt = (
        f"{task}\n\nAuteur :\n{_persona(profile)}\n\n{_style_block(style, examples)}\n\n"
        "Règles : une accroche forte dès la première ligne, des paragraphes courts séparés par une ligne vide, une idée claire, "
        "une question ou un appel à l'échange à la fin, 700 à 1300 caractères, aucun emoji, "
        "pas de hashtags en excès (3 maximum, en fin de post). "
        "Renvoie uniquement le texte du post, sans titre ni commentaire."
    )
    text = _chat(
        [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
        api_key=api_key,
        temperature=0.8,
    )
    text = strip_emojis(text).strip().strip('"').strip()
    if not text:
        raise AIError("L'IA a renvoyé un post vide.")
    return text
