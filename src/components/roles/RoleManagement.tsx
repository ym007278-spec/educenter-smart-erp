import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Key,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  UserCheck,
  Eye,
  Sliders,
  Sparkles,
  Search,
  Check,
  X
} from 'lucide-react';

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'TREASURY' | 'ATTENDANCE' | 'STUDENTS' | 'TEACHERS' | 'PAYROLL' | 'SECURITY' | 'REPORTS';
}

export interface SystemRole {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean; // system roles cannot be deleted
  userCount: number;
  permissions: string[]; // permission ids
  createdAt: string;
}

const AVAILABLE_PERMISSIONS: PermissionDefinition[] = [
  // الخزنة والماليات
  { id: 'treasury.cash_in', name: 'تحصيل مدفوعات الطلاب (Cash In)', description: 'استلام المصروفات وتحديث الخزنة وإصدار إيصالات دفع', category: 'TREASURY' },
  { id: 'treasury.cash_out', name: 'صرف مالي من الخزنة (Cash Out)', description: 'إخراج أموال لسندات الصرف والمصروفات والرواتب', category: 'TREASURY' },
  { id: 'treasury.analytics_view', name: 'الاطلاع على تحليلات الخزنة', description: 'مشاهدة تدفقات الدخل والخرج والأرباح اليومية والصافية', category: 'TREASURY' },
  { id: 'finance.expenses_create', name: 'تسجيل المصروفات والفواتير', description: 'إدخال فواتير الكهرباء والصيانة والمشتريات', category: 'TREASURY' },

  // الحضور والباركود
  { id: 'attendance.scan_qr', name: 'مسح QR كود الطلاب (Check-in)', description: 'تسجيل الحضور بالدقيقة وتفعيل التحقق الأمني HMAC', category: 'ATTENDANCE' },
  { id: 'attendance.manual_override', name: 'تعديل الحضور يدوياً', description: 'تسجيل عذر طبي أو استثناء غياب للطالب', category: 'ATTENDANCE' },
  { id: 'attendance.staff_clock', name: 'تسجيل حضور وانصراف الموظفين', description: 'تسجيل البصمة الإلكترونية بالدقيقة للموظف', category: 'ATTENDANCE' },

  // الطلاب والشعب
  { id: 'students.read', name: 'استعراض بيانات الطلاب وملف 360', description: 'الاطلاع على الأرشيف الشامل وسجل الدرجات والغياب', category: 'STUDENTS' },
  { id: 'students.create_edit', name: 'إضافة وتعديل بيانات الطلاب', description: 'تسجيل طالب جديد وربطه بالمجموعات وتوليد QR كود', category: 'STUDENTS' },
  { id: 'students.delete', name: 'حذف أو إلغاء تفعيل حساب طالب', description: 'إلغاء قيد الطالب أو تجميد اشتراكه في السنتر', category: 'STUDENTS' },

  // المدرسين والأرباح
  { id: 'teachers.view_split', name: 'مشاهدة نسب المدرسين والمحافظ', description: 'عرض محافظ المدرسين وحصصهم المالية لكل مجموعة', category: 'TEACHERS' },
  { id: 'teachers.payout_disburse', name: 'صرف مستحقات المدرسين', description: 'خصم أتعاب المدرس من الخزنة وصرفها مع تسجيل التوقيت', category: 'TEACHERS' },
  { id: 'teachers.split_config', name: 'تعديل نسب الأرباح للمجموعات', description: 'تغيير نسبة المدرس والسنتر (مثلاً 70% / 30%)', category: 'TEACHERS' },

  // الرواتب والموظفين
  { id: 'payroll.view', name: 'استعراض مسير الرواتب والخصومات', description: 'مشاهدة ساعات العمل وتأخيرات الموظفين والجزاءات', category: 'PAYROLL' },
  { id: 'payroll.disburse', name: 'اعتماد وصرف الرواتب الشهرية', description: 'صرف المرتبات بعد خصم التأخيرات آلياً من الخزنة', category: 'PAYROLL' },
  { id: 'payroll.penalties_edit', name: 'إضافة مكافآت أو جزاءات للموظف', description: 'تعديل بنود الخصم والمكافأة قبل صرف الراتب', category: 'PAYROLL' },

  // التقارير والواتساب
  { id: 'reports.whatsapp_dispatch', name: 'إرسال تقارير الواتساب لولي الأمر', description: 'إرسال إشعارات الحضور والغياب والدرجات آلياً عبر WhatsApp API', category: 'REPORTS' },
  { id: 'reports.export_pdf_excel', name: 'تصدير التقارير المالية والبيانات', description: 'توليد ملفات PDF وExcel للضرائب والإدارة', category: 'REPORTS' },

  // أمان النظام
  { id: 'security.roles_manage', name: 'إدارة الأدوار والصلاحيات (RBAC)', description: 'إنشاء الوظائف وتعيين الصلاحيات والمستخدمين', category: 'SECURITY' },
  { id: 'security.audit_logs', name: 'سجل العمليات والأمان (Audit Trail)', description: 'مراقبة محاولات الاختراق وعمليات الحذف والتعديل الحساسة', category: 'SECURITY' }
];

