"""
EduCenter Smart ERP - Task Scheduler & Automated WhatsApp Notification Schemas
Defines request/response structures for cron jobs, templates, and dispatch logs.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class TaskSchedulerConfig(BaseSchema):
    # Job 1: Late tuition fees for students/parents
    overdue_fees_enabled: bool = Field(default=True, description="Enable automated late fees notifications")
    overdue_days_threshold: int = Field(default=3, ge=1, le=60, description="Minimum overdue days before alerting")
    overdue_schedule_cron: str = Field(default="0 10 * * *", description="Cron schedule (e.g. Daily at 10:00 AM)")
    overdue_message_template: str = Field(
        default="السلام عليكم ورحمة الله، ولي أمر الطالب {student_name} المحترم. نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها {amount_due} ج.م عن ({billing_period})، وكان موعد سدادها {due_date}. شاكرين حسن تعاونكم وحرصكم الدائم. — إدارة {center_name}",
        description="Dynamic template for late fee WhatsApp alerts"
    )

    # Job 2: Upcoming sessions for teachers
    teacher_sessions_enabled: bool = Field(default=True, description="Enable automated upcoming class alerts for teachers")
    teacher_lead_minutes: int = Field(default=60, ge=15, le=1440, description="Minutes before session to notify teacher")
    teacher_schedule_cron: str = Field(default="*/30 * * * *", description="Cron schedule (e.g. Every 30 minutes)")
    teacher_message_template: str = Field(
        default="أهلاً بك أستاذ {teacher_name}. تذكير بحصتك القادمة اليوم لمجموعة '{group_name}' في تمام الساعة {session_time} بـ {hall_name}. إجمالي عدد الطلاب المسجلين: {enrolled_count} طالب. مع أطيب تمنياتنا بحصة موفقة! — {center_name}",
        description="Dynamic template for teacher session reminders"
    )

    # General configuration
    auto_dispatch_whatsapp: bool = Field(default=True, description="Automatically dispatch via WhatsApp Cloud API")
    sender_phone_number: str = Field(default="+201019882233", description="Center official WhatsApp sender number")
    center_brand_name: str = Field(default="سنتر الفردوس التعليمي الذكي", description="Center branding name in messages")
    last_run_at: Optional[datetime] = Field(default=None, description="Last execution timestamp")
    next_run_at: Optional[datetime] = Field(default=None, description="Next scheduled execution timestamp")


class WhatsAppDispatchLog(BaseSchema):
    id: str = Field(..., description="Unique dispatch ID")
    job_type: str = Field(..., description="OVERDUE_FEES | UPCOMING_SESSION | MANUAL_TEST")
    recipient_role: str = Field(..., description="STUDENT_PARENT | TEACHER | ADMIN")
    recipient_name: str = Field(..., description="Recipient full name")
    recipient_phone: str = Field(..., description="Phone number formatted for WhatsApp")
    rendered_message: str = Field(..., description="Full text with all tokens replaced")
    status: str = Field(default="DELIVERED", description="QUEUED | SENT | DELIVERED | FAILED")
    dispatched_at: datetime = Field(..., description="Dispatch timestamp")
    whatsapp_url: str = Field(..., description="Direct click-to-chat wa.me link")
    error_message: Optional[str] = Field(default=None, description="Failure reason if any")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Contextual info like student_id or group_id")


class SchedulerTriggerRequest(BaseSchema):
    job_type: str = Field(default="ALL", description="OVERDUE_FEES | UPCOMING_SESSIONS | ALL")
    simulate_only: bool = Field(default=False, description="If true, generates preview without sending")


class SchedulerTriggerResponse(BaseSchema):
    status: str
    job_type: str
    triggered_at: datetime
    processed_count: int
    successful_dispatches: int
    failed_dispatches: int
    message: str
    dispatched_items: List[WhatsAppDispatchLog] = Field(default_factory=list)


class TemplateTestRequest(BaseSchema):
    template_type: str = Field(..., description="OVERDUE_FEES | TEACHER_SESSION")
    custom_template: str = Field(..., description="Template string containing placeholders")
    sample_phone: Optional[str] = Field(default="01012345678", description="Test phone number")


class TemplateTestResponse(BaseSchema):
    rendered_message: str
    whatsapp_url: str
    variables_replaced: List[str]
    missing_variables: List[str]


class SchedulerStatusResponse(BaseSchema):
    scheduler_running: bool
    active_jobs_count: int
    config: TaskSchedulerConfig
    total_dispatched_today: int
    recent_logs: List[WhatsAppDispatchLog] = Field(default_factory=list)
