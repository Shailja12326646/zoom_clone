# Zoom Workplace Clone

A fullstack Zoom-style video conferencing workspace with real-time meeting controls, screen sharing, recording timer, chat, participant management, and SQLite database persistence. Built with **Next.js (React/TypeScript)** on the frontend and **Python (FastAPI)** on the backend.

---

## 🌐 Live Deployments

- **Frontend Application (Vercel):** [https://zoom-clone-six-xi.vercel.app/](https://zoom-clone-six-xi.vercel.app/)
- **Backend API (Render):** [https://zoom-clone-vpmw.onrender.com/](https://zoom-clone-vpmw.onrender.com/)
- **Interactive API Documentation (Swagger):** [https://zoom-clone-vpmw.onrender.com/docs](https://zoom-clone-vpmw.onrender.com/docs)
- **GitHub Repository:** [https://github.com/Shailja12326646/zoom_clone](https://github.com/Shailja12326646/zoom_clone)

---

## ✨ Features & Included Flows

### 1. Home Dashboard
- **Live Clock & Date:** Real-time digital clock and localized date formatting.
- **Quick Action Buttons:** Clean vertical stack layout for **New Meeting**, **Join**, and **Schedule**.
- **Instant Meeting Search:** Search input in the top bar with placeholder `"Search Ctrl+K"` that dynamically filters upcoming scheduled meetings by title or meeting ID in real time.
- **Upcoming & Recent Meetings:** Tabular meeting schedule view and recent instant meeting quick-access cards.

### 2. Meeting Lifecycle & WebRTC Controls
- **Instant & Scheduled Meetings:** Generate standard 9-digit unique meeting codes (`000 000 000`).
- **Hardware-Accurate Device Toggles:**
  - **Camera (Video/Stop Video):** Fully shuts down camera hardware sensor and indicator when video is turned off.
  - **Microphone (Mute/Unmute):** Real-time track audio gating and live state synchronization.
  - **Screen Sharing:** Recursion-free screen sharing with monitor selection and floating picture-in-picture camera overlay.

### 3. Recording System
- **Three-Dot More Menu:** Accessible bottom-bar recording trigger.
- **Live Header Status Bar:**
  - Pulsing recording indicator dot (red when recording, amber when paused).
  - Live duration timer (`mm:ss`).
  - Pause / Resume and Stop recording controls.
- **Persistent Recording Metadata:** Automatically logs meeting recording records (duration, file size, format) into SQLite.

### 4. Participants Management & Dialogs
- **Live State Indicators:** Reflects attendees' microphone and camera states with interactive controls.
- **Invite Dialog:**
  - Meeting link with one-click **Copy** button.
  - Meeting ID with one-click **Copy** button.
  - One-click **Send Email Invitation** button (`mailto:`).
- **Mute All Confirmation:**
  - Dialog heading: *"Mute all current and new participants"*.
  - Checkbox: *"Allow participants to unmute themselves"*.
  - Action buttons: *Cancel* and blue *Continue*.
- **Click Feedback:** Blue outline focus states on participant action buttons.

### 5. Meeting Chat
- Real-time in-meeting chat sidebar with persistent messaging history tied to the meeting ID.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 13 (App Router)
- **Library:** React 18 & TypeScript
- **Styling:** Tailwind CSS with custom responsive layout and theme tokens
- **Icons:** Lucide React
- **Client Storage:** WebAssembly SQLite (`sql.js`) with persistent fail-safe local fallback

### Backend
- **Framework:** Python 3 with FastAPI
- **ASGI Server:** Uvicorn
- **Validation & Serialization:** Pydantic v2
- **Middleware:** CORS Middleware (configured for multi-origin communication)

### Database
- **Engine:** SQLite 3 (relational database with foreign key constraints and indexed queries)
- **Tables:** `meetings`, `messages`, `recordings`, `shared_files`

---

## 🗄️ Database Schema

The database schema is defined in [`lib/schema.sqlite.sql`](lib/schema.sqlite.sql) and managed in Python by [`backend/database.py`](backend/database.py):

```sql
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
```

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- **Node.js:** v18.0 or higher
- **Python:** v3.10 or higher
- **Git**

### Step 1: Clone Repository
```bash
git clone https://github.com/Shailja12326646/zoom_clone.git
cd zoom_clone
```

### Step 2: Set Up & Run Backend (Python FastAPI)
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
python backend/run.py
```
- API Server runs at: `http://127.0.0.1:8000`
- Interactive Swagger API docs: `http://127.0.0.1:8000/docs`

### Step 3: Set Up & Run Frontend (Next.js)
Open a new terminal window:
```bash
# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
- Frontend application runs at: `http://localhost:3000`

---

## 🧪 Automated Testing

An automated test suite is provided to verify the backend API endpoints and SQLite database operations:

```bash
python backend/test_api.py
```

### Test Suite Covers:
- `GET /api/health` — Health check endpoint
- `POST /api/meetings` & `GET /api/meetings` — Meeting creation and listing
- `POST /api/messages` & `GET /api/messages/{id}` — Real-time messaging
- `POST /api/recordings` & `GET /api/recordings` — Meeting recordings persistence
- `POST /api/files` & `GET /api/files` — Shared files management

---

## 📦 Deployment

### Option 1: Render (1-Click Fullstack Blueprint)
1. Open [https://dashboard.render.com/blueprints/new](https://dashboard.render.com/blueprints/new).
2. Connect the repository `https://github.com/Shailja12326646/zoom_clone`.
3. Render automatically provisions both the Python FastAPI backend and Next.js frontend according to [`render.yaml`](render.yaml).

### Option 2: Vercel (Frontend) + Render (Backend)
1. **Backend (Render):** Deploy as a Web Service running `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
2. **Frontend (Vercel):** Import the GitHub repo on Vercel. Set `NEXT_PUBLIC_API_URL` to your backend URL (e.g. `https://zoom-clone-vpmw.onrender.com/api`).

### Option 3: Docker Compose
```bash
docker-compose up --build
```

---

## 📌 Assumptions Made

1. **Shared Demo Workspace (No Login Required):**
   - The workspace operates as a shared demo environment without mandatory user sign-in.
   - Meeting codes are unique and shareable across attendees to facilitate instant joining.

2. **Hardware Camera & Microphone Permissions:**
   - The permission prompt is presented inside the application before joining rather than forcing intrusive browser prompts upfront.
   - Turning off video explicitly stops camera tracks (`track.stop()`) to turn off hardware sensor lights and browser recording indicators.

3. **Cold-Start Resilience:**
   - Free cloud tiers (such as Render) experience cold starts (~30–50 seconds to spin up).
   - The frontend is designed with a dual-layer architecture: it immediately pings the backend on load while utilizing client-side SQLite/persistent storage. The UI remains responsive with zero lag or crashes even during backend wake-up.

4. **Screen Share Recursion Prevention:**
   - Uses containerized display surface constraints (`monitor` / `exclude`) to avoid infinite mirror loops during screen share.

---

## 📄 License

This project is licensed under the MIT License.
