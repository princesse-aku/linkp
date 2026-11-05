def test_auth_required(client):
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/profile", headers={"Authorization": "Bearer nimportequoi"}).status_code == 401


def test_deleted_account_token_is_rejected(client, user):
    from firebase_admin import auth as fb_auth

    assert client.get("/api/profile", headers=user["headers"]).status_code == 200
    fb_auth.delete_user(user["uid"])
    assert client.get("/api/profile", headers=user["headers"]).status_code == 401


def test_profile_created_on_first_read(client, user):
    r = client.get("/api/profile", headers=user["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == user["email"]
    assert body["language"] == "fr"
    assert body["tones"] == [] and body["themes"] == []


def test_profile_roundtrip_and_cleaning(client, user):
    payload = {
        "full_name": "Princesse",
        "job_title": "Développeuse",
        "industry": "Tech",
        "tones": ["Direct", "direct", "  Inspirant "],
        "themes": ["IA", "", "Leadership"],
        "start_date": "2026-11-10",
        "end_date": "2026-11-30",
        "posts_per_week": 3,
        "publish_time": "09:30:00",
        "timezone": "Europe/Paris",
    }
    r = client.put("/api/profile", json=payload, headers=user["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tones"] == ["Direct", "Inspirant"]
    assert body["themes"] == ["IA", "Leadership"]
    assert body["start_date"] == "2026-11-10"
    assert body["publish_time"].startswith("09:30")

    again = client.get("/api/profile", headers=user["headers"]).json()
    assert again["full_name"] == "Princesse"


def test_profile_validation(client, user):
    bad_dates = {"start_date": "2026-12-01", "end_date": "2026-11-01"}
    assert client.put("/api/profile", json=bad_dates, headers=user["headers"]).status_code == 422
    assert client.put("/api/profile", json={"timezone": "Mars/Olympus"}, headers=user["headers"]).status_code == 422
    assert client.put("/api/profile", json={"posts_per_week": 99}, headers=user["headers"]).status_code == 422


def test_examples_crud_and_isolation(client, user, other_user):
    text = "Voici un exemple de post suffisamment long pour être accepté."
    created = client.post("/api/examples", json={"content": text}, headers=user["headers"])
    assert created.status_code == 201
    ex_id = created.json()["id"]

    assert [e["content"] for e in client.get("/api/examples", headers=user["headers"]).json()] == [text]
    assert client.get("/api/examples", headers=other_user["headers"]).json() == []

    assert client.post("/api/examples", json={"content": "court"}, headers=user["headers"]).status_code == 422

    assert client.delete(f"/api/examples/{ex_id}", headers=user["headers"]).status_code == 204
    assert client.get("/api/examples", headers=user["headers"]).json() == []


def test_mojibake_is_repaired_on_save_and_read(client, user):
    # Texte UTF-8 relu en Latin-1 (terminal, script) : écrit avec des échappements pour rester lisible.
    broken = {
        "job_title": "DÃ©veloppeuse web",
        "bio": "J'ai conÃ§u une plateforme Ã  Paris",
        "themes": ["Ã‰quipe"],
    }
    r = client.put("/api/profile", json=broken, headers=user["headers"])
    assert r.status_code == 200
    got = client.get("/api/profile", headers=user["headers"]).json()
    assert got["job_title"] == "Développeuse web"
    assert got["bio"] == "J'ai conçu une plateforme à Paris"
    assert got["themes"] == ["Équipe"]
