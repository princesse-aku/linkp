import json
import threading

from app.services import ai


def setup_profile(client, user, **extra):
    payload = {
        "full_name": "Princesse",
        "job_title": "Développeuse",
        "themes": ["IA", "Leadership"],
        "start_date": "2026-11-02",
        "end_date": "2026-11-15",
        "posts_per_week": 2,
        "publish_time": "09:00:00",
        **extra,
    }
    assert client.put("/api/profile", json=payload, headers=user["headers"]).status_code == 200


def stream(client, user, body=None):
    r = client.post("/api/posts/generate/stream", json=body, headers=user["headers"])
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/x-ndjson")
    return [json.loads(line) for line in r.text.splitlines() if line.strip()]


def types(events):
    return [e["type"] for e in events]


def test_stream_announces_the_total_then_sends_each_post(client, user, fake_ai):
    setup_profile(client, user)
    events = stream(client, user)

    assert types(events) == ["start"] + ["post"] * 4 + ["done"]
    start, done = events[0], events[-1]
    assert start["total"] == 4
    assert [s["theme"] for s in start["slots"]] == ["IA", "Leadership", "IA", "Leadership"]
    assert [s["index"] for s in start["slots"]] == [0, 1, 2, 3]
    assert done["created"] == 4 and done["failed"] == 0
    assert done["calendar"] == {"connected": False, "synced": 0, "error": None}

    # Chaque événement "post" correspond à son emplacement annoncé, et le post est bien enregistré.
    for e in events[1:-1]:
        slot = start["slots"][e["index"]]
        assert e["post"]["theme"] == slot["theme"]
        assert e["post"]["scheduled_for"] == slot["scheduled_for"]
        assert e["post"]["id"] and e["post"]["status"] == "draft"
    saved = client.get("/api/posts", headers=user["headers"]).json()
    assert sorted(p["id"] for p in saved) == sorted(e["post"]["id"] for e in events[1:-1])


def test_posts_are_sent_as_soon_as_they_are_ready(client, user, fake_ai, monkeypatch):
    """Preuve que le flux est progressif : les posts « IA » restent bloqués tant que le premier
    post « Leadership » n'a pas été REÇU par le client. Un envoi groupé à la fin ferait attendre 10 s."""
    import asyncio

    from app.auth import AuthUser
    from app.routers.posts import generate_stream

    release = threading.Event()

    def generate_post(profile, examples, theme, *, api_key, **kw):
        if theme == "IA":
            assert release.wait(timeout=10), "le client n'a pas reçu le post prêt pendant que les autres attendaient"
        return f"Post sur {theme}"

    monkeypatch.setattr(ai, "generate_post", generate_post)
    setup_profile(client, user)
    me = AuthUser(uid=user["uid"], email=user["email"], email_verified=False, name=None)

    async def run():
        response = generate_stream(None, user=me)
        received = []
        async for chunk in response.body_iterator:
            event = json.loads(chunk)
            received.append(event)
            if event["type"] == "post":
                release.set()  # on a bien reçu un post alors que d'autres sont encore en cours
        return received

    events = asyncio.run(run())
    posts = [e for e in events if e["type"] == "post"]
    assert events[0]["type"] == "start" and events[-1]["type"] == "done"
    assert posts[0]["post"]["theme"] == "Leadership"  # reçu avant les posts « IA », encore bloqués
    assert len(posts) == 4


def test_one_failing_post_does_not_stop_the_others(client, user, fake_ai, monkeypatch):
    def generate_post(profile, examples, theme, *, api_key, **kw):
        if theme == "IA":
            raise ai.AIError("RodiumAI a répondu 500")
        return f"Post sur {theme}"

    monkeypatch.setattr(ai, "generate_post", generate_post)
    setup_profile(client, user)
    events = stream(client, user)

    errors = [e for e in events if e["type"] == "post_error"]
    assert sorted(e["index"] for e in errors) == [0, 2]  # les deux emplacements "IA"
    assert all("RodiumAI" in e["message"] for e in errors)
    assert len([e for e in events if e["type"] == "post"]) == 2
    assert events[-1] == {"type": "done", "created": 2, "failed": 2, "calendar": {"connected": False, "synced": 0, "error": None}}
    assert len(client.get("/api/posts", headers=user["headers"]).json()) == 2


