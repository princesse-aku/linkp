import pytest

from app.config import settings
from app.services import media as media_svc

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def make_post(client, user):
    client.put(
        "/api/profile",
        json={"themes": ["Leadership"], "start_date": "2026-11-02", "end_date": "2026-11-08", "posts_per_week": 1},
        headers=user["headers"],
    )
    return client.post("/api/posts/generate", headers=user["headers"]).json()["posts"][0]


@pytest.fixture
def cloudinary(monkeypatch):
    sent = []
    monkeypatch.setattr(media_svc, "ensure_configured", lambda: None)

    def upload(uid, data, filename, content_type):
        sent.append({"uid": uid, "bytes": len(data), "filename": filename, "content_type": content_type})
        return {"url": f"https://res.cloudinary.test/{filename}", "public_id": f"linkp/{filename}", "resource_type": "image", "bytes": len(data)}

    monkeypatch.setattr(media_svc, "upload", upload)
    return sent


def send(client, user, post_id, name="photo.png", data=PNG, content_type="image/png"):
    return client.post(f"/api/posts/{post_id}/media", files={"file": (name, data, content_type)}, headers=user["headers"])


def test_uploaded_image_is_stored_library_and_attached(client, user, fake_ai, cloudinary):
    post = make_post(client, user)
    r = send(client, user, post["id"])
    assert r.status_code == 200, r.text
    body = r.json()
    url = "https://res.cloudinary.test/photo.png"
    assert body["post"]["media_urls"] == [url] and body["media"]["url"] == url
    assert cloudinary == [{"uid": user["uid"], "bytes": len(PNG), "filename": "photo.png", "content_type": "image/png"}]

    assert client.get("/api/posts", headers=user["headers"]).json()[0]["media_urls"] == [url]
    assert [m["url"] for m in client.get("/api/media", headers=user["headers"]).json()] == [url]


def test_uploads_and_generated_images_can_be_combined(client, user, fake_ai, cloudinary):
    post = make_post(client, user)
    send(client, user, post["id"], name="a.png")
    r = send(client, user, post["id"], name="b.jpg", content_type="image/jpeg")
    assert [u.rsplit("/", 1)[-1] for u in r.json()["post"]["media_urls"]] == ["a.png", "b.jpg"]


def test_only_images_are_accepted(client, user, fake_ai, cloudinary):
    post = make_post(client, user)
    pdf = send(client, user, post["id"], name="doc.pdf", data=b"%PDF-1.4", content_type="application/pdf")
    assert pdf.status_code == 400 and "Format" in pdf.json()["detail"]
    exe = send(client, user, post["id"], name="x.exe", data=b"MZ", content_type="application/x-msdownload")
    assert exe.status_code == 400
    assert cloudinary == []  # rien n'est parti vers Cloudinary


def test_empty_and_oversized_files_are_refused(client, user, fake_ai, cloudinary, monkeypatch):
    post = make_post(client, user)
    assert send(client, user, post["id"], data=b"").status_code == 400
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    big = send(client, user, post["id"])
    assert big.status_code == 400 and "volumineux" in big.json()["detail"]
    assert cloudinary == []


def test_cloudinary_not_configured_is_503(client, user, fake_ai, monkeypatch):
    post = make_post(client, user)
    monkeypatch.setattr(settings, "cloudinary_cloud_name", "")
    r = send(client, user, post["id"])
    assert r.status_code == 503 and "Cloudinary" in r.json()["detail"]


def test_cloudinary_failure_is_502_and_nothing_is_attached(client, user, fake_ai, monkeypatch):
    post = make_post(client, user)
    monkeypatch.setattr(media_svc, "ensure_configured", lambda: None)

    def broken(*a, **k):
        raise media_svc.MediaError("Échec de l'envoi sur Cloudinary")

    monkeypatch.setattr(media_svc, "upload", broken)
    assert send(client, user, post["id"]).status_code == 502
    assert client.get("/api/posts", headers=user["headers"]).json()[0]["media_urls"] == []
    assert client.get("/api/media", headers=user["headers"]).json() == []


def test_unknown_post_and_other_users_post_are_404(client, user, other_user, fake_ai, cloudinary):
    post = make_post(client, user)
    assert send(client, user, "inexistant").status_code == 404
    assert send(client, other_user, post["id"]).status_code == 404
    assert cloudinary == []


def test_upload_requires_auth(client):
    assert client.post("/api/posts/x/media", files={"file": ("a.png", PNG, "image/png")}).status_code == 401


def test_post_media_limit(client, user, fake_ai, cloudinary):
    post = make_post(client, user)
    client.patch(f"/api/posts/{post['id']}", json={"media_urls": [f"https://x.test/{i}.png" for i in range(10)]}, headers=user["headers"])
    assert send(client, user, post["id"]).status_code == 409
    assert cloudinary == []
