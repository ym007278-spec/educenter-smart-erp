import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  LogIn,
  Search,
  X,
  Users,
  ShieldAlert,
} from 'lucide-react';
import {
  ERPDatabaseState,
  SystemUserRecord,
  SystemUserRole,
  UserPermissionsMatrix,
  SYSTEM_ROLE_LABELS,
  buildDefaultPermissionsForRole,
  erpStore,
} from '../../lib/erp-store';
import SystemAuditLogPanel from './SystemAuditLogPanel';

interface SuperAdminUsersPanelProps {
  state: ERPDatabaseState;
  onSwitchUserSuccess?: (user: SystemUserRecord) => void;
}

export const PERMISSION_MATRIX_ITEMS: {
  key: keyof UserPermissionsMatrix;
  label: string;
  description: string;
}[] = [
  {
    key: 'manageStudents',
    label: 'صلاحية إدارة الطلاب (إضافة/تعديل/حذف)',
    description:
      'تمكين المستخدم من عرض وإضافة وتعديل وحذف سجلات الطلاب وتسجيل الحضور بالـ QR كود.',
  },
  {
    key: 'manageGroupsAndTeachers',
    label: 'صلاحية إدارة المجموعات والمدرسين',
    description:
      'تمكين المستخدم من الدخول لشجرة المراحل والمواد والمجموعات وإدارة بيانات المدرسين.',
  },
  {
    key: 'manageFinance',
    label: 'صلاحية الإدارة المالية والخزنة ومتابعة المصروفات',
    description:
      'الوصول إلى الخزنة، تحصيل المصروفات والأقساط، حساب نسب المدرسين (70/30)، وتسجيل المصروفات.',
  },
  {
    key: 'manageWhatsApp',
    label: 'صلاحية مركز موافقات الواتساب',
    description:
      'مراجعة مسودات الإشعارات الذكية، تعديل نصوصها، واعتماد إرسالها لأولياء الأمور.',
  },
  {
    key: 'manageSettingsAndBackup',
    label: 'صلاحية تعديل الإعدادات العامة أو النسخ الاحتياطي',
    description:
      'تعديل إعدادات السنتر، إدارة الخصومات، الحقول المخصصة، وسحب أو استعادة النسخ الاحتياطية.',
  },
];

