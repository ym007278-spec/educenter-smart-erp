import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMIC_GRADES,
  calculateRevenueSplit,
  resolveEffectiveTeacherSplit,
  formatSmartMessageTemplate,
  filterAcademicGroups,
  buildWhatsAppLink,
  buildMonthlyGroupRevenueAnalytics,
  buildDefaultPermissionsForRole,
  canUserAccessSection,
  INITIAL_ERP_STATE,
  erpStore,
} from './erp-store';

test('ACADEMIC_GRADES includes all 12 stages from 1st Primary to 3rd Secondary', () => {
  assert.equal(ACADEMIC_GRADES.length, 12);
  assert.equal(ACADEMIC_GRADES[0], 'الصف الأول الابتدائي');
  assert.equal(ACADEMIC_GRADES[5], 'الصف السادس الابتدائي');
  assert.equal(ACADEMIC_GRADES[6], 'الصف الأول الإعدادي');
  assert.equal(ACADEMIC_GRADES[8], 'الصف الثالث الإعدادي');
  assert.equal(ACADEMIC_GRADES[9], 'الصف الأول الثانوي');
  assert.equal(ACADEMIC_GRADES[11], 'الصف الثالث الثانوي');
  assert.equal(INITIAL_ERP_STATE.config.grades.length, 12);
});

test('Super Admin User & Permissions Engine enforces role-based access, password change, disable, and delete', () => {
  erpStore.resetToDemoData();

  const superAdmin = erpStore.getCurrentUser();
  assert.equal(superAdmin.role, 'SUPER_ADMIN');
  assert.equal(canUserAccessSection(superAdmin, 'users_permissions'), true);
  assert.equal(canUserAccessSection(superAdmin, 'finance'), true);

  // Add a new Receptionist user with custom permissions (no finance, no settings)
  const addRes = erpStore.saveSystemUser({
    fullName: 'أ. هدى سمير (استقبال مسائي)',
    username: 'reception_hoda',
    password: 'pass789',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    permissions: buildDefaultPermissionsForRole('RECEPTIONIST'),
  });
  assert.equal(addRes.error, undefined);

  const createdUser = addRes.state.users.find((u) => u.username === 'reception_hoda');
  assert.ok(createdUser);
  assert.equal(canUserAccessSection(createdUser, 'users_permissions'), false);
  assert.equal(canUserAccessSection(createdUser, 'finance'), false);
  assert.equal(canUserAccessSection(createdUser, 'settings'), false);
  assert.equal(canUserAccessSection(createdUser, 'people'), true);
  assert.equal(canUserAccessSection(createdUser, 'attendance'), true);

  // Authenticate as the new user
  const loginOk = erpStore.authenticateUser('reception_hoda', 'pass789');
  assert.equal(loginOk.success, true);
  assert.equal(erpStore.getCurrentUser().username, 'reception_hoda');

  // Change password and verify login with new password
  erpStore.changeSystemUserPassword(createdUser.id, 'newSecret99');
  assert.equal(erpStore.authenticateUser('reception_hoda', 'pass789').success, false);
  assert.equal(erpStore.authenticateUser('reception_hoda', 'newSecret99').success, true);

  // Disable user account and verify login is blocked and currentUserId falls back to Super Admin
  erpStore.toggleSystemUserStatus(createdUser.id);
  const blockedLogin = erpStore.authenticateUser('reception_hoda', 'newSecret99');
  assert.equal(blockedLogin.success, false);
  assert.equal(erpStore.getCurrentUser().role, 'SUPER_ADMIN');

  // Delete user permanently
  const afterDelete = erpStore.deleteSystemUser(createdUser.id);
  assert.equal(
    afterDelete.users.some((u) => u.id === createdUser.id),
    false
  );
});

test('calculateRevenueSplit calculates standard 70/30 teacher-center split accurately', () => {
  const result = calculateRevenueSplit(1000, 0, 70);
  assert.equal(result.grossAmount, 1000);
  assert.equal(result.discountApplied, 0);
  assert.equal(result.netAmount, 1000);
  assert.equal(result.teacherShare, 700);
  assert.equal(result.centerShare, 300);
  assert.equal(result.remainingInstallment, 0);
});

test('calculateRevenueSplit applies discount before 70/30 teacher-center split', () => {
  // 400 EGP gross with 25% discount = 300 net. 70% teacher = 210, 30% center = 90
  const result = calculateRevenueSplit(400, 25, 70);
  assert.equal(result.grossAmount, 400);
  assert.equal(result.discountApplied, 100);
  assert.equal(result.netAmount, 300);
  assert.equal(result.teacherShare, 210);
  assert.equal(result.centerShare, 90);
});

