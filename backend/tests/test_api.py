from datetime import datetime, timedelta, timezone

from tests.conftest import auth_header, sample_pdf


def test_register_login_and_library_round_trip(client):
    headers = auth_header(client)
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["full_name"] == "Ada Reader"

    uploaded = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
        data={"title": "Hello Notes", "author": "Ada"},
    )
    assert uploaded.status_code == 200, uploaded.text
    body = uploaded.json()
    assert body["title"] == "Hello Notes"
    assert body["processing_status"] == "ready"
    assert body["total_pages"] == 1
    assert "Cloud agent hello" in body["pages"][0]["extracted_text"]

    listing = client.get("/documents", headers=headers)
    assert listing.status_code == 200
    assert listing.json()[0]["id"] == body["id"]

    other = auth_header(client, "other@example.com")
    hidden = client.get(f"/documents/{body['id']}", headers=other)
    assert hidden.status_code == 404


def test_reading_and_listening_positions_stay_separate(client):
    headers = auth_header(client)
    document_id = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
    ).json()["id"]

    reading = client.put(
        f"/progress/{document_id}",
        headers=headers,
        json={"mode": "reading", "current_page": 1, "position_offset": 0},
    )
    listening = client.put(
        f"/progress/{document_id}",
        headers=headers,
        json={"mode": "listening", "current_page": 1, "position_offset": 40},
    )
    assert reading.status_code == 200
    assert listening.status_code == 200

    both = client.get(f"/progress/{document_id}", headers=headers).json()
    assert both["reading"]["current_page"] == 1
    assert both["reading"]["position_offset"] == 0
    assert both["listening"]["position_offset"] == 40
    assert both["reading"]["progress_percentage"] != both["listening"]["progress_percentage"]


def test_session_end_ignores_unattended_time_and_sync_is_idempotent(client):
    headers = auth_header(client)
    document_id = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
    ).json()["id"]
    started = client.post(
        "/sessions/start",
        headers=headers,
        json={"document_id": document_id, "mode": "reading", "device_id": "pixel"},
    )
    assert started.status_code == 200, started.text
    session_id = started.json()["id"]
    finished = client.post(
        f"/sessions/{session_id}/end",
        headers=headers,
        json={"duration_seconds": 7200, "pages_completed": 1, "client_event_id": "event-1"},
    )
    assert finished.status_code == 200
    assert finished.json()["duration_seconds"] < 30

    duplicate = client.post(
        "/sync/push",
        headers=headers,
        json={
            "events": [
                {
                    "event_id": "event-1",
                    "type": "session",
                    "payload": {
                        "session_id": session_id,
                        "duration_seconds": 7200,
                        "pages_completed": 9,
                    },
                }
            ]
        },
    )
    assert duplicate.json()["results"][0]["status"] == "duplicate"
    overview = client.get("/analytics/overview", headers=headers).json()
    assert overview["reading"]["total_pages"] == 1


def test_older_sync_event_does_not_rewind_progress(client):
    headers = auth_header(client)
    document_id = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
    ).json()["id"]
    now = datetime.now(timezone.utc)
    client.put(
        f"/progress/{document_id}",
        headers=headers,
        json={
            "mode": "reading",
            "current_page": 1,
            "position_offset": 12,
            "updated_at": now.isoformat(),
        },
    )
    pushed = client.post(
        "/sync/push",
        headers=headers,
        json={
            "events": [
                {
                    "event_id": "old-progress",
                    "type": "progress",
                    "payload": {
                        "document_id": document_id,
                        "mode": "reading",
                        "current_page": 1,
                        "position_offset": 1,
                        "updated_at": (now - timedelta(days=1)).isoformat(),
                    },
                }
            ]
        },
    )
    assert pushed.status_code == 200
    progress = client.get(f"/progress/{document_id}", headers=headers).json()
    assert progress["reading"]["position_offset"] == 12


def test_ai_answers_from_the_document_and_cites_the_page(client):
    headers = auth_header(client)
    document_id = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
    ).json()["id"]
    reply = client.post(
        "/ai/chat",
        headers=headers,
        json={"document_id": document_id, "message": "What does the page say about a cloud agent?"},
    )
    assert reply.status_code == 200, reply.text
    body = reply.json()
    assert body["source"] == "document"
    assert 1 in body["cited_pages"]
    assert "Cloud agent hello" in body["response"]

    summary = client.post(
        "/ai/chat",
        headers=headers,
        json={"document_id": document_id, "message": "Summarise this document."},
    )
    assert summary.status_code == 200
    assert "Cloud agent hello" in summary.json()["response"]

    missing = client.post(
        "/ai/chat",
        headers=headers,
        json={
            "document_id": document_id,
            "conversation_id": body["conversation_id"],
            "message": "Where is the recipe for sourdough?",
        },
    )
    assert "could not find" in missing.json()["response"].lower()


def test_completion_goal_sets_a_daily_page_target(client):
    headers = auth_header(client)
    document_id = client.post(
        "/documents",
        headers=headers,
        files={"file": ("hello.pdf", sample_pdf(), "application/pdf")},
    ).json()["id"]
    created = client.post(
        "/goals",
        headers=headers,
        json={
            "document_id": document_id,
            "goal_type": "completion_date",
            "target_date": (datetime.now(timezone.utc).date() + timedelta(days=10)).isoformat(),
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["pages_per_day"] == 1
