import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "zoom_workspace.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Meetings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        meeting_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL DEFAULT 'Zoom Meeting',
        description TEXT DEFAULT '',
        scheduled_at TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        status TEXT NOT NULL DEFAULT 'instant' CHECK (status IN ('instant', 'scheduled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # 2. Chat Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );
    """)

    # 3. Recordings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        meeting_code TEXT NOT NULL,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL DEFAULT 'video/webm',
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('recording', 'completed', 'failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );
    """)

    # 4. Shared Files Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shared_files (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        uploader_name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );
    """)

    # Create Indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_sched ON meetings(scheduled_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_mid ON messages(meeting_id, created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_recordings_mid ON recordings(meeting_id, created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_mid ON shared_files(meeting_id, created_at);")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("SQLite database initialized successfully at", DB_PATH)