export default function SuperAdminUsersPanel({
  state,
  onSwitchUserSuccess,
}: SuperAdminUsersPanelProps) {
  const currentUser =
    state.users.find((u) => u.id === state.currentUserId) || state.users[0];

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || Boolean(currentUser?.isPrimarySuperAdmin);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add / Edit User Modal State
  const [userModal, setUserModal] = useState<{
    id?: string;
    fullName: string;
    username: string;
    password: string;
    role: SystemUserRole;
    status: 'ACTIVE' | 'DISABLED';
    permissions: UserPermissionsMatrix;
    isPrimarySuperAdmin?: boolean;
  } | null>(null);

  // Change Password Modal State
  const [passwordModal, setPasswordModal] = useState<{
    userId: string;
    fullName: string;
    username: string;
    newPassword: string;
  } | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmUser, setDeleteConfirmUser] =
    useState<SystemUserRecord | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4500);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-center max-w-xl mx-auto my-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          عذراً، ليس لديك صلاحية لهذه الصفحة
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          قسم إدارة المستخدمين والصلاحيات مخصص حصرياً لحساب{' '}
          <strong>المدير العام (Super Admin)</strong> ولا يمكن لأي حساب آخر الوصول إليه.
        </p>
      </div>
    );
  }

  const filteredUsers = state.users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q)
    );
  });

  const activeUsersCount = state.users.filter((u) => u.status === 'ACTIVE').length;
  const disabledUsersCount = state.users.filter((u) => u.status === 'DISABLED').length;

  const handleOpenCreateModal = () => {
    setUserModal({
      fullName: '',
      username: '',
      password: '',
      role: 'RECEPTIONIST',
      status: 'ACTIVE',
      permissions: buildDefaultPermissionsForRole('RECEPTIONIST'),
    });
  };

  const handleOpenEditModal = (user: SystemUserRecord) => {
    setUserModal({
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      password: user.password,
      role: user.role,
      status: user.status,
      permissions: { ...user.permissions },
      isPrimarySuperAdmin: user.isPrimarySuperAdmin,
    });
  };

  const handleRoleChangeInModal = (nextRole: SystemUserRole) => {
    if (!userModal) return;
    setUserModal({
      ...userModal,
      role: nextRole,
      permissions:
        nextRole === 'CUSTOM'
          ? userModal.permissions
          : buildDefaultPermissionsForRole(nextRole),
    });
  };

  const handleTogglePermissionCheckbox = (key: keyof UserPermissionsMatrix) => {
    if (!userModal || userModal.isPrimarySuperAdmin) return;
    const nextPermissions: UserPermissionsMatrix = {
      ...userModal.permissions,
      [key]: !userModal.permissions[key],
    };
    setUserModal({
      ...userModal,
      permissions: nextPermissions,
    });
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userModal) return;
    if (!userModal.fullName.trim() || !userModal.username.trim()) {
      showFeedback('يرجى إدخال اسم الموظف الكامل واسم الدخول.', 'error');
      return;
    }
    if (!userModal.id && !userModal.password.trim()) {
      showFeedback('يرجى تحديد كلمة مرور للمستخدم الجديد.', 'error');
      return;
    }

    const isEditing = Boolean(userModal.id);
    const result = erpStore.saveSystemUser({
      id: userModal.id,
      fullName: userModal.fullName.trim(),
      username: userModal.username.trim(),
      password: userModal.password.trim(),
      role: userModal.role,
      status: userModal.status,
      permissions: userModal.permissions,
      isPrimarySuperAdmin: userModal.isPrimarySuperAdmin,
    });

    if (result.error) {
      showFeedback(result.error, 'error');
      return;
    }

    const savedName = userModal.fullName.trim();
    setUserModal(null);
    showFeedback(
      isEditing
        ? `تم تحديث بيانات وصلاحيات المستخدم "${savedName}" بنجاح وتطبيقها فوراً.`
        : `تم إضافة المستخدم الجديد "${savedName}" وحفظ صلاحياته في النظام بنجاح.`
    );
  };

  const handleSavePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal || !passwordModal.newPassword.trim()) return;
    erpStore.changeSystemUserPassword(
      passwordModal.userId,
      passwordModal.newPassword.trim()
    );
    const targetName = passwordModal.fullName;
    setPasswordModal(null);
    showFeedback(`تم تغيير كلمة المرور للمستخدم "${targetName}" بنجاح.`);
  };

  const handleToggleStatus = (user: SystemUserRecord) => {
    if (user.isPrimarySuperAdmin) return;
    erpStore.toggleSystemUserStatus(user.id);
    const nextStatusLabel = user.status === 'ACTIVE' ? 'تعطيل' : 'إعادة تفعيل';
    showFeedback(`تم ${nextStatusLabel} حساب "${user.fullName}" بنجاح.`);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser || deleteConfirmUser.isPrimarySuperAdmin) return;
    const deletedName = deleteConfirmUser.fullName;
    erpStore.deleteSystemUser(deleteConfirmUser.id);
    setDeleteConfirmUser(null);
    showFeedback(`تم حذف حساب المستخدم "${deletedName}" نهائياً من النظام.`);
  };

  const handleSwitchToUser = (user: SystemUserRecord) => {
    const res = erpStore.switchActiveUser(user.id);
    if (!res.success) {
      showFeedback(res.error || 'تعذر التبديل لهذا الحساب.', 'error');
      return;
    }
    if (res.user && onSwitchUserSuccess) {
      onSwitchUserSuccess(res.user);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              لوحة تحكم المدير لإدارة المستخدمين والصلاحيات (Super Admin)
            </h2>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
              خاص بالمدير العام فقط
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            إضافة الموظفين والمستخدمين، تحديد كلمات المرور، والتحكم الدقيق في صلاحيات الوصول لكل شاشة بالنظام.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 text-xs font-semibold ${
            notice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              إجمالي حسابات المستخدمين
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
              {state.users.length} مستخدمين
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              الحسابات النشطة والمفعلة
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {activeUsersCount} حساب نشط
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              الحسابات الموقوفة / المعطلة
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {disabledUsersCount} حساب معطل
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            تصفية حسب الدور الوظيفي:
          </span>
          {(
            [
              { key: 'ALL', label: 'كل الأدوار' },
              { key: 'SUPER_ADMIN', label: 'المدير العام' },
              { key: 'ASSISTANT_ADMIN', label: 'مدير مساعد' },
              { key: 'RECEPTIONIST', label: 'موظف استقبال' },
              { key: 'ACCOUNTANT', label: 'محاسب' },
              { key: 'CUSTOM', label: 'تخصيص يدوي' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المستخدم أو اسم الدخول..."
            className="w-full pr-9 pl-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">اسم المستخدم</th>
                <th className="py-3.5 px-4 font-semibold">اسم الدخول وكلمة المرور</th>
                <th className="py-3.5 px-4 font-semibold">الدور الوظيفي</th>
                <th className="py-3.5 px-4 font-semibold">الصلاحيات الممنوحة</th>
                <th className="py-3.5 px-4 font-semibold">الحالة</th>
                <th className="py-3.5 px-4 font-semibold text-left">
                  أزرار التحكم والإدارة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const isCurrentActive = user.id === currentUser.id;
                const showPass = Boolean(revealedPasswords[user.id]);
                const activePermBadges = [
                  user.permissions.manageStudents && 'الطلاب والحضور',
                  user.permissions.manageGroupsAndTeachers && 'المجموعات والمدرسين',
                  user.permissions.manageFinance && 'المالية والخزنة',
                  user.permissions.manageWhatsApp && 'موافقات الواتساب',
                  user.permissions.manageSettingsAndBackup && 'الإعدادات والنسخ الاحتياطي',
                ].filter(Boolean) as string[];

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Full Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {user.fullName}
                        </span>
                        {isCurrentActive && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                            الحساب الحالي
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {user.code} · أُنشئ: {user.createdAt}
                      </div>
                    </td>

                    {/* Username & Password */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        @{user.username}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                        <span>
                          {showPass ? user.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedPasswords((prev) => ({
                              ...prev,
                              [user.id]: !prev[user.id],
                            }))
                          }
                          aria-label={
                            showPass
                              ? `إخفاء كلمة مرور ${user.fullName}`
                              : `إظهار كلمة مرور ${user.fullName}`
                          }
                          className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          title={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {showPass ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : user.role === 'ACCOUNTANT'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : user.role === 'ASSISTANT_ADMIN'
                            ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {SYSTEM_ROLE_LABELS[user.role]}
                      </span>
                    </td>

                    {/* Granted Permissions */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {user.role === 'SUPER_ADMIN' ? (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          كافة صلاحيات النظام (تحكم كامل 100%)
                        </span>
                      ) : activePermBadges.length === 0 ? (
                        <span className="text-xs text-rose-600 dark:text-rose-400">
                          بدون صلاحيات مفعلة
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {activePermBadges.map((badge) => (
                            <span
                              key={badge}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {user.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>معطل</span>
                        </span>
                      )}
                    </td>

                    {/* Control Buttons */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Switch/Test Login as this user */}
                        {!isCurrentActive && user.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleSwitchToUser(user)}
                            className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="تسجيل الدخول الفوري بهذا الحساب لمعاينة صلاحياته"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>دخول بالحساب</span>
                          </button>
                        )}

                        {/* 1. Edit Permissions */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>تعديل الصلاحيات</span>
                        </button>

                        {/* 2. Change Password */}
                        <button
                          type="button"
                          onClick={() =>
                            setPasswordModal({
                              userId: user.id,
                              fullName: user.fullName,
                              username: user.username,
                              newPassword: '',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>تغيير كلمة المرور</span>
                        </button>

                        {/* 3. Disable / Enable Account */}
                        {!user.isPrimarySuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              user.status === 'ACTIVE'
                                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                                : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>تعطيل الحساب</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>تفعيل الحساب</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 4. Delete Permanently */}
                        {!user.isPrimarySuperAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(user)}
                            aria-label={`حذف حساب ${user.fullName}`}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                            title="حذف الحساب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Log inside Super Admin Panel (سجل نشاطات النظام والعمليات الحرجة) */}
      <SystemAuditLogPanel state={state} />

      {/* MODAL 1: Add / Edit User & Dynamic Permissions Matrix */}
      {userModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {userModal.id
                    ? `تعديل بيانات وصلاحيات المستخدم: ${userModal.fullName}`
                    : 'إضافة مستخدم جديد وتخصيص صلاحياته'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حدد اسم الدخول وكلمة المرور والدور الوظيفي ومربعات الصلاحيات الدقيقة لهذا المستخدم
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-5">
              {/* Basic User Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الموظف / المستخدم الكامل
                  </label>
                  <input
                    type="text"
                    required
                    value={userModal.fullName}
                    onChange={(e) =>
                      setUserModal({ ...userModal, fullName: e.target.value })
                    }
                    placeholder="مثال: أ. محمد عبد الرحمن (موظف استقبال)"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الدخول (Username)
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={userModal.username}
                    onChange={(e) =>
                      setUserModal({ ...userModal, username: e.target.value })
                    }
                    placeholder="reception_mohamed"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور (Password)
                  </label>
                  <input
                    type="text"
                    required={!userModal.id}
                    dir="ltr"
                    value={userModal.password}
                    onChange={(e) =>
                      setUserModal({ ...userModal, password: e.target.value })
                    }
                    placeholder="أدخل كلمة مرور قوية..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تحديد الدور الوظيفي
                  </label>
                  <select
                    value={userModal.role}
                    disabled={Boolean(userModal.isPrimarySuperAdmin)}
                    onChange={(e) =>
                      handleRoleChangeInModal(e.target.value as SystemUserRole)
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="ASSISTANT_ADMIN">
                      مدير مساعد - Assistant Admin
                    </option>
                    <option value="RECEPTIONIST">
                      موظف استقبال - Receptionist
                    </option>
                    <option value="ACCOUNTANT">محاسب - Accountant</option>
                    <option value="CUSTOM">تخصيص يدوي - Custom Role</option>
                    <option value="SUPER_ADMIN">
                      المدير العام - Super Admin
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    حالة الحساب
                  </label>
                  <select
                    value={userModal.status}
                    disabled={Boolean(userModal.isPrimarySuperAdmin)}
                    onChange={(e) =>
                      setUserModal({
                        ...userModal,
                        status: e.target.value as 'ACTIVE' | 'DISABLED',
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="ACTIVE">نشط (مسموح له بتسجيل الدخول)</option>
                    <option value="DISABLED">معطل (موقوف عن الدخول)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Permissions Matrix (Checkboxes) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      محرك الصلاحيات الديناميكي (Dynamic Permissions Matrix)
                    </h4>
                    <p className="text-xs text-slate-500">
                      حدد بدقة الأقسام والعمليات المسموح لهذا المستخدم رؤيتها والتعامل معها:
                    </p>
                  </div>
                  {!userModal.isPrimarySuperAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setUserModal({
                            ...userModal,
                            permissions: {
                              manageStudents: true,
                              manageGroupsAndTeachers: true,
                              manageFinance: true,
                              manageWhatsApp: true,
                              manageSettingsAndBackup: true,
                            },
                          })
                        }
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setUserModal({
                            ...userModal,
                            permissions: {
                              manageStudents: false,
                              manageGroupsAndTeachers: false,
                              manageFinance: false,
                              manageWhatsApp: false,
                              manageSettingsAndBackup: false,
                            },
                          })
                        }
                        className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  {PERMISSION_MATRIX_ITEMS.map((item) => {
                    const checked =
                      userModal.role === 'SUPER_ADMIN'
                        ? true
                        : Boolean(userModal.permissions[item.key]);

                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                          checked
                            ? 'bg-white dark:bg-slate-900 border-blue-500/60'
                            : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={
                            Boolean(userModal.isPrimarySuperAdmin) ||
                            userModal.role === 'SUPER_ADMIN'
                          }
                          onChange={() => handleTogglePermissionCheckbox(item.key)}
                          className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {userModal.id
                    ? 'حفظ تعديلات المستخدم والصلاحيات'
                    : 'إنشاء الحساب وتفعيل الصلاحيات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Password */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تغيير كلمة المرور
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
                <div>
                  المستخدم: <strong>{passwordModal.fullName}</strong>
                </div>
                <div className="text-slate-500 font-mono">
                  اسم الدخول: @{passwordModal.username}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={passwordModal.newPassword}
                  onChange={(e) =>
                    setPasswordModal({
                      ...passwordModal,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ كلمة المرور الجديدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete User Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد حذف حساب المستخدم نهائياً
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              هل أنت متأكد من حذف حساب{' '}
              <strong className="text-slate-900 dark:text-white">
                {deleteConfirmUser.fullName}
              </strong>{' '}
              (<span className="font-mono">@{deleteConfirmUser.username}</span>)
              نهائياً؟ لن يتمكن هذا المستخدم من تسجيل الدخول للنظام مرة أخرى.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                نعم، حذف الحساب نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
