"""
EduCenter Smart ERP - Database Audit Trail & Transparency Router
Exposes endpoints to view, search, and audit all sensitive database modifications.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.core.permissions import CurrentUserContext
from app.api.deps import get_current_user
from app.schemas.audit import (
    AuditLogEntry,
    AuditStatsResponse,
    SimulateAuditEventRequest
)

router = APIRouter(prefix="/audit", tags=["سجل التدقيق والشفافية (Database Audit Trail)"])

# In-memory storage seeded with high-fidelity realistic audit logs
INITIAL_AUDIT_LOGS: List[AuditLogEntry] = [
    AuditLogEntry(
        id=101,
        username="أحمد الشناوي (مدير الخزنة)",
        action="UPDATE",
        table_name="treasury_transactions",
        record_id="TX-TREAS-8812",
        old_values={
            "amount": "12500.00",
            "category": "TUITION_FEES",
            "verified": False,
            "notes": "توريد اشتراكات فيزياء"
        },
        new_values={
            "amount": "14200.00",
            "category": "TUITION_FEES",
            "verified": True,
            "notes": "توريد اشتراكات فيزياء بعد جرد القسائم الإضافية"
        },
        changed_fields=["amount", "verified", "notes"],
        description="تعديل قيمة حركة الخزنة من 12,500.00 إلى 14,200.00 ج.م مع اعتماد الجرد.",
        ip_address="192.168.1.14",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=18)
    ),
    AuditLogEntry(
        id=102,
        username="سارة عبد الرحمن (شؤون الطلاب)",
        action="UPDATE",
        table_name="students",
        record_id="STU-2026-9041",
        old_values={
            "full_name": "يوسف أحمد الشناوي",
            "parent_phone": "01019283741",
            "discount_percentage": "0.00",
            "status": "ACTIVE"
        },
        new_values={
            "full_name": "يوسف أحمد الشناوي",
            "parent_phone": "01019283741",
            "discount_percentage": "15.00",
            "status": "ACTIVE"
        },
        changed_fields=["discount_percentage"],
        description="تطبيق منحة خصم تفوق دراسي 15% على الطالب يوسف أحمد الشناوي.",
        ip_address="192.168.1.22",
        created_at=datetime.now(timezone.utc) - timedelta(hours=1, minutes=10)
    ),
    AuditLogEntry(
        id=103,
        username="محمود كمال (المدير المالي)",
        action="INSERT",
        table_name="staff_salaries",
        record_id="PAYROLL-2026-10-OCT",
        old_values=None,
        new_values={
            "employee_name": "م. كريم حسني (مسؤول الشبكات والـ IT)",
            "base_salary": "6500.00",
            "deductions": "150.00",
            "net_paid": "6350.00",
            "disbursement_channel": "CENTRAL_SAFE"
        },
        changed_fields=["employee_name", "base_salary", "deductions", "net_paid", "disbursement_channel"],
        description="صرف راتب شهر أكتوبر للمهندس كريم حسني بمبلغ صافي 6,350.00 ج.م نقداً من الخزنة.",
        ip_address="192.168.1.10",
        created_at=datetime.now(timezone.utc) - timedelta(hours=2, minutes=45)
    ),
    AuditLogEntry(
        id=104,
        username="محمود كمال (المدير المالي)",
        action="UPDATE",
        table_name="teacher_wallets",
        record_id="TCH-WLT-001",
        old_values={
            "teacher_name": "أ. محمد عبد المنعم",
            "balance": "18400.00",
            "total_withdrawn": "45000.00"
        },
        new_values={
            "teacher_name": "أ. محمد عبد المنعم",
            "balance": "8400.00",
            "total_withdrawn": "55000.00"
        },
        changed_fields=["balance", "total_withdrawn"],
        description="صرف دفعة مستحقات بقيمة 10,000.00 ج.م للأستاذ محمد عبد المنعم وخصمها من محفظته المالية.",
        ip_address="192.168.1.10",
        created_at=datetime.now(timezone.utc) - timedelta(hours=4, minutes=15)
    ),
    AuditLogEntry(
        id=105,
        username="طارق رضوان (موظف الاستقبال)",
        action="DELETE",
        table_name="students",
        record_id="STU-2026-9912",
        old_values={
            "student_name": "إبراهيم ماهر يونس",
            "student_code": "STU-2026-9912",
            "stage": "الصف الأول الثانوي",
            "reason": "تسجيل مكرر بالخطأ"
        },
        new_values=None,
        changed_fields=[],
        description="حذف ملف الطالب المسجل بالخطأ (إبراهيم ماهر يونس) بعد مراجعة شؤون الطلاب.",
        ip_address="192.168.1.18",
        created_at=datetime.now(timezone.utc) - timedelta(hours=6, minutes=30)
    )
]

# In-memory storage pointer
_audit_logs_db: List[AuditLogEntry] = list(INITIAL_AUDIT_LOGS)


@router.get(
    "/logs",
    response_model=List[AuditLogEntry],
    summary="جلب سجلات التدقيق والتعديلات الحساسة في قاعدة البيانات"
)
async def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action: INSERT | UPDATE | DELETE"),
    table_name: Optional[str] = Query(None, description="Filter by table: students | treasury_transactions | etc."),
    username: Optional[str] = Query(None, description="Filter by operator username"),
    search: Optional[str] = Query(None, description="Full-text search in descriptions or record IDs"),
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Returns audit trail records created by database triggers, with support for field diffs.
    """
    results = _audit_logs_db

    if action:
        results = [log for log in results if log.action.upper() == action.upper()]

    if table_name:
        results = [log for log in results if log.table_name.lower() == table_name.lower()]

    if username:
        results = [log for log in results if username.lower() in log.username.lower()]

    if search:
        s = search.lower()
        results = [
            log for log in results
            if s in log.description.lower()
            or s in log.record_id.lower()
            or s in log.username.lower()
            or s in log.table_name.lower()
        ]

    # Return descending by created_at
    return sorted(results, key=lambda x: x.created_at, reverse=True)


