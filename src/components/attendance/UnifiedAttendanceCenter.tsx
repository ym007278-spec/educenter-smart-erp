import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  Users,
  CalendarPlus,
  Play,
  Ban,
  StopCircle,
  DollarSign,
  Send,
  X,
  BellRing,
} from 'lucide-react';
import {
  ERPDatabaseState,
  erpStore,
  calculateRevenueSplit,
  resolveEffectiveTeacherSplit,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';

interface UnifiedAttendanceCenterProps {
  state: ERPDatabaseState;
  onNavigateToSuggestions: () => void;
}

export default function UnifiedAttendanceCenter({
  state,
  onNavigateToSuggestions,
}: UnifiedAttendanceCenterProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    state.activeSession?.groupId || state.groups[0]?.id || ''
  );
  const [qrInputCode, setQrInputCode] = useState('');
  const [excludedAbsentIds, setExcludedAbsentIds] = useState<string[]>([]);

  // Sync selectedGroupId whenever a session is started from Dashboard or Academic Tree
  useEffect(() => {
    if (state.activeSession?.groupId) {
      setSelectedGroupId(state.activeSession.groupId);
    }
  }, [state.activeSession?.groupId]);

  const activeGroup =
    state.groups.find((g) => g.id === selectedGroupId) || state.groups[0];
  const activeTeacher = state.teachers.find(
    (t) => t.id === activeGroup?.teacherId
  );
  const groupStudents = activeGroup
    ? state.students.filter((s) => activeGroup.studentIds.includes(s.id))
    : [];

  // Quick In-Session Tuition / Installment Collection State
  const [quickPayStudentId, setQuickPayStudentId] = useState<string>(
    groupStudents[0]?.id || state.students[0]?.id || ''
  );
  const [quickPayMode, setQuickPayMode] = useState<'FULL' | 'INSTALLMENT'>(
    'FULL'
  );
  const [quickPayAmount, setQuickPayAmount] = useState<number>(
    activeGroup?.monthlyFee || 320
  );
  const [quickPayMethod, setQuickPayMethod] = useState<
    'CASH' | 'INSTAPAY' | 'VODAFONE_CASH'
  >('CASH');

  useEffect(() => {
    if (groupStudents.length > 0 && !groupStudents.some((s) => s.id === quickPayStudentId)) {
      setQuickPayStudentId(groupStudents[0].id);
    }
    if (activeGroup) {
      setQuickPayAmount(activeGroup.monthlyFee);
    }
  }, [activeGroup?.id]);

  // Make-up / Exception Session state
  const [makeupStudentId, setMakeupStudentId] = useState<string>(
    state.students[0]?.id || ''
  );
  const [makeupNote, setMakeupNote] = useState<string>(
    'حصة تعويضية عن مجموعة أخرى'
  );

  // End-of-session generated absence drafts for 1-click manager approval
  const [sessionEndReport, setSessionEndReport] = useState<{
    groupName: string;
    presentCount: number;
    absentCount: number;
    draftIds: string[];
    approved: boolean;
  } | null>(null);

  const [scanFeedback, setScanFeedback] = useState<{
    type: 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
  } | null>(null);

  const isSessionActiveForGroup =
    state.activeSession?.groupId === activeGroup?.id;
  const isQuickPayPanelOpen = Boolean(
    isSessionActiveForGroup && state.activeSession?.quickPayOpen
  );

  const toggleAbsentException = (studentId: string) => {
    setExcludedAbsentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // =========================================================================
  // Session Lifecycle Triggers (Start, Cancel, End)
  // =========================================================================

  const handleStartSession = () => {
    if (!activeGroup) return;
    erpStore.startGroupSession(activeGroup.id);
    setSessionEndReport(null);
    setScanFeedback({
      type: 'SUCCESS',
      message: `تنبيه مباشر: تم بدء حصة "${activeGroup.name}" (${activeGroup.subject}) الآن — تم فتح كشف الحضور ونافذة التحصيل السريع للمصروفات والأقساط.`,
    });
  };

  const handleCancelSession = () => {
    if (!activeGroup) return;
    const { createdCount } = erpStore.cancelGroupSession(
      activeGroup.id,
      'نظراً لظرف طارئ، تم إلغاء/تأجيل حصة اليوم وسيتم تعويضها في الموعد القادم.'
    );
    setSessionEndReport(null);
    setScanFeedback({
      type: 'WARNING',
      message: `تم إلغاء/تأجيل حصة "${activeGroup.name}" وتوليد ${createdCount} مسودة واتساب جاهزة في صندوق موافقات المدير بصيغة: "عزيزي ولي الأمر، تم إلغاء/تأجيل حصة ${activeGroup.subject} المقرر لها اليوم..."`,
    });
  };

  const handleEndSession = () => {
    if (!activeGroup) return;
    const res = erpStore.endGroupSession(
      activeGroup.id,
      excludedAbsentIds.length > 0 ? excludedAbsentIds : undefined
    );
    setExcludedAbsentIds([]);
    setSessionEndReport({
      groupName: activeGroup.name,
      presentCount: res.presentCount,
      absentCount: res.absentCount,
      draftIds: res.createdDraftIds,
      approved: false,
    });
    setScanFeedback({
      type: 'WARNING',
      message: `تم إنهاء حصة "${activeGroup.name}": تم إثبات حضور ${res.presentCount} طالب، وحصر غياب ${res.absentCount} طلاب وتوليد مسودات إشعارات غياب مجمعة في صندوق موافقات المدير.`,
    });
  };

  const handleApproveSessionAbsenceDrafts = () => {
    if (!sessionEndReport || sessionEndReport.draftIds.length === 0) return;
    erpStore.approveSuggestions(sessionEndReport.draftIds);
    setSessionEndReport({
      ...sessionEndReport,
      approved: true,
    });
    setScanFeedback({
      type: 'SUCCESS',
      message: `تمت الموافقة واعتماد إرسال ${sessionEndReport.draftIds.length} إشعار غياب لأولياء الأمور بنجاح.`,
    });
  };

  const handleQuickInSessionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !quickPayStudentId) return;
    const st = state.students.find((s) => s.id === quickPayStudentId);
    const gross = activeGroup.monthlyFee;
    const paid =
      quickPayMode === 'INSTALLMENT'
        ? Math.min(gross, Math.max(10, Number(quickPayAmount) || 0))
        : undefined;

    erpStore.collectStudentPayment({
      studentId: quickPayStudentId,
      groupId: activeGroup.id,
      grossAmount: gross,
      paidAmount: paid,
      discountPercent: st?.discountPercent || 0,
      paymentMethod: quickPayMethod,
    });

    // Also mark student PRESENT in this active session automatically
    erpStore.recordAttendance({
      studentId: quickPayStudentId,
      groupId: activeGroup.id,
      status: 'PRESENT',
      scannedVia: 'MANUAL',
      note: 'تحصيل سريع أثناء الحصة',
    });

    const splitPct = resolveEffectiveTeacherSplit(
      activeTeacher,
      activeGroup,
      state.config.defaultTeacherSplit
    );
    const calc = calculateRevenueSplit(
      gross,
      st?.discountPercent || 0,
      splitPct,
      paid
    );

    setScanFeedback({
      type: 'SUCCESS',
      message: `تحصيل فوري أثناء الحصة: تم استلام ${calc.netAmount} ${state.config.currency} من الطالب "${st?.fullName}" وإيداعها في الخزنة فوراً (حصة المدرس: ${calc.teacherShare} | السنتر: ${calc.centerShare}).`,
    });
  };

  const handleBulkGroupAttendance = () => {
    if (!activeGroup) return;
    const { presentCount, absentCount } = erpStore.recordBulkGroupAttendance({
      groupId: activeGroup.id,
      absentStudentIds: excludedAbsentIds,
    });
    setExcludedAbsentIds([]);
    if (absentCount > 0) {
      setScanFeedback({
        type: 'WARNING',
        message: `تم تسجيل حضور جماعي لـ ${presentCount} طالب، وتسجيل غياب ${absentCount} طلاب مستثنين مع توليد مسودات واتساب لأولياء أمورهم.`,
      });
    } else {
      setScanFeedback({
        type: 'SUCCESS',
        message: `تم تسجيل حضور جماعي لكامل طلاب المجموعة (${presentCount} طلاب) بضغطة زر واحدة.`,
      });
    }
  };

  const handleMakeupSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupStudentId || !activeGroup) return;
    const st = state.students.find((s) => s.id === makeupStudentId);
    erpStore.recordAttendance({
      studentId: makeupStudentId,
      groupId: activeGroup.id,
      status: 'PRESENT',
      scannedVia: 'MAKEUP_SESSION',
      sessionType: 'MAKEUP_EXCEPTION',
      note: makeupNote.trim() || 'حصة تعويضية / استثنائية',
    });
    setScanFeedback({
      type: 'SUCCESS',
      message: `تم تسجيل حضور استثنائي (تخلفات/تعويض) للطالب "${st?.fullName}" في ${activeGroup.name}.`,
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInputCode.trim() || !activeGroup) return;

    const cleanCode = qrInputCode.trim().toUpperCase();
    const matchedStudent = state.students.find(
      (s) =>
        s.code.toUpperCase() === cleanCode ||
        s.id.toUpperCase() === cleanCode ||
        s.phone === cleanCode ||
        s.fullName.includes(qrInputCode.trim())
    );

    if (!matchedStudent) {
      setScanFeedback({
        type: 'ERROR',
        message: `لم يتم العثور على طالب مسجل بالكود "${qrInputCode}". تأكد من صحة الكود.`,
      });
      return;
    }

    erpStore.recordAttendance({
      studentId: matchedStudent.id,
      groupId: activeGroup.id,
      status: 'PRESENT',
      scannedVia: 'QR_CODE',
    });

    setQrInputCode('');
    setScanFeedback({
      type: 'SUCCESS',
      message: `تم تسجيل حضور الطالب "${matchedStudent.fullName}" (${matchedStudent.code}) بنجاح في ${activeGroup.name}.`,
    });
  };

  const handleMarkStatus = (
    studentId: string,
    status: 'PRESENT' | 'ABSENT'
  ) => {
    if (!activeGroup) return;
    const st = state.students.find((s) => s.id === studentId);
    erpStore.recordAttendance({
      studentId,
      groupId: activeGroup.id,
      status,
      scannedVia: 'MANUAL',
    });

    if (status === 'ABSENT') {
      setScanFeedback({
        type: 'WARNING',
        message: `تم تسجيل غياب "${st?.fullName}" وتوليد مسودة إشعار واتساب لولي الأمر في صندوق اقتراحات المدير.`,
      });
    } else {
      setScanFeedback({
        type: 'SUCCESS',
        message: `تم إثبات حضور "${st?.fullName}" في كشف المجموعة.`,
      });
    }
  };

  const handleExportAttendance = (format: 'EXCEL' | 'PDF') => {
    const rows = state.attendance.map((entry) => {
      const st = state.students.find((s) => s.id === entry.studentId);
      const grp = state.groups.find((g) => g.id === entry.groupId);
      const methodLabel =
        entry.scannedVia === 'QR_CODE'
          ? 'ماسح QR'
          : entry.scannedVia === 'BULK_GROUP'
          ? 'حضور جماعي'
          : entry.scannedVia === 'MAKEUP_SESSION'
          ? `حصة تعويضية (${entry.note || ''})`
          : 'يدوي';
      return {
        studentCode: st?.code || '—',
        studentName: st?.fullName || '—',
        groupName: grp?.name || '—',
        date: entry.date,
        time: entry.time,
        statusLabel: entry.status === 'PRESENT' ? 'حاضر' : 'غائب',
        method: methodLabel,
      };
    });

    const cols = [
      { header: 'كود الطالب', key: 'studentCode' },
      { header: 'اسم الطالب', key: 'studentName' },
      { header: 'المجموعة الدراسية', key: 'groupName' },
      { header: 'التاريخ', key: 'date' },
      { header: 'الوقت', key: 'time' },
      { header: 'الحالة', key: 'statusLabel' },
      { header: 'وسيلة التسجيل / ملاحظات', key: 'method' },
    ];

    const presentCount = state.attendance.filter(
      (a) => a.status === 'PRESENT'
    ).length;
    const absentCount = state.attendance.filter(
      (a) => a.status === 'ABSENT'
    ).length;
    const attendanceRate =
      rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 100;

    const summaryCards = [
      { label: 'إجمالي سجلات الحضور', value: `${rows.length} سجل` },
      {
        label: 'إجمالي الحاضرين',
        value: `${presentCount} طالب`,
        color: '#15803d',
      },
      {
        label: 'إجمالي الغياب',
        value: `${absentCount} طالب`,
        color: absentCount > 0 ? '#e11d48' : '#15803d',
      },
      {
        label: 'نسبة الالتزام والحضور',
        value: `${attendanceRate}%`,
      },
    ];

    const subtitleText = `${state.config.centerName} • المجموعة النشطة: ${
      activeGroup?.name || 'جميع المجموعات'
    }`;

    if (format === 'EXCEL') {
      exportToExcel('سجل_الحضور_والغياب', cols, rows, {
        reportTitle:
          'سجل الحضور والانصراف بالـ QR والتسجيل الجماعي والتعويضات',
        subtitle: subtitleText,
        section: 'ATTENDANCE',
        summaryCards,
      });
      setScanFeedback({
        type: 'SUCCESS',
        message: `تم تصدير سجل الحضور والغياب (${rows.length} سجل) بصيغة Excel (RTL) متضمناً شعار السنتر والترويسة الرسمية.`,
      });
    } else {
      exportToPdfReport({
        title: 'سجل الحضور والانصراف بالـ QR والتسجيل الجماعي والتعويضات',
        subtitle: subtitleText,
        columns: cols,
        data: rows,
        section: 'ATTENDANCE',
        summaryCards,
      });
      setScanFeedback({
        type: 'SUCCESS',
        message: `تم توليد كشف الحضور والغياب بصيغة PDF (RTL) بخطوط عربية واضحة وشعار السنتر المعتمد.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            الحضور المرن ومحرك دورة حياة الحصة الذكي (QR · تحصيل فوري · تقارير الغياب)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            ابدأ الحصة لفتح الحضور والتحصيل الفوري، أو ألغِ الحصة لإشعار أولياء الأمور، أو أنهِ الحصة لحصر الغياب آلياً.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportAttendance('EXCEL')}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => handleExportAttendance('PDF')}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة كشف الحضور PDF</span>
          </button>
        </div>
      </div>

      {/* Session Lifecycle & Smart Automation Control Bar */}
      {activeGroup && (
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSessionActiveForGroup
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">
                  دورة حياة الحصة والأوتوميشن الذكي:
                </span>
                {isSessionActiveForGroup && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                    الحصة منعقدة الآن منذ {state.activeSession?.startedAt}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-extrabold text-white mt-0.5">
                {activeGroup.name} — {activeGroup.subject} ({activeTeacher?.fullName})
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartSession}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>بدء الحصة + فتح التحصيل السريع</span>
            </button>

            <button
              type="button"
              onClick={handleCancelSession}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>إلغاء / تأجيل الحصة</span>
            </button>

            <button
              type="button"
              onClick={handleEndSession}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>إنهاء الحصة وتقرير الغياب</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {scanFeedback && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between gap-4 text-xs font-semibold ${
            scanFeedback.type === 'SUCCESS'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : scanFeedback.type === 'WARNING'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scanFeedback.type === 'ERROR' ? (
              <XCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{scanFeedback.message}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {scanFeedback.type === 'WARNING' && (
              <button
                onClick={onNavigateToSuggestions}
                className="underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>فتح صندوق موافقات المدير</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setScanFeedback(null)}
              className="cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Session End Report & 1-Click Bulk Absence Approval Banner */}
      {sessionEndReport && (
        <div className="p-5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
              تقرير نهاية الحصة الآلي — {sessionEndReport.groupName}
            </h4>
            <p className="text-xs text-amber-900 dark:text-amber-300">
              تم إثبات حضور <strong>{sessionEndReport.presentCount} طلاب</strong>، وحصر غياب{' '}
              <strong>{sessionEndReport.absentCount} طلاب</strong> وتجهيز مسودات واتساب لأولياء أمورهم بصيغة:{' '}
              <em>&quot;تنبيه: تغيب ابنكم/تاريخ اليوم عن حضور حصة...&quot;</em>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!sessionEndReport.approved && sessionEndReport.draftIds.length > 0 ? (
              <button
                type="button"
                onClick={handleApproveSessionAbsenceDrafts}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  موافقة وإرسال إشعارات الغياب للمحدد ({sessionEndReport.draftIds.length})
                </span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                تم اعتماد وإرسال إشعارات الغياب
              </span>
            )}

            <button
              type="button"
              onClick={onNavigateToSuggestions}
              className="px-3 py-2 rounded-lg border border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer flex items-center gap-1"
            >
              <span>معاينة في صندوق الموافقات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick In-Session Tuition / Installment Collection Window (Opens automatically on Session Start) */}
      {isQuickPayPanelOpen && activeGroup && (
        <div className="p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  نافذة التحصيل السريع للمصروفات والأقساط أثناء انعقاد الحصة ({activeGroup.name})
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  سجل مصروفات أو أقساط الطلاب الحاضرين في هذه الحصة لتدخل الخزنة فوراً وتُسجل حضور الطالب تلقائياً.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => erpStore.setQuickPayOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="إخفاء نافذة التحصيل السريع"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={handleQuickInSessionPayment}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اختر الطالب الحاضر بالحصة
              </label>
              <select
                value={quickPayStudentId}
                onChange={(e) => setQuickPayStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              >
                {(groupStudents.length > 0 ? groupStudents : state.students).map(
                  (st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.code}) — متبقي: {st.balanceDue}{' '}
                      {state.config.currency}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نوع السداد
              </label>
              <select
                value={quickPayMode}
                onChange={(e) =>
                  setQuickPayMode(e.target.value as 'FULL' | 'INSTALLMENT')
                }
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="FULL">
                  اشتراك كامل ({activeGroup.monthlyFee} {state.config.currency})
                </option>
                <option value="INSTALLMENT">دفعة / قسط جزئي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المبلغ المحصل ({state.config.currency})
              </label>
              <input
                type="number"
                min={10}
                disabled={quickPayMode === 'FULL'}
                value={
                  quickPayMode === 'FULL'
                    ? activeGroup.monthlyFee
                    : quickPayAmount
                }
                onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>تحصيل فوري للخزنة</span>
            </button>
          </form>
        </div>
      )}

      {/* Main Split: Fast QR Scanner + Make-up Session (5 cols) | Bulk & Group Live Roster (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scanner Panel + Make-up Session Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* QR / Barcode Station */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  محطة قراءة الكود السريعة (QR / Barcode)
                </h3>
                <p className="text-xs text-slate-500">
                  اختر المجموعة ثم مرر الكارت أو اكتب كود الطالب (مثل ST-1001)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                المجموعة المنعقدة حالياً
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setExcludedAbsentIds([]);
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                {state.groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name} ({grp.room} · {grp.scheduleTime})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  إدخال كود الطالب أو رقم الهاتف (يدعم قارئ الباركود)
                </label>
                <input
                  type="text"
                  value={qrInputCode}
                  onChange={(e) => setQrInputCode(e.target.value)}
                  placeholder="مثال: ST-1001 أو ST-1002 ثم اضغط Enter..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                تأكيد حضور الطالب بالـ QR
              </button>
            </form>

            {/* Quick Demo Chips for 1-Click Scan Testing */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 mb-2">
                محاكاة مسح سريع لكارت طالب:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {state.students.slice(0, 4).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      if (!activeGroup) return;
                      erpStore.recordAttendance({
                        studentId: st.id,
                        groupId: activeGroup.id,
                        status: 'PRESENT',
                        scannedVia: 'QR_CODE',
                      });
                      setScanFeedback({
                        type: 'SUCCESS',
                        message: `تم مسح كارت الطالب "${st.fullName}" (${st.code}) وإثبات حضوره.`,
                      });
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs text-slate-700 dark:text-slate-300 font-mono cursor-pointer"
                  >
                    {st.code} ({st.fullName.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Make-up / Exception Session Box */}
          <form
            onSubmit={handleMakeupSessionSubmit}
            className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <CalendarPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  تسجيل حصة استثنائية / تخلفات وتعويض
                </h3>
                <p className="text-xs text-slate-500">
                  سجل حضور طالب يحضر تعويضاً في هذه المجموعة حتى لو كان مسجلاً بموعد آخر
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اختر الطالب الحاضر للتعويض
              </label>
              <select
                value={makeupStudentId}
                onChange={(e) => setMakeupStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                {state.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.code} — {st.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                سبب التعويض / ملاحظة الحصة الاستثنائية
              </label>
              <input
                type="text"
                value={makeupNote}
                onChange={(e) => setMakeupNote(e.target.value)}
                placeholder="مثال: تعويض غياب حصة السبت بعذر..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إثبات حضور حصة استثنائية / تعويض
            </button>
          </form>
        </div>

        {/* Right Column: Group Roster with 1-Click Bulk Attendance & Recent Scans */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Group Roster + Bulk Attendance */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  كشف طلاب المجموعة: {activeGroup?.name} ({groupStudents.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حدد الغائبين فقط من العمود الأول ثم اضغط &quot;تسجيل حضور جماعي&quot; أو &quot;إنهاء الحصة&quot;.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBulkGroupAttendance}
                disabled={groupStudents.length === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                <span>
                  تسجيل حضور جماعي للمجموعة (واستثناء {excludedAbsentIds.length}{' '}
                  غائبين)
                </span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">
                      استثناء كغائب
                    </th>
                    <th className="py-2.5 px-3 font-semibold">الكود والاسم</th>
                    <th className="py-2.5 px-3 font-semibold">حالة السداد</th>
                    <th className="py-2.5 px-3 font-semibold text-left">
                      تسجيل فردي سريع
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {groupStudents.map((st) => {
                    const isExcludedAbsent = excludedAbsentIds.includes(st.id);
                    return (
                      <tr
                        key={st.id}
                        className={
                          isExcludedAbsent
                            ? 'bg-rose-50/50 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-2.5 px-3">
                          <label className="inline-flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isExcludedAbsent}
                              onChange={() => toggleAbsentException(st.id)}
                              className="w-4 h-4 rounded accent-rose-600"
                            />
                            <span>
                              {isExcludedAbsent ? 'غائب مستثنى' : 'حاضر'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {st.fullName}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {st.code}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-xs">
                          {st.balanceDue > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              متبقي {st.balanceDue} {state.config.currency}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              مسدد بالكامل
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleMarkStatus(st.id, 'PRESENT')}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>حاضر</span>
                            </button>
                            <button
                              onClick={() => handleMarkStatus(st.id, 'ABSENT')}
                              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>غائب + مسودة</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Attendance Log */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              آخر حركات المسح والحضور المسجلة ({state.attendance.length})
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">الطالب</th>
                    <th className="py-2 px-3">المجموعة</th>
                    <th className="py-2 px-3">الوقت</th>
                    <th className="py-2 px-3">الحالة والوسيلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {state.attendance.slice(0, 10).map((att) => {
                    const st = state.students.find(
                      (s) => s.id === att.studentId
                    );
                    const grp = state.groups.find((g) => g.id === att.groupId);
                    const viaLabel =
                      att.scannedVia === 'QR_CODE'
                        ? 'QR'
                        : att.scannedVia === 'BULK_GROUP'
                        ? 'جماعي'
                        : att.scannedVia === 'MAKEUP_SESSION'
                        ? `تعويض (${att.note || ''})`
                        : 'يدوي';
                    return (
                      <tr key={att.id}>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {st?.fullName || 'طالب'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {grp?.name || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 tabular-nums">
                          {att.date} · {att.time}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {att.status === 'PRESENT' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              حاضر ({viaLabel})
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">
                              غائب ({viaLabel})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
