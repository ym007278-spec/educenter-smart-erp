import React, { useState } from 'react';
import {
  Users,
  BookOpen,
  DollarSign,
  MessageSquare,
  ArrowUpRight,
  Play,
  Ban,
  StopCircle,
  CheckCircle2,
  Send,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import {
  ERPDatabaseState,
  ModuleSectionKey,
  erpStore,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';
import SystemAuditLogPanel from '../roles/SystemAuditLogPanel';

interface DashboardWidgetsProps {
  state?: ERPDatabaseState;
  onNavigateToView: (view: ModuleSectionKey) => void;
}

export default function DashboardWidgets({
  state: propState,
  onNavigateToView,
}: DashboardWidgetsProps) {
  const [internalState, setInternalState] = useState<ERPDatabaseState>(() =>
    erpStore.getState()
  );
  const state = propState || internalState;

  const [lifecycleBanner, setLifecycleBanner] = useState<{
    message: string;
    draftIds?: string[];
  } | null>(null);

  React.useEffect(() => {
    if (propState) return;
    return erpStore.subscribe(setInternalState);
  }, [propState]);

  const activeStudentsCount = state.students.filter(
    (s) => s.status === 'ACTIVE'
  ).length;
  const activeTeachersCount = state.teachers.filter(
    (t) => t.status === 'ACTIVE'
  ).length;

  const tuitionTx = state.transactions.filter(
    (t) => t.type === 'TUITION_COLLECTION'
  );
  const expenseTx = state.transactions.filter(
    (t) => t.type === 'EXPENSE' || t.type === 'PAYROLL'
  );
  const centerShareGross = tuitionTx.reduce((sum, t) => sum + t.centerShare, 0);
  const totalExpenses = expenseTx.reduce((sum, t) => sum + t.netAmount, 0);
  const netTreasuryCash = centerShareGross - totalExpenses;
  const totalTeacherShares = tuitionTx.reduce(
    (sum, t) => sum + t.teacherShare,
    0
  );

  const pendingSuggestions = state.suggestions.filter(
    (s) => s.status === 'PENDING'
  );

  const handleStartGroupSession = (groupId: string) => {
    erpStore.startGroupSession(groupId);
    onNavigateToView('attendance');
  };

  const handleCancelGroupSession = (
    groupId: string,
    groupName: string,
    subject: string
  ) => {
    const { createdCount } = erpStore.cancelGroupSession(groupId);
    setLifecycleBanner({
      message: `تم إلغاء/تأجيل حصة "${groupName}" وتوليد ${createdCount} مسودة واتساب جاهزة في صندوق موافقات المدير بصيغة: "عزيزي ولي الأمر، تم إلغاء/تأجيل حصة ${subject} المقرر لها اليوم..."`,
    });
  };

  const handleEndGroupSession = (groupId: string, groupName: string) => {
    const res = erpStore.endGroupSession(groupId);
    setLifecycleBanner({
      message: `تم إنهاء حصة "${groupName}" وحصر غياب ${res.absentCount} طلاب وتوليد مسودات إشعارات غياب مجمعة في صندوق موافقات المدير.`,
      draftIds: res.createdDraftIds,
    });
  };

  const handleExportDashboardSummary = (format: 'EXCEL' | 'PDF') => {
    const cols = [
      { header: 'كود المجموعة', key: 'code' },
      { header: 'اسم المجموعة', key: 'name' },
      { header: 'المرحلة والمادة', key: 'gradeSubject' },
      { header: 'المدرس المسؤول', key: 'teacherName' },
      { header: 'الموعد والقاعة', key: 'schedule' },
      { header: 'عدد الطلاب', key: 'occupancy' },
      { header: 'اشتراك الشهر', key: 'fee' },
    ];
    const rows = state.groups.map((grp) => {
      const tch = state.teachers.find((t) => t.id === grp.teacherId);
      return {
        code: grp.code,
        name: grp.name,
        gradeSubject: `${grp.grade} - ${grp.subject}`,
        teacherName: tch?.fullName || '—',
        schedule: `${grp.scheduleDays} (${grp.scheduleTime}) - ${grp.room}`,
        occupancy: `${grp.studentIds.length} / ${grp.maxCapacity}`,
        fee: `${grp.monthlyFee} ${state.config.currency}`,
      };
    });

    if (format === 'EXCEL') {
      exportToExcel('ملخص_مجموعات_السنتر', cols, rows);
    } else {
      exportToPdfReport({
        title: 'التقرير التنفيذي الشامل لمجموعات السنتر ومؤشرات الأداء',
        subtitle: `${state.config.centerName} • صافي الخزينة: ${netTreasuryCash} ${state.config.currency}`,
        columns: cols,
        data: rows,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            نظرة عامة على {state.config.centerName}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            جميع البيانات والأرقام أدناه متصلة حياً بشاشات المجموعات، الأفراد، الخزنة، وسجل الرقابة الأمنية للعمليات الحرجة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportDashboardSummary('EXCEL')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => handleExportDashboardSummary('PDF')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة التقرير PDF</span>
          </button>
          <button
            onClick={() => onNavigateToView('academic_tree')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            <span>فتح شجرة المجموعات والطلاب</span>
          </button>
          <button
            onClick={() => onNavigateToView('suggestions')}
            className="px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            <span>مراجعة رسائل الواتساب المعلقة ({pendingSuggestions.length})</span>
          </button>
        </div>
      </div>

      {/* Session Lifecycle Banner */}
      {lifecycleBanner && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lifecycleBanner.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {lifecycleBanner.draftIds && lifecycleBanner.draftIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  erpStore.approveSuggestions(lifecycleBanner.draftIds!);
                  setLifecycleBanner({
                    message: `تمت الموافقة وإرسال ${lifecycleBanner.draftIds!.length} إشعار غياب لأولياء الأمور بنجاح.`,
                  });
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>موافقة وإرسال إشعارات الغياب للمحدد</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateToView('suggestions')}
              className="underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>فتح صندوق الموافقات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLifecycleBanner(null)}
              className="text-slate-500 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* 4 Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateToView('people')}
          className="text-right p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>الطلاب المسجلون والكادر</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {activeStudentsCount} طالب نشط
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {activeTeachersCount} مدرسين · {state.staff.length} موظفين
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToView('academic_tree')}
          className="text-right p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>المجموعات الدراسية والربط الشجري</span>
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {state.groups.length} مجموعات
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {state.config.grades.length} مرحلة دراسية (1 ابتدائي - 3 ثانوي) · {state.config.subjects.length} مواد
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToView('finance')}
          className="text-right p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>صافي خزينة السنتر (بعد النسب)</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {netTreasuryCash.toLocaleString()} {state.config.currency}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            حصص المدرسين (70%): {totalTeacherShares.toLocaleString()}{' '}
            {state.config.currency}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToView('suggestions')}
          className="text-right p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>مسودات واتساب بانتظار الاعتماد</span>
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {pendingSuggestions.length} مسودة معلقة
          </div>
          <div className="text-xs text-slate-500 mt-1">
            مراجعة وموافقة يدوية قبل الإرسال
          </div>
        </button>
      </div>

      {/* Main Content Split: Active Groups Schedule & Session Triggers (7 cols) + Pending WhatsApp Queue Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Groups Table with Session Lifecycle Smart Triggers */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                جدول المجموعات الدراسية ومحرك دورة حياة الحصة الذكي
              </h3>
              <p className="text-xs text-slate-500">
                اضغط &quot;بدء الحصة&quot; لفتح الحضور والتحصيل الفوري، أو &quot;إلغاء&quot; أو &quot;إنهاء الحصة&quot; لتوليد إشعارات الغياب
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('academic_tree')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>إدارة المجموعات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">المجموعة والمرحلة</th>
                  <th className="py-2.5 px-3 font-semibold">الموعد والقاعة</th>
                  <th className="py-2.5 px-3 font-semibold">الطلاب</th>
                  <th className="py-2.5 px-3 font-semibold text-left">
                    أحداث الحصة الذكية
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {state.groups.map((grp) => {
                  const tch = state.teachers.find((t) => t.id === grp.teacherId);
                  return (
                    <tr
                      key={grp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {grp.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {grp.grade} · {grp.subject} ({tch?.fullName || '—'})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                        <div>{grp.scheduleDays}</div>
                        <div className="text-slate-500">
                          {grp.scheduleTime} · {grp.room}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-bold text-slate-900 dark:text-white">
                        {grp.studentIds.length} / {grp.maxCapacity}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartGroupSession(grp.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="بدء الحصة وفتح الحضور والتحصيل السريع"
                          >
                            <Play className="w-3 h-3" />
                            <span>بدء الحصة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCancelGroupSession(grp.id, grp.name, grp.subject)
                            }
                            className="px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="إلغاء / تأجيل الحصة وتوليد مسودات واتساب"
                          >
                            <Ban className="w-3 h-3" />
                            <span>إلغاء / تأجيل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEndGroupSession(grp.id, grp.name)}
                            className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="إنهاء الحصة وتقرير الغياب التلقائي"
                          >
                            <StopCircle className="w-3 h-3" />
                            <span>إنهاء الحصة</span>
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

        {/* Pending Approval Suggestions Preview */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                أحدث اقتراحات رسائل الواتساب للمدير
              </h3>
              <p className="text-xs text-slate-500">
                تتطلب مراجعتك وتأكيدك اليدوي قبل الإرسال
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('suggestions')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>فتح الصندوق</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingSuggestions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              لا توجد رسائل معلقة حالياً. تم اعتماد كافة الإشعارات.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSuggestions.slice(0, 3).map((sug) => (
                <div
                  key={sug.id}
                  onClick={() => onNavigateToView('suggestions')}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {sug.title}
                    </span>
                    <span>{sug.createdAt}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    الطالب: <strong>{sug.studentName}</strong> · ولي الأمر:{' '}
                    {sug.parentName}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {sug.draftMessage}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          System Audit Log (سجل نشاطات النظام والعمليات الحرجة للمدير)
          ===================================================================== */}
      <SystemAuditLogPanel state={state} />
    </div>
  );
}

