/**
 * SQLite Database Models & Type Definitions
 * Schema corresponds to lib/schema.sqlite.sql
 */

export interface SqliteMeeting {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: 'instant' | 'scheduled';
  created_at: string;
  updated_at: string;
}

export interface SqliteMessage {
  id: string;
  meeting_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface SqliteRecording {
  id: string;
  meeting_id: string;
  meeting_code: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  mime_type: string;
  status: 'recording' | 'completed' | 'failed';
  created_at: string;
}

export interface SqliteSharedFile {
  id: string;
  meeting_id: string;
  uploader_name: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string | null;
  created_at: string;
}
