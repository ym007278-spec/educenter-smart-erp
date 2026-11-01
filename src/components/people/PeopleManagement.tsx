import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  MessageSquare,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  X,
  DollarSign,
  Sparkles,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  ERPDatabaseState,
  StudentRecord,
  TeacherRecord,
  StaffRecord,
  ModuleSectionKey,
  erpStore,
  buildWhatsAppLink,
  buildDefaultStaffPermissions,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';
import {
  CustomFieldBuilderModal,
  CategoryManagerModal,
  DynamicCustomFieldsInputGrid,
} from '../common/CustomizationModals';
import StudentFollowUpCardModal from './StudentFollowUpCardModal';

interface PeopleManagementProps {
  state?: ERPDatabaseState;
}

const MODULE_PERMISSION_LABELS: { key: ModuleSectionKey; label: string }[] = [
  { key: 'dashboard', label: 'الرئيسية والمؤشرات' },
  { key: 'academic_tree', label: 'المجموعات والشجرة' },
  { key: 'people', label: 'إدارة الأفراد' },
  { key: 'finance', label: 'الخزنة والماليات' },
  { key: 'attendance', label: 'الحضور بالـ QR' },
  { key: 'suggestions', label: 'صندوق الواتساب' },
  { key: 'settings', label: 'الإعدادات العامة' },
];

