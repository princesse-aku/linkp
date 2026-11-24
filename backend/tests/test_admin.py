"""Espace admin : accès réservé, code de confirmation par email, rôles, et aucun contenu utilisateur renvoyé."""
import re
import time

import httpx
import pytest
from firebase_admin import auth as fb_auth

from app.config import settings
from app.firebase import init_firebase
from app.services import activity
from app.services import email as mail
from tests.conftest import AUTH_HOST

SESSION = "X-Admin-Session"


@pytest.fixture(autouse=True)
def _clean_admin_documents():
    """Les tests ne doivent laisser ni admins ajoutés ni codes en attente dans l'émulateur partagé avec l'application."""
    from app.firebase import db

    init_firebase()
    names = ("admins", "admin_challenges")
    before = {n: {d.id for d in db().collection(n).stream()} for n in names}
    yield
    for n in names:
        for d in db().collection(n).stream():
            if d.id not in before[n]:
                d.reference.delete()


@pytest.fixture
def outbox(monkeypatch):
    """Capture les emails envoyés au lieu de les expédier."""
    sent: list[dict] = []
    monkeypatch.setattr(mail, "send_email", lambda to, subject, html, text: sent.append({"to": to, "subject": subject, "text": text}))
    return sent


def _code(outbox) -> str:
    return re.search(r"\b(\d{6})\b", outbox[-1]["text"]).group(1)


def _login(user: dict) -> dict:
    """Marque l'adresse comme vérifiée, puis se reconnecte (nouveau jeton, nouvelle connexion)."""
    init_firebase()
    fb_auth.update_user(user["uid"], email_verified=True)
    r = httpx.post(
        f"http://{AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
        json={"email": user["email"], "password": "motdepasse123", "returnSecureToken": True},
    )
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['idToken']}"}


def _full_admin(client, user: dict, outbox) -> dict:
    """Connexion vérifiée + code de confirmation saisi : en-têtes prêts pour les routes de données."""
    headers = _login(user)
    assert client.post("/api/admin/session/code", headers=headers).status_code == 202
    r = client.post("/api/admin/session/verify", json={"code": _code(outbox)}, headers=headers)
    assert r.status_code == 200, r.text
    return {**headers, SESSION: r.json()["token"]}


DATA_ROUTES = ("/api/admin/overview", "/api/admin/users", "/api/admin/events", "/api/admin/admins")


def test_admin_routes_are_hidden_from_everyone_by_default(client, user):
    for path in ("/api/admin/me", "/api/admin/session/code", *DATA_ROUTES):
        method = client.post if "session" in path else client.get
        assert method(path, headers=user["headers"]).status_code == 404
        assert method(path).status_code == 401


def test_admin_needs_a_listed_and_verified_email(client, user, other_user, monkeypatch):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"].upper())
    # Adresse listée mais non vérifiée : refusée (sinon n'importe qui pourrait s'inscrire avec cette adresse).
    assert client.get("/api/admin/me", headers=user["headers"]).status_code == 404
    # Adresse vérifiée mais non listée.
    assert client.get("/api/admin/me", headers=_login(other_user)).status_code == 404
    me = client.get("/api/admin/me", headers=_login(user)).json()
    assert me["role"] == "superadmin" and me["session"] is False


def test_data_routes_need_the_confirmation_code(client, user, monkeypatch):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    headers = _login(user)
    for path in DATA_ROUTES:
        r = client.get(path, headers=headers)
        assert r.status_code == 401 and r.json()["detail"] == "admin_session_required"
    forged = {**headers, SESSION: "pas-une-session"}
    assert client.get("/api/admin/overview", headers=forged).status_code == 401


