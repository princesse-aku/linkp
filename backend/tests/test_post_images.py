import base64

import httpx
import pytest

from app.config import settings
from app.services import ai, images
from app.services import media as media_svc

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
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
    """Cloudinary simulé : on garde la trace des envois."""
    sent = []
    monkeypatch.setattr(media_svc, "ensure_configured", lambda: None)

    def upload(uid, data, filename, content_type):
        sent.append({"uid": uid, "bytes": len(data), "filename": filename, "content_type": content_type})
        return {"url": f"https://res.cloudinary.test/{filename}", "public_id": f"linkp/{filename}", "resource_type": "image", "bytes": len(data)}

    monkeypatch.setattr(media_svc, "upload", upload)
    return sent


@pytest.fixture
def fake_image(monkeypatch):
    calls = []

    def generate_image(prompt, *, api_key):
        calls.append({"prompt": prompt, "api_key": api_key})
        return JPEG, "image/jpeg"

    monkeypatch.setattr(images, "generate_image", generate_image)
    return calls


# ---------- Route ----------

def test_image_is_generated_uploaded_and_attached(client, user, fake_ai, fake_image, cloudinary):
    post = make_post(client, user)
    r = client.post(f"/api/posts/{post['id']}/image", json={}, headers=user["headers"])
    assert r.status_code == 200, r.text
    body = r.json()

    url = body["post"]["media_urls"][0]
    assert url.startswith("https://res.cloudinary.test/post-") and url.endswith(".jpg")
    assert body["media"]["url"] == url
    assert cloudinary[0]["content_type"] == "image/jpeg" and cloudinary[0]["uid"] == user["uid"]

    # Le post et la médiathèque sont à jour.
    assert client.get("/api/posts", headers=user["headers"]).json()[0]["media_urls"] == [url]
    assert [m["url"] for m in client.get("/api/media", headers=user["headers"]).json()] == [url]


def test_prompt_uses_the_post_and_the_instruction(client, user, fake_ai, fake_image, cloudinary):
    post = make_post(client, user)
    client.post(f"/api/posts/{post['id']}/image", json={"instruction": "ambiance chaleureuse, tons bleus"}, headers=user["headers"])
    prompt = fake_image[0]["prompt"]
    assert "Leadership" in prompt and "Post sur Leadership" in prompt
    assert "ambiance chaleureuse, tons bleus" in prompt
    assert "Do NOT include any text" in prompt  # pas de texte dans l'image
    assert fake_image[0]["api_key"] == "rd_sk_test_0000"  # la clé de l'utilisateur


def test_several_images_can_be_added(client, user, fake_ai, fake_image, cloudinary):
    post = make_post(client, user)
    for _ in range(2):
        r = client.post(f"/api/posts/{post['id']}/image", headers=user["headers"])
        assert r.status_code == 200
    assert len(r.json()["post"]["media_urls"]) == 2


def test_image_needs_a_key(client, user):
    r = client.post("/api/posts/quelconque/image", headers=user["headers"])
    assert r.status_code == 428


def test_image_for_unknown_post_is_404(client, user, fake_ai, fake_image, cloudinary):
    assert client.post("/api/posts/inexistant/image", headers=user["headers"]).status_code == 404
    assert fake_image == []  # aucune image payante générée


def test_posts_images_are_private(client, user, other_user, fake_ai, fake_image, cloudinary):
    post = make_post(client, user)
    assert client.post(f"/api/posts/{post['id']}/image", headers=other_user["headers"]).status_code == 404


def test_cloudinary_not_configured_fails_before_paying_for_an_image(client, user, fake_ai, fake_image, monkeypatch):
    post = make_post(client, user)
    monkeypatch.setattr(settings, "cloudinary_cloud_name", "")
    r = client.post(f"/api/posts/{post['id']}/image", headers=user["headers"])
    assert r.status_code == 503 and "Cloudinary" in r.json()["detail"]
    assert fake_image == []  # on n'a pas généré (ni payé) d'image


def test_image_provider_errors(client, user, fake_ai, cloudinary, monkeypatch):
    post = make_post(client, user)

    def failing(error):
        def generate_image(prompt, *, api_key):
            raise error

        return generate_image

    monkeypatch.setattr(images, "generate_image", failing(ai.AIError("RodiumAI a répondu 500")))
    assert client.post(f"/api/posts/{post['id']}/image", headers=user["headers"]).status_code == 502
    monkeypatch.setattr(images, "generate_image", failing(ai.AIKeyRejected("clé refusée")))
    assert client.post(f"/api/posts/{post['id']}/image", headers=user["headers"]).status_code == 424
    assert client.get("/api/posts", headers=user["headers"]).json()[0]["media_urls"] == []


def test_cloudinary_upload_failure_is_reported(client, user, fake_ai, fake_image, monkeypatch):
    post = make_post(client, user)
    monkeypatch.setattr(media_svc, "ensure_configured", lambda: None)

    def broken(*a, **k):
        raise media_svc.MediaError("Échec de l'envoi sur Cloudinary")

    monkeypatch.setattr(media_svc, "upload", broken)
    assert client.post(f"/api/posts/{post['id']}/image", headers=user["headers"]).status_code == 502


def test_post_media_limit(client, user, fake_ai, fake_image, cloudinary):
    post = make_post(client, user)
    client.patch(f"/api/posts/{post['id']}", json={"media_urls": [f"https://x.test/{i}.png" for i in range(10)]}, headers=user["headers"])
    assert client.post(f"/api/posts/{post['id']}/image", headers=user["headers"]).status_code == 409


# ---------- Service d'image ----------

def fake_response(payload, status=200):
    return lambda url, **kw: httpx.Response(status, json=payload, request=httpx.Request("POST", url))


def test_generate_image_decodes_base64(monkeypatch):
    monkeypatch.setattr(httpx, "post", fake_response({"data": [{"b64_json": base64.b64encode(PNG).decode()}]}))
    data, content_type = images.generate_image("p", api_key="k")
    assert data == PNG and content_type == "image/png"


def test_generate_image_sends_the_configured_model(monkeypatch):
    seen = {}

    def post(url, headers, json, timeout):
        seen.update(url=url, auth=headers["Authorization"], body=json)
        return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(JPEG).decode()}]}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", post)
    images.generate_image("un prompt", api_key="rd_sk_abc")
    assert seen["url"].endswith("/images/generations")
    assert seen["auth"] == "Bearer rd_sk_abc"
    assert seen["body"]["model"] == "google/gemini-3.1-flash-lite-image"
    assert seen["body"]["prompt"] == "un prompt" and seen["body"]["n"] == 1


def test_generate_image_rejects_junk_and_http_errors(monkeypatch):
    monkeypatch.setattr(httpx, "post", fake_response({"data": [{"b64_json": base64.b64encode(b"pas une image").decode()}]}))
    with pytest.raises(ai.AIError, match="exploitable"):
        images.generate_image("p", api_key="k")
    monkeypatch.setattr(httpx, "post", fake_response({"data": []}))
    with pytest.raises(ai.AIError):
        images.generate_image("p", api_key="k")
    monkeypatch.setattr(httpx, "post", fake_response({}, status=401))
    with pytest.raises(ai.AIKeyRejected):
        images.generate_image("p", api_key="k")
    monkeypatch.setattr(httpx, "post", fake_response({}, status=402))
    with pytest.raises(ai.AIError, match="crédit"):
        images.generate_image("p", api_key="k")
