'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sqliteDb } from '@/lib/sqlite-db';
import { CalendarDays, Camera, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, Grid2X2, Heart, Home as HomeIcon, Info, Link2, Mail, MessageSquare, Mic, MicOff, MoreHorizontal, Pause, Play, Paperclip, Phone, Plus, Search, Settings, ShieldCheck, Square, Users, Video, VideoOff, X } from 'lucide-react';

type Meeting = { id: string; meeting_id: string; title: string; description: string; scheduled_at: string | null; duration_minutes: number; status: 'instant' | 'scheduled'; created_at: string };
type Message = { id: string; sender_name: string; body: string; created_at: string };

const colors = ['#5b32b4', '#0d8a72', '#ce6d28', '#1877c9'];
const fallbackMeetings: Meeting[] = [];

function makeMeetingCode() { return `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`; }

async function copyText(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.style.position = 'fixed';
    helper.style.top = '0';
    helper.style.left = '0';
    helper.style.opacity = '0';
    helper.setAttribute('readonly', '');
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(helper);
    return successful;
  } catch {
    return false;
  }
}

function formatDate(date: string | null) { return date ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date)) : 'Instant meeting'; }

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>(fallbackMeetings);
  const [view, setView] = useState<'home' | 'meetings' | 'meeting'>('home');
  const [clock, setClock] = useState<Date>(new Date());
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [joining, setJoining] = useState(false);
  const [dialog, setDialog] = useState<'join' | 'schedule' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('Shailja Kumari');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('60');
  const [panel, setPanel] = useState<'participants' | 'chat' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    void loadMeetings();
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadMeetings() {
    try {
      const data = await sqliteDb.getMeetings();
      if (data && data.length > 0) setMeetings(data as Meeting[]);
    } catch (err) {
      console.error('Failed to load meetings from SQLite', err);
    }
  }

  async function createMeeting(scheduledAt: string | null = null) {
    const meetingPayload = {
      meeting_id: makeMeetingCode(),
      title: scheduledAt ? (scheduleTitle || 'Team sync') : 'My Personal Meeting Room',
      description: scheduledAt ? scheduleDescription : '',
      scheduled_at: scheduledAt,
      duration_minutes: Number(scheduleDuration),
      status: (scheduledAt ? 'scheduled' : 'instant') as 'instant' | 'scheduled',
    };
    try {
      const created = await sqliteDb.createMeeting(meetingPayload);
      setMeetings((items) => [created as Meeting, ...items]);
      setDialog(null);
      setScheduleTitle('');
      setScheduleDescription('');
      setScheduleDate('');
      if (!scheduledAt) {
        enterMeeting(created as Meeting);
      }
    } catch (err) {
      console.error('Failed to create meeting in SQLite', err);
    }
  }

  function enterMeeting(meeting: Meeting) { setActiveMeeting(meeting); setView('meeting'); setJoining(true); }

  function joinMeeting() {
    const found = meetings.find((item) => item.meeting_id.replaceAll(' ', '') === joinCode.replaceAll(' ', ''));
    if (!found) {
      setNotice('We couldn’t find that meeting ID. Check the number and try again.');
      return;
    }
    enterMeeting(found);
    setDialog(null);
    setNotice('');
  }

  async function openMeeting(meeting: Meeting) {
    enterMeeting(meeting);
    try {
      const data = await sqliteDb.getMessages(meeting.id);
      if (data) setMessages(data as Message[]);
    } catch (err) {
      console.error('Failed to load messages from SQLite', err);
    }
  }

  async function sendMessage() {
    if (!messageText.trim() || !activeMeeting) return;
    try {
      const data = await sqliteDb.createMessage({
        meeting_id: activeMeeting.id,
        sender_name: name,
        body: messageText.trim(),
      });
      if (data) setMessages((items) => [...items, data as Message]);
      setMessageText('');
    } catch (err) {
      console.error('Failed to save message in SQLite', err);
    }
  }

  const filteredUpcoming = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = meetings.filter((item) => item.status === 'scheduled');
    if (!q) return list;
    return list.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.meeting_id.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  }, [meetings, searchQuery]);

  if (view === 'meeting' && activeMeeting && joining) return <JoiningScreen onDone={() => setJoining(false)} />;
  if (view === 'meeting' && activeMeeting) return <MeetingRoom meeting={activeMeeting} name={name} isHost={activeMeeting.status === 'instant'} panel={panel} setPanel={setPanel} messages={messages} messageText={messageText} setMessageText={setMessageText} sendMessage={sendMessage} leave={() => { setView('home'); setPanel(null); }} />;
  if (view === 'meetings') return <><Header searchQuery={searchQuery} onSearchChange={setSearchQuery} /><aside className="sidebar"><div className="brand"><span>zoom</span><b>Workplace</b></div><NavItem icon={<HomeIcon size={18} />} label="Home" onClick={() => setView('home')} /><NavItem active icon={<Video size={18} />} label="Meetings" /><NavItem icon={<MessageSquare size={18} />} label="Chat" /><button className="side-settings"><Settings size={18} /></button></aside><MeetingsView meetings={meetings} onStart={enterMeeting} onCopy={async (meeting) => { await copyText(meeting.meeting_id); setNotice(`Meeting ID ${meeting.meeting_id} copied to clipboard.`); }} notice={notice} onClearNotice={() => setNotice('')} /></>;

  return <main className="zoom-shell">
    <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
    <aside className="sidebar"><div className="brand"><span>zoom</span><b>Workplace</b></div><NavItem active icon={<HomeIcon size={18} />} label="Home" onClick={() => setView('home')} /><NavItem icon={<Video size={18} />} label="Meetings" onClick={() => setView('meetings')} /><NavItem icon={<MessageSquare size={18} />} label="Chat" /><button className="side-settings"><Settings size={18} /></button></aside>
    <section className="workspace">
      <div className="clock-block">
        <h1 suppressHydrationWarning>{mounted ? clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</h1>
        <p suppressHydrationWarning>{mounted ? clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}</p>
      </div>
      <div className="quick-actions">
        <Action icon={<Video size={27} />} label="New meeting" tone="orange" onClick={() => void createMeeting()} />
        <Action icon={<Plus size={28} />} label="Join" tone="blue" onClick={() => setDialog('join')} />
        <Action icon={<CalendarDays size={26} />} label="Schedule" tone="blue" onClick={() => setDialog('schedule')} />
      </div>
      {notice && <div className="notice"><Info size={17} /> {notice}<button onClick={() => setNotice('')}><X size={15} /></button></div>}
      <div className="info-banner"><Info size={18} /><span>You can now manage your meetings, chat, and contacts all in one place.</span><button>Learn more</button></div>
      <div className="section-heading"><div><h2>Upcoming meetings</h2><p className="subtle">Your next scheduled conversations</p></div></div>
      <div className="meetings-card">
        {filteredUpcoming.length === 0 ? (
          searchQuery.trim() ? (
            <div className="empty">
              <div className="empty-art"><Search size={30} /></div>
              <b>No matching meetings found</b>
              <span>No upcoming meetings match &quot;{searchQuery}&quot;.</span>
            </div>
          ) : (
            <EmptyMeetings onClick={() => setDialog('schedule')} />
          )
        ) : (
          filteredUpcoming.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onOpen={() => void openMeeting(meeting)} />
          ))
        )}
      </div>
      <div className="section-heading recent"><div><h2>Recent meetings</h2><p className="subtle">Jump back into a previous room</p></div><button className="text-button" onClick={() => setView('meetings')}>View all <ChevronRight size={16} /></button></div>
      <div className="recent-grid">{meetings.filter((item) => item.status === 'instant').slice(0, 3).map((meeting, i) => <button className="recent-card" key={meeting.id} onClick={() => void openMeeting(meeting)}><span className="recent-icon" style={{ background: colors[i % colors.length] }}><Video size={19} /></span><span><b>{meeting.title}</b><small>{meeting.meeting_id}</small></span><ChevronRight size={17} /></button>)}</div>
    </section>
    {dialog === 'join' && <Dialog title="Join a meeting" onClose={() => setDialog(null)}><p className="dialog-copy">Enter the meeting ID or personal link shared with you.</p><label>Meeting ID<input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="000 000 000" autoFocus /></label><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label><button className="primary-button full" onClick={joinMeeting}>Join meeting</button></Dialog>}
    {dialog === 'schedule' && <Dialog title="Schedule a meeting" onClose={() => setDialog(null)}><p className="dialog-copy">Plan ahead and send a shareable invite to your team.</p><label>Meeting title<input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} placeholder="e.g. Weekly team sync" /></label><label>Description<textarea className="dialog-textarea" value={scheduleDescription} onChange={(event) => setScheduleDescription(event.target.value)} placeholder="Add a note for attendees" /></label><label>Date and time<input type="datetime-local" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /></label><label>Duration<select value={scheduleDuration} onChange={(event) => setScheduleDuration(event.target.value)}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></label><button className="primary-button full" disabled={!scheduleDate} onClick={() => void createMeeting(new Date(scheduleDate).toISOString())}>Save meeting</button></Dialog>}
  </main>;
}

