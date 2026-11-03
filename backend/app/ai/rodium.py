"""Client pour l'API RodiumAI (compatible OpenAI : POST /v1/chat/completions)."""
import httpx

from ..config import settings

SYSTEM = (
    "Tu es un rédacteur LinkedIn expert. Tu écris des posts naturels, sans jargon creux, "
    "qui sonnent comme la personne et non comme une IA. N'utilise aucun emoji. "
    "Tu renvoies uniquement le texte du post."
)


def build_prompt(profile, examples: list[str], theme: str) -> str:
    ex = "\n\n---\n\n".join(examples) if examples else "(aucun exemple fourni)"
    return (
        f"Écris un post LinkedIn en {profile.language} pour {profile.full_name}, "
        f"{profile.job_title} dans {profile.industry}.\n"
        f"Bio : {profile.bio}\n"
        f"Ton : {', '.join(profile.tones) or 'neutre'}\n"
        f"Thème : {theme}\n\n"
        f"Imite le style de ces posts déjà écrits par la personne :\n{ex}"
    )


def generate_post(prompt: str) -> str:
    if not settings.rodium_api_key:
        raise RuntimeError("RodiumAI n'est pas configuré (RODIUM_API_KEY manquante).")
    try:
        r = httpx.post(
            f"{settings.rodium_api_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.rodium_api_key}"},
            json={
                "model": settings.rodium_model,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 800,
                "temperature": 0.8,
            },
            timeout=60,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except httpx.HTTPError as e:
        raise RuntimeError(f"Erreur RodiumAI : {e}") from e
