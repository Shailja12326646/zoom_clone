# Zoom Workplace Clone

A polished Zoom-style video conferencing workspace built with Next.js and Supabase.

## Included flows

- Dashboard with Home, Meetings, Chat, and More navigation
- Instant meeting creation with unique meeting IDs
- Join meetings by meeting ID
- Schedule meetings with title, date, time, and duration
- Upcoming and recent meeting views
- Meeting room with mute, camera, participant, chat, and end controls
- Persistent meetings and meeting chat messages
- Responsive desktop and mobile layouts

## Stack

- Next.js 13 App Router (Frontend)
- Python 3 with FastAPI and Uvicorn (Backend)
- SQLite database for persistent meeting, chat, recording, and file data
- React and TypeScript
- Tailwind CSS with custom responsive styling
- Lucide React for interface icons

## Running the Python FastAPI Backend

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
python backend/run.py
# Server runs at http://127.0.0.1:8000 (Interactive docs at http://127.0.0.1:8000/docs)
```

## Assumptions

This assignment uses a default shared workspace and does not require sign-in. Meeting and chat records are intentionally available to the shared demo user. Camera and microphone controls are presented as meeting-room controls; the browser permission prompt is not automatically requested because the workspace is designed to work without requiring device access.
