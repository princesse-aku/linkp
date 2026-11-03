import httpx
import pytest

from app.config import settings
from app.services import calendar as gcal
from app.services import email as mail
from app.services import media as media_svc

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82"
)


# ---------- Emails ----------

@pytest.fixture
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(mail, "send_email", lambda to, subject, html, text: sent.append((to, subject, html, text)))
    return sent


def test_password_reset_sends_a_link(client, user, outbox):
    r = client.post("/api/auth/password-reset", json={"email": user["email"]})
    assert r.status_code == 202
    assert len(outbox) == 1
    to, subject, html, text = outbox[0]
    assert to == user["email"]
    assert "http" in text and "oobCode" in text


def test_password_reset_never_reveals_unknown_addresses(client, outbox):
    r = client.post("/api/auth/password-reset", json={"email": "inconnu@example.com"})
    assert r.status_code == 202 and r.json() == {"ok": True}
    assert outbox == []
    assert client.post("/api/auth/password-reset", json={"email": "pas-un-email"}).status_code == 422


def test_welcome_email_contains_verification_link(client, user, outbox):
    assert client.post("/api/auth/welcome", headers=user["headers"]).status_code == 202
    assert len(outbox) == 1
    assert outbox[0][0] == user["email"]
    assert "oobCode" in outbox[0][3]


def test_welcome_requires_auth(client):
    assert client.post("/api/auth/welcome").status_code == 401


def test_smtp_delivers_to_mailpit():
    """Envoi réel vers Mailpit (inclus dans docker compose)."""
    api = f"http://{settings.smtp_host}:8025/api/v1/messages"
    try:
        httpx.delete(api, timeout=3)
    except httpx.HTTPError:
        pytest.skip("Mailpit injoignable")
    mail.send_email("dest@example.com", "Sujet de test", "<p>Bonjour</p>", "Bonjour")
    messages = httpx.get(api, timeout=3).json()["messages"]
    assert messages and messages[0]["Subject"] == "Sujet de test"


def test_resend_is_called_with_the_api_key(monkeypatch):
    seen = {}

    def fake_post(url, headers, json, timeout):
        seen.update(url=url, auth=headers["Authorization"], body=json)
        return httpx.Response(200, json={"id": "abc"})

    monkeypatch.setattr(settings, "email_provider", "resend")
    monkeypatch.setattr(settings, "resend_api_key", "re_test")
    monkeypatch.setattr(httpx, "post", fake_post)
    mail.send_email("a@b.co", "Sujet", "<p>x</p>", "x")
    assert seen["url"] == "https://api.resend.com/emails"
    assert seen["auth"] == "Bearer re_test"
    assert seen["body"]["to"] == ["a@b.co"]


def test_resend_without_key_fails_clearly(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "resend")
    monkeypatch.setattr(settings, "resend_api_key", "")
    with pytest.raises(mail.EmailError):
        mail.send_email("a@b.co", "S", "<p>x</p>", "x")


# ---------- Google Agenda ----------

def test_calendar_status_when_not_configured(client, user):
    r = client.get("/api/calendar/status", headers=user["headers"])
    assert r.json() == {"configured": bool(settings.google_client_id and settings.google_client_secret), "connected": False, "email": None}


def test_calendar_connect_builds_google_url(client, user, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "client-123")
    monkeypatch.setattr(settings, "google_client_secret", "secret")
    url = client.get("/api/calendar/connect", headers=user["headers"]).json()["url"]
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=client-123" in url
    assert "calendar.events" in url
    assert "access_type=offline" in url


