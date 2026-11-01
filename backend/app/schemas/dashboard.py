"""
EduCenter Smart ERP - Real-Time Dashboard KPI Schemas (Pydantic v2)
Tracks Students Today, Pending Payments, Treasury Liquidity, and Operational Status
"""
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OverdueStudentPreview(BaseSchema):
    student_id: str = Field(..., description="Unique student ID")
    student_name: str = Field(..., description="Full student name in Arabic")
    student_code: str = Field(..., description="Center admission barcode / code")
    group_name: str = Field(..., description="Academic group enrolled in")
    parent_phone: str = Field(..., description="Parent contact phone number for WhatsApp")
    pending_amount: Decimal = Field(..., description="Unpaid balance in EGP")
    billing_period: str = Field(..., description="e.g. شهر أكتوبر / نوفمبر")
    overdue_days: int = Field(..., description="Days since payment deadline")
    attendance_status_today: str = Field(default="SCHEDULED", description="ATTENDED | SCHEDULED | ABSENT")


class TodayGroupSession(BaseSchema):
    group_id: str
    group_name: str
    subject_name: str
    teacher_name: str
    hall_name: str
    time_slot: str
    enrolled_count: int
    attended_count: int
    attendance_rate: float
    status: str = Field(default="ACTIVE", description="ACTIVE | UPCOMING | COMPLETED")


class DashboardKPIsResponse(BaseSchema):
    # Students Today KPIs
    students_today_attended: int = Field(..., description="Total students who checked in today")
    students_today_total: int = Field(..., description="Total scheduled students expected today")
    attendance_rate_today: float = Field(..., description="Percentage of attendance today")
    
    # Financial & Pending Payments KPIs
    pending_payments_amount: Decimal = Field(..., description="Total overdue amount in EGP")
    pending_payments_students_count: int = Field(..., description="Number of students with pending balances")
    collected_today_amount: Decimal = Field(..., description="Total cash collected today in EGP")
    treasury_liquid_balance: Decimal = Field(..., description="Current liquid cash in central safe")
    
    # Operational Center KPIs
    active_hall_sessions: int = Field(..., description="Current running sessions across halls")
    total_halls_available: int = Field(..., description="Total lecture halls")
    whatsapp_alerts_today: int = Field(..., description="Number of absence/payment alerts sent today")
    staff_on_shift_count: int = Field(..., description="Staff members punched in and on duty")
    
    # Live Sync Metadata
    last_sync: datetime = Field(..., description="Timestamp of the latest KPI recalculation")
    server_time: datetime = Field(..., description="Current server UTC timestamp")
    
    # Drill-down previews
    overdue_students_preview: List[OverdueStudentPreview] = Field(default_factory=list)
    today_groups_schedule: List[TodayGroupSession] = Field(default_factory=list)


class PaymentReminderRequest(BaseSchema):
    student_id: str
    parent_phone: str
    amount: Decimal
    custom_message: Optional[str] = None


class QuickCollectRequest(BaseSchema):
    student_id: str
    amount: Decimal
    payment_method: str = "CASH"
    period: str = "المصروفات المستحقة"
    notes: Optional[str] = None
