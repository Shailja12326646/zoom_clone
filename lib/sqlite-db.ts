import initSqlJs, { Database } from 'sql.js';

const FASTAPI_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

let dbInstance: Database | null = null;
let initPromise: Promise<Database | null> | null = null;

const STORAGE_KEY = 'zoom_workplace_sqlite_db';

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    meeting_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Zoom Meeting',
    description TEXT DEFAULT '',
    scheduled_at DATETIME,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'instant' CHECK (status IN ('instant', 'scheduled')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

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
`;

export interface MeetingRecord {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: 'instant' | 'scheduled';
  created_at: string;
}

export interface MessageRecord {
  id: string;
  meeting_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface RecordingRecord {
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

export interface SharedFileRecord {
  id: string;
  meeting_id: string;
  uploader_name: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string | null;
  created_at: string;
}

const fallbackStorage = {
  meetings: [] as MeetingRecord[],
  messages: [] as MessageRecord[],
  recordings: [] as RecordingRecord[],
  sharedFiles: [] as SharedFileRecord[],
};

function loadFallback() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('zoom_sqlite_json_backup');
    if (raw) {
      const data = JSON.parse(raw);
      fallbackStorage.meetings = data.meetings || [];
      fallbackStorage.messages = data.messages || [];
      fallbackStorage.recordings = data.recordings || [];
      fallbackStorage.sharedFiles = data.sharedFiles || [];
    }
  } catch {}
}

function saveFallback() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zoom_sqlite_json_backup', JSON.stringify(fallbackStorage));
  } catch {}
}

export async function getDatabase(): Promise<Database | null> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });

      let savedData: Uint8Array | null = null;
      if (typeof window !== 'undefined') {
        const savedBase64 = localStorage.getItem(STORAGE_KEY);
        if (savedBase64) {
          try {
            const binaryString = window.atob(savedBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            savedData = bytes;
          } catch {
            savedData = null;
          }
        }
      }

      const db = savedData ? new SQL.Database(savedData) : new SQL.Database();
      db.run(INIT_SQL);
      dbInstance = db;
      saveDatabase();
      return db;
    } catch {
      loadFallback();
      return null;
    }
  })();

  return initPromise;
}

export function saveDatabase() {
  if (!dbInstance || typeof window === 'undefined') return;
  try {
    const data = dbInstance.export();
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    localStorage.setItem(STORAGE_KEY, base64);
  } catch (err) {
    console.error('Failed to export SQLite database to storage', err);
  }
}

export const sqliteDb = {
  async getMeetings(): Promise<MeetingRecord[]> {
    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/meetings`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return data as MeetingRecord[];
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        const res = db.exec('SELECT * FROM meetings ORDER BY scheduled_at ASC');
        if (res.length > 0) {
          const { columns, values } = res[0];
          return values.map((row) => {
            const obj: any = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj as MeetingRecord;
          });
        }
      } catch {}
    }

    // 3. Fallback to Local Backup
    loadFallback();
    return fallbackStorage.meetings;
  },

  async createMeeting(meeting: Omit<MeetingRecord, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<MeetingRecord> {
    const id = meeting.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now()));
    const createdAt = meeting.created_at || new Date().toISOString();
    const newMeeting: MeetingRecord = {
      id,
      meeting_id: meeting.meeting_id,
      title: meeting.title || 'Zoom Meeting',
      description: meeting.description || '',
      scheduled_at: meeting.scheduled_at,
      duration_minutes: meeting.duration_minutes || 60,
      status: meeting.status || 'instant',
      created_at: createdAt,
    };

    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return data as MeetingRecord;
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        db.run(
          `INSERT INTO meetings (id, meeting_id, title, description, scheduled_at, duration_minutes, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newMeeting.id,
            newMeeting.meeting_id,
            newMeeting.title,
            newMeeting.description,
            newMeeting.scheduled_at,
            newMeeting.duration_minutes,
            newMeeting.status,
            newMeeting.created_at,
          ]
        );
        saveDatabase();
      } catch {}
    }

    loadFallback();
    fallbackStorage.meetings.unshift(newMeeting);
    saveFallback();
    return newMeeting;
  },

  async getMessages(meetingId: string): Promise<MessageRecord[]> {
    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/messages/${meetingId}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return data as MessageRecord[];
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        const stmt = db.prepare('SELECT * FROM messages WHERE meeting_id = :mid ORDER BY created_at ASC');
        const result: MessageRecord[] = [];
        stmt.bind({ ':mid': meetingId });
        while (stmt.step()) {
          const row = stmt.getAsObject();
          result.push(row as unknown as MessageRecord);
        }
        stmt.free();
        return result;
      } catch {}
    }

    loadFallback();
    return fallbackStorage.messages.filter((m) => m.meeting_id === meetingId);
  },

  async createMessage(message: { meeting_id: string; sender_name: string; body: string }): Promise<MessageRecord> {
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now());
    const createdAt = new Date().toISOString();
    const newMessage: MessageRecord = {
      id,
      meeting_id: message.meeting_id,
      sender_name: message.sender_name,
      body: message.body,
      created_at: createdAt,
    };

    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return data as MessageRecord;
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        db.run(
          `INSERT INTO messages (id, meeting_id, sender_name, body, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, message.meeting_id, message.sender_name, message.body, createdAt]
        );
        saveDatabase();
      } catch {}
    }

    loadFallback();
    fallbackStorage.messages.push(newMessage);
    saveFallback();
    return newMessage;
  },

  async createRecording(recording: Omit<RecordingRecord, 'id' | 'created_at'>): Promise<RecordingRecord> {
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now());
    const createdAt = new Date().toISOString();
    const newRecording: RecordingRecord = {
      id,
      ...recording,
      created_at: createdAt,
    };

    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/recordings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recording),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return data as RecordingRecord;
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        db.run(
          `INSERT INTO recordings (id, meeting_id, meeting_code, title, file_name, file_path, file_size_bytes, duration_seconds, mime_type, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            recording.meeting_id,
            recording.meeting_code,
            recording.title,
            recording.file_name,
            recording.file_path,
            recording.file_size_bytes,
            recording.duration_seconds,
            recording.mime_type,
            recording.status,
            createdAt,
          ]
        );
        saveDatabase();
      } catch {}
    }

    loadFallback();
    fallbackStorage.recordings.push(newRecording);
    saveFallback();
    return newRecording;
  },

  async getRecordings(meetingId?: string): Promise<RecordingRecord[]> {
    // 1. Try Python FastAPI Backend
    try {
      const url = meetingId ? `${FASTAPI_BASE}/recordings?meeting_id=${meetingId}` : `${FASTAPI_BASE}/recordings`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return data as RecordingRecord[];
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        const sql = meetingId
          ? 'SELECT * FROM recordings WHERE meeting_id = ? ORDER BY created_at DESC'
          : 'SELECT * FROM recordings ORDER BY created_at DESC';
        const res = db.exec(sql, meetingId ? [meetingId] : []);
        if (res.length > 0) {
          const { columns, values } = res[0];
          return values.map((row) => {
            const obj: any = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj as RecordingRecord;
          });
        }
      } catch {}
    }

    loadFallback();
    return meetingId
      ? fallbackStorage.recordings.filter((r) => r.meeting_id === meetingId)
      : fallbackStorage.recordings;
  },

  async createSharedFile(file: Omit<SharedFileRecord, 'id' | 'created_at'>): Promise<SharedFileRecord> {
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now());
    const createdAt = new Date().toISOString();
    const newFile: SharedFileRecord = {
      id,
      ...file,
      created_at: createdAt,
    };

    // 1. Try Python FastAPI Backend
    try {
      const res = await fetch(`${FASTAPI_BASE}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return data as SharedFileRecord;
      }
    } catch {}

    // 2. Fallback to SQLite WASM
    const db = await getDatabase();
    if (db) {
      try {
        db.run(
          `INSERT INTO shared_files (id, meeting_id, uploader_name, file_name, file_path, file_size_bytes, mime_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            file.meeting_id,
            file.uploader_name,
            file.file_name,
            file.file_path,
            file.file_size_bytes,
            file.mime_type,
            createdAt,
          ]
        );
        saveDatabase();
      } catch {}
    }

    loadFallback();
    fallbackStorage.sharedFiles.push(newFile);
    saveFallback();
    return newFile;
  },
};
