"""
EduCenter Smart ERP - Attendance & QR Schemas (Pydantic v2)
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, date, time
from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class QRScanAttendanceRequest(BaseSchema):
    qr_payload: str = Field(..., description="Encrypted QR payload: student_id:student_code:hmac_signature")
    group_id: UUID
    session_date: Optional[date] = None


class ManualAttendanceRequest(BaseSchema):
    student_id: UUID
    group_id: UUID
    status: str = Field(default="PRESENT", pattern="^(PRESENT|ABSENT|EXCUSED|LATE)$")
    session_date: Optional[date] = None


class AttendanceResponse(BaseSchema):
    id: UUID
    student_id: UUID
    student_name: str
    student_code: str
    group_id: UUID
    session_date: date
    check_in_time: Optional[datetime]
    status: str
    scan_method: str
    session_charge_applied: bool
    whatsapp_notified: bool


class AbsenceAlertRequest(BaseSchema):
    student_id: UUID
    group_id: UUID
    session_date: Optional[date] = None
    custom_note: Optional[str] = None


class StaffCheckInRequest(BaseSchema):
    user_id: UUID
    work_date: Optional[date] = None
    scheduled_start_time: Optional[time] = None
