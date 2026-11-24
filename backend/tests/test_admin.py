"""Espace admin : connexion par code email (sans mot de passe), rôles, et aucun contenu utilisateur renvoyé."""
import re

import pytest

from app.config import settings
from app.firebase import init_firebase
from app.services import activity
from app.services import email as mail

SESSION = "X-Admin-Session"
BOSS = "boss@example.com"
HELPER = "helper@example.com"


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
def boss(monkeypatch):
    monkeypatch.setattr(settings, "superadmin_emails", BOSS)
    return BOSS


@pytest.fixture
def outbox(monkeypatch):
    """Capture les emails envoyés au lieu de les expédier."""
    sent: list[dict] = []
    monkeypatch.setattr(mail, "send_email", lambda to, subject, html, text: sent.append({"to": to, "subject": subject, "text": text}))
    return sent


def _code(outbox) -> str:
    return re.search(r"\b(\d{6})\b", outbox[-1]["text"]).group(1)


def _login(client, outbox, email: str) -> dict:
    """Demande un code, le saisit : en-tête de session prêt pour les routes de données."""
    assert client.post("/api/admin/login/code", json={"email": email}).status_code == 202
    r = client.post("/api/admin/login/verify", json={"email": email, "code": _code(outbox)})
    assert r.status_code == 200, r.text
    return {SESSION: r.json()["token"]}


DATA_ROUTES = ("/api/admin/me", "/api/admin/overview", "/api/admin/users", "/api/admin/events", "/api/admin/admins")


def test_data_routes_need_an_admin_session(client, user):
    for path in DATA_ROUTES:
        for headers in ({}, user["headers"], {SESSION: "pas-une-session"}):
            r = client.get(path, headers=headers)
            assert r.status_code == 401 and r.json()["detail"] == "admin_session_required"


def test_a_normal_user_session_is_not_an_admin_session(client, user, boss, outbox):
    # Se connecter à LinkP ne donne aucun accès à l'admin, même avec l'adresse d'un admin.
    assert client.get("/api/admin/overview", headers=user["headers"]).status_code == 401


def test_unknown_address_gets_the_same_answer_and_no_email(client, boss, outbox):
    r = client.post("/api/admin/login/code", json={"email": "inconnu@example.com"})
    known = client.post("/api/admin/login/code", json={"email": BOSS})
    assert r.status_code == known.status_code == 202 and r.json() == known.json()
    assert [m["to"] for m in outbox] == [BOSS]
    bad = client.post("/api/admin/login/verify", json={"email": "inconnu@example.com", "code": "123456"})
    assert bad.status_code == 400 and "expiré" in bad.json()["detail"]
    assert client.post("/api/admin/login/code", json={"email": "pas-un-email"}).status_code == 202


def test_code_is_emailed_works_once_and_gives_a_session(client, boss, outbox):
    assert client.post("/api/admin/login/code", json={"email": BOSS.upper()}).status_code == 202
    assert outbox[-1]["to"] == BOSS and re.search(r"\d{6}", outbox[-1]["subject"])
    code = _code(outbox)

    wrong = "000000" if code != "000000" else "111111"
    r = client.post("/api/admin/login/verify", json={"email": BOSS, "code": wrong})
    assert r.status_code == 400 and "4 essais" in r.json()["detail"]
    assert client.post("/api/admin/login/verify", json={"email": BOSS, "code": "12ab"}).status_code == 422

    ok = client.post("/api/admin/login/verify", json={"email": f" {BOSS.upper()} ", "code": f" {code[:3]} {code[3:]} "})
    assert ok.status_code == 200 and ok.json()["role"] == "superadmin"
    session = {SESSION: ok.json()["token"]}
    assert client.get("/api/admin/overview", headers=session).status_code == 200
    assert client.get("/api/admin/me", headers=session).json() == {"email": BOSS, "role": "superadmin"}

    # Un code ne sert qu'une fois.
    assert client.post("/api/admin/login/verify", json={"email": BOSS, "code": code}).status_code == 400


def test_a_code_only_works_for_its_own_address(client, boss, monkeypatch, outbox):
    monkeypatch.setattr(settings, "admin_emails", HELPER)
    client.post("/api/admin/login/code", json={"email": BOSS})
    code = _code(outbox)
    assert client.post("/api/admin/login/verify", json={"email": HELPER, "code": code}).status_code == 400


def test_code_is_locked_after_too_many_wrong_attempts(client, boss, outbox):
    client.post("/api/admin/login/code", json={"email": BOSS})
    code = _code(outbox)
    wrong = "000000" if code != "000000" else "111111"
    statuses = [client.post("/api/admin/login/verify", json={"email": BOSS, "code": wrong}).status_code for _ in range(5)]
    assert statuses == [400, 400, 400, 400, 429]
    # Le bon code ne marche plus : il faut en redemander un.
    assert client.post("/api/admin/login/verify", json={"email": BOSS, "code": code}).status_code == 400


