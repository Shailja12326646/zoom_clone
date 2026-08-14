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

## Running Locally

```bash
# 1. Start Python FastAPI Backend (Terminal 1)
pip install -r backend/requirements.txt
python backend/run.py
# Backend runs at http://127.0.0.1:8000 (Swagger docs at http://127.0.0.1:8000/docs)

# 2. Start Next.js Frontend (Terminal 2)
npm install
npm run dev
# Frontend runs at http://localhost:3000
```

## Deployment Guide

### Option 1: Render (1-Click Fullstack Deploy)
1. Go to [https://dashboard.render.com/blueprints/new](https://dashboard.render.com/blueprints/new)
2. Connect your GitHub repository: `https://github.com/Shailja12326646/zoom_clone`
3. Render will automatically detect `render.yaml` and deploy both the **Python FastAPI Backend** and the **Next.js Frontend** web services simultaneously with zero extra configuration.

### Option 2: Vercel (Frontend) + Render / Railway (Backend)
1. **Deploy Backend (FastAPI):**
   - Go to [https://render.com](https://render.com) or [https://railway.app](https://railway.app).
   - Create a new Web Service from your repository `https://github.com/Shailja12326646/zoom_clone`.
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Copy your public backend URL (e.g., `https://zoom-backend.onrender.com`).

2. **Deploy Frontend (Next.js):**
   - Go to [https://vercel.com/new](https://vercel.com/new).
   - Import your repository: `https://github.com/Shailja12326646/zoom_clone`.
   - Add Environment Variable:
     - `NEXT_PUBLIC_API_URL` = `https://zoom-backend.onrender.com/api`
   - Click **Deploy**.

### Option 3: Docker Compose
```bash
docker-compose up --build
```

## Assumptions

This assignment uses a default shared workspace and does not require sign-in. Meeting and chat records are intentionally available to the shared demo user. Camera and microphone controls are presented as meeting-room controls; the browser permission prompt is not automatically requested because the workspace is designed to work without requiring device access.