@router.get(
    "/stats",
    response_model=AuditStatsResponse,
    summary="إحصائيات الشفافية وتوزيع العمليات الحساسة"
)
async def get_audit_stats(
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Aggregates metrics: total operations, inserts, updates, deletes, and top tables.
    """
    total = len(_audit_logs_db)
    inserts = sum(1 for l in _audit_logs_db if l.action == "INSERT")
    updates = sum(1 for l in _audit_logs_db if l.action == "UPDATE")
    deletes = sum(1 for l in _audit_logs_db if l.action == "DELETE")

    table_counts: Dict[str, int] = {}
    for l in _audit_logs_db:
        table_counts[l.table_name] = table_counts.get(l.table_name, 0) + 1

    top_tables = [{"table_name": k, "count": v} for k, v in table_counts.items()]

    last_ts = _audit_logs_db[0].created_at if _audit_logs_db else None

    return AuditStatsResponse(
        total_logs=total,
        insert_count=inserts,
        update_count=updates,
        delete_count=deletes,
        critical_financial_events_today=updates + inserts,
        last_audit_timestamp=last_ts,
        top_affected_tables=sorted(top_tables, key=lambda x: x["count"], reverse=True)
    )


@router.post(
    "/simulate-event",
    response_model=AuditLogEntry,
    summary="محاكاة إطلاق عملية حساسة لاختبار التريجر (Simulate Sensitive Trigger Event)"
)
async def simulate_audit_event(
    req: SimulateAuditEventRequest,
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """
    Simulates a sensitive database operation to demonstrate how the PostgreSQL trigger
    captures Old and New values in JSONB with zero data loss.
    """
    changed_fields = []
    if req.action == "UPDATE" and req.old_values and req.new_values:
        for k in req.new_values:
            if k not in req.old_values or req.old_values[k] != req.new_values[k]:
                changed_fields.append(k)
    elif req.action == "INSERT" and req.new_values:
        changed_fields = list(req.new_values.keys())

    # Build description
    if req.action == "UPDATE":
        desc = f"تعديل حساس في جدول {req.table_name} للسجل {req.record_id}. الحقول: {', '.join(changed_fields)} بواسطة {req.username}."
    elif req.action == "INSERT":
        desc = f"إضافة سجل جديد في جدول {req.table_name} (المعرف: {req.record_id}) بواسطة {req.username}."
    else:
        desc = f"حذف سجل من جدول {req.table_name} (المعرف: {req.record_id}) بواسطة {req.username}."

    if req.note:
        desc += f" (ملاحظة: {req.note})"

    new_id = (max([l.id for l in _audit_logs_db]) + 1) if _audit_logs_db else 1

    entry = AuditLogEntry(
        id=new_id,
        username=req.username or current_user.username,
        action=req.action.upper(),
        table_name=req.table_name,
        record_id=req.record_id,
        old_values=req.old_values,
        new_values=req.new_values,
        changed_fields=changed_fields,
        description=desc,
        ip_address="127.0.0.1",
        created_at=datetime.now(timezone.utc)
    )

    _audit_logs_db.insert(0, entry)
    return entry


@router.post(
    "/clear-logs",
    summary="تفريغ سجلات التدقيق القديمة"
)
async def clear_audit_logs(
    current_user: CurrentUserContext = Depends(get_current_user)
):
    """Clears non-persistent logs in sandbox mode."""
    global _audit_logs_db
    _audit_logs_db = []
    return {"status": "SUCCESS", "message": "تم تفريغ سجل التدقيق بنجاح."}