test('calculateRevenueSplit handles partial installment payments and computes remaining balance', () => {
  // 400 EGP gross, 0% discount, paid 250 EGP as first installment, 70% teacher split
  const result = calculateRevenueSplit(400, 0, 70, 250);
  assert.equal(result.netRequiredAmount, 400);
  assert.equal(result.netAmount, 250);
  assert.equal(result.remainingInstallment, 150);
  assert.equal(result.teacherShare, 175);
  assert.equal(result.centerShare, 75);
});

test('resolveEffectiveTeacherSplit respects group override, subject override, and teacher default', () => {
  const teacher = {
    ...INITIAL_ERP_STATE.teachers[0],
    splitPercentage: 70,
    subjectSplitOverrides: { 'فيزياء لغات': 80 },
  };
  const normalGroup = { ...INITIAL_ERP_STATE.groups[0], customSplitPercentage: undefined };
  const customSplitGroup = { ...INITIAL_ERP_STATE.groups[0], customSplitPercentage: 75 };

  assert.equal(resolveEffectiveTeacherSplit(teacher, normalGroup, 70), 70);
  assert.equal(resolveEffectiveTeacherSplit(teacher, customSplitGroup, 70), 75);
});

test('formatSmartMessageTemplate replaces dynamic tokens cleanly', () => {
  const tpl = 'مرحباً {parentName}، الطالب {studentName} في {groupName} متبقي عليه {remainingAmount} {currency}.';
  const rendered = formatSmartMessageTemplate(tpl, {
    parentName: 'أ/ طارق',
    studentName: 'يوسف طارق',
    groupName: 'مجموعة التميز',
    remainingAmount: 150,
    currency: 'ج.م',
  });
  assert.equal(
    rendered,
    'مرحباً أ/ طارق، الطالب يوسف طارق في مجموعة التميز متبقي عليه 150 ج.م.'
  );
});

test('filterAcademicGroups filters groups by grade, subject, and teacherId', () => {
  const groups = INITIAL_ERP_STATE.groups;

  const thirdYearPhysics = filterAcademicGroups(groups, {
    grade: 'الصف الثالث الثانوي',
    subject: 'الفيزياء',
  });
  assert.equal(thirdYearPhysics.length, 1);
  assert.equal(thirdYearPhysics[0].id, 'grp-1');

  const byTeacher = filterAcademicGroups(groups, {
    teacherId: 'tch-3',
  });
  assert.equal(byTeacher.length, 1);
  assert.equal(byTeacher[0].subject, 'الرياضيات');
});

test('buildWhatsAppLink formats local 010 numbers to international 2010 format', () => {
  const link = buildWhatsAppLink('01019283741', 'مرحبا ولي الأمر');
  assert.ok(link.startsWith('https://wa.me/201019283741?text='));
});

test('buildMonthlyGroupRevenueAnalytics separates monthly revenue by educational group and supports 70/30 modes', () => {
  const { monthlySeries, groupSummaries, grandTotalMetric } = buildMonthlyGroupRevenueAnalytics(
    INITIAL_ERP_STATE.groups,
    INITIAL_ERP_STATE.transactions,
    'NET_REVENUE'
  );

  // Should have 4 chronological months (August -> November 2026)
  assert.equal(monthlySeries.length, 4);
  assert.equal(monthlySeries[0].monthKey, '2026-08');
  assert.equal(monthlySeries[3].monthKey, '2026-11');

  // November 2026 group breakdown (grp-1: 9600, grp-2: 7500, grp-3: 6800, grp-4: 5200)
  const novPoint = monthlySeries[3];
  assert.equal(novPoint['grp-1'], 9600);
  assert.equal(novPoint['grp-2'], 7500);
  assert.equal(novPoint['grp-3'], 6800);
  assert.equal(novPoint['grp-4'], 5200);
  assert.equal(novPoint.totalRevenue, 9600 + 7500 + 6800 + 5200);

  // Verify group summaries and positive month-over-month growth
  assert.equal(groupSummaries.length, 4);
  const physicsSummary = groupSummaries.find((g) => g.groupId === 'grp-1');
  assert.ok(physicsSummary);
  assert.equal(physicsSummary.currentMonthRevenue, 9600);
  assert.equal(physicsSummary.previousMonthRevenue, 8640);
  assert.ok(physicsSummary.growthPercent > 0);
  assert.ok(grandTotalMetric > 0);

  // Verify CENTER_SHARE (30%) mode
  const centerAnalytics = buildMonthlyGroupRevenueAnalytics(
    INITIAL_ERP_STATE.groups,
    INITIAL_ERP_STATE.transactions,
    'CENTER_SHARE'
  );
  assert.equal(centerAnalytics.monthlySeries[3]['grp-1'], 2880);
});