def test_calendar_connect_unconfigured_is_503(client, user, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    assert client.get("/api/calendar/connect", headers=user["headers"]).status_code == 503


def test_calendar_callback_rejects_bad_state(client):
    r = client.get("/api/calendar/callback?code=abc&state=forge", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert "calendar=error" in r.headers["location"]


def test_calendar_callback_stores_tokens_and_connects(client, user, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "client-123")
    monkeypatch.setattr(settings, "google_client_secret", "secret")
    monkeypatch.setattr(
        gcal,
        "_post_token",
        lambda data: {"refresh_token": "r1", "access_token": "a1", "expires_in": 3600},
    )
    state = gcal.make_state(user["uid"])
    r = client.get(f"/api/calendar/callback?code=abc&state={state}", follow_redirects=False)
    assert "calendar=connected" in r.headers["location"]
    assert client.get("/api/calendar/status", headers=user["headers"]).json()["connected"] is True


def test_posts_get_calendar_events_when_connected(client, user, monkeypatch):
    from app.services import ai

    monkeypatch.setattr(ai, "generate_post", lambda *a, **k: "Un post")
    events = {}

    def upsert(uid, post, tz):
        events[post["id"]] = (post["scheduled_for"], tz)
        return f"evt-{post['id']}"

    monkeypatch.setattr(gcal, "status", lambda uid: {"configured": True, "connected": True, "email": "x@y.z"})
    monkeypatch.setattr(gcal, "upsert_event", upsert)
    deleted = []
    monkeypatch.setattr(gcal, "delete_event", lambda uid, event_id: deleted.append(event_id))

    client.put(
        "/api/profile",
        json={"themes": ["IA"], "start_date": "2026-11-02", "end_date": "2026-11-08", "posts_per_week": 2, "publish_time": "08:00:00"},
        headers=user["headers"],
    )
    body = client.post("/api/posts/generate", headers=user["headers"]).json()
    assert body["calendar"]["synced"] == len(body["posts"]) == 2
    assert all(p["calendar_event_id"] == f"evt-{p['id']}" for p in body["posts"])
    assert all(tz == "Europe/Paris" for _, tz in events.values())

    # Passer un post en "publié" retire son rappel ; le supprimer aussi.
    first, second = body["posts"]
    client.patch(f"/api/posts/{first['id']}", json={"status": "published"}, headers=user["headers"])
    client.delete(f"/api/posts/{second['id']}", headers=user["headers"])
    assert sorted(deleted) == sorted([first["calendar_event_id"], second["calendar_event_id"]])


def test_event_body_has_reminders():
    body = gcal.event_body({"id": "p1", "theme": "IA", "content": "Texte", "scheduled_for": "2026-11-02T09:00:00"}, "Europe/Paris")
    assert body["start"] == {"dateTime": "2026-11-02T09:00:00", "timeZone": "Europe/Paris"}
    assert body["end"]["dateTime"] == "2026-11-02T09:15:00"
    assert {"method": "popup", "minutes": 30} in body["reminders"]["overrides"]
    assert body["summary"] == "Publier sur LinkedIn : IA"


# ---------- Cloudinary ----------

def test_media_upload_list_delete(client, user, monkeypatch):
    monkeypatch.setattr(
        media_svc,
        "upload",
        lambda uid, data, filename, content_type: {"url": "https://res.cloudinary.test/a.png", "public_id": "linkp/a", "resource_type": "image", "bytes": len(data)},
    )
    destroyed = []
    monkeypatch.setattr(media_svc, "destroy", lambda public_id, resource_type="image": destroyed.append(public_id))

    r = client.post("/api/media", files={"file": ("photo.png", PNG, "image/png")}, headers=user["headers"])
    assert r.status_code == 201, r.text
    media_id = r.json()["id"]
    assert r.json()["url"] == "https://res.cloudinary.test/a.png"
    assert [m["id"] for m in client.get("/api/media", headers=user["headers"]).json()] == [media_id]

    assert client.delete(f"/api/media/{media_id}", headers=user["headers"]).status_code == 204
    assert destroyed == ["linkp/a"]
    assert client.get("/api/media", headers=user["headers"]).json() == []


def test_media_rejects_bad_types_and_big_files(client, user, monkeypatch):
    bad = client.post("/api/media", files={"file": ("virus.exe", b"MZ", "application/x-msdownload")}, headers=user["headers"])
    assert bad.status_code == 400
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    big = client.post("/api/media", files={"file": ("a.png", PNG, "image/png")}, headers=user["headers"])
    assert big.status_code == 400


def test_media_without_cloudinary_config_is_503(client, user, monkeypatch):
    monkeypatch.setattr(settings, "cloudinary_cloud_name", "")
    r = client.post("/api/media", files={"file": ("a.png", PNG, "image/png")}, headers=user["headers"])
    assert r.status_code == 503
