import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  FileSpreadsheet,
  Printer,
  Search,
  Clock,
  UserCheck,
  AlertTriangle,
  Activity,
  DollarSign,
  ArrowUpDown,
  RotateCcw,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  ERPDatabaseState,
  SystemAuditCategory,
  SystemAuditEntry,
  SystemAuditSeverity,
  SystemUserRole,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';

interface SystemAuditLogPanelProps {
  state: ERPDatabaseState;
}

export const AUDIT_CATEGORY_LABELS: Record<SystemAuditCategory, string> = {
  STUDENTS_PEOPLE: 'الطلاب والأفراد',
  TREASURY_FINANCE: 'الخزنة والماليات',
  USERS_PERMISSIONS: 'المستخدمين والصلاحيات',
  ACADEMIC_GROUPS: 'المجموعات الدراسية',
  SYSTEM_SETTINGS: 'إعدادات النظام',
};

export const ROLE_LABELS_AR: Record<SystemUserRole, string> = {
  SUPER_ADMIN: 'المدير العام',
  ASSISTANT_ADMIN: 'مدير مساعد',
  ACCOUNTANT: 'محاسب الخزنة',
  RECEPTIONIST: 'موظف استقبال',
  CUSTOM: 'صلاحية مخصصة',
};

type CriticalQuickFilter =
  | 'ALL'
  | 'STUDENT_DELETE'
  | 'TREASURY_EDIT'
  | 'PERMISSIONS_CHANGE';

export function classifyCriticalOperationType(
  entry: SystemAuditEntry
): CriticalQuickFilter | 'OTHER' {
  const titleAndDetails = `${entry.actionTitle} ${entry.details}`;
  if (
    entry.category === 'STUDENTS_PEOPLE' &&
    (titleAndDetails.includes('حذف سجل طالب') || titleAndDetails.includes('حذف طالب'))
  ) {
    return 'STUDENT_DELETE';
  }
  if (
    entry.category === 'TREASURY_FINANCE' &&
    (titleAndDetails.includes('تعديل حركة مالية') ||
      titleAndDetails.includes('حذف حركة مالية') ||
      titleAndDetails.includes('تعديل خزنة') ||
      titleAndDetails.includes('الخزنة'))
  ) {
    return 'TREASURY_EDIT';
  }
  if (
    entry.category === 'USERS_PERMISSIONS' &&
    (titleAndDetails.includes('صلاحيات') ||
      titleAndDetails.includes('حساب مستخدم') ||
      titleAndDetails.includes('كلمة مرور'))
  ) {
    return 'PERMISSIONS_CHANGE';
  }
  return 'OTHER';
}