def test_code_is_emailed_works_once_and_gives_a_session(client, user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    headers = _login(user)
    assert client.post("/api/admin/session/code", headers=headers).status_code == 202
    assert outbox[-1]["to"] == user["email"] and re.search(r"\d{6}", outbox[-1]["subject"])
    code = _code(outbox)

    wrong = "000000" if code != "000000" else "111111"
    r = client.post("/api/admin/session/verify", json={"code": wrong}, headers=headers)
    assert r.status_code == 400 and "4 essais" in r.json()["detail"]
    assert client.post("/api/admin/session/verify", json={"code": "12ab"}, headers=headers).status_code == 422

    ok = client.post("/api/admin/session/verify", json={"code": f" {code[:3]} {code[3:]} "}, headers=headers)
    assert ok.status_code == 200 and ok.json()["role"] == "superadmin"
    session = {**headers, SESSION: ok.json()["token"]}
    assert client.get("/api/admin/overview", headers=session).status_code == 200
    assert client.get("/api/admin/me", headers=session).json()["session"] is True

    # Un code ne sert qu'une fois.
    again = client.post("/api/admin/session/verify", json={"code": code}, headers=headers)
    assert again.status_code == 400


def test_code_is_locked_after_too_many_wrong_attempts(client, user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    headers = _login(user)
    client.post("/api/admin/session/code", headers=headers)
    code = _code(outbox)
    wrong = "000000" if code != "000000" else "111111"
    statuses = [client.post("/api/admin/session/verify", json={"code": wrong}, headers=headers).status_code for _ in range(5)]
    assert statuses == [400, 400, 400, 400, 429]
    # Le bon code ne marche plus : il faut en redemander un.
    assert client.post("/api/admin/session/verify", json={"code": code}, headers=headers).status_code == 400


def test_a_new_code_cannot_be_requested_every_second(client, user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    headers = _login(user)
    assert client.post("/api/admin/session/code", headers=headers).status_code == 202
    r = client.post("/api/admin/session/code", headers=headers)
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0
    assert len(outbox) == 1


def test_a_failed_email_does_not_leave_a_usable_code(client, user, monkeypatch):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])

    def boom(*a, **k):
        raise mail.EmailError("panne")

    monkeypatch.setattr(mail, "send_email", boom)
    headers = _login(user)
    assert client.post("/api/admin/session/code", headers=headers).status_code == 502
    # La panne n'a pas déclenché le délai d'attente : on peut réessayer tout de suite.
    monkeypatch.setattr(mail, "send_email", lambda *a, **k: None)
    assert client.post("/api/admin/session/code", headers=headers).status_code == 202


def test_session_is_tied_to_the_user_and_to_the_current_login(client, user, other_user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", f"{user['email']},{other_user['email']}")
    mine = _full_admin(client, user, outbox)

    # La session d'un admin ne marche pas avec le jeton d'un autre.
    other_headers = _login(other_user)
    assert client.get("/api/admin/overview", headers={**other_headers, SESSION: mine[SESSION]}).status_code == 401

    # Une nouvelle connexion (nouveau jeton Firebase) invalide la session : il faut un nouveau code.
    time.sleep(1.2)
    relogin = _login(user)
    assert client.get("/api/admin/overview", headers={**relogin, SESSION: mine[SESSION]}).status_code == 401


def test_superadmin_manages_admins(client, user, other_user, make_user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    boss = _full_admin(client, user, outbox)

    assert client.post("/api/admin/admins", json={"email": "pas-un-email"}, headers=boss).status_code == 422
    created = client.post("/api/admin/admins", json={"email": other_user["email"].upper()}, headers=boss)
    assert created.status_code == 201 and created.json()["email"] == other_user["email"]
    assert client.post("/api/admin/admins", json={"email": other_user["email"]}, headers=boss).status_code == 409  # déjà admin
    assert client.post("/api/admin/admins", json={"email": user["email"]}, headers=boss).status_code == 409  # superadmin

    listed = {a["email"]: a for a in client.get("/api/admin/admins", headers=boss).json()["admins"]}
    assert listed[user["email"]]["role"] == "superadmin" and listed[user["email"]]["removable"] is False
    assert listed[other_user["email"]]["role"] == "admin" and listed[other_user["email"]]["added_by"] == user["email"]

    # Le nouvel admin se connecte avec son propre code : il voit les données, mais ne gère pas les admins.
    helper = _full_admin(client, other_user, outbox)
    assert outbox[-1]["to"] == other_user["email"]
    assert client.get("/api/admin/overview", headers=helper).status_code == 200
    assert client.get("/api/admin/me", headers=helper).json()["role"] == "admin"
    assert client.get("/api/admin/admins", headers=helper).status_code == 403
    assert client.post("/api/admin/admins", json={"email": "x@example.com"}, headers=helper).status_code == 403

    # Retrait : l'accès disparaît tout de suite, et un superadmin de configuration n'est pas retirable.
    assert client.delete("/api/admin/admins/" + other_user["email"], headers=boss).status_code == 204
    assert client.get("/api/admin/me", headers=helper).status_code == 404
    assert client.delete("/api/admin/admins/" + other_user["email"], headers=boss).status_code == 404
    assert client.delete("/api/admin/admins/" + user["email"], headers=boss).status_code == 409


def test_admin_actions_are_traced_without_content(client, user, other_user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    boss = _full_admin(client, user, outbox)
    client.post("/api/admin/admins", json={"email": other_user["email"]}, headers=boss)
    events = client.get("/api/admin/events", headers=boss).json()["events"]
    mine = [e for e in events if e["uid"] == user["uid"]]
    assert {"admin_login", "admin_added"} <= {e["type"] for e in mine}
    assert [e for e in mine if e["type"] == "admin_added"][0]["meta"]["target"] == other_user["email"]


def test_overview_users_and_events_for_an_admin(client, user, other_user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    admin = _full_admin(client, user, outbox)
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


def test_admin_payload_never_contains_user_content(client, user, other_user, monkeypatch, outbox):
    monkeypatch.setattr(settings, "superadmin_emails", user["email"])
    admin = _full_admin(client, user, outbox)
    secret = "Texte-secret-du-profil-1234"
    client.put("/api/profile", json={"job_title": secret, "bio": secret, "themes": [secret]}, headers=other_user["headers"])
    client.post("/api/examples", json={"content": secret * 3}, headers=other_user["headers"])

    detail = client.get(f"/api/admin/users/{other_user['uid']}", headers=admin)
    assert secret not in detail.text
    assert detail.json()["setup"]["profile_filled"] is True
    assert secret not in client.get("/api/admin/overview", headers=admin).text
