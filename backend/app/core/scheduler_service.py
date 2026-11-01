"""
EduCenter Smart ERP - Task Scheduler & Automated WhatsApp Service
Handles periodic evaluations for overdue student fees and teacher upcoming classes.
Interpolates dynamic templates and provides WhatsApp click-to-chat links and audit logs.
"""
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
from uuid import uuid4

from app.schemas.scheduler import (
    TaskSchedulerConfig,
    WhatsAppDispatchLog,
    SchedulerTriggerResponse,
    TemplateTestResponse
)


class SchedulerService:
    def __init__(self):
        # Default persistent configuration
        self.config = TaskSchedulerConfig(
            overdue_fees_enabled=True,
            overdue_days_threshold=3,
            overdue_schedule_cron="0 10 * * *",
            overdue_message_template=(
                "السلام عليكم ورحمة الله، ولي أمر الطالب {student_name} المحترم. "
                "نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها {amount_due} ج.م عن ({billing_period})، "
                "وكان موعد سدادها المحدد {due_date}. شاكرين حسن تعاونكم وحرصكم الدائم على مستقبل الطالب. "
                "— إدارة {center_name}"
            ),
            teacher_sessions_enabled=True,
            teacher_lead_minutes=60,
            teacher_schedule_cron="*/30 * * * *",
            teacher_message_template=(
                "أهلاً بك أستاذ {teacher_name}. "
                "تذكير بموعد حصتك القادمة لمجموعة '{group_name}' في تمام الساعة {session_time} بـ {hall_name}. "
                "إجمالي عدد الطلاب المسجلين بالحضور: {enrolled_count} طالب. "
                "مع أطيب تمنياتنا بحصة موفقة ومثمرة! — {center_name}"
            ),
            auto_dispatch_whatsapp=True,
            sender_phone_number="+201019882233",
            center_brand_name="سنتر الفردوس التعليمي الذكي",
            last_run_at=datetime.now(timezone.utc) - timedelta(minutes=15),
            next_run_at=datetime.now(timezone.utc) + timedelta(minutes=45)
        )

        # In-memory dispatch audit logs with initial representative logs
        self.dispatch_logs: List[WhatsAppDispatchLog] = [
            WhatsAppDispatchLog(
                id="DISP-9841-A",
                job_type="OVERDUE_FEES",
                recipient_role="STUDENT_PARENT",
                recipient_name="ولي أمر: يوسف أحمد الشناوي",
                recipient_phone="+201019283741",
                rendered_message=(
                    "السلام عليكم ورحمة الله، ولي أمر الطالب يوسف أحمد الشناوي المحترم. "
                    "نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها 350.00 ج.م عن (شهر أكتوبر)، "
                    "وكان موعد سدادها المحدد 2026-10-22. شاكرين حسن تعاونكم وحرصكم الدائم على مستقبل الطالب. "
                    "— إدارة سنتر الفردوس التعليمي الذكي"
                ),
                status="DELIVERED",
                dispatched_at=datetime.now(timezone.utc) - timedelta(hours=1, minutes=20),
                whatsapp_url=self.generate_whatsapp_url(
                    "+201019283741",
                    "السلام عليكم ورحمة الله، ولي أمر الطالب يوسف أحمد الشناوي المحترم. نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها 350.00 ج.م..."
                ),
                metadata={"student_id": "std-101", "amount": 350.0, "days_overdue": 9}
            ),
            WhatsAppDispatchLog(
                id="DISP-9842-B",
                job_type="UPCOMING_SESSION",
                recipient_role="TEACHER",
                recipient_name="أ. محمد عبد المنعم",
                recipient_phone="+201122334455",
                rendered_message=(
                    "أهلاً بك أستاذ محمد عبد المنعم. "
                    "تذكير بموعد حصتك القادمة لمجموعة 'مجموعة أوائل الفيزياء - الصف 3 ث' في تمام الساعة 04:00 م بـ قاعة الفردوس الكبرى (120 مقعد). "
                    "إجمالي عدد الطلاب المسجلين بالحضور: 95 طالب. "
                    "مع أطيب تمنياتنا بحصة موفقة ومثمرة! — سنتر الفردوس التعليمي الذكي"
                ),
                status="DELIVERED",
                dispatched_at=datetime.now(timezone.utc) - timedelta(minutes=40),
                whatsapp_url=self.generate_whatsapp_url(
                    "+201122334455",
                    "أهلاً بك أستاذ محمد عبد المنعم. تذكير بموعد حصتك القادمة..."
                ),
                metadata={"teacher_name": "أ. محمد عبد المنعم", "group_id": "grp-ph-3", "hall": "قاعة الفردوس الكبرى"}
            ),
            WhatsAppDispatchLog(
                id="DISP-9843-C",
                job_type="OVERDUE_FEES",
                recipient_role="STUDENT_PARENT",
                recipient_name="ولي أمر: مريم طارق العوضي",
                recipient_phone="+201224567890",
                rendered_message=(
                    "السلام عليكم ورحمة الله، ولي أمر الطالب مريم طارق العوضي المحترم. "
                    "نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها 300.00 ج.م عن (شهر أكتوبر)، "
                    "وكان موعد سدادها المحدد 2026-10-17. شاكرين حسن تعاونكم وحرصكم الدائم على مستقبل الطالب. "
                    "— إدارة سنتر الفردوس التعليمي الذكي"
                ),
                status="SENT",
                dispatched_at=datetime.now(timezone.utc) - timedelta(minutes=15),
                whatsapp_url=self.generate_whatsapp_url(
                    "+201224567890",
                    "السلام عليكم ورحمة الله، ولي أمر الطالب مريم طارق العوضي المحترم. نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة..."
                ),
                metadata={"student_id": "std-102", "amount": 300.0, "days_overdue": 14}
            )
        ]

    @staticmethod
    def normalize_phone_number(phone: str) -> str:
        """Cleans and formats Egyptian / International phone number to E.164."""
        cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        if cleaned.startswith("+"):
            return cleaned
        if cleaned.startswith("0"):
            # Typical Egyptian local number e.g. 01012345678 -> +201012345678
            return "+20" + cleaned[1:]
        if cleaned.startswith("20") and len(cleaned) == 12:
            return "+" + cleaned
        return "+" + cleaned

    @staticmethod
    def generate_whatsapp_url(phone: str, message: str) -> str:
        """Generates standard https://wa.me/{phone}?text={urlencoded} URL."""
        digits = "".join(ch for ch in phone if ch.isdigit())
        encoded_text = urllib.parse.quote(message)
        return f"https://wa.me/{digits}?text={encoded_text}"

    @staticmethod
    def interpolate_template(template: str, variables: Dict[str, Any]) -> Tuple[str, List[str], List[str]]:
        """
        Safely replaces {key} occurrences with variable values.
        Returns (rendered_text, replaced_keys, missing_keys).
        """
        import re
        all_placeholders = re.findall(r"\{([a-zA-Z0-9_]+)\}", template)
        replaced = []
        missing = []

        rendered = template
        for key in set(all_placeholders):
            if key in variables:
                val = str(variables[key])
                rendered = rendered.replace(f"{{{key}}}", val)
                replaced.append(key)
            else:
                missing.append(key)

        return rendered, replaced, missing

    def get_overdue_candidates(self) -> List[Dict[str, Any]]:
        """Mock/DB provider for students with overdue balances exceeding threshold."""
        # Simulated database records
        students = [
            {
                "student_id": "std-101",
                "student_name": "يوسف أحمد الشناوي",
                "student_code": "STU-2026-9041",
                "parent_name": "أحمد الشناوي",
                "parent_phone": "01019283741",
                "amount_due": "350.00",
                "billing_period": "شهر أكتوبر 2026",
                "due_date": "2026-10-22",
                "days_overdue": 9,
                "group_name": "الصف الثالث الثانوي - فيزياء متقدمة"
            },
            {
                "student_id": "std-102",
                "student_name": "مريم طارق العوضي",
                "student_code": "STU-2026-8812",
                "parent_name": "طارق العوضي",
                "parent_phone": "01224567890",
                "amount_due": "300.00",
                "billing_period": "شهر أكتوبر 2026",
                "due_date": "2026-10-17",
                "days_overdue": 14,
                "group_name": "الصف الثاني الثانوي - كيمياء عضوية"
            },
            {
                "student_id": "std-103",
                "student_name": "عمر خالد الهواري",
                "student_code": "STU-2026-7734",
                "parent_name": "خالد الهواري",
                "parent_phone": "01138475920",
                "amount_due": "700.00",
                "billing_period": "شهري سبتمبر وأكتوبر 2026",
                "due_date": "2026-10-09",
                "days_overdue": 22,
                "group_name": "الصف الثالث الثانوي - لغة عربية"
            },
            {
                "student_id": "std-104",
                "student_name": "سارة محمود عبد الوهاب",
                "student_code": "STU-2026-6651",
                "parent_name": "محمود عبد الوهاب",
                "parent_phone": "01004561234",
                "amount_due": "280.00",
                "billing_period": "شهر أكتوبر 2026",
                "due_date": "2026-10-26",
                "days_overdue": 5,
                "group_name": "الصف الأول الثانوي - رياضيات عامة"
            },
            {
                "student_id": "std-105",
                "student_name": "زياد مصطفى الباز",
                "student_code": "STU-2026-5542",
                "parent_name": "مصطفى الباز",
                "parent_phone": "01552341298",
                "amount_due": "400.00",
                "billing_period": "شهر أكتوبر 2026",
                "due_date": "2026-10-20",
                "days_overdue": 11,
                "group_name": "الصف الثالث الثانوي - أحياء ولغات"
            }
        ]
        # Filter by threshold
        threshold = self.config.overdue_days_threshold
        return [s for s in students if s["days_overdue"] >= threshold]

    def get_upcoming_sessions_candidates(self) -> List[Dict[str, Any]]:
        """Mock/DB provider for teacher sessions scheduled within upcoming window."""
        return [
            {
                "session_id": "ses-01",
                "teacher_id": "tch-1",
                "teacher_name": "أ. محمد عبد المنعم",
                "teacher_phone": "01122334455",
                "subject_name": "الفيزياء للثانوية العامة",
                "group_name": "مجموعة أوائل الفيزياء - الصف 3 ث",
                "hall_name": "قاعة الفردوس الكبرى (120 مقعد)",
                "session_time": "04:00 م - 06:00 م",
                "enrolled_count": 95,
                "minutes_until": 45
            },
            {
                "session_id": "ses-02",
                "teacher_id": "tch-2",
                "teacher_name": "أ. هاني سليم",
                "teacher_phone": "01099887766",
                "subject_name": "الكيمياء العضوية",
                "group_name": "الكيمياء العامة - الصف 2 ث",
                "hall_name": "قاعة النخبة (70 مقعد)",
                "session_time": "04:30 م - 06:30 م",
                "enrolled_count": 65,
                "minutes_until": 75
            },
            {
                "session_id": "ses-03",
                "teacher_id": "tch-3",
                "teacher_name": "أ. إبراهيم رضوان",
                "teacher_phone": "01233445566",
                "subject_name": "اللغة العربية والبلاغة",
                "group_name": "البلاغة والنحو - الصف 3 ث",
                "hall_name": "قاعة الأندلس (90 مقعد)",
                "session_time": "05:00 م - 07:00 م",
                "enrolled_count": 80,
                "minutes_until": 105
            }
        ]

    def execute_scheduler_jobs(self, job_type: str = "ALL", simulate_only: bool = False) -> SchedulerTriggerResponse:
        """
        Executes configured tasks:
        - Evaluates overdue students and prepares/dispatches messages.
        - Evaluates upcoming teacher sessions and prepares/dispatches reminders.
        """
        now = datetime.now(timezone.utc)
        dispatched: List[WhatsAppDispatchLog] = []

        # 1. Process Overdue Tuition Fees
        if (job_type in ["ALL", "OVERDUE_FEES"]) and self.config.overdue_fees_enabled:
            candidates = self.get_overdue_candidates()
            for cand in candidates:
                variables = {
                    "student_name": cand["student_name"],
                    "student_code": cand["student_code"],
                    "parent_name": cand["parent_name"],
                    "amount_due": cand["amount_due"],
                    "billing_period": cand["billing_period"],
                    "due_date": cand["due_date"],
                    "days_overdue": cand["days_overdue"],
                    "center_name": self.config.center_brand_name,
                    "group_name": cand["group_name"]
                }
                msg, _, _ = self.interpolate_template(self.config.overdue_message_template, variables)
                phone_e164 = self.normalize_phone_number(cand["parent_phone"])
                wa_url = self.generate_whatsapp_url(phone_e164, msg)

                log_entry = WhatsAppDispatchLog(
                    id=f"DISP-FEE-{uuid4().hex[:6].upper()}",
                    job_type="OVERDUE_FEES",
                    recipient_role="STUDENT_PARENT",
                    recipient_name=f"ولي أمر {cand['student_name']}",
                    recipient_phone=phone_e164,
                    rendered_message=msg,
                    status="DELIVERED" if not simulate_only else "QUEUED",
                    dispatched_at=now,
                    whatsapp_url=wa_url,
                    metadata={
                        "student_id": cand["student_id"],
                        "amount": cand["amount_due"],
                        "billing_period": cand["billing_period"]
                    }
                )
                dispatched.append(log_entry)

        # 2. Process Upcoming Teacher Sessions
        if (job_type in ["ALL", "UPCOMING_SESSIONS"]) and self.config.teacher_sessions_enabled:
            sessions = self.get_upcoming_sessions_candidates()
            for sess in sessions:
                variables = {
                    "teacher_name": sess["teacher_name"],
                    "subject_name": sess["subject_name"],
                    "group_name": sess["group_name"],
                    "hall_name": sess["hall_name"],
                    "session_time": sess["session_time"],
                    "enrolled_count": sess["enrolled_count"],
                    "center_name": self.config.center_brand_name
                }
                msg, _, _ = self.interpolate_template(self.config.teacher_message_template, variables)
                phone_e164 = self.normalize_phone_number(sess["teacher_phone"])
                wa_url = self.generate_whatsapp_url(phone_e164, msg)

                log_entry = WhatsAppDispatchLog(
                    id=f"DISP-TCH-{uuid4().hex[:6].upper()}",
                    job_type="UPCOMING_SESSION",
                    recipient_role="TEACHER",
                    recipient_name=sess["teacher_name"],
                    recipient_phone=phone_e164,
                    rendered_message=msg,
                    status="DELIVERED" if not simulate_only else "QUEUED",
                    dispatched_at=now,
                    whatsapp_url=wa_url,
                    metadata={
                        "session_id": sess["session_id"],
                        "group_name": sess["group_name"],
                        "hall": sess["hall_name"]
                    }
                )
                dispatched.append(log_entry)

        # Save to history
        if not simulate_only and dispatched:
            for item in dispatched:
                self.dispatch_logs.insert(0, item)
            # Keep history within reasonable bounds (e.g. 100 items)
            self.dispatch_logs = self.dispatch_logs[:100]
            self.config.last_run_at = now
            self.config.next_run_at = now + timedelta(hours=1)

        total = len(dispatched)
        return SchedulerTriggerResponse(
            status="SUCCESS",
            job_type=job_type,
            triggered_at=now,
            processed_count=total,
            successful_dispatches=total,
            failed_dispatches=0,
            message=f"تم تشغيل الجدولة بنجاح ومعالجة {total} إشعار واتساب تلقائي مطابق للقواعد.",
            dispatched_items=dispatched
        )

    def test_preview_template(self, template_type: str, custom_template: str, sample_phone: str) -> TemplateTestResponse:
        """Renders sample template without dispatching."""
        if template_type == "OVERDUE_FEES":
            sample_vars = {
                "student_name": "أحمد محمود كمال",
                "student_code": "STU-2026-1029",
                "parent_name": "محمود كمال",
                "amount_due": "450.00",
                "billing_period": "شهر أكتوبر 2026",
                "due_date": "2026-10-25",
                "days_overdue": 6,
                "center_name": self.config.center_brand_name,
                "group_name": "الصف الثالث الثانوي - فيزياء"
            }
        else:
            sample_vars = {
                "teacher_name": "أ. محمد عبد المنعم",
                "subject_name": "الفيزياء للثانوية العامة",
                "group_name": "مجموعة أوائل الفيزياء",
                "hall_name": "قاعة الفردوس الكبرى",
                "session_time": "04:00 م - 06:00 م",
                "enrolled_count": 88,
                "center_name": self.config.center_brand_name
            }

        rendered, replaced, missing = self.interpolate_template(custom_template, sample_vars)
        e164 = self.normalize_phone_number(sample_phone or "01012345678")
        wa_url = self.generate_whatsapp_url(e164, rendered)

        return TemplateTestResponse(
            rendered_message=rendered,
            whatsapp_url=wa_url,
            variables_replaced=replaced,
            missing_variables=missing
        )


# Global Singleton Instance for backend lifecycle
scheduler_service = SchedulerService()
