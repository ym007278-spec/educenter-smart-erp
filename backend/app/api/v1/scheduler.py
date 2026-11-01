"""
EduCenter Smart ERP - Task Scheduler & Automated WhatsApp API Router
Provides endpoints to configure cron jobs, edit message templates, manually trigger runs, and inspect logs.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from app.core.permissions import CurrentUserContext
from app.api.deps import get_current_user
from app.core.scheduler_service import scheduler_service
from app.schemas.scheduler import (
    TaskSchedulerConfig,
    WhatsAppDispatchLog,
    SchedulerTriggerRequest,
    SchedulerTriggerResponse,
    TemplateTestRequest,
    TemplateTestResponse,
    SchedulerStatusResponse
)

router = APIRouter(prefix="/scheduler", tags=["جدولة المهام وإشعارات الواتساب (Task Scheduler & WhatsApp)"])


@router.get(
    "/status",
    response_model=SchedulerStatusResponse,
    summary="جلب حالة نظام الجدولة والإحصائيات اللحظية"
)
async def get_scheduler_status(
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Returns running status, active cron jobs count, current config, and latest dispatch logs.
    """
    cfg = scheduler_service.config
    active_jobs = 0
    if cfg.overdue_fees_enabled:
        active_jobs += 1
    if cfg.teacher_sessions_enabled:
        active_jobs += 1

    return SchedulerStatusResponse(
        scheduler_running=True,
        active_jobs_count=active_jobs,
        config=cfg,
        total_dispatched_today=len(scheduler_service.dispatch_logs),
        recent_logs=scheduler_service.dispatch_logs[:20]
    )


@router.get(
    "/config",
    response_model=TaskSchedulerConfig,
    summary="جلب إعدادات وقوالب رسائل الجدولة الحالية"
)
async def get_scheduler_config(
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """Fetches active scheduler config and WhatsApp message templates."""
    return scheduler_service.config


@router.put(
    "/config",
    response_model=TaskSchedulerConfig,
    summary="تحديث إعدادات الجدولة وقوالب رسائل الواتساب"
)
async def update_scheduler_config(
    new_config: TaskSchedulerConfig,
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Updates schedule frequency, alert days threshold, and dynamic WhatsApp templates.
    """
    scheduler_service.config = new_config
    return scheduler_service.config


@router.post(
    "/trigger",
    response_model=SchedulerTriggerResponse,
    summary="تشغيل فحص فوري للمهام وجدولة الإرسال الآن"
)
async def trigger_scheduler_run(
    req: SchedulerTriggerRequest,
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Manually initiates immediate evaluation of overdue fees and/or upcoming classes,
    interpolating templates and generating WhatsApp dispatch records.
    """
    result = scheduler_service.execute_scheduler_jobs(
        job_type=req.job_type,
        simulate_only=req.simulate_only
    )
    return result


@router.get(
    "/logs",
    response_model=List[WhatsAppDispatchLog],
    summary="جلب سجلات إرسال رسائل الواتساب الآلية"
)
async def get_dispatch_logs(
    role: Optional[str] = Query(None, description="Filter by recipient role: STUDENT_PARENT | TEACHER"),
    status: Optional[str] = Query(None, description="Filter by status: DELIVERED | SENT | QUEUED | FAILED"),
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Returns audit history of automated WhatsApp notifications with filtering capabilities.
    """
    logs = scheduler_service.dispatch_logs
    if role:
        logs = [log for log in logs if log.recipient_role == role]
    if status:
        logs = [log for log in logs if log.status == status]
    return logs


@router.post(
    "/test-template",
    response_model=TemplateTestResponse,
    summary="معاينة حية لقالب الرسالة مع استبدال المتغيرات وتوليد رابط الواتساب"
)
async def test_template_rendering(
    req: TemplateTestRequest,
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Previews how a template looks with realistic test data without sending an actual message.
    """
    return scheduler_service.test_preview_template(
        template_type=req.template_type,
        custom_template=req.custom_template,
        sample_phone=req.sample_phone or "01012345678"
    )


@router.post(
    "/clear-logs",
    summary="تفريغ سجل الإشعارات القديمة"
)
async def clear_dispatch_logs(
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """Clears history logs."""
    scheduler_service.dispatch_logs = []
    return {"status": "SUCCESS", "message": "تم تفريغ سجل إرسال رسائل الواتساب بنجاح."}
