"""Génération d'images avec RodiumAI (POST /v1/images/generations), avec la clé de l'utilisateur."""
import base64

import httpx

from ..config import settings
from .ai import AIError, _base_url, _raise_for_status

# Le prompt est en anglais : les modèles d'image suivent mieux les consignes dans cette langue.
STYLE = (
    "Create a professional, modern, high-quality image to accompany a LinkedIn post. "
    "Clean editorial style, either a polished illustration or a realistic business scene, soft natural lighting, "
    "refined and uncluttered composition, landscape orientation, generous breathing space. "
    "Do NOT include any text, letters, numbers, logos, watermarks or screenshots of interfaces. "
    "No recognizable real people."
)


def build_prompt(theme: str, content: str, instruction: str = "") -> str:
    excerpt = " ".join(content.split())[:450]
    parts = [STYLE, f"Topic of the post: {theme or 'professional insight'}.", f"What the post says (for context, in French): {excerpt}"]
    if instruction.strip():
        parts.append(f"Additional direction from the author: {instruction.strip()}")
    return "\n\n".join(parts)


def _content_type(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    raise AIError("RodiumAI n'a pas renvoyé une image exploitable.")


def generate_image(prompt: str, *, api_key: str) -> tuple[bytes, str]:
    """Génère une image et renvoie (octets, type MIME)."""
    try:
        r = httpx.post(
            f"{_base_url()}/images/generations",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": settings.rodium_image_model, "prompt": prompt, "n": 1, "size": settings.rodium_image_size},
            timeout=180,
        )
    except httpx.HTTPError as exc:
        raise AIError(f"RodiumAI injoignable : {exc}") from exc
    _raise_for_status(r)

    try:
        item = r.json()["data"][0]
    except (KeyError, IndexError, ValueError) as exc:
        raise AIError("Réponse RodiumAI inattendue pour l'image.") from exc

    if item.get("b64_json"):
        try:
            data = base64.b64decode(item["b64_json"], validate=False)
        except ValueError as exc:
            raise AIError("Image illisible renvoyée par RodiumAI.") from exc
    elif str(item.get("url", "")).startswith("https://"):
        try:
            data = httpx.get(item["url"], timeout=60).content
        except httpx.HTTPError as exc:
            raise AIError(f"Téléchargement de l'image impossible : {exc}") from exc
    else:
        raise AIError("RodiumAI n'a renvoyé aucune image.")

    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise AIError("L'image générée est trop volumineuse.")
    return data, _content_type(data)
