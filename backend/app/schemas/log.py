import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AccessLogOut(BaseModel):
    id: int
    card_uid: str
    student_id: Optional[uuid.UUID] = None
    gate_id: Optional[uuid.UUID] = None
    access_time: datetime
    status: str
    failure_reason: Optional[str] = None
    # Joined metadata for ease of display
    student_code: Optional[str] = None
    student_name: Optional[str] = None
    faculty: Optional[str] = None
    avatar_url: Optional[str] = None
    gate_name: Optional[str] = None

    class Config:
        from_attributes = True
