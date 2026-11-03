"""Clé RodiumAI de chaque utilisateur, chiffrée au repos.

Stockage : users/{uid}/private/rodium  ->  { cipher, last4, saved_at }
La clé en clair n'est jamais écrite en base, jamais journalisée et jamais renvoyée au client.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from ..config import settings
from ..store import now, user_doc
from .ai import AIKeyMissing


def _fernet() -> Fernet:
    if settings.encryption_key:
        return Fernet(settings.encryption_key.encode())
    # Développement : clé dérivée de SECRET_KEY. En production, ENCRYPTION_KEY est obligatoire.
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(settings.secret_key.encode()).digest()))


def _doc(uid: str):
    return user_doc(uid).collection("private").document("rodium")


def save_key(uid: str, api_key: str) -> None:
    _doc(uid).set(
        {
            "cipher": _fernet().encrypt(api_key.encode()).decode(),
            "last4": api_key[-4:],
            "saved_at": now(),
        }
    )


def status(uid: str) -> dict:
    snap = _doc(uid).get()
    data = snap.to_dict() if snap.exists else None
    return {"configured": bool(data), "last4": (data or {}).get("last4")}


def require_key(uid: str) -> str:
    """Renvoie la clé en clair pour un appel IA, ou lève AIKeyMissing."""
    snap = _doc(uid).get()
    if not snap.exists:
        raise AIKeyMissing("Ajoute ta clé RodiumAI (dans ton profil) pour utiliser l'IA.")
    try:
        return _fernet().decrypt((snap.to_dict() or {})["cipher"].encode()).decode()
    except (InvalidToken, KeyError):
        # Clé de chiffrement changée ou donnée corrompue : l'utilisateur doit la ressaisir.
        _doc(uid).delete()
        raise AIKeyMissing("Ta clé RodiumAI n'est plus lisible : saisis-la à nouveau dans ton profil.")


def delete_key(uid: str) -> None:
    _doc(uid).delete()
