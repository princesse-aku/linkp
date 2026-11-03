"""Tests d'intégration : ils tournent contre les émulateurs Firebase (docker compose up firebase).

Lancer :  docker compose run --rm backend pytest

Les tests partagent les émulateurs avec l'application en dev : ils ne vident JAMAIS les données.
Chaque test crée ses propres utilisateurs (adresses uniques) et supprime uniquement ceux-là à la fin.
"""
import os
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app.firebase import db, init_firebase
from app.main import app

AUTH_HOST = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099")
FIRESTORE_HOST = os.environ.get("FIRESTORE_EMULATOR_HOST", "localhost:8080")


@pytest.fixture(scope="session", autouse=True)
def _emulators_up():
    for name, host in (("Auth", AUTH_HOST), ("Firestore", FIRESTORE_HOST)):
        try:
            httpx.get(f"http://{host}", timeout=3)
        except httpx.HTTPError:
            pytest.exit(f"Émulateur {name} injoignable sur {host}. Lance : docker compose up -d firebase", returncode=2)


# Utilisateurs créés pendant le test courant : eux seuls sont supprimés à la fin.
_created: list[str] = []


@pytest.fixture(autouse=True)
def _cleanup_created_users():
    _created.clear()
    yield
    if not _created:
        return
    from firebase_admin import auth as fb_auth

    init_firebase()
    for uid in _created:
        try:
            fb_auth.delete_user(uid)
        except Exception:  # déjà supprimé par le test lui-même
            pass
        db().recursive_delete(db().collection("users").document(uid))
    _created.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _signup(email: str | None = None, password: str = "motdepasse123") -> dict:
    email = email or f"{uuid.uuid4().hex[:8]}@example.com"
    r = httpx.post(
        f"http://{AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key",
        json={"email": email, "password": password, "returnSecureToken": True},
    )
    r.raise_for_status()
    data = r.json()
    _created.append(data["localId"])
    return {"email": email, "uid": data["localId"], "headers": {"Authorization": f"Bearer {data['idToken']}"}}


@pytest.fixture
def user():
    return _signup()


@pytest.fixture
def other_user():
    return _signup()


@pytest.fixture
def make_user():
    return _signup


@pytest.fixture
def ai_key(monkeypatch):
    """Simule une clé RodiumAI déjà enregistrée pour l'utilisateur connecté."""
    from app.services import keys

    monkeypatch.setattr(keys, "require_key", lambda uid: "rd_sk_test_0000")


@pytest.fixture
def fake_ai(ai_key, monkeypatch):
    """Remplace RodiumAI par des réponses prévisibles."""
    from app.schemas import StyleAnalysis
    from app.services import ai

    calls: list[dict] = []

    def generate_post(profile, examples, theme, *, api_key, style=None, instruction="", previous=None):
        calls.append({"theme": theme, "instruction": instruction, "previous": previous, "style": style, "api_key": api_key})
        return f"[{instruction or 'nouveau'}] Post sur {theme}"

    monkeypatch.setattr(ai, "generate_post", generate_post)
    monkeypatch.setattr(
        ai,
        "analyze_style",
        lambda profile, examples, *, api_key: StyleAnalysis(
            summary="Direct et chaleureux", tone_keywords=["direct"], examples_count=len(examples)
        ),
    )
    monkeypatch.setattr(ai, "suggest_themes", lambda profile, *, api_key, count=8: ["Leadership", "Recrutement"])
    return calls