export default function PeopleManagement({
  state: propState,
}: PeopleManagementProps) {
  const [internalState, setInternalState] = useState<ERPDatabaseState>(() =>
    erpStore.getState()
  );
  const state = propState || internalState;

  React.useEffect(() => {
    if (propState) return;
    return erpStore.subscribe(setInternalState);
  }, [propState]);

  const dynamicGrades = state.config.grades;
  const dynamicSubjects = state.config.subjects;

  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'staff'>(
    'students'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  // Customization Modals
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Student Follow-up Card Modal
  const [followUpStudentId, setFollowUpStudentId] = useState<string | null>(
    null
  );

  // Student Modal
  const [editingStudent, setEditingStudent] = useState<
    (Omit<StudentRecord, 'id' | 'code' | 'registeredAt'> & { id?: string }) | null
  >(null);

  // Teacher Modal
  const [editingTeacher, setEditingTeacher] = useState<
    (Omit<TeacherRecord, 'id' | 'code' | 'hiredAt'> & { id?: string }) | null
  >(null);

  // Staff Modal
  const [editingStaff, setEditingStaff] = useState<
    (Omit<StaffRecord, 'id' | 'code' | 'hiredAt'> & { id?: string }) | null
  >(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const studentCustomFields = state.config.customFields.filter(
    (f) => f.entity === 'student'
  );
  const teacherCustomFields = state.config.customFields.filter(
    (f) => f.entity === 'teacher'
  );
  const staffCustomFields = state.config.customFields.filter(
    (f) => f.entity === 'staff'
  );

  // Filtered Lists
  const filteredStudents = state.students.filter((st) => {
    if (gradeFilter !== 'ALL' && st.grade !== gradeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.fullName.toLowerCase().includes(q) ||
      st.code.toLowerCase().includes(q) ||
      st.phone.includes(q) ||
      st.parentPhone.includes(q)
    );
  });

  const filteredTeachers = state.teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.phone.includes(q)
    );
  });

  const filteredStaff = state.staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.roleTitle.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  // Save Handlers
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.fullName.trim()) return;
    erpStore.saveStudent(editingStudent);
    setEditingStudent(null);
    showToast('تم حفظ بيانات الطالب والحقول المخصصة وتحديث المجموعات بنجاح.');
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.fullName.trim()) return;
    erpStore.saveTeacher(editingTeacher);
    setEditingTeacher(null);
    showToast('تم حفظ بيانات المدرس ونسبته المالية المرنة بنجاح.');
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.fullName.trim()) return;
    erpStore.saveStaff(editingStaff);
    setEditingStaff(null);
    showToast('تم حفظ بيانات الموظف وصلاحياته التفصيلية بنجاح.');
  };

  const handlePayStaffSalary = (staffMember: StaffRecord) => {
    erpStore.recordOperationalExpense({
      title: `صرف راتب شهري - ${staffMember.fullName} (${staffMember.roleTitle})`,
      category: 'رواتب وأجور الموظفين',
      amount: staffMember.monthlySalary,
      type: 'PAYROLL',
      staffId: staffMember.id,
      paymentMethod: 'CASH',
    });
    showToast(
      `تم صرف راتب "${staffMember.fullName}" بقيمة ${staffMember.monthlySalary} ${state.config.currency} وخصمه من الخزينة.`
    );
  };

  // Export Handlers (including dynamic custom fields, RTL summary cards, and Center Logo/Branding)
  const handleExportCurrentTab = (format: 'EXCEL' | 'PDF') => {
    const currency = state.config.currency;
    if (activeTab === 'students') {
      const cols = [
        { header: 'الكود', key: 'code' },
        { header: 'اسم الطالب', key: 'fullName' },
        { header: 'المرحلة الدراسية', key: 'grade' },
        { header: 'هاتف ولي الأمر', key: 'parentPhone' },
        { header: 'المواد المسجلة', key: 'subjects' },
        { header: 'الاشتراك الشهري', key: 'monthlyTuition' },
        { header: 'المتبقي المستحق', key: 'balanceDue' },
        ...studentCustomFields.map((cf) => ({
          header: cf.label,
          key: `cf_${cf.id}`,
        })),
      ];
      const rows = filteredStudents.map((s) => {
        const rowObj: Record<string, any> = {
          ...s,
          subjects: s.enrolledSubjects.join(' + '),
        };
        studentCustomFields.forEach((cf) => {
          rowObj[`cf_${cf.id}`] = s.customFields?.[cf.id] || '—';
        });
        return rowObj;
      });
      const totalMonthly = filteredStudents.reduce(
        (sum, s) => sum + (Number(s.monthlyTuition) || 0),
        0
      );
      const totalOverdue = filteredStudents.reduce(
        (sum, s) => sum + (Number(s.balanceDue) || 0),
        0
      );
      const settledCount = filteredStudents.filter(
        (s) => (Number(s.balanceDue) || 0) <= 0
      ).length;
      const summaryCards = [
        { label: 'إجمالي الطلاب بالكشف', value: `${rows.length} طالب` },
        {
          label: 'إجمالي الاشتراكات الشهرية',
          value: `${totalMonthly.toLocaleString()} ${currency}`,
        },
        {
          label: 'إجمالي المتأخرات المستحقة',
          value: `${totalOverdue.toLocaleString()} ${currency}`,
          color: totalOverdue > 0 ? '#e11d48' : '#15803d',
        },
        {
          label: 'المنتظمون بالسداد الكامل',
          value: `${settledCount} من ${rows.length}`,
          color: '#15803d',
        },
      ];

      if (format === 'EXCEL') {
        exportToExcel('سجل_الطلاب', cols, rows, {
          reportTitle: 'تقرير شؤون الطلاب والحسابات المستحقة',
          subtitle: `${state.config.centerName} - إجمالي الطلاب: ${rows.length}`,
          section: 'STUDENTS',
          summaryCards,
        });
        showToast(
          `تم تصدير سجل الطلاب (${rows.length} طالب) بصيغة Excel (RTL) متضمناً شعار السنتر والترويسة المخصصة.`
        );
      } else {
        exportToPdfReport({
          title: 'تقرير شؤون الطلاب والحسابات المستحقة',
          subtitle: `${state.config.centerName} - إجمالي الطلاب: ${rows.length}`,
          columns: cols,
          data: rows,
          section: 'STUDENTS',
          summaryCards,
        });
        showToast(
          `تم توليد تقرير الطلاب بصيغة PDF (RTL) بخطوط عربية واضحة وشعار السنتر المعتمد.`
        );
      }
    } else if (activeTab === 'teachers') {
      const cols = [
        { header: 'الكود', key: 'code' },
        { header: 'اسم المدرس', key: 'fullName' },
        { header: 'المادة', key: 'subject' },
        { header: 'الهاتف', key: 'phone' },
        { header: 'نسبة المدرس %', key: 'splitPercentage' },
        { header: 'سعر الشهر', key: 'monthlyGroupFee' },
        ...teacherCustomFields.map((cf) => ({
          header: cf.label,
          key: `cf_${cf.id}`,
        })),
      ];
      const rows = filteredTeachers.map((t) => {
        const rowObj: Record<string, any> = { ...t };
        teacherCustomFields.forEach((cf) => {
          rowObj[`cf_${cf.id}`] = t.customFields?.[cf.id] || '—';
        });
        return rowObj;
      });
      const avgSplit =
        filteredTeachers.length > 0
          ? Math.round(
              filteredTeachers.reduce((s, t) => s + t.splitPercentage, 0) /
                filteredTeachers.length
            )
          : state.config.defaultTeacherSplit;
      const summaryCards = [
        { label: 'إجمالي المدرسين', value: `${rows.length} مدرس` },
        { label: 'متوسط نسبة المدرس', value: `${avgSplit}%` },
        { label: 'متوسط حصة السنتر', value: `${100 - avgSplit}%` },
      ];
      if (format === 'EXCEL') {
        exportToExcel('سجل_المدرسين', cols, rows, {
          reportTitle: 'بيان هيئة التدريس ونسب الأرباح المرنة',
          subtitle: `${state.config.centerName}`,
          section: 'TEACHERS',
          summaryCards,
        });
        showToast(
          `تم تصدير سجل المدرسين (${rows.length} مدرس) بصيغة Excel (RTL) مع شعار السنتر.`
        );
      } else {
        exportToPdfReport({
          title: 'بيان هيئة التدريس ونسب الأرباح المرنة',
          subtitle: `${state.config.centerName}`,
          columns: cols,
          data: rows,
          section: 'TEACHERS',
          summaryCards,
        });
        showToast(
          `تم توليد بيان هيئة التدريس بصيغة PDF (RTL) مع شعار السنتر والترويسة الرسمية.`
        );
      }
    } else {
      const cols = [
        { header: 'الكود', key: 'code' },
        { header: 'اسم الموظف', key: 'fullName' },
        { header: 'المسمى الوظيفي', key: 'roleTitle' },
        { header: 'الهاتف', key: 'phone' },
        { header: 'الراتب الشهري', key: 'monthlySalary' },
        ...staffCustomFields.map((cf) => ({
          header: cf.label,
          key: `cf_${cf.id}`,
        })),
      ];
      const rows = filteredStaff.map((s) => {
        const rowObj: Record<string, any> = { ...s };
        staffCustomFields.forEach((cf) => {
          rowObj[`cf_${cf.id}`] = s.customFields?.[cf.id] || '—';
        });
        return rowObj;
      });
      const totalPayroll = filteredStaff.reduce(
        (sum, s) => sum + (Number(s.monthlySalary) || 0),
        0
      );
      const summaryCards = [
        { label: 'عدد الموظفين', value: `${rows.length} موظف` },
        {
          label: 'إجمالي الرواتب الشهرية',
          value: `${totalPayroll.toLocaleString()} ${currency}`,
        },
      ];
      if (format === 'EXCEL') {
        exportToExcel('سجل_الموظفين', cols, rows, {
          reportTitle: 'كشف رواتب وصلاحيات موظفي السنتر',
          subtitle: `${state.config.centerName}`,
          section: 'STAFF',
          summaryCards,
        });
        showToast(
          `تم تصدير كشف الموظفين (${rows.length} موظف) بصيغة Excel (RTL) مع شعار السنتر.`
        );
      } else {
        exportToPdfReport({
          title: 'كشف رواتب وصلاحيات موظفي السنتر',
          subtitle: `${state.config.centerName}`,
          columns: cols,
          data: rows,
          section: 'STAFF',
          summaryCards,
        });
        showToast(
          `تم توليد كشف الموظفين بصيغة PDF (RTL) مع شعار السنتر والترويسة الرسمية.`
        );
      }
    }
  };

  const currentEntityForCustomField =
    activeTab === 'students'
      ? 'student'
      : activeTab === 'teachers'
      ? 'teacher'
      : 'staff';

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            إدارة الأفراد الشاملة (الطلاب · المدرسين · الموظفين)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            أضف حقولاً مخصصة لأي قسم بضغطة زر، تحكم في نسب المدرسين المرنة، وحدد صلاحيات كل موظف بدقة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Custom Field Builder Pill Button */}
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
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>إدارة وتعديل التصنيفات</span>
          </button>

          <button
            onClick={() => handleExportCurrentTab('EXCEL')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => handleExportCurrentTab('PDF')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة PDF</span>
          </button>

          {activeTab === 'students' && (
            <button
              onClick={() =>
                setEditingStudent({
                  fullName: '',
                  phone: '',
                  parentName: '',
                  parentPhone: '',
                  grade: dynamicGrades[0] || 'الصف الثالث الثانوي',
                  groupIds: [],
                  enrolledSubjects: [],
                  monthlyTuition: 0,
                  balanceDue: 0,
                  discountPercent: 0,
                  status: 'ACTIVE',
                  notes: '',
                  customFields: {},
                })
              }
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة طالب جديد</span>
            </button>
          )}

          {activeTab === 'teachers' && (
            <button
              onClick={() =>
                setEditingTeacher({
                  fullName: '',
                  subject: dynamicSubjects[0] || 'الفيزياء',
                  grades: [dynamicGrades[0] || 'الصف الثالث الثانوي'],
                  phone: '',
                  splitPercentage: state.config.defaultTeacherSplit || 70,
                  sessionPrice: 80,
                  monthlyGroupFee: 320,
                  status: 'ACTIVE',
                  notes: '',
                  customFields: {},
                })
              }
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مدرس جديد</span>
            </button>
          )}

          {activeTab === 'staff' && (
            <button
              onClick={() =>
                setEditingStaff({
                  fullName: '',
                  roleTitle: 'مسؤول استقبال وتسجيل',
                  phone: '',
                  monthlySalary: 5000,
                  shift: 'MORNING',
                  accessLevel: 'RECEPTION',
                  status: 'ACTIVE',
                  permissions: buildDefaultStaffPermissions('RECEPTION'),
                  customFields: {},
                })
              }
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Segmented Control Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>الطلاب ({state.students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المدرسين ({state.teachers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>الموظفين والصلاحيات ({state.staff.length})</span>
          </button>
        </div>

        {/* Search & Grade Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'students' && (
            <select
              aria-label="تصفية الطلاب حسب المرحلة"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">كل المراحل الدراسية</option>
              {dynamicGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الكود، أو رقم الهاتف..."
              className="w-full pr-9 pl-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: STUDENTS TABLE (Includes Dynamic Custom Columns) */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">الكود والاسم</th>
                  <th className="py-3 px-4 font-semibold">المرحلة والمجموعات</th>
                  <th className="py-3 px-4 font-semibold">ولي الأمر والهاتف</th>
                  <th className="py-3 px-4 font-semibold">المصروفات الشهرية</th>
                  <th className="py-3 px-4 font-semibold">المديونية المتبقية</th>
                  {studentCustomFields.map((cf) => (
                    <th
                      key={cf.id}
                      className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      {cf.label}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-left">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStudents.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {st.fullName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {st.code} · {st.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {st.grade}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {st.enrolledSubjects.length > 0
                          ? st.enrolledSubjects.join(' · ')
                          : 'غير ملحق بمجموعة'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200">
                        {st.parentName}
                      </div>
                      <div className="text-xs font-mono text-slate-500 tabular-nums">
                        {st.parentPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {st.monthlyTuition} {state.config.currency}
                      </div>
                      {st.discountPercent > 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          خصم معتمد {st.discountPercent}%
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {st.balanceDue > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {st.balanceDue} {state.config.currency}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          خالص
                        </span>
                      )}
                    </td>
                    {studentCustomFields.map((cf) => (
                      <td
                        key={cf.id}
                        className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {st.customFields?.[cf.id] || '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFollowUpStudentId(st.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>عرض وطباعة بطاقة المتابعة</span>
                        </button>
                        <a
                          href={buildWhatsAppLink(
                            st.parentPhone || st.phone,
                            `تحية طيبة لولي أمر الطالب ${st.fullName} من إدارة ${state.config.centerName}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </a>
                        <button
                          onClick={() => setEditingStudent(st)}
                          aria-label={`تعديل الطالب ${st.fullName}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            erpStore.deleteStudent(st.id);
                            showToast(
                              `تم حذف الطالب "${st.fullName}" وإخراجه من المجموعات.`
                            );
                          }}
                          aria-label={`حذف الطالب ${st.fullName}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 cursor-pointer"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS TABLE (Includes Dynamic Custom Columns & Flexible Splits) */}
      {activeTab === 'teachers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">الكود والمدرس</th>
                  <th className="py-3 px-4 font-semibold">التخصص والمراحل</th>
                  <th className="py-3 px-4 font-semibold">
                    نسبة التقسيم المرنة (المدرس / السنتر)
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    المجموعات والطلاب الفعليين
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    إجمالي مستحقاته المحصلة
                  </th>
                  {teacherCustomFields.map((cf) => (
                    <th
                      key={cf.id}
                      className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      {cf.label}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-left">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTeachers.map((tch) => {
                  const teacherGroups = state.groups.filter(
                    (g) => g.teacherId === tch.id
                  );
                  const totalStudentsCount = teacherGroups.reduce(
                    (sum, g) => sum + g.studentIds.length,
                    0
                  );
                  const collectedShare = state.transactions
                    .filter(
                      (tx) =>
                        tx.teacherId === tch.id &&
                        tx.type === 'TUITION_COLLECTION'
                    )
                    .reduce((sum, tx) => sum + tx.teacherShare, 0);

                  return (
                    <tr
                      key={tch.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {tch.fullName}
                        </div>
                        <div className="text-xs font-mono text-slate-500 tabular-nums">
                          {tch.code} · {tch.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                          {tch.subject}
                        </div>
                        <div className="text-xs text-slate-500">
                          {tch.grades.join(' · ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {tch.splitPercentage}% للمدرس ·{' '}
                          {100 - tch.splitPercentage}% للسنتر
                        </div>
                        <div className="text-xs text-slate-500">
                          اشتراك المجموعة: {tch.monthlyGroupFee}{' '}
                          {state.config.currency}
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {teacherGroups.length} مجموعات دراسية
                        </div>
                        <div className="text-xs text-slate-500">
                          إجمالي {totalStudentsCount} طالب مسجل
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {collectedShare.toLocaleString()}{' '}
                          {state.config.currency}
                        </span>
                      </td>
                      {teacherCustomFields.map((cf) => (
                        <td
                          key={cf.id}
                          className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300"
                        >
                          {tch.customFields?.[cf.id] || '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingTeacher(tch)}
                            aria-label={`تعديل المدرس ${tch.fullName}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              erpStore.deleteTeacher(tch.id);
                              showToast(`تم حذف المدرس "${tch.fullName}".`);
                            }}
                            aria-label={`حذف المدرس ${tch.fullName}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB 3: STAFF & GRANULAR PERMISSIONS TABLE */}
      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">الكود والموظف</th>
                  <th className="py-3 px-4 font-semibold">المسمى الوظيفي</th>
                  <th className="py-3 px-4 font-semibold">
                    الأقسام المسموح له الوصول إليها
                  </th>
                  <th className="py-3 px-4 font-semibold">الراتب الشهري</th>
                  {staffCustomFields.map((cf) => (
                    <th
                      key={cf.id}
                      className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      {cf.label}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-left">
                    الإجراءات وصرف الراتب
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStaff.map((stf) => {
                  const perms =
                    stf.permissions ||
                    buildDefaultStaffPermissions(stf.accessLevel);
                  const allowedModules = MODULE_PERMISSION_LABELS.filter(
                    (m) => perms[m.key]?.view
                  );

                  return (
                    <tr
                      key={stf.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {stf.fullName}
                        </div>
                        <div className="text-xs font-mono text-slate-500 tabular-nums">
                          {stf.code} · {stf.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {stf.roleTitle}
                        </div>
                        <div className="text-xs text-slate-500">
                          {stf.shift === 'MORNING'
                            ? 'وردية صباحية'
                            : stf.shift === 'EVENING'
                            ? 'وردية مسائية'
                            : 'يوم كامل'}{' '}
                          · {stf.accessLevel}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {allowedModules.map((m) => (
                            <span
                              key={m.key}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                perms[m.key]?.edit
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {m.label}{' '}
                              {perms[m.key]?.edit ? '(تعديل)' : '(عرض)'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold text-slate-900 dark:text-white">
                        {stf.monthlySalary} {state.config.currency}
                      </td>
                      {staffCustomFields.map((cf) => (
                        <td
                          key={cf.id}
                          className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300"
                        >
                          {stf.customFields?.[cf.id] || '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePayStaffSalary(stf)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>صرف الراتب</span>
                          </button>
                          <button
                            onClick={() => setEditingStaff(stf)}
                            aria-label={`تعديل صلاحيات الموظف ${stf.fullName}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>تعديل الصلاحيات</span>
                          </button>
                          <button
                            onClick={() => {
                              erpStore.deleteStaff(stf.id);
                              showToast(`تم حذف الموظف "${stf.fullName}".`);
                            }}
                            aria-label={`حذف الموظف ${stf.fullName}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* MODAL: ADD / EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingStudent.id
                  ? 'تعديل بيانات الطالب والحقول المخصصة'
                  : 'إضافة طالب جديد للسنتر'}
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الطالب ثلاثي أو رباعي
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        fullName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المرحلة الدراسية
                  </label>
                  <select
                    value={editingStudent.grade}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    هاتف الطالب
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.phone}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم ولي الأمر
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentName}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        parentName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    واتساب ولي الأمر
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentPhone}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        parentPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Select Enrolled Groups directly */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  المجموعات الدراسية المسجل بها الطالب
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {state.groups.map((grp) => {
                    const checked = editingStudent.groupIds.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className="flex items-center justify-between text-xs cursor-pointer py-1"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextIds = e.target.checked
                                ? [...editingStudent.groupIds, grp.id]
                                : editingStudent.groupIds.filter(
                                    (id) => id !== grp.id
                                  );
                              const selectedGroups = state.groups.filter((g) =>
                                nextIds.includes(g.id)
                              );
                              const subjects = Array.from(
                                new Set(selectedGroups.map((g) => g.subject))
                              );
                              const totalFee = selectedGroups.reduce(
                                (sum, g) => sum + g.monthlyFee,
                                0
                              );
                              setEditingStudent({
                                ...editingStudent,
                                groupIds: nextIds,
                                enrolledSubjects: subjects,
                                monthlyTuition: totalFee,
                              });
                            }}
                          />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {grp.name}
                          </span>
                          <span className="text-slate-500">({grp.grade})</span>
                        </div>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {grp.monthlyFee} {state.config.currency}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المصروفات الشهرية
                  </label>
                  <input
                    type="number"
                    value={editingStudent.monthlyTuition}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        monthlyTuition: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المديونية المستحقة
                  </label>
                  <input
                    type="number"
                    value={editingStudent.balanceDue}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        balanceDue: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة الخصم %
                  </label>
                  <select
                    value={editingStudent.discountPercent}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        discountPercent: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value={0}>بدون خصم (0%)</option>
                    {state.config.discountRules
                      .filter((r) => r.active)
                      .map((rule) => (
                        <option key={rule.id} value={rule.percent}>
                          {rule.title} ({rule.percent}%)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <DynamicCustomFieldsInputGrid
                entity="student"
                customFields={state.config.customFields}
                values={editingStudent.customFields}
                onChange={(nextValues) =>
                  setEditingStudent({
                    ...editingStudent,
                    customFields: nextValues,
                  })
                }
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  حفظ بيانات الطالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TEACHER */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTeacher.id
                  ? 'تعديل بيانات المدرس ونسبته المالية المرنة'
                  : 'إضافة مدرس جديد'}
              </h3>
              <button
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المدرس واللقب العلمي
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.fullName}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      fullName: e.target.value,
                    })
                  }
                  placeholder="مثال: أ.د محمود رضوان"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المادة العلمية الأساسية
                  </label>
                  <select
                    value={editingTeacher.subject}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.phone}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Select Grades taught by Teacher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  المراحل الدراسية التي يدرسها بالسنتر
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {dynamicGrades.map((grade) => {
                    const isChecked = editingTeacher.grades.includes(grade);
                    return (
                      <label
                        key={grade}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const nextGrades = e.target.checked
                              ? [...editingTeacher.grades, grade]
                              : editingTeacher.grades.filter((g) => g !== grade);
                            setEditingTeacher({
                              ...editingTeacher,
                              grades:
                                nextGrades.length > 0
                                  ? nextGrades
                                  : [dynamicGrades[0]],
                            });
                          }}
                        />
                        <span>{grade}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة المدرس المرنة % (مثلاً 65%، 70%، 80%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={98}
                    value={editingTeacher.splitPercentage}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        splitPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                  <span className="text-[11px] text-slate-500">
                    نسبة السنتر المتبقية:{' '}
                    {100 - (editingTeacher.splitPercentage || 70)}%
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اشتراك الشهر الافتراضي ({state.config.currency})
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={editingTeacher.monthlyGroupFee}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        monthlyGroupFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <DynamicCustomFieldsInputGrid
                entity="teacher"
                customFields={state.config.customFields}
                values={editingTeacher.customFields}
                onChange={(nextValues) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    customFields: nextValues,
                  })
                }
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  حفظ بيانات المدرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STAFF & GRANULAR PERMISSIONS */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingStaff.id
                  ? 'تعديل بيانات الموظف وصلاحياته التفصيلية'
                  : 'إضافة موظف جديد وتخصيص صلاحياته'}
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الموظف بالكامل
                </label>
                <input
                  type="text"
                  required
                  value={editingStaff.fullName}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.roleTitle}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        roleTitle: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.phone}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الراتب الشهري ({state.config.currency})
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={editingStaff.monthlySalary}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        monthlySalary: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الوردية
                  </label>
                  <select
                    value={editingStaff.shift}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        shift: e.target.value as StaffRecord['shift'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="MORNING">وردية صباحية</option>
                    <option value="EVENING">وردية مسائية</option>
                    <option value="FULL_DAY">يوم كامل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    قالب الدور السريع
                  </label>
                  <select
                    value={editingStaff.accessLevel}
                    onChange={(e) => {
                      const nextLevel = e.target
                        .value as StaffRecord['accessLevel'];
                      setEditingStaff({
                        ...editingStaff,
                        accessLevel: nextLevel,
                        permissions: buildDefaultStaffPermissions(nextLevel),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="RECEPTION">استقبال وتسجيل</option>
                    <option value="ACCOUNTANT">محاسب خزينة</option>
                    <option value="SUPERVISOR">مشرف قاعات وحضور</option>
                    <option value="ADMIN">مدير تشغيل كامل</option>
                  </select>
                </div>
              </div>

              {/* Granular Module Permissions Matrix */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>جدول الصلاحيات التفصيلية للموظف حسب كل قسم:</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {MODULE_PERMISSION_LABELS.map((mod) => {
                    const currentPerms =
                      editingStaff.permissions ||
                      buildDefaultStaffPermissions(editingStaff.accessLevel);
                    const modPerm = currentPerms[mod.key] || {
                      view: false,
                      edit: false,
                    };

                    return (
                      <div
                        key={mod.key}
                        className="p-2.5 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {mod.label}
                        </span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={modPerm.view}
                              onChange={(e) => {
                                const viewChecked = e.target.checked;
                                setEditingStaff({
                                  ...editingStaff,
                                  permissions: {
                                    ...currentPerms,
                                    [mod.key]: {
                                      view: viewChecked,
                                      edit: viewChecked ? modPerm.edit : false,
                                    },
                                  },
                                });
                              }}
                            />
                            <span>مشاهدة وعرض</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={modPerm.edit}
                              onChange={(e) => {
                                const editChecked = e.target.checked;
                                setEditingStaff({
                                  ...editingStaff,
                                  permissions: {
                                    ...currentPerms,
                                    [mod.key]: {
                                      view: editChecked ? true : modPerm.view,
                                      edit: editChecked,
                                    },
                                  },
                                });
                              }}
                            />
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              إضافة وتعديل
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DynamicCustomFieldsInputGrid
                entity="staff"
                customFields={state.config.customFields}
                values={editingStaff.customFields}
                onChange={(nextValues) =>
                  setEditingStaff({
                    ...editingStaff,
                    customFields: nextValues,
                  })
                }
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  حفظ بيانات وصلاحيات الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Field Builder Modal */}
      {showCustomFieldModal && (
        <CustomFieldBuilderModal
          entity={currentEntityForCustomField}
          customFields={state.config.customFields}
          onClose={() => setShowCustomFieldModal(false)}
          onSuccess={showToast}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <CategoryManagerModal
          state={state}
          initialTab="grades"
          onClose={() => setShowCategoryModal(false)}
          onSuccess={showToast}
        />
      )}

      {/* Student Comprehensive Follow-Up Card Modal */}
      {followUpStudentId && (
        <StudentFollowUpCardModal
          studentId={followUpStudentId}
          state={state}
          onClose={() => setFollowUpStudentId(null)}
        />
      )}
    </div>
  );
}
