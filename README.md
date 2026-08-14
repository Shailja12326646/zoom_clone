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

- Next.js 13 App Router
- React and TypeScript
- Tailwind CSS with custom responsive styling
- SQLite for persistent meeting, chat, recording, and file data
- Lucide React for interface icons

## Assumptions

This assignment uses a default shared workspace and does not require sign-in. Meeting and chat records are intentionally available to the shared demo user. Camera and microphone controls are presented as meeting-room controls; the browser permission prompt is not automatically requested because the workspace is designed to work without requiring device access.