function Header({ searchQuery, onSearchChange }: { searchQuery?: string; onSearchChange?: (val: string) => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><span>zoom</span><b>Workplace</b></div>
      <div className="history"><ChevronLeft size={16} /><ChevronRight size={16} /><span>◷</span></div>
      <div className="search">
        <Search size={17} />
        <input
          type="text"
          value={searchQuery ?? ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search Ctrl+K"
          className="search-input"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange?.('')} style={{ color: '#718096', padding: 2, display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        )}
      </div>
      <button className="upgrade">Upgrade</button>
      <div className="top-avatar">S<i /></div>
    </header>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function Action({ icon, label, tone, onClick }: { icon: React.ReactNode; label: string; tone: string; onClick: () => void }) {
  return (
    <button className="action" onClick={onClick}>
      <span className={`action-icon ${tone}`}>{icon}</span>
      <span className="action-label">
        {label}
        {label === 'New meeting' && <ChevronDown size={14} />}
      </span>
    </button>
  );
}
function EmptyMeetings({ onClick }: { onClick: () => void }) { return <div className="empty"><div className="empty-art"><CalendarDays size={30} /></div><b>No meetings scheduled</b><span>Your calendar is clear. Schedule your next meeting when you’re ready.</span><button className="primary-button" onClick={onClick}><Plus size={16} /> Schedule a meeting</button></div>; }
function MeetingRow({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) { return <div className="meeting-row"><div className="date-box"><b>{meeting.scheduled_at ? new Date(meeting.scheduled_at).getDate() : '--'}</b><span>{meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleDateString('en-US', { month: 'short' }) : 'NOW'}</span></div><div className="meeting-details"><b>{meeting.title}</b><span>{formatDate(meeting.scheduled_at)} · {meeting.duration_minutes} min</span><small>{meeting.meeting_id}</small></div><button className="join-small" onClick={onOpen}>Start</button></div>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop"><div className="dialog"><div className="dialog-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={19} /></button></div>{children}</div></div>; }

type Participant = { name: string; isHost: boolean; muted: boolean; videoOff: boolean };
const reactionEmojis = ['👍', '❤️', '😂', '🎉', '👏', '😮'];
function JoiningScreen({ onDone }: { onDone: () => void }) { useEffect(() => { const timer = window.setTimeout(onDone, 900); return () => window.clearTimeout(timer); }, [onDone]); return <main className="meeting-shell joining-screen"><div className="joining-card"><div className="joining-spinner" /><h2>Joining meeting</h2><p>Getting everything ready for you...</p></div></main>; }

function MeetingRoom({ meeting, name, isHost, panel, setPanel, messages, messageText, setMessageText, sendMessage, leave }: { meeting: Meeting; name: string; isHost: boolean; panel: 'participants' | 'chat' | null; setPanel: (value: 'participants' | 'chat' | null) => void; messages: Message[]; messageText: string; setMessageText: (value: string) => void; sendMessage: () => Promise<void>; leave: () => void }) {
  const [muted, setMuted] = useState(true);
  const [videoOff, setVideoOff] = useState(true);
  const [permissionPending, setPermissionPending] = useState(true);
  const [permissionError, setPermissionError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMuteAllDialog, setShowMuteAllDialog] = useState(false);
  const [allowUnmute, setAllowUnmute] = useState(true);
  const [showEnd, setShowEnd] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const reactionId = useRef(0);

  const participants: Participant[] = useMemo(() => [{ name, isHost, muted, videoOff: videoOff && !sharing }], [name, isHost, muted, videoOff, sharing]);

  // Handle recording timer
  useEffect(() => {
    let interval: number | null = null;
    if (recording && !recordingPaused) {
      interval = window.setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [recording, recordingPaused]);

  function formatDuration(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function startRecording() {
    setRecording(true);
    setRecordingPaused(false);
    setShowMoreMenu(false);
  }

  function togglePauseRecording() {
    setRecordingPaused((prev) => !prev);
  }

  async function stopRecording() {
    setRecording(false);
    setRecordingPaused(false);
    if (recordingSeconds > 0) {
      try {
        await sqliteDb.createRecording({
          meeting_id: meeting.id,
          meeting_code: meeting.meeting_id,
          title: `${meeting.title} - Recording`,
          file_name: `recording-${meeting.meeting_id.replaceAll(' ', '')}-${Date.now()}.webm`,
          file_path: `/recordings/${meeting.meeting_id.replaceAll(' ', '')}/recording.webm`,
          file_size_bytes: recordingSeconds * 250000,
          duration_seconds: recordingSeconds,
          mime_type: 'video/webm',
          status: 'completed',
        });
      } catch (err) {
        console.error('Failed to save recording to SQLite', err);
      }
    }
    setRecordingSeconds(0);
  }

  // Synchronize video element srcObjects whenever video state, sharing, or stream changes
  useEffect(() => {
    if (sharing && screenVideoRef.current && screenStreamRef.current) {
      if (screenVideoRef.current.srcObject !== screenStreamRef.current) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
      }
      screenVideoRef.current.play().catch(() => {});
    }

    if (!sharing && !videoOff && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }

    if (sharing && !videoOff && pipVideoRef.current && mediaStreamRef.current) {
      if (pipVideoRef.current.srcObject !== mediaStreamRef.current) {
        pipVideoRef.current.srcObject = mediaStreamRef.current;
      }
      pipVideoRef.current.play().catch(() => {});
    }
  }, [videoOff, sharing, activeStream]);

  // Cleanup all media tracks on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function enableDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      stream.getVideoTracks().forEach((track) => { track.enabled = true; });
      setActiveStream(stream);
      setVideoOff(false);
      setMuted(true);
      setPermissionPending(false);
      setPermissionError('');
    } catch {
      setPermissionError('Camera and microphone access was not granted. You can continue with both turned off.');
    }
  }

  function continueWithoutDevices() {
    setPermissionPending(false);
    setPermissionError('');
  }

  async function toggleVideo() {
    if (!videoOff) {
      setVideoOff(true);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
          mediaStreamRef.current?.removeTrack(track);
        });
      }
      if (videoRef.current && !sharing) {
        videoRef.current.srcObject = null;
      }
      if (!sharing) {
        setActiveStream(null);
      }
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          mediaStreamRef.current?.removeTrack(t);
        });
        mediaStreamRef.current.addTrack(newVideoTrack);
      } else {
        mediaStreamRef.current = newStream;
      }

      setActiveStream(mediaStreamRef.current);
      setVideoOff(false);
    } catch (err) {
      console.error('Failed to access camera:', err);
      setVideoOff(true);
    }
  }

  async function toggleMic() {
    if (!muted) {
      setMuted(true);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      return;
    }

    try {
      if (mediaStreamRef.current && mediaStreamRef.current.getAudioTracks().length > 0) {
        const track = mediaStreamRef.current.getAudioTracks()[0];
        if (track.readyState === 'live') {
          track.enabled = true;
          setMuted(false);
          return;
        }
      }

      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newAudioTrack = newStream.getAudioTracks()[0];

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => {
          t.stop();
          mediaStreamRef.current?.removeTrack(t);
        });
        mediaStreamRef.addTrack?.(newAudioTrack) ?? mediaStreamRef.current.addTrack(newAudioTrack);
      } else {
        mediaStreamRef.current = newStream;
      }

      setMuted(false);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      setMuted(true);
    }
  }

  async function toggleShare() {
    if (sharing) {
      stopShare();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        systemAudio: 'exclude',
      } as any);

      screenStreamRef.current = stream;
      const screenTrack = stream.getVideoTracks()[0];
      screenTrack.onended = () => {
        stopShare();
      };
      setActiveStream(stream);
      setSharing(true);
    } catch (err) {
      console.error('Screen sharing error/cancelled:', err);
      setSharing(false);
    }
  }

  function stopShare() {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setSharing(false);
    if (mediaStreamRef.current && !videoOff) {
      setActiveStream(mediaStreamRef.current);
    } else {
      setActiveStream(null);
    }
  }

  function sendReaction(emoji: string) { const id = reactionId.current++; setReactions((items) => [...items, { id, emoji }]); window.setTimeout(() => setReactions((items) => items.filter((item) => item.id !== id)), 3000); setShowReactions(false); }
  function muteAll() {
    setMuted(true);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = false; });
    }
  }
  function inviteLink() { return `${typeof window !== 'undefined' ? window.location.origin : ''}/join?mid=${meeting.meeting_id.replaceAll(' ', '')}`; }
  function copyInvite() { void copyText(inviteLink()); }
  function renderPermission() { if (!permissionPending) return null; return <div className="permission-modal"><div className="permission-illustration"><Video size={46} /><Mic size={28} /></div><h2>Do you want people to see you in the meeting?</h2><p>You can still turn off your microphone and camera anytime in the meeting</p>{permissionError && <div className="permission-error">{permissionError}</div>}<button className="primary-button permission-button" onClick={() => void enableDevices()}><Video size={17} /> Use microphone and camera</button><button className="permission-link" onClick={continueWithoutDevices}>Continue without microphone and camera</button></div>; }

  function handleLeave() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    leave();
  }

  return <main className="meeting-shell">
    <div className="meeting-top">
      <div className="room-title"><Info size={15} /> {meeting.title} <span className="secure"><ShieldCheck size={14} /></span></div>
      <div className="room-tools">
        {recording ? (
          <div className="rec-status-bar">
            <span className={`rec-pulse ${recordingPaused ? 'paused' : ''}`} />
            <span className="rec-timer-txt">{formatDuration(recordingSeconds)}</span>
            <button className="top-tool-btn" title={recordingPaused ? 'Resume Recording' : 'Pause Recording'} onClick={togglePauseRecording}>
              {recordingPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />}
            </button>
            <button className="top-tool-btn stop-btn" title="Stop Recording" onClick={stopRecording}>
              <Square size={12} fill="currentColor" />
            </button>
          </div>
        ) : (
          <>
            <span>▣</span>
            <span>◉</span>
          </>
        )}
        <div className="top-avatar">S</div>
      </div>
    </div>
    <div className={`stage ${panel ? 'with-panel' : ''}`}>
      <div className="reactions-overlay">{reactions.map((r) => <span key={r.id} className="reaction-float">{r.emoji}</span>)}</div>
      <div className="participant-tile">
        {sharing ? (
          <div className="sharing-container">
            <div className="sharing-banner"><Grid2X2 size={15} /> You are sharing your screen</div>
            <div className="sharing-screen-box">
              <video ref={screenVideoRef} autoPlay playsInline muted className="sharing-video" />
            </div>
            {!videoOff && (
              <div className="pip-camera">
                <video ref={pipVideoRef} autoPlay playsInline muted />
              </div>
            )}
          </div>
        ) : videoOff ? (
          <div className="big-avatar">S</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="self-video" />
        )}
        <span className="name-tag">{muted && <MicOff size={13} />} {name} {isHost && '(Host)'}</span>
      </div>
      {renderPermission()}
      <div className="bottom-bar">
        <Control icon={muted ? <MicOff size={21} /> : <Mic size={21} />} label={muted ? 'Unmute' : 'Mute'} off={muted} onClick={toggleMic} />
        <Control icon={videoOff ? <VideoOff size={21} /> : <Camera size={21} />} label={videoOff ? 'Start Video' : 'Stop Video'} off={videoOff} onClick={toggleVideo} />
        <Control icon={<Grid2X2 size={21} />} label="Share Screen" active={sharing} onClick={toggleShare} />
        <Control icon={<Users size={21} />} label="Participants" onClick={() => setPanel(panel === 'participants' ? null : 'participants')} active={panel === 'participants'} />
        <Control icon={<MessageSquare size={21} />} label="Chat" onClick={() => setPanel(panel === 'chat' ? null : 'chat')} active={panel === 'chat'} />
        <div className="reaction-wrap">
          <Control icon={<Heart size={21} />} label="React" active={showReactions} onClick={() => { setShowReactions(!showReactions); setShowMoreMenu(false); }} />
          {showReactions && (
            <div className="reaction-picker">
              {reactionEmojis.map((emoji) => (
                <button key={emoji} onClick={() => sendReaction(emoji)}>{emoji}</button>
              ))}
            </div>
          )}
        </div>
        <div className="more-menu-wrap">
          <Control
            icon={<MoreHorizontal size={21} />}
            label="More"
            active={showMoreMenu || recording}
            onClick={() => { setShowMoreMenu(!showMoreMenu); setShowReactions(false); }}
          />
          {showMoreMenu && (
            <div className="more-popup">
              {!recording ? (
                <button className="more-menu-item" onClick={startRecording}>
                  <span className="record-dot">●</span>
                  <span>Record meeting</span>
                </button>
              ) : (
                <>
                  <button className="more-menu-item" onClick={togglePauseRecording}>
                    {recordingPaused ? <Play size={15} /> : <Pause size={15} />}
                    <span>{recordingPaused ? 'Resume Recording' : 'Pause Recording'}</span>
                  </button>
                  <button className="more-menu-item" onClick={stopRecording}>
                    <Square size={15} />
                    <span>Stop Recording</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button className="end-button" onClick={() => setShowEnd(true)}><Phone size={19} /> End</button>
      </div>
    </div>
    {panel === 'participants' && (
      <ParticipantsPanel
        participants={participants}
        onClose={() => setPanel(null)}
        onMuteAll={() => setShowMuteAllDialog(true)}
        onInvite={() => setShowInvite(true)}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
      />
    )}
    {panel === 'chat' && <Chat onClose={() => setPanel(null)} messages={messages} messageText={messageText} setMessageText={setMessageText} sendMessage={sendMessage} />}
    {showInvite && (
      <Dialog title="Invite people to join" onClose={() => setShowInvite(false)}>
        <p className="dialog-copy">Share this meeting link or ID with anyone you want to join.</p>
        <label>Meeting link</label>
        <div className="invite-link">
          <Link2 size={16} />
          <input readOnly value={inviteLink()} />
          <button className="primary-button" onClick={copyInvite}><Copy size={15} /> Copy</button>
        </div>
        <label>Meeting ID</label>
        <div className="invite-link">
          <input readOnly value={meeting.meeting_id} />
          <button className="primary-button" onClick={() => void copyText(meeting.meeting_id)}><Copy size={15} /> Copy</button>
        </div>
        <a
          className="email-button"
          href={`mailto:?subject=${encodeURIComponent(`Zoom Meeting: ${meeting.title}`)}&body=${encodeURIComponent(`Hi,\n\nPlease join my Zoom meeting.\n\nMeeting link: ${inviteLink()}\nMeeting ID: ${meeting.meeting_id}\n\nThanks!`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Mail size={16} /> Send Email Invitation
        </a>
      </Dialog>
    )}
    {showMuteAllDialog && (
      <Dialog title="Mute all current and new participants" onClose={() => setShowMuteAllDialog(false)}>
        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
            <input
              type="checkbox"
              checked={allowUnmute}
              onChange={(e) => setAllowUnmute(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Allow participants to unmute themselves
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button className="dialog-cancel-btn" onClick={() => setShowMuteAllDialog(false)}>
            Cancel
          </button>
          <button className="primary-button" style={{ margin: 0, padding: '9px 18px' }} onClick={() => { muteAll(); setShowMuteAllDialog(false); }}>
            Continue
          </button>
        </div>
      </Dialog>
    )}
    {showEnd && <Dialog title={isHost ? 'End this meeting?' : 'Leave this meeting?'} onClose={() => setShowEnd(false)}><p className="dialog-copy">{isHost ? 'As the host, you can end the meeting for everyone or just leave the room.' : 'You will leave the meeting. Others can continue without you.'}</p>{isHost && <button className="end-all-button full" onClick={handleLeave}><Phone size={16} /> End Meeting For All</button>}<button className="leave-button full" onClick={handleLeave}>Leave meeting</button></Dialog>}
  </main>;
}

function Control({ icon, label, off, active, onClick }: { icon: React.ReactNode; label: string; off?: boolean; active?: boolean; onClick?: () => void }) { return <button className={`control ${active ? 'active' : ''}`} onClick={onClick}><span className={off ? 'control-off' : ''}>{icon}</span><small>{label}</small></button>; }
function PanelHead({ title, onClose }: { title: string; onClose: () => void }) { return <div className="panel-head"><b>{title}</b><div><Grid2X2 size={17} /><X size={19} onClick={onClose} /></div></div>; }
function ParticipantsPanel({
  participants,
  onClose,
  onMuteAll,
  onInvite,
  onToggleMic,
  onToggleVideo,
}: {
  participants: Participant[];
  onClose: () => void;
  onMuteAll: () => void;
  onInvite: () => void;
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
}) {
  const [clickedBtn, setClickedBtn] = useState<string | null>(null);

  const handleClick = (name: string, callback: () => void) => {
    setClickedBtn(name);
    callback();
    window.setTimeout(() => setClickedBtn((curr) => (curr === name ? null : curr)), 500);
  };

  return (
    <aside className="meeting-panel">
      <PanelHead title={`Participants (${participants.length})`} onClose={onClose} />
      <div className="people">
        {participants.map((p, i) => (
          <div className="person" key={i}>
            <span className="small-avatar" style={{ background: colors[i % colors.length] }}>
              {p.name[0]}
            </span>
            <span>
              {p.name} {p.isHost && <small>(Host, me)</small>}
            </span>
            <div className="person-icons">
              <button
                style={{ color: p.muted ? '#ef4051' : '#18dc84', padding: 2 }}
                title={p.muted ? 'Unmute' : 'Mute'}
                onClick={p.isHost ? onToggleMic : undefined}
              >
                {p.muted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                style={{ color: p.videoOff ? '#ef4051' : '#18dc84', padding: 2 }}
                title={p.videoOff ? 'Start Video' : 'Stop Video'}
                onClick={p.isHost ? onToggleVideo : undefined}
              >
                {p.videoOff ? <VideoOff size={16} /> : <Video size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="panel-actions">
        <button
          className={clickedBtn === 'invite' ? 'clicked' : ''}
          onClick={() => handleClick('invite', onInvite)}
        >
          Invite
        </button>
        <button
          className={clickedBtn === 'muteAll' ? 'clicked' : ''}
          onClick={() => handleClick('muteAll', onMuteAll)}
        >
          Mute All
        </button>
        <button
          className={clickedBtn === 'more' ? 'clicked' : ''}
          onClick={() => handleClick('more', () => {})}
        >
          More
        </button>
      </div>
    </aside>
  );
}
function Chat({ onClose, messages, messageText, setMessageText, sendMessage }: { onClose: () => void; messages: Message[]; messageText: string; setMessageText: (value: string) => void; sendMessage: () => Promise<void> }) { return <aside className="meeting-panel chat-panel"><PanelHead title="Meeting Chat" onClose={onClose} /><div className="chat-messages">{messages.length === 0 ? <span className="chat-empty">Messages sent here are visible to everyone in the meeting.</span> : messages.map((message) => <div className="chat-message" key={message.id}><b>{message.sender_name}</b><span>{message.body}</span></div>)}</div><div className="chat-composer"><span>To: <b>Everyone</b></span><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Type message here ..." /><div><Paperclip size={16} /><FileText size={16} /><button onClick={() => void sendMessage()}><ChevronRight size={18} /></button></div></div></aside>; }
function MeetingsView({ meetings, onStart, onCopy, notice, onClearNotice }: { meetings: Meeting[]; onStart: (meeting: Meeting) => void; onCopy: (meeting: Meeting) => void; notice?: string; onClearNotice?: () => void }) {
  const upcoming = meetings.filter((m) => m.status === 'scheduled');
  const previous = meetings.filter((m) => m.status === 'instant');
  return <section className="workspace meetings-view">
    <div className="section-heading"><div><h1>Meetings</h1><p className="subtle">All your scheduled and recent meetings in one place</p></div></div>
    {notice && <div className="notice" style={{ maxWidth: '780px', margin: '0 auto 20px' }}><Info size={17} /> {notice}<button onClick={onClearNotice}><X size={15} /></button></div>}
    <div className="meetings-list">
      <div className="ml-section">
        <h2>Upcoming Meetings</h2>
        {upcoming.length === 0 ? <div className="ml-empty">No upcoming meetings. Schedule one from the Home tab.</div> : upcoming.map((m) => <div className="ml-row" key={m.id}><div className="ml-info"><b>{m.title}</b><span>{formatDate(m.scheduled_at)} · {m.duration_minutes} min</span>{m.description && <small>{m.description}</small>}<small>Meeting ID: {m.meeting_id}</small></div><div className="ml-actions"><button className="join-small" onClick={() => onStart(m)}>Start</button><button className="icon-button" title="Copy Meeting ID" onClick={() => onCopy(m)}><Copy size={16} /></button></div></div>)}
      </div>
      <div className="ml-section">
        <h2>Previous Meetings</h2>
        {previous.length === 0 ? <div className="ml-empty">No previous meetings yet.</div> : previous.map((m) => <div className="ml-row" key={m.id}><div className="ml-info"><b>{m.title}</b><span>{formatDate(m.scheduled_at)}</span><small>Meeting ID: {m.meeting_id}</small></div><div className="ml-actions"><button className="join-small" onClick={() => onStart(m)}>Start</button><button className="icon-button" title="Copy Meeting ID" onClick={() => onCopy(m)}><Copy size={16} /></button></div></div>)}
      </div>
    </div>
  </section>;
}
