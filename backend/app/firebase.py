"""Initialisation de Firebase Admin (auth) et Firestore.

En développement, on utilise l'émulateur : FIRESTORE_EMULATOR_HOST et
FIREBASE_AUTH_EMULATOR_HOST sont définies et aucune clé n'est nécessaire.
En production, un compte de service est obligatoire.
"""
import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore
from google.oauth2 import service_account

from .config import settings


class _AnonymousCredential(credentials.Base):
    """Identifiants factices : l'émulateur n'en vérifie aucun."""

    def get_credential(self):
        return AnonymousCredentials()


def _service_account_info() -> dict | None:
    raw = settings.firebase_service_account_json.strip()
    if not raw:
        return None
    if raw.startswith("{"):
        return json.loads(raw)
    with open(raw, encoding="utf-8") as f:
        return json.load(f)


def using_emulator() -> bool:
    return bool(os.environ.get("FIRESTORE_EMULATOR_HOST") or os.environ.get("FIREBASE_AUTH_EMULATOR_HOST"))


@lru_cache(maxsize=1)
def init_firebase() -> firestore.Client:
    info = _service_account_info()

    if settings.is_production and using_emulator():
        raise RuntimeError("Les variables d'émulateur Firebase ne doivent pas être définies en production.")

    if info:
        admin_cred = credentials.Certificate(info)
        fs_cred = service_account.Credentials.from_service_account_info(info)
    elif using_emulator():
        admin_cred = _AnonymousCredential()
        fs_cred = AnonymousCredentials()
    else:
        raise RuntimeError(
            "Firebase n'est pas configuré : définis FIREBASE_SERVICE_ACCOUNT_JSON, "
            "ou lance les émulateurs (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST)."
        )

    if not firebase_admin._apps:
        firebase_admin.initialize_app(admin_cred, {"projectId": settings.firebase_project_id})
    return firestore.Client(project=settings.firebase_project_id, credentials=fs_cred)


def db() -> firestore.Client:
    return init_firebase()