export default function SystemAuditLogPanel({ state }: SystemAuditLogPanelProps) {
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<
    'ALL' | SystemAuditCategory
  >('ALL');
  const [criticalQuickFilter, setCriticalQuickFilter] =
    useState<CriticalQuickFilter>('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<
    'ALL' | SystemAuditSeverity
  >('ALL');
  const [selectedUsernameFilter, setSelectedUsernameFilter] =
    useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedEntryModal, setSelectedEntryModal] =
    useState<SystemAuditEntry | null>(null);

  const auditLogs = state.auditLogs || [];
  const activeUser =
    state.users.find((u) => u.id === state.currentUserId) || state.users[0];

  const studentDeleteCount = useMemo(
    () =>
      auditLogs.filter((e) => classifyCriticalOperationType(e) === 'STUDENT_DELETE')
        .length,
    [auditLogs]
  );
  const treasuryEditCount = useMemo(
    () =>
      auditLogs.filter((e) => classifyCriticalOperationType(e) === 'TREASURY_EDIT')
        .length,
    [auditLogs]
  );
  const permissionsChangeCount = useMemo(
    () =>
      auditLogs.filter(
        (e) => classifyCriticalOperationType(e) === 'PERMISSIONS_CHANGE'
      ).length,
    [auditLogs]
  );
  const criticalAuditCount = useMemo(
    () => auditLogs.filter((a) => a.severity === 'CRITICAL').length,
    [auditLogs]
  );

  // Unique users who performed actions or exist in state.users
  const performerOptions = useMemo(() => {
    const map = new Map<string, string>();
    state.users.forEach((u) => {
      map.set(u.username, `${u.fullName} (@${u.username})`);
    });
    auditLogs.forEach((log) => {
      if (!map.has(log.performedByUsername)) {
        map.set(
          log.performedByUsername,
          `${log.performedByName} (@${log.performedByUsername})`
        );
      }
    });
    return Array.from(map.entries()).map(([username, label]) => ({
      username,
      label,
    }));
  }, [state.users, auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const filtered = auditLogs.filter((entry) => {
      if (
        auditCategoryFilter !== 'ALL' &&
        entry.category !== auditCategoryFilter
      ) {
        return false;
      }
      if (criticalQuickFilter !== 'ALL') {
        const opType = classifyCriticalOperationType(entry);
        if (opType !== criticalQuickFilter) return false;
      }
      if (
        auditSeverityFilter !== 'ALL' &&
        entry.severity !== auditSeverityFilter
      ) {
        return false;
      }
      if (
        selectedUsernameFilter !== 'ALL' &&
        entry.performedByUsername !== selectedUsernameFilter
      ) {
        return false;
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.trim().toLowerCase();
        const hay = `${entry.actionCode} ${entry.actionTitle} ${entry.details} ${
          entry.performedByName
        } ${entry.performedByUsername} ${entry.targetEntity || ''} ${
          entry.timestamp
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return sortOrder === 'DESC' ? filtered : [...filtered].reverse();
  }, [
    auditLogs,
    auditCategoryFilter,
    criticalQuickFilter,
    auditSeverityFilter,
    selectedUsernameFilter,
    auditSearchQuery,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAuditLogs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredAuditLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredAuditLogs, safeCurrentPage, pageSize]);

  const hasActiveFilters =
    auditCategoryFilter !== 'ALL' ||
    criticalQuickFilter !== 'ALL' ||
    auditSeverityFilter !== 'ALL' ||
    selectedUsernameFilter !== 'ALL' ||
    Boolean(auditSearchQuery.trim());

  const handleResetFilters = () => {
    setAuditCategoryFilter('ALL');
    setCriticalQuickFilter('ALL');
    setAuditSeverityFilter('ALL');
    setSelectedUsernameFilter('ALL');
    setAuditSearchQuery('');
    setCurrentPage(1);
  };

  const handleExportAuditLog = (format: 'EXCEL' | 'PDF') => {
    const cols = [
      { header: 'كود العملية', key: 'actionCode' },
      { header: 'مستوى الحساسية', key: 'severityLabel' },
      { header: 'القسم', key: 'categoryLabel' },
      { header: 'العملية المسجلة', key: 'actionTitle' },
      { header: 'العنصر المستهدف', key: 'targetEntity' },
      { header: 'تفاصيل العملية الرقابية', key: 'details' },
      { header: 'اسم المستخدم المنفذ', key: 'performedByName' },
      { header: 'الطابع الزمني', key: 'timestamp' },
    ];
    const rows = filteredAuditLogs.map((entry) => ({
      actionCode: entry.actionCode,
      severityLabel:
        entry.severity === 'CRITICAL'
          ? 'عملية حرجة (حذف / خزنة / صلاحيات)'
          : entry.severity === 'WARNING'
          ? 'تعديل رقابي'
          : 'عملية مسجلة',
      categoryLabel: AUDIT_CATEGORY_LABELS[entry.category] || entry.category,
      actionTitle: entry.actionTitle,
      targetEntity: entry.targetEntity || '—',
      details: entry.details,
      performedByName: `${entry.performedByName} (@${entry.performedByUsername})`,
      timestamp: entry.timestamp,
    }));

    if (format === 'EXCEL') {
      exportToExcel('سجل_نشاطات_النظام_الرقابي', cols, rows);
    } else {
      exportToPdfReport({
        title: 'سجل نشاطات النظام والعمليات الحرجة (System Audit Log)',
        subtitle: `تقرير الرقابة الأمنية والمالية • إجمالي السجلات: ${rows.length} عملية`,
        columns: cols,
        data: rows,
      });
    }
  };

  return (
    <div
      data-testid="system-audit-log-panel"
      className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                سجل نشاطات النظام (System Audit Log)
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[11px] font-bold">
                رقابة المدير العام الفورية
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              يوثق تلقائياً كل عملية حرجة (حذف طالب، تعديل خزنة، تغيير صلاحيات) مع اسم المستخدم المنفذ والطابع الزمني في جدول مرتب يسهل تصفحه.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportAuditLog('EXCEL')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير السجل Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportAuditLog('PDF')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>طباعة السجل PDF</span>
          </button>
        </div>
      </div>

      {/* Audit Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">
              إجمالي النشاطات المسجلة
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {auditLogs.length} عملية موثقة
            </div>
          </div>
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="p-3.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              العمليات الحرجة (حذف / خزنة / صلاحيات)
            </div>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-0.5 tabular-nums">
              {criticalAuditCount} عمليات حرجة
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        </div>

        <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              تعديلات وحركات الخزنة
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
              {treasuryEditCount} عملية مالية
            </div>
          </div>
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="p-3.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
              المستخدم المسجل حالياً بالجلسة
            </div>
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mt-1 truncate">
              {activeUser?.fullName || 'المدير العام'}
            </div>
          </div>
          <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        </div>
      </div>

      {/* Quick Critical Operation Filter Pills (حذف طالب / تعديل خزنة / تغيير صلاحيات) */}
      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            تصفية سريعة للعمليات الحرجة:
          </span>
          <button
            type="button"
            onClick={() => {
              setCriticalQuickFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              criticalQuickFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            جميع السجلات ({auditLogs.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setCriticalQuickFilter('STUDENT_DELETE');
              setAuditCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              criticalQuickFilter === 'STUDENT_DELETE'
                ? 'bg-rose-600 text-white'
                : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف طالب ({studentDeleteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCriticalQuickFilter('TREASURY_EDIT');
              setAuditCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              criticalQuickFilter === 'TREASURY_EDIT'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>تعديل خزنة ({treasuryEditCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCriticalQuickFilter('PERMISSIONS_CHANGE');
              setAuditCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              criticalQuickFilter === 'PERMISSIONS_CHANGE'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>تغيير صلاحيات ({permissionsChangeCount})</span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        )}
      </div>

      {/* Filter Bar: Categories + User + Severity + Sort + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'ALL', label: 'كل الأقسام' },
              { key: 'STUDENTS_PEOPLE', label: 'الطلاب والأفراد' },
              { key: 'TREASURY_FINANCE', label: 'الخزنة والماليات' },
              { key: 'USERS_PERMISSIONS', label: 'المستخدمين والصلاحيات' },
              { key: 'ACADEMIC_GROUPS', label: 'المجموعات الدراسية' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setAuditCategoryFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                auditCategoryFilter === tab.key
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="تصفية حسب المستخدم المنفذ"
            value={selectedUsernameFilter}
            onChange={(e) => {
              setSelectedUsernameFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">جميع الموظفين والمستخدمين</option>
            {performerOptions.map((u) => (
              <option key={u.username} value={u.username}>
                {u.label}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب مستوى الحساسية"
            value={auditSeverityFilter}
            onChange={(e) => {
              setAuditSeverityFilter(
                e.target.value as 'ALL' | SystemAuditSeverity
              );
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">جميع مستويات الحساسية</option>
            <option value="CRITICAL">عمليات حرجة (حذف / خزنة / صلاحيات)</option>
            <option value="WARNING">تعديلات وسحوبات مالية</option>
            <option value="INFO">عمليات إضافة وتحصيل</option>
          </select>

          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))
            }
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            title="تغيير الترتيب الزمني"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>{sortOrder === 'DESC' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={auditSearchQuery}
              onChange={(e) => {
                setAuditSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="بحث باسم المستخدم، الطالب، أو العملية..."
              className="pr-8 pl-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 w-60"
            />
          </div>
        </div>
      </div>

      {/* Organized & Easy-to-Browse Audit Log Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3.5 font-semibold w-12 text-center">#</th>
              <th className="py-3 px-3.5 font-semibold">كود ومستوى العملية</th>
              <th className="py-3 px-3.5 font-semibold">
                العملية الحرجة والتفاصيل الرقابية
              </th>
              <th className="py-3 px-3.5 font-semibold">القسم المرتبط</th>
              <th className="py-3 px-3.5 font-semibold">
                اسم المستخدم المنفذ
              </th>
              <th className="py-3 px-3.5 font-semibold">الطابع الزمني</th>
              <th className="py-3 px-3.5 font-semibold text-left">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedAuditLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-xs text-slate-500"
                >
                  لا توجد سجلات نشاط مطابقة لمعايير البحث أو التصفية الحالية.
                </td>
              </tr>
            ) : (
              paginatedAuditLogs.map((log, idx) => {
                const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                const opKind = classifyCriticalOperationType(log);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3.5 align-top text-center font-mono text-xs text-slate-400 tabular-nums">
                      {rowNumber}
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {log.actionCode}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {log.severity === 'CRITICAL'
                          ? 'عملية حرجة'
                          : log.severity === 'WARNING'
                          ? 'تعديل / خصم'
                          : 'إجراء مسجل'}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-top">
                      <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        <span>{log.actionTitle}</span>
                        {opKind === 'STUDENT_DELETE' && (
                          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold">
                            حذف طالب
                          </span>
                        )}
                        {opKind === 'TREASURY_EDIT' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                            تعديل خزنة
                          </span>
                        )}
                        {opKind === 'PERMISSIONS_CHANGE' && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
                            تغيير صلاحيات
                          </span>
                        )}
                        {log.targetEntity && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold">
                            {log.targetEntity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {log.details}
                      </p>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {AUDIT_CATEGORY_LABELS[log.category] || log.category}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {log.performedByName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">@{log.performedByUsername}</span>
                        <span>•</span>
                        <span>
                          {ROLE_LABELS_AR[log.performedByRole] ||
                            log.performedByRole}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap text-left">
                      <button
                        type="button"
                        onClick={() => setSelectedEntryModal(log)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="عرض بطاقة تفاصيل العملية"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>التفاصيل</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Easy Browsing & Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            إجمالي النتائج المعروضة:{' '}
            <strong className="text-slate-900 dark:text-white tabular-nums">
              {paginatedAuditLogs.length}
            </strong>{' '}
            من أصل{' '}
            <strong className="text-slate-900 dark:text-white tabular-nums">
              {filteredAuditLogs.length}
            </strong>{' '}
            عملية مسجلة
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <label className="inline-flex items-center gap-1.5">
            <span>عدد الصفوف:</span>
            <select
              aria-label="عدد الصفوف في الصفحة"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value={10}>10 صفوف</option>
              <option value={25}>25 صفاً</option>
              <option value={100}>100 صف</option>
            </select>
          </label>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              صفحة {safeCurrentPage} من {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Audit Entry Inspection Modal */}
      {selectedEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  تفاصيل العملية الرقابية ({selectedEntryModal.actionCode})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntryModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="text-slate-500">اسم المستخدم المنفذ</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedEntryModal.performedByName}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    @{selectedEntryModal.performedByUsername} •{' '}
                    {ROLE_LABELS_AR[selectedEntryModal.performedByRole] ||
                      selectedEntryModal.performedByRole}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">الطابع الزمني الدقيق</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {selectedEntryModal.timestamp}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    القسم:{' '}
                    {AUDIT_CATEGORY_LABELS[selectedEntryModal.category] ||
                      selectedEntryModal.category}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-slate-500">عنوان العملية المسجلة</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedEntryModal.actionTitle}
                </div>
                {selectedEntryModal.targetEntity && (
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-400">
                    العنصر المستهدف: {selectedEntryModal.targetEntity}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-slate-500">البيان التفصيلي للعملية</div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedEntryModal.details}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEntryModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