const INITIAL_ROLES: SystemRole[] = [
  {
    id: 'role-superadmin',
    code: 'SUPER_ADMIN',
    name: 'مدير عام السنتر الأكاديمي',
    description: 'صلاحيات كاملة وغير مقيدة لإدارة جميع المفاصل المالية والأكاديمية والأمنية.',
    isSystem: true,
    userCount: 2,
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
    createdAt: '2026-01-01'
  },
  {
    id: 'role-accountant',
    code: 'ACCOUNTANT',
    name: 'المحاسب المالي ومدير الخزنة',
    description: 'إدارة تحصيلات الطلاب، تسوية المصروفات، صرف مستحقات المدرسين ومسير الرواتب.',
    isSystem: true,
    userCount: 3,
    permissions: [
      'treasury.cash_in',
      'treasury.cash_out',
      'treasury.analytics_view',
      'finance.expenses_create',
      'teachers.view_split',
      'teachers.payout_disburse',
      'payroll.view',
      'payroll.disburse',
      'reports.export_pdf_excel'
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'role-reception',
    code: 'RECEPTIONIST',
    name: 'موظف الاستقبال والمتابعة',
    description: 'تسجيل حضور الطلاب بالـ QR كود، تحصيل الحصص، واستعراض ملفات الطلاب وإرسال رسائل الواتساب.',
    isSystem: true,
    userCount: 5,
    permissions: [
      'attendance.scan_qr',
      'treasury.cash_in',
      'students.read',
      'students.create_edit',
      'reports.whatsapp_dispatch'
    ],
    createdAt: '2026-02-01'
  },
  {
    id: 'role-teacher',
    code: 'TEACHER',
    name: 'المعلم الأكاديمي',
    description: 'استعراض طلاب المجموعات، إدخال درجات الامتحانات والملاحظات، ومتابعة رصيد المحفظة الشخصية.',
    isSystem: true,
    userCount: 14,
    permissions: [
      'students.read',
      'teachers.view_split'
    ],
    createdAt: '2026-02-15'
  },
  {
    id: 'role-student-affairs',
    code: 'STUDENT_AFFAIRS',
    name: 'أخصائي شؤون الطلاب والمتابعة',
    description: 'متابعة الحضور والغياب، التواصل مع أولياء الأمور، وإصدار تقارير الأداء الأكاديمي والامتحانات.',
    isSystem: false,
    userCount: 4,
    permissions: [
      'attendance.scan_qr',
      'attendance.manual_override',
      'students.read',
      'students.create_edit',
      'reports.whatsapp_dispatch',
      'reports.export_pdf_excel'
    ],
    createdAt: '2026-03-01'
  }
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<SystemRole[]>(INITIAL_ROLES);
  const [selectedRole, setSelectedRole] = useState<SystemRole>(INITIAL_ROLES[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Form state when creating or editing a role
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    code: '',
    description: '',
    permissions: []
  });

  const handleSelectRole = (role: SystemRole) => {
    setSelectedRole(role);
    setIsEditing(false);
    setIsCreatingNew(false);
    setSaveSuccessMessage(null);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(true);
    setFormData({
      name: '',
      code: '',
      description: '',
      permissions: ['students.read', 'attendance.scan_qr']
    });
    setSaveSuccessMessage(null);
  };

  const handleStartEdit = () => {
    setIsCreatingNew(false);
    setIsEditing(true);
    setFormData({
      name: selectedRole.name,
      code: selectedRole.code,
      description: selectedRole.description,
      permissions: [...selectedRole.permissions]
    });
    setSaveSuccessMessage(null);
  };

  const handleTogglePermission = (permissionId: string) => {
    if (!isEditing) return;
    setFormData(prev => {
      const exists = prev.permissions.includes(permissionId);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permissionId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permissionId] };
      }
    });
  };

  const handleSelectAllCategory = (category: string) => {
    if (!isEditing) return;
    const catPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    setFormData(prev => {
      const allSelected = catPerms.every(id => prev.permissions.includes(id));
      if (allSelected) {
        return { ...prev, permissions: prev.permissions.filter(id => !catPerms.includes(id)) };
      } else {
        const union = Array.from(new Set([...prev.permissions, ...catPerms]));
        return { ...prev, permissions: union };
      }
    });
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    if (isCreatingNew) {
      const newRole: SystemRole = {
        id: `role-${Date.now()}`,
        code: formData.code.toUpperCase().replace(/\s+/g, '_'),
        name: formData.name.trim(),
        description: formData.description.trim(),
        isSystem: false,
        userCount: 0,
        permissions: formData.permissions,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setRoles(prev => [...prev, newRole]);
      setSelectedRole(newRole);
      setSaveSuccessMessage(`تم إنشاء الدور الوظيفي "${newRole.name}" بنجاح وتأمينه في الـ RBAC Matrix!`);
    } else {
      const updatedRoles = roles.map(r => {
        if (r.id === selectedRole.id) {
          return {
            ...r,
            name: formData.name.trim(),
            description: formData.description.trim(),
            permissions: formData.permissions
          };
        }
        return r;
      });
      setRoles(updatedRoles);
      const updatedSelected = updatedRoles.find(r => r.id === selectedRole.id)!;
      setSelectedRole(updatedSelected);
      setSaveSuccessMessage(`تم تحديث صلاحيات الدور "${updatedSelected.name}" وتطبيقها فورياً على المستخدمين.`);
    }

    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isSystem) return;
    if (confirm(`هل أنت متأكد من حذف الدور الوظيفي "${role.name}"؟`)) {
      const filtered = roles.filter(r => r.id !== roleId);
      setRoles(filtered);
      setSelectedRole(filtered[0]);
      setIsEditing(false);
      setSaveSuccessMessage(`تم حذف الدور الوظيفي بنجاح.`);
    }
  };

  // Filter permissions in the permissions table
  const filteredPermissions = AVAILABLE_PERMISSIONS.filter(perm => {
    const matchesCategory = selectedCategoryFilter === 'ALL' || perm.category === selectedCategoryFilter;
    const matchesSearch =
      perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { key: 'ALL', label: 'كافة الأقسام' },
    { key: 'TREASURY', label: 'الخزنة والماليات' },
    { key: 'ATTENDANCE', label: 'الحضور والباركود' },
    { key: 'STUDENTS', label: 'شؤون الطلاب' },
    { key: 'TEACHERS', label: 'المدرسين والنسب' },
    { key: 'PAYROLL', label: 'الرواتب والجزاءات' },
    { key: 'REPORTS', label: 'التقارير والواتساب' },
    { key: 'SECURITY', label: 'أمان النظام RBAC' }
  ];

  const currentPermissions = isEditing ? formData.permissions : selectedRole.permissions;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">إدارة الوظائف والصلاحيات (RBAC Hardening)</h2>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  Zero-Trust Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تخصيص صلاحيات الوصول الدقيقة لكل وظيفة • تطبيق أوتوماتيكي على واجهات المستخدم ونقاط نهاية FastAPI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة وظيفة جديدة</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMessage && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Roles List (Right) & Permission Matrix (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Roles List Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>قائمة الوظائف المعتمدة ({roles.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Role Count</span>
            </div>

            <div className="space-y-2">
              {roles.map(role => {
                const isSelected = selectedRole.id === role.id && !isCreatingNew;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/70 to-slate-800/80 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{role.name}</span>
                          {role.isSystem && (
                            <span className="text-[10px] bg-slate-800 text-cyan-300 border border-cyan-800/50 px-1.5 py-0.5 rounded font-mono">
                              نظامي
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{role.description}</p>
                      </div>

                      <div className="text-left flex flex-col items-end shrink-0">
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                          {role.permissions.length} صلاحية
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">
                          {role.userCount} مستخدم
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick RBAC Security Specs */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2.5">
            <h4 className="font-bold text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>ميثاق الأمان وحماية المسارات</span>
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              • كل طلب يتم التحقق منه على السيرفر عبر Middleware <code className="text-cyan-400 font-mono">RequirePermission</code>.
              <br />
              • التوكنات مشفرة بمفتاح HS256 عالي التعقيد، ويتم إلغاء الجلسات عند تعديل الصلاحيات فورياً.
              <br />
              • منع تام لوصول أي موظف إلى الخزنة أو التقارير بدون إذن صريح محدد في الجدول.
            </p>
          </div>
        </div>

        {/* Permission Matrix Editor (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            
            {/* Header of Role Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-white">
                    {isCreatingNew ? 'إنشاء دور وظيفي جديد' : isEditing ? `تعديل: ${formData.name}` : selectedRole.name}
                  </h3>
                  <code className="text-xs font-mono bg-slate-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                    {isCreatingNew ? (formData.code || 'ROLE_CODE') : selectedRole.code}
                  </code>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isCreatingNew
                    ? 'حدد اسم الكود البرمجي والصلاحيات المسموح بها لهذا المنصب'
                    : selectedRole.description}
                </p>
              </div>

              {/* Actions: Edit / Cancel / Save */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تعديل الصلاحيات</span>
                    </button>
                    {!selectedRole.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(selectedRole.id)}
                        className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setIsCreatingNew(false);
                      }}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إلغاء</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRole}
                      className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
                    >
                      <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>حفظ التعديلات</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* If Editing or Creating New: Basic Fields */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم الوظيفة بالعربية:
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: مسؤول الدعم الأكاديمي"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    كود الوظيفة البرمجي (Role Code):
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="ACADEMIC_SUPPORT"
                    disabled={!isCreatingNew && selectedRole.isSystem}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    وصف المهام والمسؤوليات:
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر لدور هذه الوظيفة في السنتر التعليمي..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Filter and Search Bar for Permissions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none text-xs">
                {categories.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCategoryFilter(c.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategoryFilter === c.key
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث في الصلاحيات..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Active Permissions Counter & Quick Bulk Toggles */}
            <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs mb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">الصلاحيات الممنوحة حالياً:</span>
                <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/40 px-2.5 py-0.5 rounded-md">
                  {currentPermissions.length} من {AVAILABLE_PERMISSIONS.length}
                </span>
              </div>

              {isEditing && selectedCategoryFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleSelectAllCategory(selectedCategoryFilter)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>تحديد / إلغاء تحديد قسم {categories.find(c => c.key === selectedCategoryFilter)?.label}</span>
                </button>
              )}
            </div>

            {/* Permissions List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredPermissions.map(perm => {
                const isChecked = currentPermissions.includes(perm.id);

                return (
                  <div
                    key={perm.id}
                    onClick={() => handleTogglePermission(perm.id)}
                    className={`p-3.5 rounded-xl border transition-all text-right select-none ${
                      isEditing ? 'cursor-pointer hover:border-cyan-500/60' : 'cursor-default'
                    } ${
                      isChecked
                        ? 'bg-slate-900 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20'
                              : 'border-slate-700 bg-slate-900 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-bold text-xs text-white">{perm.name}</h5>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {perm.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{perm.description}</p>
                        <code className="text-[10px] font-mono text-cyan-400/80 block mt-1.5 dir-ltr text-right">
                          {perm.id}
                        </code>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
