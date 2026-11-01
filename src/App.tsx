import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  BookOpen,
  Users,
  DollarSign,
  QrCode,
  MessageSquare,
  Sliders,
  ShieldCheck,
  Sun,
  Moon,
  Download,
  CheckCircle2,
  LogIn,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  X,
} from 'lucide-react';

import DashboardWidgets from './components/dashboard/DashboardWidgets';
import AcademicTreeManager from './components/academic/AcademicTreeManager';
import PeopleManagement from './components/people/PeopleManagement';
import UnifiedFinanceCenter from './components/finance/UnifiedFinanceCenter';
import UnifiedAttendanceCenter from './components/attendance/UnifiedAttendanceCenter';
import SmartSuggestionInbox from './components/notifications/SmartSuggestionInbox';
import SuperAdminUsersPanel from './components/roles/SuperAdminUsersPanel';
import AdminSettingsCenter from './components/settings/AdminSettingsCenter';

import {
  ERPDatabaseState,
  ModuleSectionKey,
  SystemUserRecord,
  SYSTEM_ROLE_LABELS,
  canUserAccessSection,
  erpStore,
} from './lib/erp-store';

export default function App() {
  // Light / Dark Mode state (persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('educenter_theme');
      return saved === 'light' || saved === 'dark' ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  // Reactive Central ERP State
  const [erpState, setErpState] = useState<ERPDatabaseState>(() =>
    erpStore.getState()
  );

  // Active Section Tab
  const [activeSection, setActiveSection] =
    useState<ModuleSectionKey>('dashboard');

  const [backupToast, setBackupToast] = useState<string | null>(null);
  const [accessDeniedAlert, setAccessDeniedAlert] = useState<string | null>(
    null
  );

  // Login / Account Switcher Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    return erpStore.subscribe((nextState) => {
      setErpState(nextState);
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('educenter_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const currentUser: SystemUserRecord =
    erpState.users.find((u) => u.id === erpState.currentUserId) ||
    erpState.users.find((u) => u.role === 'SUPER_ADMIN') ||
    erpState.users[0];

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    Boolean(currentUser?.isPrimarySuperAdmin);

  const canBackupOrSettings =
    isSuperAdmin || Boolean(currentUser?.permissions?.manageSettingsAndBackup);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const triggerAccessDenied = () => {
    setAccessDeniedAlert('عذراً، ليس لديك صلاحية لهذه الصفحة');
  };

  const handleNavigateToSection = (target: ModuleSectionKey) => {
    if (!canUserAccessSection(currentUser, target)) {
      triggerAccessDenied();
      setActiveSection(target); // Also shows the full guard view if they tried to force navigation
      return;
    }
    setAccessDeniedAlert(null);
    setActiveSection(target);
  };

  const handleInstantBackup = () => {
    if (!canBackupOrSettings) {
      triggerAccessDenied();
      return;
    }
    const snapshot = erpStore.getState();
    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `EduCenter_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupToast(filename);
    setTimeout(() => setBackupToast(null), 4000);
  };

  const handleLoginFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = erpStore.authenticateUser(loginUsername, loginPassword);
    if (!result.success || !result.user) {
      setLoginError(result.error || 'تعذر تسجيل الدخول.');
      return;
    }
    setShowLoginModal(false);
    setLoginUsername('');
    setLoginPassword('');
    setAccessDeniedAlert(null);
    if (!canUserAccessSection(result.user, activeSection)) {
      setActiveSection('dashboard');
    }
  };

  const handleQuickSwitchUser = (user: SystemUserRecord) => {
    setLoginError(null);
    const result = erpStore.switchActiveUser(user.id);
    if (!result.success || !result.user) {
      setLoginError(result.error || 'هذا الحساب معطل حالياً.');
      return;
    }
    setShowLoginModal(false);
    setAccessDeniedAlert(null);
    if (!canUserAccessSection(result.user, activeSection)) {
      setActiveSection('dashboard');
    }
  };

  const pendingSuggestionsCount = erpState.suggestions.filter(
    (s) => s.status === 'PENDING'
  ).length;

  const navItems: {
    key: ModuleSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }[] = [
    {
      key: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutGrid,
    },
    {
      key: 'academic_tree',
      label: 'المجموعات والشجرة',
      icon: BookOpen,
    },
    {
      key: 'people',
      label: 'إدارة الأفراد',
      icon: Users,
    },
    {
      key: 'finance',
      label: 'الخزنة والماليات',
      icon: DollarSign,
    },
    {
      key: 'attendance',
      label: 'الحضور بالـ QR',
      icon: QrCode,
    },
    {
      key: 'suggestions',
      label: 'صندوق الاقتراحات',
      icon: MessageSquare,
      badgeCount: pendingSuggestionsCount,
    },
    {
      key: 'users_permissions',
      label: 'المستخدمين والصلاحيات',
      icon: ShieldCheck,
    },
    {
      key: 'settings',
      label: 'الإعدادات',
      icon: Sliders,
    },
  ];

  // Filter navigation items by BOTH center config enabledSections AND current user's dynamic permissions
  const visibleNavItems = navItems.filter((item) => {
    const enabledInCenter =
      item.key === 'settings' ||
      item.key === 'users_permissions' ||
      erpState.config.enabledSections[item.key] !== false;
    const allowedForUser = canUserAccessSection(currentUser, item.key);
    return enabledInCenter && allowedForUser;
  });

  const isCurrentSectionAllowed = canUserAccessSection(
    currentUser,
    activeSection
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150"
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleNavigateToSection('dashboard')}
            className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer text-right"
          >
            {erpState.config.centerName}
          </button>

          {/* Zone 2: Modular Navigation Tabs (Filtered by User Permissions) */}
          <nav
            aria-label="أقسام النظام الرئيسية"
            className="flex items-center gap-1 overflow-x-auto py-0.5"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigateToSection(item.key)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                        isActive
                          ? 'bg-white text-blue-700'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Active User Switcher, Theme Switch & Instant Backup */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active User & Login Switcher Button */}
            <button
              type="button"
              onClick={() => {
                setLoginError(null);
                setShowLoginModal(true);
              }}
              aria-label="تبديل المستخدم أو تسجيل الدخول"
              className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="max-w-[115px] truncate">{currentUser.fullName}</span>
            </button>

            <button
              onClick={toggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'التبديل إلى الوضع الفاتح'
                  : 'التبديل إلى الوضع الليلي'
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>فاتح</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>ليلي</span>
                </>
              )}
            </button>

            {canBackupOrSettings && (
              <button
                onClick={handleInstantBackup}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>نسخة احتياطية</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Non-Super Admin Active Role Strip (Allows 1-click return to Super Admin during testing) */}
      {!isSuperAdmin && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800 px-6 py-2 text-xs text-indigo-950 dark:text-indigo-200 no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                أنت تتصفح النظام الآن بحساب: <strong>{currentUser.fullName}</strong> (
                {SYSTEM_ROLE_LABELS[currentUser.role]}) — تم إخفاء الأقسام غير المصرح بها تلقائياً.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const adminAcc = erpState.users.find(
                  (u) => u.role === 'SUPER_ADMIN'
                );
                if (adminAcc) handleQuickSwitchUser(adminAcc);
              }}
              className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer whitespace-nowrap"
            >
              العودة لحساب المدير العام (Super Admin)
            </button>
          </div>
        </div>
      )}

      {/* Access Denied Alert Banner */}
      {accessDeniedAlert && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-800 px-6 py-3 text-xs text-rose-900 dark:text-rose-200 no-print"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{accessDeniedAlert}</span>
            </div>
            <button
              onClick={() => setAccessDeniedAlert(null)}
              className="font-semibold hover:underline cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Instant Backup Confirmation Banner */}
      {backupToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 no-print">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                تم تنزيل النسخة الاحتياطية الكاملة للنظام بنجاح:{' '}
                <strong className="font-mono">{backupToast}</strong>
              </span>
            </div>
            <button
              onClick={() => setBackupToast(null)}
              className="font-semibold hover:underline cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1">
        {!isCurrentSectionAllowed ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              عذراً، ليس لديك صلاحية لهذه الصفحة
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              حسابك الحالي (<strong>{currentUser.fullName}</strong> —{' '}
              {SYSTEM_ROLE_LABELS[currentUser.role]}) غير مخول بالدخول إلى هذا القسم. يرجى مراجعة المدير العام للسنتر لطلب الصلاحية.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccessDeniedAlert(null);
                  setActiveSection('dashboard');
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                العودة إلى الصفحة الرئيسية
              </button>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                تبديل حساب المستخدم
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <DashboardWidgets
                state={erpState}
                onNavigateToView={(view) => handleNavigateToSection(view)}
              />
            )}

            {activeSection === 'academic_tree' && (
              <AcademicTreeManager
                state={erpState}
                onNavigateToSuggestions={() =>
                  handleNavigateToSection('suggestions')
                }
                onNavigateToAttendance={() =>
                  handleNavigateToSection('attendance')
                }
              />
            )}

            {activeSection === 'people' && (
              <PeopleManagement state={erpState} />
            )}

            {activeSection === 'finance' && (
              <UnifiedFinanceCenter state={erpState} />
            )}

            {activeSection === 'attendance' && (
              <UnifiedAttendanceCenter
                state={erpState}
                onNavigateToSuggestions={() =>
                  handleNavigateToSection('suggestions')
                }
              />
            )}

            {activeSection === 'suggestions' && (
              <SmartSuggestionInbox state={erpState} />
            )}

            {activeSection === 'users_permissions' && (
              <SuperAdminUsersPanel
                state={erpState}
                onSwitchUserSuccess={(switchedUser) => {
                  if (!canUserAccessSection(switchedUser, activeSection)) {
                    setActiveSection('dashboard');
                  }
                }}
              />
            )}

            {activeSection === 'settings' && (
              <AdminSettingsCenter
                state={erpState}
                onNavigateToView={(view) => handleNavigateToSection(view)}
              />
            )}
          </>
        )}
      </main>

      {/* Login & User Switcher Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    تسجيل الدخول وتبديل المستخدم النشط
                  </h3>
                  <p className="text-xs text-slate-500">
                    سجل الدخول باسم المستخدم وكلمة المرور لتطبيق صلاحياته فوراً على النظام
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Direct Username / Password Login Form */}
            <form
              onSubmit={handleLoginFormSubmit}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الدخول (Username)
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور (Password)
                  </label>
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                تسجيل الدخول وتطبيق الصلاحيات
              </button>
            </form>

            {/* Quick Account Switcher List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                أو اختر حساباً للتبديل الفوري ومعاينة الصلاحيات ({erpState.users.length}):
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {erpState.users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.status === 'DISABLED' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px]">
                              معطل
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 font-mono mt-0.5">
                          @{u.username} · {SYSTEM_ROLE_LABELS[u.role]}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                          نشط حالياً
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickSwitchUser(u)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                        >
                          دخول بهذا الحساب
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