def test_old_drafts_are_kept_if_nothing_succeeds(client, user, fake_ai, monkeypatch):
    setup_profile(client, user)
    old = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    assert len(old) == 4

    def broken(*a, **k):
        raise ai.AIError("RodiumAI a répondu 500")

    monkeypatch.setattr(ai, "generate_post", broken)
    events = stream(client, user)
    assert types(events) == ["start"] + ["post_error"] * 4 + ["done"]
    assert events[-1]["created"] == 0
    still = client.get("/api/posts", headers=user["headers"]).json()
    assert sorted(p["id"] for p in still) == sorted(p["id"] for p in old)  # rien n'a été supprimé


def test_old_drafts_are_replaced_once_a_post_succeeds(client, user, fake_ai):
    setup_profile(client, user)
    old = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    published = old[0]["id"]
    client.patch(f"/api/posts/{published}", json={"status": "published"}, headers=user["headers"])

    events = stream(client, user)
    new_ids = {e["post"]["id"] for e in events if e["type"] == "post"}
    now_ids = {p["id"] for p in client.get("/api/posts", headers=user["headers"]).json()}
    assert now_ids == new_ids | {published}  # anciens brouillons supprimés, post publié conservé


def test_replace_drafts_can_be_disabled(client, user, fake_ai):
    setup_profile(client, user)
    old = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    stream(client, user, {"replace_drafts": False})
    assert len(client.get("/api/posts", headers=user["headers"]).json()) == len(old) + 4


def test_rejected_key_stops_the_stream_and_keeps_drafts(client, user, fake_ai, monkeypatch):
    setup_profile(client, user)
    old = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]

    def refuse(*a, **k):
        raise ai.AIKeyRejected("RodiumAI a refusé ta clé.")

    monkeypatch.setattr(ai, "generate_post", refuse)
    events = stream(client, user)
    assert events[0]["type"] == "start"
    assert events[-1] == {"type": "fatal", "status": 424, "message": "RodiumAI a refusé ta clé."}
    assert "done" not in types(events)
    assert len(client.get("/api/posts", headers=user["headers"]).json()) == len(old)


def test_checks_happen_before_the_stream_starts(client, user, fake_ai):
    # Pas de thème : erreur HTTP normale, pas de flux.
    assert client.post("/api/posts/generate/stream", headers=user["headers"]).status_code == 400
    client.put("/api/profile", json={"themes": ["IA"]}, headers=user["headers"])
    assert client.post("/api/posts/generate/stream", headers=user["headers"]).status_code == 400


def test_stream_needs_a_key(client, user):
    setup_profile(client, user)
    r = client.post("/api/posts/generate/stream", headers=user["headers"])
    assert r.status_code == 428


def test_stream_requires_auth(client):
    assert client.post("/api/posts/generate/stream").status_code == 401


def test_generate_one_retries_a_single_post(client, user, fake_ai):
    r = client.post(
        "/api/posts/generate/one",
        json={"theme": "IA", "scheduled_for": "2026-11-04T09:00:00"},
        headers=user["headers"],
    )
    assert r.status_code == 201, r.text
    assert r.json()["theme"] == "IA" and r.json()["scheduled_for"] == "2026-11-04T09:00:00"
    assert len(client.get("/api/posts", headers=user["headers"]).json()) == 1


def test_generate_one_validation_and_errors(client, user, fake_ai, monkeypatch):
    bad_date = client.post("/api/posts/generate/one", json={"theme": "IA", "scheduled_for": "demain"}, headers=user["headers"])
    assert bad_date.status_code == 422

    def broken(*a, **k):
        raise ai.AIError("RodiumAI a répondu 500")

    monkeypatch.setattr(ai, "generate_post", broken)
    r = client.post("/api/posts/generate/one", json={"theme": "IA", "scheduled_for": "2026-11-04T09:00:00"}, headers=user["headers"])
    assert r.status_code == 502
    assert client.get("/api/posts", headers=user["headers"]).json() == []