test('erpStore supports adding custom fields, dynamic categories, and bulk group attendance', () => {
  erpStore.resetToDemoData();
  const initialCustomFieldsCount = erpStore.getState().config.customFields.length;

  erpStore.addCustomField({
    entity: 'student',
    label: 'فصيلة الدم',
    type: 'select',
    options: ['A+', 'O+', 'B+'],
    showInTable: true,
  });

  assert.equal(erpStore.getState().config.customFields.length, initialCustomFieldsCount + 1);

  // Add and rename a dynamic subject category
  erpStore.addCategoryItem('subjects', 'البرمجة والذكاء الاصطناعي');
  assert.ok(erpStore.getState().config.subjects.includes('البرمجة والذكاء الاصطناعي'));

  erpStore.updateCategoryItem('subjects', 'الفيزياء', 'الفيزياء الحديثة');
  assert.ok(erpStore.getState().config.subjects.includes('الفيزياء الحديثة'));
  assert.equal(erpStore.getState().groups.find((g) => g.id === 'grp-1')?.subject, 'الفيزياء الحديثة');

  // Record bulk group attendance with 1 absent student
  const bulkResult = erpStore.recordBulkGroupAttendance({
    groupId: 'grp-1',
    absentStudentIds: ['std-1'],
  });
  assert.equal(bulkResult.absentCount, 1);
  assert.ok(bulkResult.presentCount >= 1);
});

test('Student Follow-up Card summary, exam grades, and follow-up notes work accurately', async () => {
  const { computeStudentFollowUpSummary } = await import('./erp-store');
  erpStore.resetToDemoData();

  const state0 = erpStore.getState();
  const student = state0.students.find((s) => s.id === 'std-2')!;
  const summary0 = computeStudentFollowUpSummary(student, state0);

  assert.ok(summary0.totalRequiredTuition > 0);
  assert.equal(summary0.remainingAmount, 300);
  assert.equal(
    summary0.paidAmount + summary0.remainingAmount,
    summary0.totalRequiredTuition
  );
  assert.ok(summary0.examGrades.length >= 3);
  assert.ok(summary0.followUpNotes.length >= 2);

  // Add a new exam grade and a new note
  erpStore.addStudentExamGrade('std-2', {
    examTitle: 'امتحان شهر نوفمبر الشامل',
    subject: 'الفيزياء',
    examType: 'MONTHLY',
    date: '2026-11-15',
    score: 58,
    maxScore: 60,
  });

  const afterNoteState = erpStore.addStudentFollowUpNote('std-2', {
    author: 'أ.د محمود رضوان',
    category: 'ACADEMIC',
    content: 'تطور ملحوظ في حل مسائل الدوائر الكهربية.',
  });

  const updatedStudent = afterNoteState.students.find((s) => s.id === 'std-2')!;
  const summary1 = computeStudentFollowUpSummary(updatedStudent, afterNoteState);
  assert.equal(summary1.examGrades[0].examTitle, 'امتحان شهر نوفمبر الشامل');
  assert.equal(summary1.examGrades[0].evaluation, 'ممتاز (تفوق)');
  assert.equal(
    summary1.followUpNotes[0].content,
    'تطور ملحوظ في حل مسائل الدوائر الكهربية.'
  );
});

test('Session Lifecycle Smart Triggers (Start, Cancel, End) manage active session and queue exact WhatsApp drafts', () => {
  erpStore.resetToDemoData();

  // 1. Start Session Trigger
  const startRes = erpStore.startGroupSession('grp-1');
  assert.ok(startRes.state.activeSession);
  assert.equal(startRes.state.activeSession?.groupId, 'grp-1');
  assert.equal(startRes.state.activeSession?.quickPayOpen, true);

  // 2. Cancel Session Trigger
  const beforeCancelCount = erpStore.getState().suggestions.length;
  const cancelRes = erpStore.cancelGroupSession('grp-1', 'تأجيل طارئ للغد');
  assert.ok(cancelRes.createdCount > 0);
  assert.equal(cancelRes.state.activeSession, null);
  assert.equal(
    cancelRes.state.suggestions.length,
    beforeCancelCount + cancelRes.createdCount
  );
  assert.ok(
    cancelRes.state.suggestions[0].draftMessage.includes(
      'عزيزي ولي الأمر، تم إلغاء/تأجيل حصة'
    )
  );

  // 3. End Session Trigger with absent student scan
  erpStore.startGroupSession('grp-1');
  const endRes = erpStore.endGroupSession('grp-1', ['std-4']);
  assert.equal(endRes.absentCount, 1);
  assert.equal(endRes.presentCount, 2);
  assert.equal(endRes.createdDraftIds.length, 1);
  assert.equal(endRes.state.activeSession, null);

  const generatedAbsenceDraft = endRes.state.suggestions.find(
    (s) => s.id === endRes.createdDraftIds[0]
  );
  assert.ok(generatedAbsenceDraft);
  assert.ok(
    generatedAbsenceDraft.draftMessage.includes('تنبيه: تغيب ابنكم/تاريخ اليوم')
  );
});