def test_a_new_code_cannot_be_requested_every_second(client, boss, outbox):
    assert client.post("/api/admin/login/code", json={"email": BOSS}).status_code == 202
    assert client.post("/api/admin/login/code", json={"email": BOSS}).status_code == 202
    assert len(outbox) == 1  # le second appel n'envoie rien


def test_a_failed_email_does_not_leave_a_usable_code(client, boss, monkeypatch):
    def boom(*a, **k):
        raise mail.EmailError("panne")

    monkeypatch.setattr(mail, "send_email", boom)
    assert client.post("/api/admin/login/code", json={"email": BOSS}).status_code == 502
    # La panne n'a pas déclenché le délai d'attente : on peut réessayer tout de suite.
    sent = []
    monkeypatch.setattr(mail, "send_email", lambda to, *a: sent.append(to))
    assert client.post("/api/admin/login/code", json={"email": BOSS}).status_code == 202
    assert sent == [BOSS]


def test_session_stops_working_when_the_admin_is_removed(client, boss, outbox):
    me = _login(client, outbox, BOSS)
    assert client.post("/api/admin/admins", json={"email": HELPER}, headers=me).status_code == 201
    helper = _login(client, outbox, HELPER)
    assert client.get("/api/admin/overview", headers=helper).status_code == 200
    assert client.delete(f"/api/admin/admins/{HELPER}", headers=me).status_code == 204
    assert client.get("/api/admin/overview", headers=helper).status_code == 401


def test_superadmin_manages_admins(client, boss, outbox):
    me = _login(client, outbox, BOSS)

    assert client.post("/api/admin/admins", json={"email": "pas-un-email"}, headers=me).status_code == 422
    created = client.post("/api/admin/admins", json={"email": HELPER.upper()}, headers=me)
    assert created.status_code == 201 and created.json()["email"] == HELPER
    assert client.post("/api/admin/admins", json={"email": HELPER}, headers=me).status_code == 409  # déjà admin
    assert client.post("/api/admin/admins", json={"email": BOSS}, headers=me).status_code == 409  # superadmin

    listed = {a["email"]: a for a in client.get("/api/admin/admins", headers=me).json()["admins"]}
    assert listed[BOSS]["role"] == "superadmin" and listed[BOSS]["removable"] is False
    assert listed[HELPER]["role"] == "admin" and listed[HELPER]["added_by"] == BOSS

    # Le nouvel admin se connecte avec son propre code : il voit les données, mais ne gère pas les admins.
    helper = _login(client, outbox, HELPER)
    assert outbox[-1]["to"] == HELPER
    assert client.get("/api/admin/overview", headers=helper).status_code == 200
    assert client.get("/api/admin/me", headers=helper).json()["role"] == "admin"
    assert client.get("/api/admin/admins", headers=helper).status_code == 403
    assert client.post("/api/admin/admins", json={"email": "x@example.com"}, headers=helper).status_code == 403

    # Retrait : un superadmin de configuration n'est pas retirable.
    assert client.delete(f"/api/admin/admins/{HELPER}", headers=me).status_code == 204
    assert client.delete(f"/api/admin/admins/{HELPER}", headers=me).status_code == 404
    assert client.delete(f"/api/admin/admins/{BOSS}", headers=me).status_code == 409


def test_admin_actions_are_traced_without_content(client, boss, outbox):
    me = _login(client, outbox, BOSS)
    client.post("/api/admin/admins", json={"email": HELPER}, headers=me)
    events = client.get("/api/admin/events", headers=me).json()["events"]
    mine = [e for e in events if e["uid"] == f"admin:{BOSS}"]
    assert {"admin_login", "admin_added"} <= {e["type"] for e in mine}
    assert all(e["email"] == BOSS for e in mine)
    assert [e for e in mine if e["type"] == "admin_added"][0]["meta"]["target"] == HELPER


def test_overview_users_and_events_for_an_admin(client, user, other_user, boss, outbox):
    admin = _login(client, outbox, BOSS)
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


def test_admin_payload_never_contains_user_content(client, user, other_user, boss, outbox):
    admin = _login(client, outbox, BOSS)
    secret = "Texte-secret-du-profil-1234"
    client.put("/api/profile", json={"job_title": secret, "bio": secret, "themes": [secret]}, headers=other_user["headers"])
    client.post("/api/examples", json={"content": secret * 3}, headers=other_user["headers"])

    detail = client.get(f"/api/admin/users/{other_user['uid']}", headers=admin)
    assert secret not in detail.text
    assert detail.json()["setup"]["profile_filled"] is True
    assert secret not in client.get("/api/admin/overview", headers=admin).text
