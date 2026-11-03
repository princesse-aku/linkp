"""Envoi de fichiers sur Cloudinary."""
import io

import cloudinary
import cloudinary.uploader

from ..config import settings

ALLOWED_TYPES = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "application/pdf": "image",  # Cloudinary traite les PDF comme des images
}


class MediaError(Exception):
    pass


def _configure() -> None:
    if not (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret):
        raise MediaError("Cloudinary n'est pas configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).")
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def http_status(exc: "MediaError") -> int:
    """Code HTTP adapté à l'erreur : 503 non configuré, 400 fichier refusé, 502 échec Cloudinary."""
    text = str(exc)
    if "configuré" in text:
        return 503
    if "Format" in text or "volumineux" in text:
        return 400
    return 502


def ensure_configured() -> None:
    """Vérifie Cloudinary avant une action coûteuse (ex. génération d'image payante)."""
    _configure()


def register(uid: str, uploaded: dict, filename: str) -> dict:
    """Ajoute un fichier envoyé sur Cloudinary à la médiathèque de l'utilisateur (Firestore)."""
    from ..store import now, sub

    doc = {**uploaded, "filename": filename, "created_at": now()}
    _, ref = sub(uid, "media").add(doc)
    return {**doc, "id": ref.id}


def validate(content_type: str | None, size: int) -> None:
    if content_type not in ALLOWED_TYPES:
        raise MediaError("Format non pris en charge (JPEG, PNG, WebP, GIF ou PDF).")
    if size > settings.max_upload_mb * 1024 * 1024:
        raise MediaError(f"Fichier trop volumineux (maximum {settings.max_upload_mb} Mo).")


def upload(uid: str, data: bytes, filename: str, content_type: str) -> dict:
    validate(content_type, len(data))
    _configure()
    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(data),
            folder=f"{settings.cloudinary_folder}/{settings.env}/{uid}",
            resource_type=ALLOWED_TYPES[content_type],
            use_filename=True,
            unique_filename=True,
            filename_override=filename,
        )
    except Exception as exc:  # cloudinary.exceptions.Error et erreurs réseau
        raise MediaError(f"Échec de l'envoi sur Cloudinary : {exc}") from exc
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "resource_type": result.get("resource_type", "image"),
        "bytes": int(result.get("bytes", len(data))),
    }


def destroy(public_id: str, resource_type: str = "image") -> None:
    _configure()
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
    except Exception as exc:
        raise MediaError(f"Suppression Cloudinary impossible : {exc}") from exc
