-- SQLite Database Schema for Zoom Workplace Clone
-- Stores meetings, chat messages, recorded meeting videos, and shared meeting files.

PRAGMA foreign_keys = ON;

-- 1. Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    meeting_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Zoom Meeting',
    description TEXT DEFAULT '',
    scheduled_at DATETIME,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'instant' CHECK (status IN ('instant', 'scheduled')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chat Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 3. Meeting Recordings Table
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 4. Shared / Produced Files Table
CREATE TABLE IF NOT EXISTS shared_files (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_messages_meeting_id ON messages(meeting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recordings_meeting_id ON recordings(meeting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shared_files_meeting_id ON shared_files(meeting_id, created_at);
