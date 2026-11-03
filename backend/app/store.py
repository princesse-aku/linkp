"""Accès Firestore.

Structure :
  users/{uid}                    profil, tons, thèmes, période, analyse de style
  users/{uid}/examples/{id}      posts d'exemple
  users/{uid}/posts/{id}         posts générés / programmés
  users/{uid}/media/{id}         fichiers envoyés sur Cloudinary
  users/{uid}/private/google     jetons Google Agenda (jamais renvoyés au client)
"""
from datetime import datetime, timezone

from google.cloud.firestore import DocumentReference, DocumentSnapshot

from .firebase import db
from .schemas import ProfileOut


def now() -> datetime:
    return datetime.now(timezone.utc)


def user_doc(uid: str) -> DocumentReference:
    return db().collection("users").document(uid)


def sub(uid: str, name: str):
    return user_doc(uid).collection(name)


def with_id(doc: DocumentSnapshot) -> dict:
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


def ensure_user(uid: str, email: str | None) -> dict:
    """Renvoie le document utilisateur, en le créant à la première connexion."""
    ref = user_doc(uid)
    snap = ref.get()
    if snap.exists:
        return snap.to_dict() or {}
    data = {"email": email, "created_at": now()}
    ref.set(data)
    return data


def load_profile(uid: str, email: str | None = None) -> ProfileOut:
    data = ensure_user(uid, email)
    return ProfileOut.model_validate(data)


def load_examples(uid: str, limit: int = 15) -> list[str]:
    docs = sub(uid, "examples").order_by("created_at", direction="DESCENDING").limit(limit).stream()
    return [(d.to_dict() or {}).get("content", "")[:2000] for d in docs]
