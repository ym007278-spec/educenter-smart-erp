import React, { useState } from 'react';
import {
  UserPlus,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  X,
  ArrowUpRight,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Printer,
  Play,
  StopCircle,
} from 'lucide-react';
import {
  ERPDatabaseState,
  GroupRecord,
  erpStore,
  filterAcademicGroups,
  resolveEffectiveTeacherSplit,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';
import {
  CustomFieldBuilderModal,
  CategoryManagerModal,
  DynamicCustomFieldsInputGrid,
} from '../common/CustomizationModals';

interface AcademicTreeManagerProps {
  state: ERPDatabaseState;
  onNavigateToSuggestions: () => void;
  onNavigateToAttendance?: () => void;
}

export default function AcademicTreeManager({
  state,
  onNavigateToSuggestions,
  onNavigateToAttendance,
}: AcademicTreeManagerProps) {
  const dynamicGrades = state.config.grades;
  const dynamicSubjects = state.config.subjects;
  const groupCustomFields = state.config.customFields.filter(
    (f) => f.entity === 'group'
  );

  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGroupId, setActiveGroupId] = useState<string>(
    state.groups[0]?.id || ''
  );

  // Enroll student state
  const [studentToEnroll, setStudentToEnroll] = useState<string>('');

  // Customization Modals
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Add / Edit group modal state
  const [editingGroup, setEditingGroup] = useState<
    | (Omit<GroupRecord, 'id' | 'code' | 'studentIds'> & {
        id?: string;
        studentIds?: string[];
      })
    | null
  >(null);

  // Session cancel/reschedule alert modal
  const [sessionAlertModal, setSessionAlertModal] = useState<{
    groupId: string;
    type: 'SESSION_CANCEL' | 'SESSION_RESCHEDULE';
    note: string;
  } | null>(null);

  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Teachers filtered by selected subject/grade for clean tree mapping
  const availableTeachers = state.teachers.filter((t) => {
    if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
    if (selectedGrade !== 'ALL' && !t.grades.includes(selectedGrade))
      return false;
    return true;
  });

  const filteredGroups = filterAcademicGroups(state.groups, {
    grade: selectedGrade,
    subject: selectedSubject,
    teacherId: selectedTeacherId,
    search: searchQuery,
  });

  const activeGroup =
    filteredGroups.find((g) => g.id === activeGroupId) ||
    state.groups.find((g) => g.id === activeGroupId) ||
    filteredGroups[0] ||
    null;

  const activeGroupTeacher = state.teachers.find(
    (t) => t.id === activeGroup?.teacherId
  );
  const effectiveSplitPct = resolveEffectiveTeacherSplit(
    activeGroupTeacher,
    activeGroup,
    state.config.defaultTeacherSplit
  );

  const enrolledStudents = activeGroup
    ? state.students.filter((s) => activeGroup.studentIds.includes(s.id))
    : [];

  const unEnrolledStudents = activeGroup
    ? state.students.filter((s) => !activeGroup.studentIds.includes(s.id))
    : [];

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !studentToEnroll) return;
    erpStore.enrollStudentInGroup(studentToEnroll, activeGroup.id);
    const st = state.students.find((s) => s.id === studentToEnroll);
    setStudentToEnroll('');
    showNotice(
      `تم إلحاق الطالب "${st?.fullName || ''}" في ${activeGroup.name} وتحديث حساباته تلقائياً.`
    );
  };

  const handleRemoveStudentFromGroup = (
    studentId: string,
    studentName: string
  ) => {
    if (!activeGroup) return;
    erpStore.removeStudentFromGroup(studentId, activeGroup.id);
    showNotice(`تم إخراج الطالب "${studentName}" من ${activeGroup.name}.`);
  };

  const handleSaveGroupForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.name.trim() || !editingGroup.teacherId)
      return;
    const isEdit = Boolean(editingGroup.id);
    const nextState = erpStore.saveGroup({
      ...editingGroup,
      name: editingGroup.name.trim(),
      monthlyFee: Number(editingGroup.monthlyFee) || 300,
      maxCapacity: Number(editingGroup.maxCapacity) || 50,
    });
    if (!isEdit) {
      setActiveGroupId(nextState.groups[0]?.id || '');
    }
    setEditingGroup(null);
    showNotice(
      isEdit
        ? 'تم حفظ تعديلات المجموعة الدراسية وسعتها الاستيعابية بنجاح.'
        : 'تم إنشاء المجموعة الدراسية وربطها بالمدرس والمرحلة بنجاح.'
    );
  };

  const handleQuickAttendance = (
    studentId: string,
    status: 'PRESENT' | 'ABSENT'
  ) => {
    if (!activeGroup) return;
    erpStore.recordAttendance({
      studentId,
      groupId: activeGroup.id,
      status,
      scannedVia: 'MANUAL',
    });
    const st = state.students.find((s) => s.id === studentId);
    if (status === 'ABSENT') {
      showNotice(
        `تم تسجيل غياب "${st?.fullName}" وإنشاء مسودة رسالة واتساب لولي الأمر في صندوق اقتراحات المدير.`
      );
    } else {
      showNotice(`تم تسجيل حضور "${st?.fullName}" في حصة اليوم.`);
    }
  };

  const handleQueueGroupAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionAlertModal) return;
    const { createdCount } = erpStore.triggerGroupSessionAlert(
      sessionAlertModal.groupId,
      sessionAlertModal.type,
      sessionAlertModal.note
    );
    setSessionAlertModal(null);
    showNotice(
      `تم تجهيز ${createdCount} مسودة إشعار واتساب لأولياء أمور المجموعة وإرسالها لصندوق موافقة المدير.`
    );
  };

  const handleExportGroups = (format: 'EXCEL' | 'PDF') => {
    const cols = [
      { header: 'الكود', key: 'code' },
      { header: 'اسم المجموعة', key: 'name' },
      { header: 'المرحلة الدراسية', key: 'grade' },
      { header: 'المادة', key: 'subject' },
      { header: 'المدرس', key: 'teacherName' },
      { header: 'المواعيد والقاعة', key: 'schedule' },
      { header: 'الطلاب المسجلون', key: 'studentsCount' },
      { header: 'الاشتراك الشهري', key: 'monthlyFee' },
      ...groupCustomFields.map((cf) => ({
        header: cf.label,
        key: `cf_${cf.id}`,
      })),
    ];
    const rows = filteredGroups.map((g) => {
      const t = state.teachers.find((tch) => tch.id === g.teacherId);
      const rowObj: Record<string, any> = {
        ...g,
        teacherName: t?.fullName || '—',
        schedule: `${g.scheduleDays} (${g.scheduleTime}) - ${g.room}`,
        studentsCount: `${g.studentIds.length} / ${g.maxCapacity}`,
      };
      groupCustomFields.forEach((cf) => {
        rowObj[`cf_${cf.id}`] = g.customFields?.[cf.id] || '—';
      });
      return rowObj;
    });
    const totalStudentsInGroups = filteredGroups.reduce(
      (sum, g) => sum + g.studentIds.length,
      0
    );
    const totalCapacity = filteredGroups.reduce(
      (sum, g) => sum + g.maxCapacity,
      0
    );
    const summaryCards = [
      { label: 'عدد المجموعات الدراسية', value: `${rows.length} مجموعة` },
      {
        label: 'إجمالي المقاعد المشغولة',
        value: `${totalStudentsInGroups} طالب`,
        color: '#15803d',
      },
      {
        label: 'إجمالي السعة الاستيعابية',
        value: `${totalCapacity} مقعد`,
      },
    ];
    if (format === 'EXCEL') {
      exportToExcel('سجل_المجموعات_الدراسية', cols, rows, {
        reportTitle: 'بيان المجموعات الدراسية والربط الشجري للمراحل والمواد',
        subtitle: `${state.config.centerName} • إجمالي المجموعات: ${rows.length}`,
        section: 'ACADEMIC_GROUPS',
        summaryCards,
      });
      showNotice(
        `تم تصدير سجل المجموعات (${rows.length} مجموعة) بصيغة Excel (RTL) متضمناً شعار السنتر والترويسة الرسمية.`
      );
    } else {
      exportToPdfReport({
        title: 'بيان المجموعات الدراسية والربط الشجري للمراحل والمواد',
        subtitle: `${state.config.centerName} • إجمالي المجموعات: ${rows.length}`,
        columns: cols,
        data: rows,
        section: 'ACADEMIC_GROUPS',
        summaryCards,
      });
      showNotice(
        `تم توليد بيان المجموعات الدراسية بصيغة PDF (RTL) بخطوط عربية واضحة وشعار السنتر المعتمد.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Customization Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            الربط الشجري للمراحل والمواد والمجموعات الديناميكية
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            تحكم كامل في المراحل والمواد والمجموعات، وأحداث دورة حياة الحصة (بدء، إلغاء، وإنهاء الحصة).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomFieldModal(true)}
            className="px-3.5 py-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ إضافة حقل مخصص</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>إدارة وتعديل التصنيفات</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportGroups('EXCEL')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportGroups('PDF')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة PDF</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setEditingGroup({
                name: '',
                grade: dynamicGrades[0] || 'الصف الثالث الثانوي',
                subject: dynamicSubjects[0] || 'الفيزياء',
                teacherId: state.teachers[0]?.id || '',
                scheduleDays: 'السبت والثلاثاء',
                scheduleTime: '04:00 م - 06:00 م',
                room: 'قاعة نيوتن الكبرى (A1)',
                monthlyFee: 320,
                maxCapacity: 50,
                customFields: {},
              })
            }
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مجموعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Feedback Notice */}
      {feedbackBanner && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToSuggestions}
              className="text-xs font-semibold underline hover:text-emerald-700 cursor-pointer flex items-center gap-1"
            >
              <span>مراجعة صندوق الاقتراحات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setFeedbackBanner(null)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tree Filter Bar: Stage -> Subject -> Teacher */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Grade */}
          <div>
            <label
              htmlFor="tree-grade-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              1. المرحلة الدراسية
            </label>
            <select
              id="tree-grade-select"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedTeacherId('ALL');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                كل المراحل الدراسية ({dynamicGrades.length})
              </option>
              {dynamicGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Subject */}
          <div>
            <label
              htmlFor="tree-subject-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              2. المادة العلمية
            </label>
            <select
              id="tree-subject-select"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTeacherId('ALL');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                كل المواد الدراسية ({dynamicSubjects.length})
              </option>
              {dynamicSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Teacher */}
          <div>
            <label
              htmlFor="tree-teacher-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              3. المدرس المسؤول
            </label>
            <select
              id="tree-teacher-select"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">
                كل المدرسين المطابقين ({availableTeachers.length})
              </option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} — {t.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Search Group / Room */}
          <div>
            <label
              htmlFor="tree-group-search"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              4. بحث باسم المجموعة أو القاعة
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                id="tree-group-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="مثال: نيوتن، فيزياء، G-PHY..."
                className="w-full pr-9 pl-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View: Filtered Groups List (Right) + Selected Group Students & Actions (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Groups Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              المجموعات الدراسية المطابقة ({filteredGroups.length})
            </h3>
            {(selectedGrade !== 'ALL' ||
              selectedSubject !== 'ALL' ||
              selectedTeacherId !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedGrade('ALL');
                  setSelectedSubject('ALL');
                  setSelectedTeacherId('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                إعادة ضبط الفلتر
              </button>
            )}
          </div>

          {filteredGroups.length === 0 ? (
            <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                لا توجد مجموعات مطابقة لاختياراتك الحالية
              </p>
              <p className="text-xs text-slate-500">
                جرب تغيير المرحلة أو المادة أو اضغط على زر إضافة مجموعة جديدة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const teacher = state.teachers.find(
                  (t) => t.id === group.teacherId
                );
                const isSelected = activeGroup?.id === group.id;
                const occPct = Math.min(
                  100,
                  Math.round(
                    (group.studentIds.length / Math.max(1, group.maxCapacity)) *
                      100
                  )
                );
                return (
                  <div
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="font-mono">{group.code}</span>
                          <span aria-hidden="true">·</span>
                          <span>{group.grade}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {group.subject}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {group.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                          }}
                          aria-label={`تعديل ${group.name}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="تعديل بيانات وسعة المجموعة"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            erpStore.deleteGroup(group.id);
                            showNotice(`تم حذف المجموعة "${group.name}".`);
                          }}
                          aria-label={`حذف ${group.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="حذف المجموعة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400">المدرس: </span>
                        <span className="font-semibold">
                          {teacher?.fullName || 'غير محدد'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">الموعد: </span>
                        <span>{group.scheduleDays}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">القاعة: </span>
                        <span>{group.room}</span>
                      </div>
                      <div className="tabular-nums">
                        <span className="text-slate-400">السعة: </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {group.studentIds.length} / {group.maxCapacity} ({occPct}%)
                        </span>
                      </div>
                    </div>

                    {groupCustomFields.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        {groupCustomFields.map((cf) => {
                          const val = group.customFields?.[cf.id];
                          if (!val) return null;
                          return (
                            <span
                              key={cf.id}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {cf.label}: <strong>{val}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Group Roster & Enrollment Panel (7 cols) */}
        <div className="lg:col-span-7">
          {activeGroup ? (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              {/* Group Summary Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="font-mono">{activeGroup.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeGroup.grade}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeGroup.room}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeGroup.scheduleTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {activeGroup.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                    المدرس: <strong>{activeGroupTeacher?.fullName}</strong> ·
                    اشتراك الشهر:{' '}
                    <strong>
                      {activeGroup.monthlyFee} {state.config.currency}
                    </strong>{' '}
                    · نسبة المدرس المعتمدة للمجموعة:{' '}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {effectiveSplitPct}% (والسنتر {100 - effectiveSplitPct}%)
                    </strong>
                  </p>
                  {groupCustomFields.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-indigo-600 dark:text-indigo-400">
                      {groupCustomFields.map((cf) => (
                        <span key={cf.id}>
                          {cf.label}:{' '}
                          <strong>
                            {activeGroup.customFields?.[cf.id] || '—'}
                          </strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Automation Triggers (Start, Cancel/Postpone, End Session) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      erpStore.startGroupSession(activeGroup.id);
                      if (onNavigateToAttendance) {
                        onNavigateToAttendance();
                      } else {
                        showNotice(
                          `تم بدء حصة "${activeGroup.name}" الآن وتفعيل شاشة الحضور والتحصيل السريع.`
                        );
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>بدء الحصة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSessionAlertModal({
                        groupId: activeGroup.id,
                        type: 'SESSION_CANCEL',
                        note: '',
                      })
                    }
                    className="px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    إلغاء / تأجيل الحصة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const res = erpStore.endGroupSession(activeGroup.id);
                      showNotice(
                        `تم إنهاء حصة "${activeGroup.name}" وحصر غياب ${res.absentCount} طلاب وتوليد مسودات إشعارات الغياب في صندوق موافقات المدير.`
                      );
                    }}
                    className="px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>إنهاء الحصة</span>
                  </button>

                  <button
                    onClick={() => setEditingGroup(activeGroup)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل المجموعة</span>
                  </button>
                </div>
              </div>

              {/* Enroll Student Directly Into Group */}
              <form
                onSubmit={handleEnrollStudent}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-[220px]">
                  <label
                    htmlFor="enroll-student-select"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    إضافة طالب مسجل بالسنتر إلى هذه المجموعة بضغطة زر
                  </label>
                  <select
                    id="enroll-student-select"
                    value={studentToEnroll}
                    onChange={(e) => setStudentToEnroll(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="">
                      -- اختر طالباً لإلحاقه بالمجموعة --
                    </option>
                    {unEnrolledStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.code} - {st.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!studentToEnroll}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إدراج الطالب بالمجموعة</span>
                </button>
              </form>

              {/* Enrolled Students Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    قائمة طلاب المجموعة الحاليين ({enrolledStudents.length} من{' '}
                    {activeGroup.maxCapacity})
                  </h4>
                  <span className="text-xs text-slate-500">
                    تسجيل غياب الطالب يرسل مسودة إشعار فورية لصندوق موافقة المدير
                  </span>
                </div>

                {enrolledStudents.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500">
                    لا يوجد طلاب مسجلون في هذه المجموعة حالياً. اختر طالباً من القائمة أعلاه لإضافته.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">
                            الكود والاسم
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            ولي الأمر والهاتف
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            المديونية
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            حضور / غياب سريع
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-left">
                            إجراء
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {enrolledStudents.map((st) => (
                          <tr
                            key={st.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {st.fullName}
                              </div>
                              <div className="text-xs font-mono text-slate-500">
                                {st.code}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-slate-800 dark:text-slate-200">
                                {st.parentName}
                              </div>
                              <div className="text-xs font-mono text-slate-500 tabular-nums">
                                {st.parentPhone}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 tabular-nums">
                              {st.balanceDue > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {st.balanceDue} {state.config.currency}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  خالص
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleQuickAttendance(st.id, 'PRESENT')
                                  }
                                  className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  حاضر
                                </button>
                                <button
                                  onClick={() =>
                                    handleQuickAttendance(st.id, 'ABSENT')
                                  }
                                  className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  غائب + إشعار
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-left">
                              <button
                                onClick={() =>
                                  handleRemoveStudentFromGroup(
                                    st.id,
                                    st.fullName
                                  )
                                }
                                aria-label={`إخراج ${st.fullName} من المجموعة`}
                                className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                إزالة من المجموعة
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500">
              اختر مجموعة من القائمة الجانبية لعرض الطلاب المسجلين بها وإدارتهم.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create or Edit Group */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGroup.id
                  ? 'تعديل بيانات المجموعة وسعتها الاستيعابية'
                  : 'إضافة مجموعة دراسية جديدة'}
              </h3>
              <button
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المجموعة الدراسية
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, name: e.target.value })
                  }
                  placeholder="مثال: مجموعة الفيزياء المكثفة (أحد وأربعاء)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المرحلة الدراسية
                  </label>
                  <select
                    value={editingGroup.grade}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        grade: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {dynamicGrades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المادة العلمية
                  </label>
                  <select
                    value={editingGroup.subject}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        subject: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {dynamicSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  المدرس المسؤول عن المجموعة
                </label>
                <select
                  value={editingGroup.teacherId}
                  onChange={(e) =>
                    setEditingGroup({
                      ...editingGroup,
                      teacherId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                >
                  {state.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.subject} — النسبة الأساسية {t.splitPercentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    أيام الحضور
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGroup.scheduleDays}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        scheduleDays: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الساعة
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGroup.scheduleTime}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        scheduleTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    القاعة
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGroup.room}
                    onChange={(e) =>
                      setEditingGroup({ ...editingGroup, room: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الاشتراك الشهري ({state.config.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={editingGroup.monthlyFee}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        monthlyFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    السعة الاستيعابية
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingGroup.maxCapacity}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        maxCapacity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نسبة المدرس الخاصة بهذه المجموعة % (اتركها فارغة لاستخدام النسبة الأساسية للمدرس)
                </label>
                <input
                  type="number"
                  min={5}
                  max={99}
                  value={editingGroup.customSplitPercentage ?? ''}
                  onChange={(e) =>
                    setEditingGroup({
                      ...editingGroup,
                      customSplitPercentage: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="مثال: 75% أو 80% لهذه المجموعة فقط"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <DynamicCustomFieldsInputGrid
                entity="group"
                customFields={state.config.customFields}
                values={editingGroup.customFields}
                onChange={(nextValues) =>
                  setEditingGroup({
                    ...editingGroup,
                    customFields: nextValues,
                  })
                }
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  حفظ بيانات المجموعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel or Reschedule Group Session */}
      {sessionAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {sessionAlertModal.type === 'SESSION_CANCEL'
                  ? 'تجهيز إشعار إلغاء حصة لأولياء الأمور'
                  : 'تجهيز إشعار تعديل موعد حصة'}
              </h3>
              <button
                onClick={() => setSessionAlertModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQueueGroupAlert} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                لن يتم إرسال أي رسالة بشكل صامت؛ سيقوم النظام بتوليد مسودات رسائل واتساب لجميع طلاب المجموعة وإدراجها في{' '}
                <strong>صندوق اقتراحات المدير</strong> للمراجعة والاعتماد اليدوي.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب الإلغاء أو الموعد البديل (يظهر في نص المسودة)
                </label>
                <textarea
                  rows={3}
                  value={sessionAlertModal.note}
                  onChange={(e) =>
                    setSessionAlertModal({
                      ...sessionAlertModal,
                      note: e.target.value,
                    })
                  }
                  placeholder={
                    sessionAlertModal.type === 'SESSION_CANCEL'
                      ? 'مثال: تم تأجيل حصة اليوم لظرف طارئ وسيتم تعويضها يوم الجمعة الساعة 3 عصراً.'
                      : 'مثال: تم تقديم موعد حصة الغد لتبدأ الساعة 5 مساءً بدلاً من 6 مساءً.'
                  }
                  className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionAlertModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  توليد المسودات للمراجعة اليدوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Fields Builder Modal for Groups */}
      {showCustomFieldModal && (
        <CustomFieldBuilderModal
          entity="group"
          customFields={state.config.customFields}
          onClose={() => setShowCustomFieldModal(false)}
          onSuccess={showNotice}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <CategoryManagerModal
          state={state}
          initialTab="grades"
          onClose={() => setShowCategoryModal(false)}
          onSuccess={showNotice}
        />
      )}
    </div>
  );
}
