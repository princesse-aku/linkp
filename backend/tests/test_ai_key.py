import httpx
import pytest
from cryptography.fernet import Fernet

from app.config import settings
from app.services import ai, keys
from app.store import user_doc

KEY = "rd_sk_abcdef123456"


@pytest.fixture
def valid_key(monkeypatch):
    """La vérification auprès de RodiumAI réussit (et on garde la trace des clés testées)."""
    tested: list[str] = []
    monkeypatch.setattr(ai, "validate_key", lambda api_key: tested.append(api_key))
    return tested


def put_key(client, user, key=KEY):
    return client.put("/api/ai/key", json={"api_key": key}, headers=user["headers"])


def test_no_key_by_default(client, user):
    r = client.get("/api/ai/key", headers=user["headers"])
    assert r.json() == {"configured": False, "last4": None}


def test_key_endpoints_require_auth(client):
    assert client.get("/api/ai/key").status_code == 401
    assert client.put("/api/ai/key", json={"api_key": KEY}).status_code == 401
    assert client.delete("/api/ai/key").status_code == 401


def test_save_key_is_validated_and_masked(client, user, valid_key):
    r = put_key(client, user)
    assert r.status_code == 200, r.text
    assert r.json() == {"configured": True, "last4": "3456"}
    assert valid_key == [KEY]
    assert KEY not in r.text
    assert KEY not in client.get("/api/ai/key", headers=user["headers"]).text


def test_key_is_encrypted_at_rest(client, user, valid_key):
    put_key(client, user)
    stored = user_doc(user["uid"]).collection("private").document("rodium").get().to_dict()
    assert KEY not in str(stored)
    assert stored["cipher"] != KEY
    assert keys.require_key(user["uid"]) == KEY  # on retrouve bien la clé en clair côté serveur


def test_key_never_leaks_through_the_profile(client, user, valid_key):
    put_key(client, user)
    profile = client.get("/api/profile", headers=user["headers"])
    assert KEY not in profile.text and "cipher" not in profile.text


def test_bad_format_is_rejected(client, user, valid_key):
    for bad in ("abc", "sk_pas_la_bonne_1234567890", "rd_sk_avec des espaces dedans"):
        assert put_key(client, user, bad).status_code == 422
    assert valid_key == []  # on n'a même pas appelé RodiumAI
    assert client.get("/api/ai/key", headers=user["headers"]).json()["configured"] is False


def test_rejected_key_is_not_saved(client, user, monkeypatch):
    def refuse(api_key):
        raise ai.AIKeyRejected("Cette clé n'est pas valide.")

    monkeypatch.setattr(ai, "validate_key", refuse)
    r = put_key(client, user)
    assert r.status_code == 424
    assert client.get("/api/ai/key", headers=user["headers"]).json()["configured"] is False


def test_replace_and_delete_key(client, user, valid_key):
    put_key(client, user, "rd_sk_first_000000001111")
    assert put_key(client, user, "rd_sk_second_00000002222").json()["last4"] == "2222"
    assert client.delete("/api/ai/key", headers=user["headers"]).status_code == 204
    assert client.get("/api/ai/key", headers=user["headers"]).json()["configured"] is False


def test_keys_are_private_per_user(client, user, other_user, valid_key):
    put_key(client, user)
    assert client.get("/api/ai/key", headers=other_user["headers"]).json()["configured"] is False
    assert client.post("/api/ai/suggest-themes", headers=other_user["headers"]).status_code == 428


def test_ai_actions_need_a_key(client, user):
    """Sans clé : 428, et RodiumAI n'est jamais appelé."""
    client.put(
        "/api/profile",
        json={"job_title": "Dev", "themes": ["IA"], "start_date": "2026-11-02", "end_date": "2026-11-08"},
        headers=user["headers"],
    )
    for method, path in (
        ("post", "/api/ai/analyze-style"),
        ("post", "/api/ai/suggest-themes"),
        ("post", "/api/posts/generate"),
        ("post", "/api/posts/inexistant/regenerate"),
    ):
        r = getattr(client, method)(path, json={} if "regenerate" in path else None, headers=user["headers"])
        assert r.status_code == 428, (path, r.status_code, r.text)
        assert "clé RodiumAI" in r.json()["detail"]


def test_the_users_own_key_is_used_for_calls(client, user, valid_key, monkeypatch):
    seen = {}

    def generate_post(profile, examples, theme, *, api_key, **kw):
        seen["key"] = api_key
        return "Un post"

    monkeypatch.setattr(ai, "generate_post", generate_post)
    put_key(client, user)
    client.put(
        "/api/profile",
        json={"themes": ["IA"], "start_date": "2026-11-02", "end_date": "2026-11-08", "posts_per_week": 1},
        headers=user["headers"],
    )
    assert client.post("/api/posts/generate", headers=user["headers"]).status_code == 200
    assert seen["key"] == KEY


def test_revoked_key_at_call_time_is_reported_as_424(client, user, ai_key, monkeypatch):
    def refuse(*a, **k):
        raise ai.AIKeyRejected("RodiumAI a refusé ta clé.")

    monkeypatch.setattr(ai, "generate_post", refuse)
    client.put(
        "/api/profile",
        json={"themes": ["IA"], "start_date": "2026-11-02", "end_date": "2026-11-08"},
        headers=user["headers"],
    )
    assert client.post("/api/posts/generate", headers=user["headers"]).status_code == 424


def test_unreadable_key_is_dropped_and_asked_again(client, user, valid_key, monkeypatch):
    put_key(client, user)
    monkeypatch.setattr(settings, "encryption_key", Fernet.generate_key().decode())  # la clé de chiffrement a changé
    with pytest.raises(ai.AIKeyMissing):
        keys.require_key(user["uid"])
    assert client.get("/api/ai/key", headers=user["headers"]).json()["configured"] is False


def test_validate_key_reads_rodium_status(monkeypatch):
    def fake_get(status):
        return lambda url, headers, timeout: httpx.Response(status, json={}, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "get", fake_get(200))
    ai.validate_key(KEY)
    monkeypatch.setattr(httpx, "get", fake_get(401))
    with pytest.raises(ai.AIKeyRejected):
        ai.validate_key(KEY)
    monkeypatch.setattr(httpx, "get", fake_get(402))
    with pytest.raises(ai.AIError, match="crédit"):
        ai.validate_key(KEY)
    monkeypatch.setattr(httpx, "get", fake_get(500))
    with pytest.raises(ai.AIError):
        ai.validate_key(KEY)
