"""Espace admin : accès réservé, et aucune donnée de contenu dans ce qui est renvoyé."""
import httpx
from firebase_admin import auth as fb_auth

from app.config import settings
from app.firebase import init_firebase
from app.services import activity
from tests.conftest import AUTH_HOST


def _verified_headers(user: dict) -> dict:
    """Marque l'adresse comme vérifiée, puis se reconnecte pour obtenir un jeton qui le reflète."""
    init_firebase()
    fb_auth.update_user(user["uid"], email_verified=True)
    r = httpx.post(
        f"http://{AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
        json={"email": user["email"], "password": "motdepasse123", "returnSecureToken": True},
    )
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['idToken']}"}


def test_admin_routes_are_hidden_from_everyone_by_default(client, user):
    for path in ("/api/admin/me", "/api/admin/overview", "/api/admin/users", "/api/admin/events"):
        assert client.get(path, headers=user["headers"]).status_code == 404
        assert client.get(path).status_code == 401


def test_admin_needs_a_listed_and_verified_email(client, user, other_user, monkeypatch):
    monkeypatch.setattr(settings, "admin_emails", user["email"].upper())
    # Adresse listée mais non vérifiée : refusée (sinon n'importe qui pourrait s'inscrire avec cette adresse).
    assert client.get("/api/admin/me", headers=user["headers"]).status_code == 404
    assert client.get("/api/admin/me", headers=_verified_headers(other_user)).status_code == 404
    assert client.get("/api/admin/me", headers=_verified_headers(user)).json()["admin"] is True


def test_overview_users_and_events_for_an_admin(client, user, other_user, monkeypatch):
    monkeypatch.setattr(settings, "admin_emails", user["email"])
    admin = _verified_headers(user)
    activity.log_event(other_user["uid"], "generation", total=3, created=2, failed=1, errors={"credit": 1})
    activity.log_event(other_user["uid"], "key_saved", ok=False, error="key_rejected")

    overview = client.get("/api/admin/overview", headers=admin).json()
    assert overview["users"]["total"] >= 2
    assert len(overview["signups_by_day"]) == 30
    assert overview["generation_30d"]["posts_created"] >= 2

    listed = client.get("/api/admin/users", params={"q": other_user["email"]}, headers=admin).json()
    assert [u["email"] for u in listed["users"]] == [other_user["email"]]
    assert listed["users"][0]["has_key"] is False

    detail = client.get(f"/api/admin/users/{other_user['uid']}", headers=admin).json()
    assert [e["type"] for e in detail["events"]][:2] == ["key_saved", "generation"]
    assert set(detail["setup"]) == {"profile_filled", "themes", "period", "style_analyzed"}

    errors = client.get("/api/admin/events", params={"errors_only": True}, headers=admin).json()["events"]
    assert {e["type"] for e in errors if e["uid"] == other_user["uid"]} == {"generation", "key_saved"}
    assert client.get("/api/admin/users/inconnu", headers=admin).status_code == 404


def test_admin_payload_never_contains_user_content(client, user, other_user, monkeypatch, fake_ai):
    monkeypatch.setattr(settings, "admin_emails", user["email"])
    admin = _verified_headers(user)
    secret = "Texte-secret-du-profil-1234"
    client.put("/api/profile", json={"job_title": secret, "bio": secret, "themes": [secret]}, headers=other_user["headers"])
    client.post("/api/examples", json={"content": secret * 3}, headers=other_user["headers"])

    detail = client.get(f"/api/admin/users/{other_user['uid']}", headers=admin)
    assert secret not in detail.text
    assert detail.json()["setup"]["profile_filled"] is True
    assert secret not in client.get("/api/admin/overview", headers=admin).text
