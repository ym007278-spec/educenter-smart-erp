/**
 * Unit Tests for Scheduler Engine Logic
 * Uses node:test and node:assert/strict as mandated by Ultra Mode.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  generateWhatsAppUrl,
  interpolateTemplate,
  filterOverdueStudents,
  filterUpcomingSessions,
  executeSchedulerEvaluation,
  DEFAULT_SCHEDULER_CONFIG,
  StudentOverdueRecord,
  TeacherSessionRecord
} from './scheduler-engine';

test('normalizePhoneNumber formats local Egyptian phone numbers to international E.164', () => {
  assert.equal(normalizePhoneNumber('01019283741'), '+201019283741');
  assert.equal(normalizePhoneNumber('+201122334455'), '+201122334455');
  assert.equal(normalizePhoneNumber('012 345 6789'), '+20123456789');
  assert.equal(normalizePhoneNumber('201552341298'), '+201552341298');
});

test('generateWhatsAppUrl builds valid wa.me URI with URL-encoded Arabic text', () => {
  const phone = '+201019283741';
  const message = 'مرحباً بكم في السنتر';
  const url = generateWhatsAppUrl(phone, message);

  assert.ok(url.startsWith('https://wa.me/201019283741?text='));
  assert.ok(url.includes(encodeURIComponent('مرحباً بكم في السنتر')));
});

test('interpolateTemplate safely replaces tokens and reports replaced and missing keys', () => {
  const template = 'أهلاً يا {student_name}، المبلغ هو {amount_due} ج.م في سنتر {center_name}. كودك: {missing_code}';
  const variables = {
    student_name: 'يوسف أحمد',
    amount_due: 350,
    center_name: 'الفردوس'
  };

  const { rendered, replaced, missing } = interpolateTemplate(template, variables);

  assert.equal(rendered, 'أهلاً يا يوسف أحمد، المبلغ هو 350 ج.م في سنتر الفردوس. كودك: {missing_code}');
  assert.deepEqual(replaced.sort(), ['amount_due', 'center_name', 'student_name'].sort());
  assert.deepEqual(missing, ['missing_code']);
});

test('filterOverdueStudents only includes students with overdue days >= threshold', () => {
  const dummyStudents: StudentOverdueRecord[] = [
    {
      studentId: '1',
      studentName: 'طالب 1',
      studentCode: 'C1',
      parentName: 'ولي 1',
      parentPhone: '0101',
      amountDue: 200,
      billingPeriod: 'أكتوبر',
      dueDate: '2026-10-25',
      daysOverdue: 2,
      groupName: 'فيزياء'
    },
    {
      studentId: '2',
      studentName: 'طالب 2',
      studentCode: 'C2',
      parentName: 'ولي 2',
      parentPhone: '0102',
      amountDue: 400,
      billingPeriod: 'أكتوبر',
      dueDate: '2026-10-20',
      daysOverdue: 7,
      groupName: 'كيمياء'
    },
    {
      studentId: '3',
      studentName: 'طالب 3',
      studentCode: 'C3',
      parentName: 'ولي 3',
      parentPhone: '0103',
      amountDue: 500,
      billingPeriod: 'أكتوبر',
      dueDate: '2026-10-18',
      daysOverdue: 12,
      groupName: 'أحياء'
    }
  ];

  const filtered = filterOverdueStudents(dummyStudents, 5);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].studentId, '2');
  assert.equal(filtered[1].studentId, '3');
});

test('filterUpcomingSessions filters classes scheduled within leadMinutes window', () => {
  const dummySessions: TeacherSessionRecord[] = [
    {
      sessionId: 's1',
      teacherId: 't1',
      teacherName: 'أ. محمد',
      teacherPhone: '0101',
      subjectName: 'فيزياء',
      groupName: 'مجموعة 1',
      hallName: 'قاعة 1',
      sessionTime: '04:00',
      enrolledCount: 40,
      minutesUntil: 25 // within 60 min
    },
    {
      sessionId: 's2',
      teacherId: 't2',
      teacherName: 'أ. علي',
      teacherPhone: '0102',
      subjectName: 'كيمياء',
      groupName: 'مجموعة 2',
      hallName: 'قاعة 2',
      sessionTime: '06:00',
      enrolledCount: 50,
      minutesUntil: 120 // outside 60 min
    }
  ];

  const filtered = filterUpcomingSessions(dummySessions, 60);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].sessionId, 's1');
});

test('executeSchedulerEvaluation executes both student and teacher rules and generates valid dispatch logs', () => {
  const dummyStudents: StudentOverdueRecord[] = [
    {
      studentId: 'std-1',
      studentName: 'سارة خالد',
      studentCode: 'STU-100',
      parentName: 'خالد عبد الرحمن',
      parentPhone: '01012345678',
      amountDue: 300,
      billingPeriod: 'شهر أكتوبر',
      dueDate: '2026-10-20',
      daysOverdue: 8,
      groupName: 'أحياء 3 ث'
    }
  ];

  const dummySessions: TeacherSessionRecord[] = [
    {
      sessionId: 'ses-1',
      teacherId: 'tch-1',
      teacherName: 'أ. طارق عبد الله',
      teacherPhone: '01234567890',
      subjectName: 'رياضيات',
      groupName: 'تفاضل 3 ث',
      hallName: 'قاعة النخبة',
      sessionTime: '05:00 م',
      enrolledCount: 75,
      minutesUntil: 40
    }
  ];

  const result = executeSchedulerEvaluation(DEFAULT_SCHEDULER_CONFIG, dummyStudents, dummySessions);

  assert.equal(result.overdueCount, 1);
  assert.equal(result.teacherSessionCount, 1);
  assert.equal(result.dispatched.length, 2);

  const studentLog = result.dispatched.find((d) => d.jobType === 'OVERDUE_FEES');
  assert.ok(studentLog);
  assert.ok(studentLog.renderedMessage.includes('سارة خالد'));
  assert.ok(studentLog.renderedMessage.includes('300.00'));
  assert.ok(studentLog.whatsappUrl.startsWith('https://wa.me/201012345678'));

  const teacherLog = result.dispatched.find((d) => d.jobType === 'UPCOMING_SESSION');
  assert.ok(teacherLog);
  assert.ok(teacherLog.renderedMessage.includes('أ. طارق عبد الله'));
  assert.ok(teacherLog.renderedMessage.includes('قاعة النخبة'));
  assert.ok(teacherLog.whatsappUrl.startsWith('https://wa.me/201234567890'));
});
