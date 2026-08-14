import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db_connection, init_db
from .models import (
    MeetingCreate,
    MeetingResponse,
    MessageCreate,
    MessageResponse,
    RecordingCreate,
    RecordingResponse,
    SharedFileCreate,
    SharedFileResponse,
)

# Initialize database schema on startup
init_db()

app = FastAPI(
    title="Zoom Workplace Clone Backend API",
    description="Python FastAPI backend with SQLite for video meetings, messages, files, and recordings.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Zoom Workplace Clone FastAPI Backend",
        "docs": "/docs",
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== MEETINGS ENDPOINTS ====================

@app.get("/api/meetings", response_model=List[MeetingResponse])
def get_meetings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM meetings ORDER BY scheduled_at ASC, created_at DESC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/meetings", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(payload: MeetingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    meeting_id_uuid = payload.id or str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    try:
        cursor.execute(
            """
            INSERT INTO meetings (id, meeting_id, title, description, scheduled_at, duration_minutes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                meeting_id_uuid,
                payload.meeting_id,
                payload.title,
                payload.description or "",
                payload.scheduled_at,
                payload.duration_minutes,
                payload.status,
                now_str,
                now_str,
            ),
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Failed to create meeting: {str(e)}")

    cursor.execute("SELECT * FROM meetings WHERE id = ?;", (meeting_id_uuid,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@app.get("/api/meetings/{id_or_code}", response_model=MeetingResponse)
def get_meeting(id_or_code: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Try finding by primary key ID or meeting code
    cursor.execute("SELECT * FROM meetings WHERE id = ? OR meeting_id = ?;", (id_or_code, id_or_code))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return dict(row)

@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM meetings WHERE id = ? OR meeting_id = ?;", (meeting_id, meeting_id))
    conn.commit()
    conn.close()
    return {"message": "Meeting deleted successfully"}

# ==================== MESSAGES ENDPOINTS ====================

@app.get("/api/messages/{meeting_id}", response_model=List[MessageResponse])
def get_messages(meeting_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE meeting_id = ? ORDER BY created_at ASC;", (meeting_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(payload: MessageCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    msg_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    cursor.execute(
        """
        INSERT INTO messages (id, meeting_id, sender_name, body, created_at)
        VALUES (?, ?, ?, ?, ?);
        """,
        (msg_id, payload.meeting_id, payload.sender_name, payload.body, now_str),
    )
    conn.commit()
    
    cursor.execute("SELECT * FROM messages WHERE id = ?;", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

# ==================== RECORDINGS ENDPOINTS ====================

@app.get("/api/recordings", response_model=List[RecordingResponse])
def get_recordings(meeting_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if meeting_id:
        cursor.execute("SELECT * FROM recordings WHERE meeting_id = ? ORDER BY created_at DESC;", (meeting_id,))
    else:
        cursor.execute("SELECT * FROM recordings ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/recordings", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
def create_recording(payload: RecordingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    rec_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    cursor.execute(
        """
        INSERT INTO recordings (id, meeting_id, meeting_code, title, file_name, file_path, file_size_bytes, duration_seconds, mime_type, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        (
            rec_id,
            payload.meeting_id,
            payload.meeting_code,
            payload.title,
            payload.file_name,
            payload.file_path,
            payload.file_size_bytes,
            payload.duration_seconds,
            payload.mime_type,
            payload.status,
            now_str,
        ),
    )
    conn.commit()
    
    cursor.execute("SELECT * FROM recordings WHERE id = ?;", (rec_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

# ==================== SHARED FILES ENDPOINTS ====================

@app.get("/api/files", response_model=List[SharedFileResponse])
def get_shared_files(meeting_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if meeting_id:
        cursor.execute("SELECT * FROM shared_files WHERE meeting_id = ? ORDER BY created_at DESC;", (meeting_id,))
    else:
        cursor.execute("SELECT * FROM shared_files ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/files", response_model=SharedFileResponse, status_code=status.HTTP_201_CREATED)
def create_shared_file(payload: SharedFileCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    file_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    cursor.execute(
        """
        INSERT INTO shared_files (id, meeting_id, uploader_name, file_name, file_path, file_size_bytes, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """,
        (
            file_id,
            payload.meeting_id,
            payload.uploader_name,
            payload.file_name,
            payload.file_path,
            payload.file_size_bytes,
            payload.mime_type,
            now_str,
        ),
    )
    conn.commit()
    
    cursor.execute("SELECT * FROM shared_files WHERE id = ?;", (file_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)
