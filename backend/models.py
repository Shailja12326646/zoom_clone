from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MeetingBase(BaseModel):
    meeting_id: str
    title: str = "Zoom Meeting"
    description: Optional[str] = ""
    scheduled_at: Optional[str] = None
    duration_minutes: int = 60
    status: str = "instant"

class MeetingCreate(MeetingBase):
    id: Optional[str] = None

class MeetingResponse(MeetingBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None

class MessageCreate(BaseModel):
    meeting_id: str
    sender_name: str
    body: str

class MessageResponse(BaseModel):
    id: str
    meeting_id: str
    sender_name: str
    body: str
    created_at: str

class RecordingCreate(BaseModel):
    meeting_id: str
    meeting_code: str
    title: str
    file_name: str
    file_path: str
    file_size_bytes: int = 0
    duration_seconds: int = 0
    mime_type: str = "video/webm"
    status: str = "completed"

class RecordingResponse(RecordingCreate):
    id: str
    created_at: str

class SharedFileCreate(BaseModel):
    meeting_id: str
    uploader_name: str
    file_name: str
    file_path: str
    file_size_bytes: int = 0
    mime_type: Optional[str] = None

class SharedFileResponse(SharedFileCreate):
    id: str
    created_at: str
