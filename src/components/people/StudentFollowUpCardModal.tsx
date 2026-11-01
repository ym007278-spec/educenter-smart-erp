import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Award,
  FileText,
  DollarSign,
  UserCheck,
  Plus,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import {
  ERPDatabaseState,
  StudentRecord,
  erpStore,
  computeStudentFollowUpSummary,
  buildWhatsAppLink,
} from '../../lib/erp-store';
import {
  exportStudentFollowUpCardPdf,
  exportToExcel,
} from '../../lib/export-engine';

interface StudentFollowUpCardModalProps {
  studentId: string;
  state: ERPDatabaseState;
  onClose: () => void;
}

export default function StudentFollowUpCardModal({
  studentId,
  state,
  onClose,
}: StudentFollowUpCardModalProps) {
  const student: StudentRecord | undefined = state.students.find(
    (s) => s.id === studentId
  );

  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [examForm, setExamForm] = useState({
    examTitle: 'اختبار الأسبوع الثاني - نوفمبر',
    subject: student?.enrolledSubjects[0] || state.config.subjects[0] || 'الفيزياء',
    examType: 'WEEKLY' as 'MONTHLY' | 'WEEKLY',
    date: new Date().toISOString().slice(0, 10),
    score: 19,
    maxScore: 20,
  });

  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    author: 'إدارة السنتر والمدرس المشرف',
    category: 'ACADEMIC' as 'ACADEMIC' | 'BEHAVIORAL',
    content: '',
  });

  const [toast, setToast] = useState<string | null>(null);

  if (!student) return null;

  const summary = computeStudentFollowUpSummary(student, state);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handlePrintCardPdf = () => {
    exportStudentFollowUpCardPdf({
      centerName: state.config.centerName,
      centerPhone: state.config.centerPhone,
      currency: state.config.currency,
      studentName: student.fullName,
      studentCode: student.code,
      grade: student.grade,
      studentPhone: student.phone,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      enrolledGroups: summary.enrolledGroups.map(
        (g) => `${g.name} (${g.subject})`
      ),
      totalRequiredTuition: summary.totalRequiredTuition,
      paidAmount: summary.paidAmount,
      remainingAmount: summary.remainingAmount,
      paymentStatusLabel: summary.paymentStatusLabel,
      attendancePresent: summary.attendanceCount.present,
      attendanceAbsent: summary.attendanceCount.absent,
      examGrades: summary.examGrades,
      followUpNotes: summary.followUpNotes,
    });
    triggerToast(
      'تم تجهيز بطاقة متابعة الطالب بتنسيق PDF للطباعة الفورية وتسليمها لولي الأمر.'
    );
  };

  const handleExportCardExcel = () => {
    const cols = [
      { header: 'الاختبار / البيان', key: 'title' },
      { header: 'المادة / التصنيف', key: 'subject' },
      { header: 'التاريخ', key: 'date' },
      { header: 'الدرجة / القيمة', key: 'scoreLabel' },
      { header: 'التقييم / الملاحظات', key: 'evaluation' },
    ];
    const rows = [
      {
        title: `بيانات الطالب: ${student.fullName} (${student.code})`,
        subject: student.grade,
        date: student.registeredAt,
        scoreLabel: `هاتف ولي الأمر: ${student.parentPhone}`,
        evaluation: summary.enrolledGroups.map((g) => g.name).join(' + '),
      },
      {
        title: 'الوضع المالي والاشتراكات',
        subject: summary.paymentStatusLabel,
        date: new Date().toISOString().slice(0, 10),
        scoreLabel: `المطلوب: ${summary.totalRequiredTuition} | المدفوع: ${summary.paidAmount}`,
        evaluation: `المتبقي: ${summary.remainingAmount} ${state.config.currency}`,
      },
      ...summary.examGrades.map((ex) => ({
        title: ex.examTitle,
        subject: `${ex.subject} (${ex.examType === 'MONTHLY' ? 'شهري' : 'أسبوعي'})`,
        date: ex.date,
        scoreLabel: `${ex.score} / ${ex.maxScore}`,
        evaluation: ex.evaluation,
      })),
      ...summary.followUpNotes.map((nt) => ({
        title:
          nt.category === 'ACADEMIC' ? 'ملاحظة أكاديمية' : 'ملاحظة سلوكية',
        subject: nt.author,
        date: nt.date,
        scoreLabel: '—',
        evaluation: nt.content,
      })),
    ];
    exportToExcel(
      `بطاقة_متابعة_${student.code}_${student.fullName}`,
      cols,
      rows,
      {
        reportTitle: `بطاقة متابعة الطالب الشاملة - ${student.fullName} (${student.code})`,
        subtitle: `${state.config.centerName} • المرحلة: ${student.grade}`,
        section: 'STUDENT_CARD',
        summaryCards: [
          {
            label: 'إجمالي المصروفات المطلوبة',
            value: `${summary.totalRequiredTuition} ${state.config.currency}`,
          },
          {
            label: 'المبلغ المدفوع',
            value: `${summary.paidAmount} ${state.config.currency}`,
            color: '#15803d',
          },
          {
            label: 'المتبقي المستحق',
            value: `${summary.remainingAmount} ${state.config.currency}`,
            color: summary.remainingAmount > 0 ? '#e11d48' : '#15803d',
          },
          {
            label: 'حالة السداد',
            value: summary.paymentStatusLabel,
          },
        ],
      }
    );
    triggerToast(
      'تم تصدير بطاقة متابعة الطالب في ملف Excel (RTL) متضمناً شعار السنتر والترويسة الرسمية.'
    );
  };

  const handleAddExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.examTitle.trim()) return;
    erpStore.addStudentExamGrade(student.id, {
      examTitle: examForm.examTitle.trim(),
      subject: examForm.subject,
      examType: examForm.examType,
      date: examForm.date,
      score: Number(examForm.score) || 0,
      maxScore: Math.max(1, Number(examForm.maxScore) || 20),
    });
    setShowAddExamForm(false);
    triggerToast('تم تسجيل درجة الامتحان وتحديث بطاقة المتابعة بنجاح.');
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    erpStore.addStudentFollowUpNote(student.id, {
      author: noteForm.author.trim() || 'إدارة السنتر',
      category: noteForm.category,
      content: noteForm.content.trim(),
    });
    setNoteForm({ ...noteForm, content: '' });
    setShowAddNoteForm(false);
    triggerToast('تمت إضافة الملاحظة إلى سجل متابعة الطالب بنجاح.');
  };

  const whatsappReportText = `بطاقة متابعة الطالب (${student.fullName} - ${student.code}) من ${state.config.centerName}:
• المرحلة: ${student.grade}
• الوضع المالي: المطلوب ${summary.totalRequiredTuition} ${state.config.currency} | المدفوع ${summary.paidAmount} ${state.config.currency} | المتبقي ${summary.remainingAmount} ${state.config.currency}
• آخر تقييم: ${summary.examGrades[0]?.examTitle || 'امتحان دوري'} (${summary.examGrades[0]?.score || 0}/${summary.examGrades[0]?.maxScore || 0} - ${summary.examGrades[0]?.evaluation || 'ممتاز'})
• ملاحظات الإدارة: ${summary.followUpNotes[0]?.content || 'طالب ملتزم ومتميز'}`;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Top Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {state.config.exportBranding?.showLogoInExports !== false &&
              state.config.exportBranding?.logoDataUrl && (
                <img
                  src={state.config.exportBranding.logoDataUrl}
                  alt="شعار السنتر"
                  className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0"
                />
              )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-mono font-bold">
                  {student.code}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  بطاقة متابعة الطالب الشاملة: {student.fullName}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {state.config.centerName} •{' '}
                {state.config.exportBranding?.headerSubtitle ||
                  'وثيقة رسمية تجمع البيانات الأساسية، الوضع المالي، سجل درجات الامتحانات، وملاحظات المدرسين.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCardPdf}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة البطاقة PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportCardExcel}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>

            <a
              href={buildWhatsAppLink(
                student.parentPhone || student.phone,
                whatsappReportText
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>إرسال لولي الأمر</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق بطاقة المتابعة"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {toast && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* 1. Basic Student Info Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>1. البيانات الأساسية والأكاديمية للطالب</span>
            </h4>
            <span className="text-xs text-slate-500 tabular-nums">
              الحضور: <strong className="text-emerald-600">{summary.attendanceCount.present} حصة</strong> · الغياب:{' '}
              <strong className="text-rose-600">{summary.attendanceCount.absent} حصة</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-slate-500">اسم الطالب والكود</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                {student.fullName} ({student.code})
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-slate-500">المرحلة الدراسية</div>
              <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {student.grade}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-slate-500">ولي الأمر ورقم الهاتف</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {student.parentName} — <span className="font-mono">{student.parentPhone}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-slate-500">المجموعات المسجل بها</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {summary.enrolledGroups.length > 0
                  ? summary.enrolledGroups.map((g) => g.name).join(' · ')
                  : 'غير مسجل بمجموعة حالياً'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Financial Status Section */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>2. الوضع المالي والاشتراكات الدراسية</span>
            </h4>
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                summary.remainingAmount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              {summary.paymentStatusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500">
                إجمالي المصروفات المطلوبة (بعد الخصم {student.discountPercent}%)
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                {summary.totalRequiredTuition.toLocaleString()}{' '}
                {state.config.currency}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                المبلغ المدفوع بالخزينة
              </div>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                {summary.paidAmount.toLocaleString()} {state.config.currency}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                summary.remainingAmount > 0
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-600 dark:text-slate-300">
                المبلغ المتبقي (الأقساط المستحقة)
              </div>
              <div
                className={`text-lg font-extrabold mt-1 ${
                  summary.remainingAmount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {summary.remainingAmount.toLocaleString()}{' '}
                {state.config.currency}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Exam Grades Table */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>
                3. سجل الدرجات (الامتحانات الشهرية والأسبوعية ومستوى التقييم)
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddExamForm((p) => !p)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ رصد درجة امتحان جديدة</span>
            </button>
          </div>

          {showAddExamForm && (
            <form
              onSubmit={handleAddExamSubmit}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  اسم الامتحان
                </label>
                <input
                  type="text"
                  required
                  value={examForm.examTitle}
                  onChange={(e) =>
                    setExamForm({ ...examForm, examTitle: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  المادة والنوع
                </label>
                <select
                  value={examForm.examType}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      examType: e.target.value as 'MONTHLY' | 'WEEKLY',
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="MONTHLY">امتحان شهري</option>
                  <option value="WEEKLY">اختبار أسبوعي</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    الدرجة
                  </label>
                  <input
                    type="number"
                    required
                    value={examForm.score}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        score: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    من
                  </label>
                  <input
                    type="number"
                    required
                    value={examForm.maxScore}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        maxScore: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                حفظ الدرجة
              </button>
            </form>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">اسم الاختبار</th>
                  <th className="py-2.5 px-3 font-semibold">المادة والنوع</th>
                  <th className="py-2.5 px-3 font-semibold">التاريخ</th>
                  <th className="py-2.5 px-3 font-semibold">الدرجة والنسبة</th>
                  <th className="py-2.5 px-3 font-semibold">مستوى التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {summary.examGrades.map((ex) => {
                  const pct =
                    ex.maxScore > 0
                      ? Math.round((ex.score / ex.maxScore) * 100)
                      : 0;
                  return (
                    <tr
                      key={ex.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {ex.examTitle}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {ex.subject} ·{' '}
                        {ex.examType === 'MONTHLY'
                          ? 'امتحان شهري'
                          : 'اختبار أسبوعي'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                        {ex.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {ex.score} / {ex.maxScore} ({pct}%)
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            pct >= 85
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : pct >= 65
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {ex.evaluation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Admin & Teacher Notes Box */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>
                4. ملاحظات الإدارة والمدرسين (الملاحظات السلوكية والأكاديمية)
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddNoteForm((p) => !p)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة ملاحظة جديدة</span>
            </button>
          </div>

          {showAddNoteForm && (
            <form
              onSubmit={handleAddNoteSubmit}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نوع الملاحظة
                  </label>
                  <select
                    value={noteForm.category}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        category: e.target.value as 'ACADEMIC' | 'BEHAVIORAL',
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="ACADEMIC">ملاحظة أكاديمية وعلمية</option>
                    <option value="BEHAVIORAL">ملاحظة سلوكية وانضباطية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    المسجل (المدرس / الإدارة)
                  </label>
                  <input
                    type="text"
                    required
                    value={noteForm.author}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, author: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>
              <div>
                <textarea
                  rows={2}
                  required
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, content: e.target.value })
                  }
                  placeholder="اكتب الملاحظة الأكاديمية أو السلوكية لتظهر في بطاقة متابعة الطالب..."
                  className="w-full p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ الملاحظة بالبطاقة
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {summary.followUpNotes.map((nt) => (
              <div
                key={nt.id}
                className={`p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 border-r-4 ${
                  nt.category === 'ACADEMIC'
                    ? 'border-r-blue-600'
                    : 'border-r-emerald-600'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {nt.category === 'ACADEMIC'
                      ? 'تقييم أكاديمي وعلمي'
                      : 'تقييم سلوكي وانضباطي'}{' '}
                    — {nt.author}
                  </span>
                  <span className="font-mono">{nt.date}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {nt.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
