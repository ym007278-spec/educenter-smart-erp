/**
 * EduCenter Smart ERP - Task Scheduler & Automated WhatsApp Engine
 * Decoupled pure logic for template parsing, variables interpolation,
 * phone formatting, and schedule rule evaluation.
 */

export interface SchedulerConfig {
  overdueFeesEnabled: boolean;
  overdueDaysThreshold: number;
  overdueScheduleCron: string;
  overdueMessageTemplate: string;

  teacherSessionsEnabled: boolean;
  teacherLeadMinutes: number;
  teacherScheduleCron: string;
  teacherMessageTemplate: string;

  autoDispatchWhatsApp: boolean;
  senderPhoneNumber: string;
  centerBrandName: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface StudentOverdueRecord {
  studentId: string;
  studentName: string;
  studentCode: string;
  parentName: string;
  parentPhone: string;
  amountDue: number;
  billingPeriod: string;
  dueDate: string;
  daysOverdue: number;
  groupName: string;
}

export interface TeacherSessionRecord {
  sessionId: string;
  teacherId: string;
  teacherName: string;
  teacherPhone: string;
  subjectName: string;
  groupName: string;
  hallName: string;
  sessionTime: string;
  enrolledCount: number;
  minutesUntil: number;
}

export interface WhatsAppDispatchItem {
  id: string;
  jobType: 'OVERDUE_FEES' | 'UPCOMING_SESSION' | 'MANUAL_TEST';
  recipientRole: 'STUDENT_PARENT' | 'TEACHER';
  recipientName: string;
  recipientPhone: string;
  renderedMessage: string;
  status: 'DELIVERED' | 'SENT' | 'QUEUED' | 'FAILED';
  dispatchedAt: string;
  whatsappUrl: string;
  metadata?: Record<string, any>;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  overdueFeesEnabled: true,
  overdueDaysThreshold: 3,
  overdueScheduleCron: '0 10 * * *',
  overdueMessageTemplate:
    'السلام عليكم ورحمة الله، ولي أمر الطالب {student_name} المحترم. نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها {amount_due} ج.م عن ({billing_period})، وكان موعد سدادها المحدد {due_date}. شاكرين حسن تعاونكم وحرصكم الدائم. — إدارة {center_name}',
  teacherSessionsEnabled: true,
  teacherLeadMinutes: 60,
  teacherScheduleCron: '*/30 * * * *',
  teacherMessageTemplate:
    "أهلاً بك أستاذ {teacher_name}. تذكير بموعد حصتك القادمة اليوم لمجموعة '{group_name}' في تمام الساعة {session_time} بـ {hall_name}. إجمالي الطلاب المسجلين: {enrolled_count} طالب. تمنياتنا بحصة موفقة! — {center_name}",
  autoDispatchWhatsApp: true,
  senderPhoneNumber: '+201019882233',
  centerBrandName: 'سنتر الفردوس التعليمي الذكي',
  lastRunAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  nextRunAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
};

/**
 * Normalizes phone numbers to standard E.164 without dashes or spaces.
 * E.g. '01012345678' -> '+201012345678'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9+]/g, '');
  if (digitsOnly.startsWith('+')) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('0')) {
    return `+20${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith('20') && digitsOnly.length === 12) {
    return `+${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

/**
 * Generates direct WhatsApp click-to-chat URL: https://wa.me/{phone}?text={encoded}
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/**
 * Replaces `{token}` tokens safely with provided dictionary values.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number>
): { rendered: string; replaced: string[]; missing: string[] } {
  const tokenRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const replaced: string[] = [];
  const missing: string[] = [];

  const rendered = template.replace(tokenRegex, (match, key) => {
    if (key in variables && variables[key] !== undefined && variables[key] !== null) {
      if (!replaced.includes(key)) replaced.push(key);
      return String(variables[key]);
    }
    if (!missing.includes(key)) missing.push(key);
    return match;
  });

  return { rendered, replaced, missing };
}

/**
 * Filters overdue student candidates exceeding the configured threshold.
 */
export function filterOverdueStudents(
  students: StudentOverdueRecord[],
  thresholdDays: number
): StudentOverdueRecord[] {
  return students.filter((s) => s.daysOverdue >= thresholdDays);
}

/**
 * Filters upcoming teacher classes that fall within the advance lead time window.
 */
export function filterUpcomingSessions(
  sessions: TeacherSessionRecord[],
  leadMinutes: number
): TeacherSessionRecord[] {
  return sessions.filter((s) => s.minutesUntil > 0 && s.minutesUntil <= leadMinutes);
}

/**
 * Runs batch generation of WhatsApp dispatch items for both overdue students and upcoming sessions.
 */
export function executeSchedulerEvaluation(
  config: SchedulerConfig,
  overdueStudents: StudentOverdueRecord[],
  upcomingSessions: TeacherSessionRecord[]
): {
  dispatched: WhatsAppDispatchItem[];
  overdueCount: number;
  teacherSessionCount: number;
} {
  const dispatched: WhatsAppDispatchItem[] = [];
  let overdueCount = 0;
  let teacherSessionCount = 0;
  const nowIso = new Date().toISOString();

  // 1. Process Overdue Students
  if (config.overdueFeesEnabled) {
    const candidates = filterOverdueStudents(overdueStudents, config.overdueDaysThreshold);
    for (const student of candidates) {
      const vars = {
        student_name: student.studentName,
        student_code: student.studentCode,
        parent_name: student.parentName,
        amount_due: student.amountDue.toFixed(2),
        billing_period: student.billingPeriod,
        due_date: student.dueDate,
        days_overdue: student.daysOverdue,
        group_name: student.groupName,
        center_name: config.centerBrandName
      };

      const { rendered } = interpolateTemplate(config.overdueMessageTemplate, vars);
      const phone = normalizePhoneNumber(student.parentPhone);
      const url = generateWhatsAppUrl(phone, rendered);

      dispatched.push({
        id: `DISP-FEE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        jobType: 'OVERDUE_FEES',
        recipientRole: 'STUDENT_PARENT',
        recipientName: `ولي أمر الطالب: ${student.studentName}`,
        recipientPhone: phone,
        renderedMessage: rendered,
        status: 'DELIVERED',
        dispatchedAt: nowIso,
        whatsappUrl: url,
        metadata: {
          studentId: student.studentId,
          amountDue: student.amountDue,
          daysOverdue: student.daysOverdue
        }
      });
      overdueCount++;
    }
  }

  // 2. Process Upcoming Sessions for Teachers
  if (config.teacherSessionsEnabled) {
    const candidates = filterUpcomingSessions(upcomingSessions, config.teacherLeadMinutes);
    for (const session of candidates) {
      const vars = {
        teacher_name: session.teacherName,
        subject_name: session.subjectName,
        group_name: session.groupName,
        hall_name: session.hallName,
        session_time: session.sessionTime,
        enrolled_count: session.enrolledCount,
        center_name: config.centerBrandName
      };

      const { rendered } = interpolateTemplate(config.teacherMessageTemplate, vars);
      const phone = normalizePhoneNumber(session.teacherPhone);
      const url = generateWhatsAppUrl(phone, rendered);

      dispatched.push({
        id: `DISP-TCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        jobType: 'UPCOMING_SESSION',
        recipientRole: 'TEACHER',
        recipientName: session.teacherName,
        recipientPhone: phone,
        renderedMessage: rendered,
        status: 'DELIVERED',
        dispatchedAt: nowIso,
        whatsappUrl: url,
        metadata: {
          sessionId: session.sessionId,
          groupName: session.groupName,
          hallName: session.hallName
        }
      });
      teacherSessionCount++;
    }
  }

  return { dispatched, overdueCount, teacherSessionCount };
}
