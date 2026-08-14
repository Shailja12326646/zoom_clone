import urllib.request
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("--- 1. Testing Health Endpoint ---")
    req = urllib.request.Request(f"{BASE_URL}/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        print("Health check response:", data)
        assert data.get("status") == "healthy"

    print("\n--- 2. Testing Create Scheduled Meeting ---")
    meeting_payload = {
        "meeting_id": "456 789 123",
        "title": "Quarterly Sprint Review",
        "description": "Discussing upcoming sprints and product roadmap",
        "scheduled_at": "2026-08-20T14:30:00Z",
        "duration_minutes": 45,
        "status": "scheduled"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/meetings",
        data=json.dumps(meeting_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        created_meeting = json.loads(resp.read().decode())
        print("Created meeting:", created_meeting)
        assert created_meeting["title"] == "Quarterly Sprint Review"
        meeting_db_id = created_meeting["id"]

    print("\n--- 3. Testing Get Meetings List ---")
    req = urllib.request.Request(f"{BASE_URL}/meetings")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        meetings = json.loads(resp.read().decode())
        print(f"Retrieved {len(meetings)} meetings")
        assert any(m["meeting_id"] == "456 789 123" for m in meetings)

    print("\n--- 4. Testing Chat Messages ---")
    msg_payload = {
        "meeting_id": meeting_db_id,
        "sender_name": "Shailja Kumari",
        "body": "Hello team, welcome to the Sprint Review meeting!"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/messages",
        data=json.dumps(msg_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        created_msg = json.loads(resp.read().decode())
        print("Created message:", created_msg)
        assert created_msg["sender_name"] == "Shailja Kumari"

    # Get messages
    req = urllib.request.Request(f"{BASE_URL}/messages/{meeting_db_id}")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        msgs = json.loads(resp.read().decode())
        print(f"Retrieved {len(msgs)} messages for meeting {meeting_db_id}")
        assert len(msgs) >= 1

    print("\n--- 5. Testing Recordings ---")
    rec_payload = {
        "meeting_id": meeting_db_id,
        "meeting_code": "456 789 123",
        "title": "Quarterly Sprint Review - Recording",
        "file_name": "recording-456789123-test.webm",
        "file_path": "/recordings/456789123/recording.webm",
        "file_size_bytes": 10485760,
        "duration_seconds": 120,
        "mime_type": "video/webm",
        "status": "completed"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/recordings",
        data=json.dumps(rec_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        created_rec = json.loads(resp.read().decode())
        print("Created recording entry:", created_rec)
        assert created_rec["file_name"] == "recording-456789123-test.webm"

    print("\n--- 6. Testing Shared Files ---")
    file_payload = {
        "meeting_id": meeting_db_id,
        "uploader_name": "Shailja Kumari",
        "file_name": "sprint_slides.pdf",
        "file_path": "/uploads/sprint_slides.pdf",
        "file_size_bytes": 2048576,
        "mime_type": "application/pdf"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/files",
        data=json.dumps(file_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        created_file = json.loads(resp.read().decode())
        print("Created file entry:", created_file)
        assert created_file["file_name"] == "sprint_slides.pdf"

    print("\n==========================================")
    print(" ALL BACKEND API & SQLITE TESTS PASSED! ")
    print("==========================================")

if __name__ == "__main__":
    test_api()