test('System Audit Log (سجل نشاطات النظام) records critical operations (deleting student, modifying treasury) with user name and timestamp', () => {
  erpStore.resetToDemoData();
  const initialCount = erpStore.getState().auditLogs.length;
  assert.ok(initialCount >= 5);

  // Switch active user to Receptionist Sara Mahmoud to verify employee name attribution
  erpStore.switchActiveUser('usr-recep-1');
  const activeReceptionist = erpStore.getCurrentUser();
  assert.equal(activeReceptionist.username, 'reception_sara');

  // 1. Delete a student record -> must log CRITICAL entry under STUDENTS_PEOPLE with Sara's name and timestamp
  const targetStudent = erpStore.getState().students[0];
  const afterStudentDelete = erpStore.deleteStudent(targetStudent.id);
  assert.equal(afterStudentDelete.auditLogs.length, initialCount + 1);

  const studentDeleteLog = afterStudentDelete.auditLogs[0];
  assert.equal(studentDeleteLog.category, 'STUDENTS_PEOPLE');
  assert.equal(studentDeleteLog.severity, 'CRITICAL');
  assert.equal(studentDeleteLog.actionTitle, 'حذف سجل طالب من النظام');
  assert.ok(studentDeleteLog.details.includes(targetStudent.fullName));
  assert.equal(studentDeleteLog.performedByName, activeReceptionist.fullName);
  assert.equal(studentDeleteLog.performedByUsername, 'reception_sara');
  assert.ok(studentDeleteLog.timestamp.length > 5);

  // Switch active user to Accountant Wael Kamal
  erpStore.switchActiveUser('usr-acc-1');
  const activeAccountant = erpStore.getCurrentUser();
  assert.equal(activeAccountant.username, 'accountant_wael');

  // 2. Modify a treasury transaction -> must log CRITICAL entry under TREASURY_FINANCE with Wael's name and timestamp
  const targetTx = erpStore.getState().transactions[0];
  const afterTreasuryEdit = erpStore.updateTreasuryTransaction(targetTx.id, {
    netAmount: 500,
    reason: 'تصحيح قيمة الإيصال بعد المراجعة المالية',
  });
  assert.equal(afterTreasuryEdit.auditLogs.length, initialCount + 2);

  const treasuryEditLog = afterTreasuryEdit.auditLogs[0];
  assert.equal(treasuryEditLog.category, 'TREASURY_FINANCE');
  assert.equal(treasuryEditLog.severity, 'CRITICAL');
  assert.equal(treasuryEditLog.actionTitle, 'تعديل حركة مالية في الخزنة');
  assert.ok(treasuryEditLog.details.includes(targetTx.receiptNumber));
  assert.ok(treasuryEditLog.details.includes('500'));
  assert.equal(treasuryEditLog.performedByName, activeAccountant.fullName);
  assert.equal(treasuryEditLog.performedByRole, 'ACCOUNTANT');

  // 3. Delete a treasury transaction -> must log CRITICAL entry under TREASURY_FINANCE
  const afterTreasuryDelete = erpStore.deleteTreasuryTransaction(
    targetTx.id,
    'إلغاء إيصال مكرر'
  );
  assert.equal(afterTreasuryDelete.auditLogs.length, initialCount + 3);
  assert.equal(
    afterTreasuryDelete.auditLogs[0].actionTitle,
    'حذف حركة مالية من الخزنة'
  );
  assert.equal(afterTreasuryDelete.auditLogs[0].severity, 'CRITICAL');

  // 4. Switch to Super Admin and modify user permissions -> must log CRITICAL entry 'تغيير صلاحيات مستخدم'
  erpStore.switchActiveUser('usr-admin-1');
  const superAdmin = erpStore.getCurrentUser();
  const targetUser = erpStore.getState().users.find((u) => u.id === 'usr-recep-1')!;
  const afterPermChange = erpStore.saveSystemUser({
    id: targetUser.id,
    fullName: targetUser.fullName,
    username: targetUser.username,
    password: targetUser.password,
    role: 'CUSTOM',
    status: 'ACTIVE',
    permissions: {
      ...targetUser.permissions,
      manageWhatsApp: true,
    },
  });
  assert.equal(afterPermChange.state.auditLogs.length, initialCount + 4);
  const permChangeLog = afterPermChange.state.auditLogs[0];
  assert.equal(permChangeLog.category, 'USERS_PERMISSIONS');
  assert.equal(permChangeLog.severity, 'CRITICAL');
  assert.equal(permChangeLog.actionTitle, 'تغيير صلاحيات مستخدم');
  assert.equal(permChangeLog.performedByName, superAdmin.fullName);
  assert.equal(permChangeLog.performedByUsername, 'admin');
  assert.ok(permChangeLog.timestamp.length > 5);
});



