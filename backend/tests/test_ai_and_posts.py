from datetime import date, time

from app.services.planner import plan_slots

EXAMPLE = "Voici un exemple de post suffisamment long pour être accepté."


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
    r = client.put("/api/profile", json=payload, headers=user["headers"])
    assert r.status_code == 200, r.text


def test_plan_slots_spreads_posts():
    slots = plan_slots(date(2026, 11, 2), date(2026, 11, 15), 2, time(9, 0))
    assert len(slots) == 4
    assert slots == sorted(slots)
    assert slots[0].isoformat() == "2026-11-02T09:00:00"
    assert slots[-1].date() <= date(2026, 11, 15)


def test_plan_slots_has_a_cap_and_a_minimum():
    assert len(plan_slots(date(2026, 1, 1), date(2026, 12, 31), 7, None)) == 30
    assert len(plan_slots(date(2026, 1, 1), date(2026, 1, 1), 1, None)) == 1


def test_analyze_style_needs_examples(client, user, fake_ai):
    assert client.post("/api/ai/analyze-style", headers=user["headers"]).status_code == 400


def test_analyze_style_is_saved_on_profile(client, user, fake_ai):
    client.post("/api/examples", json={"content": EXAMPLE}, headers=user["headers"])
    r = client.post("/api/ai/analyze-style", headers=user["headers"])
    assert r.status_code == 200
    assert r.json()["summary"] == "Direct et chaleureux"
    assert client.get("/api/profile", headers=user["headers"]).json()["style_analysis"]["examples_count"] == 1


def test_suggest_themes(client, user, fake_ai):
    assert client.post("/api/ai/suggest-themes", headers=user["headers"]).status_code == 400
    setup_profile(client, user)
    r = client.post("/api/ai/suggest-themes", headers=user["headers"])
    assert r.json() == {"themes": ["Leadership", "Recrutement"]}


def test_generate_needs_themes_and_dates(client, user, fake_ai):
    assert client.post("/api/posts/generate", headers=user["headers"]).status_code == 400
    client.put("/api/profile", json={"themes": ["IA"]}, headers=user["headers"])
    assert client.post("/api/posts/generate", headers=user["headers"]).status_code == 400


def test_generate_update_regenerate_delete(client, user, fake_ai):
    setup_profile(client, user)
    r = client.post("/api/posts/generate", headers=user["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    posts = body["posts"]
    assert len(posts) == 4
    assert [p["theme"] for p in posts] == ["IA", "Leadership", "IA", "Leadership"]
    assert [p["scheduled_for"] for p in posts] == sorted(p["scheduled_for"] for p in posts)
    assert all(p["status"] == "draft" for p in posts)
    assert body["calendar"] == {"connected": False, "synced": 0, "error": None}

    # Régénérer remplace les brouillons au lieu de les empiler.
    again = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    assert len(again) == 4
    assert len(client.get("/api/posts", headers=user["headers"]).json()) == 4

    post_id = again[0]["id"]
    patched = client.patch(
        f"/api/posts/{post_id}",
        json={"content": "Texte modifié", "status": "scheduled", "media_urls": ["https://exemple.test/a.png"]},
        headers=user["headers"],
    )
    assert patched.status_code == 200
    assert patched.json()["content"] == "Texte modifié"
    assert patched.json()["media_urls"] == ["https://exemple.test/a.png"]

    regenerated = client.post(
        f"/api/posts/{post_id}/regenerate", json={"instruction": "plus court"}, headers=user["headers"]
    )
    assert regenerated.json()["content"].startswith("[plus court]")
    assert fake_ai[-1]["previous"] == "Texte modifié"

    assert client.patch(f"/api/posts/{post_id}", json={"scheduled_for": "pas-une-date"}, headers=user["headers"]).status_code == 422
    assert client.delete(f"/api/posts/{post_id}", headers=user["headers"]).status_code == 204
    assert client.patch(f"/api/posts/{post_id}", json={"content": "x"}, headers=user["headers"]).status_code == 404


def test_published_posts_survive_regeneration(client, user, fake_ai):
    setup_profile(client, user)
    posts = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    client.patch(f"/api/posts/{posts[0]['id']}", json={"status": "published"}, headers=user["headers"])
    after = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"]
    all_posts = client.get("/api/posts", headers=user["headers"]).json()
    assert len(all_posts) == len(after) + 1
    assert any(p["id"] == posts[0]["id"] and p["status"] == "published" for p in all_posts)


def test_posts_are_private_per_user(client, user, other_user, fake_ai):
    setup_profile(client, user)
    post_id = client.post("/api/posts/generate", headers=user["headers"]).json()["posts"][0]["id"]
    assert client.get("/api/posts", headers=other_user["headers"]).json() == []
    assert client.patch(f"/api/posts/{post_id}", json={"content": "x"}, headers=other_user["headers"]).status_code == 404
    assert client.delete(f"/api/posts/{post_id}", headers=other_user["headers"]).status_code == 404


def test_ai_failure_is_reported_as_502(client, user, ai_key, monkeypatch):
    from app.services import ai

    def boom(*a, **k):
        raise ai.AIError("RodiumAI a répondu 500")

    monkeypatch.setattr(ai, "generate_post", boom)
    setup_profile(client, user)
    r = client.post("/api/posts/generate", headers=user["headers"])
    assert r.status_code == 502
    assert client.get("/api/posts", headers=user["headers"]).json() == []


def test_strip_emojis():
    from app.services.ai import strip_emojis

    assert strip_emojis("Bonjour 👋 à tous ✨") == "Bonjour  à tous"
