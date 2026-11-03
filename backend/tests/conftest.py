"""Tests d'intégration : ils tournent contre les émulateurs Firebase (docker compose up firebase).

Lancer :  docker compose run --rm backend pytest
"""
import os
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

AUTH_HOST = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099")
FIRESTORE_HOST = os.environ.get("FIRESTORE_EMULATOR_HOST", "localhost:8080")
PROJECT = settings.firebase_project_id


@pytest.fixture(scope="session", autouse=True)
def _emulators_up():
    for name, host in (("Auth", AUTH_HOST), ("Firestore", FIRESTORE_HOST)):
        try:
            httpx.get(f"http://{host}", timeout=3)
        except httpx.HTTPError:
            pytest.exit(f"Émulateur {name} injoignable sur {host}. Lance : docker compose up -d firebase", returncode=2)


@pytest.fixture(autouse=True)
def _clean_emulators():
    """Repart d'une base et d'un annuaire vides pour chaque test."""
    httpx.delete(f"http://{FIRESTORE_HOST}/emulator/v1/projects/{PROJECT}/databases/(default)/documents")
    httpx.delete(f"http://{AUTH_HOST}/emulator/v1/projects/{PROJECT}/accounts")
    yield


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
def fake_ai(monkeypatch):
    """Remplace RodiumAI par des réponses prévisibles."""
    from app.schemas import StyleAnalysis
    from app.services import ai

    calls: list[dict] = []

    def generate_post(profile, examples, theme, *, style=None, instruction="", previous=None):
        calls.append({"theme": theme, "instruction": instruction, "previous": previous, "style": style})
        return f"[{instruction or 'nouveau'}] Post sur {theme}"

    monkeypatch.setattr(ai, "generate_post", generate_post)
    monkeypatch.setattr(
        ai,
        "analyze_style",
        lambda profile, examples: StyleAnalysis(summary="Direct et chaleureux", tone_keywords=["direct"], examples_count=len(examples)),
    )
    monkeypatch.setattr(ai, "suggest_themes", lambda profile, count=8: ["Leadership", "Recrutement"])
    return calls
