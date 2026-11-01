import React, { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Receipt,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Search,
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import {
  ERPDatabaseState,
  TreasuryTransaction,
  erpStore,
  calculateRevenueSplit,
  buildMonthlyGroupRevenueAnalytics,
  resolveEffectiveTeacherSplit,
  RevenueMetricMode,
  GroupRevenueSummary,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';
import {
  CustomFieldBuilderModal,
  CategoryManagerModal,
  DynamicCustomFieldsInputGrid,
} from '../common/CustomizationModals';

interface UnifiedFinanceCenterProps {
  state: ERPDatabaseState;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
  currency: string;
  groupSummaries: GroupRevenueSummary[];
  metricLabel: string;
}

function CustomGroupRevenueTooltip({
  active,
  payload,
  label,
  currency,
  groupSummaries,
  metricLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const totalMonth = payload.reduce(
    (sum, entry) => sum + (Number(entry.value) || 0),
    0
  );

  return (
    <div
      dir="rtl"
      className="rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-700 shadow-lg p-3.5 min-w-[240px] text-right"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          {label}
        </span>
        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          {metricLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        {payload.map((entry) => {
          const grpMeta = groupSummaries.find(
            (g) => g.groupId === entry.dataKey
          );
          const val = Number(entry.value) || 0;
          const pct = totalMonth > 0 ? Math.round((val / totalMonth) * 100) : 0;
          return (
            <div
              key={String(entry.dataKey)}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor:
                      entry.color || grpMeta?.color || '#2563eb',
                  }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                  {grpMeta?.shortName || entry.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                <span className="font-bold text-slate-900 dark:text-white">
                  {val.toLocaleString()} {currency}
                </span>
                <span className="text-[11px] text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
        <span className="text-slate-600 dark:text-slate-400">إجمالي الشهر</span>
        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
          {totalMonth.toLocaleString()} {currency}
        </span>
      </div>
    </div>
  );
}

export default function UnifiedFinanceCenter({
  state,
}: UnifiedFinanceCenterProps) {
  const expenseCategories = state.config.expenseCategories;
  const expenseCustomFields = state.config.customFields.filter(
    (f) => f.entity === 'expense'
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    state.students[0]?.id || ''
  );
  const selectedStudent = state.students.find(
    (s) => s.id === selectedStudentId
  );

  const studentGroups = state.groups.filter((g) =>
    selectedStudent?.groupIds.includes(g.id)
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    studentGroups[0]?.id || state.groups[0]?.id || ''
  );

  const activeGroup =
    state.groups.find((g) => g.id === selectedGroupId) || state.groups[0];
  const activeTeacher = state.teachers.find(
    (t) => t.id === activeGroup?.teacherId
  );

  const [grossAmount, setGrossAmount] = useState<number>(
    activeGroup?.monthlyFee || 320
  );
  const [discountPercent, setDiscountPercent] = useState<number>(
    selectedStudent?.discountPercent || 0
  );
  const [isInstallmentMode, setIsInstallmentMode] = useState<boolean>(false);
  const [paidAmountNow, setPaidAmountNow] = useState<number>(
    activeGroup?.monthlyFee || 320
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'INSTAPAY' | 'VODAFONE_CASH'
  >('CASH');

  // Interactive Recharts Analytics State
  const [chartType, setChartType] = useState<
    'STACKED_BAR' | 'GROUPED_BAR' | 'AREA_TREND'
  >('STACKED_BAR');
  const [metricMode, setMetricMode] =
    useState<RevenueMetricMode>('NET_REVENUE');
  const [focusedGroupId, setFocusedGroupId] = useState<string>('ALL');

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(
    expenseCategories[0] || 'مطبوعات وتشغيل'
  );
  const [expenseAmount, setExpenseAmount] = useState<number>(200);
  const [expenseCustomValues, setExpenseCustomValues] = useState<
    Record<string, string>
  >({});

  // Customization Modals
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Treasury Edit Modal State
  const [editingTx, setEditingTx] = useState<TreasuryTransaction | null>(null);
  const [editTxTitle, setEditTxTitle] = useState('');
  const [editTxAmount, setEditTxAmount] = useState<number>(0);
  const [editTxReason, setEditTxReason] = useState('');

  // Filter Ledger
  const [txFilter, setTxFilter] = useState<
    'ALL' | 'TUITION_COLLECTION' | 'EXPENSE' | 'PAYROLL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: `التقرير_المالي_${state.config.centerName}`,
  });

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Effective Teacher Split Percentage (supports group override, subject override, teacher split, or default)
  const teacherSplitPct = resolveEffectiveTeacherSplit(
    activeTeacher,
    activeGroup,
    state.config.defaultTeacherSplit
  );

  const liveSplit = calculateRevenueSplit(
    grossAmount,
    discountPercent,
    teacherSplitPct,
    isInstallmentMode ? paidAmountNow : undefined
  );

  // Financial KPIs from state.transactions
  const tuitionTransactions = state.transactions.filter(
    (t) => t.type === 'TUITION_COLLECTION'
  );
  const expenseTransactions = state.transactions.filter(
    (t) => t.type === 'EXPENSE' || t.type === 'PAYROLL'
  );

  const totalGrossCollected = tuitionTransactions.reduce(
    (sum, t) => sum + t.netAmount,
    0
  );
  const totalTeacherShares = tuitionTransactions.reduce(
    (sum, t) => sum + t.teacherShare,
    0
  );
  const totalCenterGrossShare = tuitionTransactions.reduce(
    (sum, t) => sum + t.centerShare,
    0
  );
  const totalExpensesAndPayroll = expenseTransactions.reduce(
    (sum, t) => sum + t.netAmount,
    0
  );
  const netCenterTreasury = totalCenterGrossShare - totalExpensesAndPayroll;

  // Monthly Group Revenue Analytics (Recharts Data)
  const revenueAnalytics = useMemo(
    () =>
      buildMonthlyGroupRevenueAnalytics(
        state.groups,
        state.transactions,
        metricMode
      ),
    [state.groups, state.transactions, metricMode]
  );

  const visibleGroups = useMemo(() => {
    if (focusedGroupId === 'ALL') return revenueAnalytics.groupSummaries;
    return revenueAnalytics.groupSummaries.filter(
      (g) => g.groupId === focusedGroupId
    );
  }, [revenueAnalytics.groupSummaries, focusedGroupId]);

  const metricLabel =
    metricMode === 'CENTER_SHARE'
      ? 'صافي حصة السنتر'
      : metricMode === 'TEACHER_SHARE'
      ? 'حصة المدرسين'
      : 'إجمالي دخل المجموعات';

  const filteredTransactions = state.transactions.filter((tx) => {
    if (txFilter !== 'ALL' && tx.type !== txFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.title.toLowerCase().includes(q) ||
      tx.receiptNumber.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q)
    );
  });

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !activeGroup || grossAmount <= 0) return;
    erpStore.collectStudentPayment({
      studentId: selectedStudentId,
      groupId: activeGroup.id,
      grossAmount,
      paidAmount: isInstallmentMode ? paidAmountNow : undefined,
      discountPercent,
      paymentMethod,
    });

    if (liveSplit.remainingInstallment > 0) {
      showToast(
        `تم تحصيل دفعة ${liveSplit.netAmount} ${state.config.currency}، وتسجيل متبقي (${liveSplit.remainingInstallment} ${state.config.currency}) وتجهيز مسودة واتساب لولي الأمر.`
      );
    } else {
      showToast(
        `تم تحصيل ${liveSplit.netAmount} ${state.config.currency} بالكامل وتحديث الرسم البياني لإيرادات (${activeGroup.name}) فوراً.`
      );
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return;
    erpStore.recordOperationalExpense({
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: expenseAmount,
      type: 'EXPENSE',
      paymentMethod: 'CASH',
      customFields: expenseCustomValues,
    });
    setExpenseTitle('');
    setExpenseCustomValues({});
    showToast(
      `تم تسجيل مصروف "${expenseTitle}" بقيمة ${expenseAmount} ${state.config.currency} وخصمه من الخزينة.`
    );
  };

  const buildFinanceSummaryCards = () => [
    {
      label: 'إجمالي المتحصلات الدراسية',
      value: `${totalGrossCollected.toLocaleString()} ${state.config.currency}`,
      color: '#15803d',
    },
    {
      label: 'إجمالي حصة المدرسين',
      value: `${totalTeacherShares.toLocaleString()} ${state.config.currency}`,
      color: '#1d4ed8',
    },
    {
      label: 'المصروفات والرواتب',
      value: `${totalExpensesAndPayroll.toLocaleString()} ${state.config.currency}`,
      color: '#e11d48',
    },
    {
      label: 'صافي الخزينة الحالي',
      value: `${netCenterTreasury.toLocaleString()} ${state.config.currency}`,
    },
  ];

  const handleExportExcel = () => {
    const cols = [
      { header: 'رقم الإيصال', key: 'receiptNumber' },
      { header: 'البيان', key: 'title' },
      { header: 'التصنيف', key: 'category' },
      { header: 'المبلغ المحصل/المصروف', key: 'netAmount' },
      { header: 'المتبقي (أقساط)', key: 'remainingInstallment' },
      { header: 'حصة المدرس', key: 'teacherShare' },
      { header: 'صافي السنتر', key: 'centerShare' },
      { header: 'طريقة الدفع', key: 'paymentMethod' },
      { header: 'التوقيت', key: 'createdAt' },
      ...expenseCustomFields.map((cf) => ({
        header: cf.label,
        key: `cf_${cf.id}`,
      })),
    ];
    const rows = filteredTransactions.map((tx) => {
      const rowObj: Record<string, any> = {
        ...tx,
        remainingInstallment: tx.remainingInstallment || 0,
      };
      expenseCustomFields.forEach((cf) => {
        rowObj[`cf_${cf.id}`] = tx.customFields?.[cf.id] || '—';
      });
      return rowObj;
    });
    exportToExcel('حركة_الخزينة_والماليات', cols, rows, {
      reportTitle: 'كشف حركة الخزينة وتوزيع نسب المدرسين والأقساط',
      subtitle: `${state.config.centerName} - صافي الخزينة الحالي: ${netCenterTreasury.toLocaleString()} ${state.config.currency}`,
      section: 'FINANCE',
      summaryCards: buildFinanceSummaryCards(),
    });
    showToast(
      `تم تصدير كشف الخزينة والماليات (${rows.length} حركة) بصيغة Excel (RTL) متضمناً شعار السنتر والترويسة المعتمدة.`
    );
  };

  const handleExportPdf = () => {
    const cols = [
      { header: 'رقم الإيصال', key: 'receiptNumber' },
      { header: 'البيان', key: 'title' },
      { header: 'التصنيف', key: 'category' },
      { header: 'المبلغ', key: 'netAmount' },
      { header: 'حصة المدرس', key: 'teacherShare' },
      { header: 'صافي السنتر', key: 'centerShare' },
      { header: 'التوقيت', key: 'createdAt' },
      ...expenseCustomFields.map((cf) => ({
        header: cf.label,
        key: `cf_${cf.id}`,
      })),
    ];
    const rows = filteredTransactions.map((tx) => {
      const rowObj: Record<string, any> = { ...tx };
      expenseCustomFields.forEach((cf) => {
        rowObj[`cf_${cf.id}`] = tx.customFields?.[cf.id] || '—';
      });
      return rowObj;
    });
    exportToPdfReport({
      title: 'كشف حركة الخزينة وتوزيع نسب المدرسين والأقساط',
      subtitle: `${state.config.centerName} - صافي الخزينة الحالي: ${netCenterTreasury.toLocaleString()} ${state.config.currency}`,
      columns: cols,
      data: rows,
      section: 'FINANCE',
      summaryCards: buildFinanceSummaryCards(),
    });
    showToast(
      `تم توليد التقرير المالي الرسمي بصيغة PDF (RTL) بخطوط عربية واضحة وشعار السنتر المعتمد.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Export / Customization Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            الخزنة والماليات، السداد على دفعات، وحساب النسب المرنة
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            تحصيل الاشتراكات (كامل أو أقساط)، إضافة بنود مصروفات وحقول مخصصة، وتحليل إيرادات المجموعات شهرياً.
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
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>إدارة وتعديل التصنيفات</span>
          </button>

          <button
            onClick={() => handlePrintReport()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>تصدير للتقارير (طباعة مباشرة)</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>PDF رسمي</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
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
            className="text-slate-500 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 4 Financial KPIs Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            إجمالي المتحصلات من الطلاب
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {totalGrossCollected.toLocaleString()} {state.config.currency}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            من إجمالي {tuitionTransactions.length} حركة تحصيل للمجموعات
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            إجمالي حصص المدرسين المعتمدة
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {totalTeacherShares.toLocaleString()} {state.config.currency}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            تحسب تلقائياً حسب نسبة كل مدرس أو مجموعة
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            إجمالي المصروفات والرواتب
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {totalExpensesAndPayroll.toLocaleString()} {state.config.currency}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            تشمل التشغيل ورواتب الموظفين
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            صافي ربح الخزينة للسنتر (بعد المصروفات)
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {netCenterTreasury.toLocaleString()} {state.config.currency}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            حصة السنتر مطروحاً منها المصروفات
          </div>
        </div>
      </div>

      {/* Interactive Recharts Monthly Group Revenue Evolution Section */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تطور إيرادات السنتر شهرياً حسب كل مجموعة تعليمية
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تحليل تفاعلي يقارن مساهمة كل مجموعة دراسية في دخل السنتر من أغسطس حتى نوفمبر 2026 ويتحدث فورياً مع كل إيصال جديد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('NET_REVENUE')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  metricMode === 'NET_REVENUE'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                إجمالي دخل المجموعات
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('CENTER_SHARE')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  metricMode === 'CENTER_SHARE'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                صافي السنتر
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('TEACHER_SHARE')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  metricMode === 'TEACHER_SHARE'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                حصص المدرسين
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartType('STACKED_BAR')}
                className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  chartType === 'STACKED_BAR'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>أعمدة تراكمية</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('GROUPED_BAR')}
                className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  chartType === 'GROUPED_BAR'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>أعمدة منفصلة</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('AREA_TREND')}
                className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  chartType === 'AREA_TREND'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>منحنى النمو</span>
              </button>
            </div>
          </div>
        </div>

        {/* Group Selector Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              تصفية حسب المجموعة:
            </span>
            <button
              type="button"
              onClick={() => setFocusedGroupId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                focusedGroupId === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              جميع المجموعات ({revenueAnalytics.groupSummaries.length})
            </button>
            {revenueAnalytics.groupSummaries.map((grp) => {
              const isSelected = focusedGroupId === grp.groupId;
              return (
                <button
                  key={grp.groupId}
                  type="button"
                  onClick={() =>
                    setFocusedGroupId(isSelected ? 'ALL' : grp.groupId)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-500'
                      : 'bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: grp.color }}
                  />
                  <span>{grp.shortName}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            إجمالي الفترة ({metricLabel}):{' '}
            <strong className="text-slate-900 dark:text-white font-bold">
              {revenueAnalytics.grandTotalMetric.toLocaleString()}{' '}
              {state.config.currency}
            </strong>
          </div>
        </div>

        {/* Recharts Canvas Container */}
        <div className="h-[340px] w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartType === 'AREA_TREND' ? (
              <AreaChart
                data={revenueAnalytics.monthlySeries}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  {visibleGroups.map((grp) => (
                    <linearGradient
                      key={`grad-${grp.groupId}`}
                      id={`grad-${grp.groupId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={grp.color}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={grp.color}
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  content={
                    <CustomGroupRevenueTooltip
                      currency={state.config.currency}
                      groupSummaries={revenueAnalytics.groupSummaries}
                      metricLabel={metricLabel}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mx-1">
                      {value}
                    </span>
                  )}
                />
                {visibleGroups.map((grp) => (
                  <Area
                    key={grp.groupId}
                    type="monotone"
                    dataKey={grp.groupId}
                    name={grp.shortName}
                    stroke={grp.color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#grad-${grp.groupId})`}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart
                data={revenueAnalytics.monthlySeries}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                barGap={chartType === 'GROUPED_BAR' ? 6 : 0}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  content={
                    <CustomGroupRevenueTooltip
                      currency={state.config.currency}
                      groupSummaries={revenueAnalytics.groupSummaries}
                      metricLabel={metricLabel}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mx-1">
                      {value}
                    </span>
                  )}
                />
                {visibleGroups.map((grp) => (
                  <Bar
                    key={grp.groupId}
                    dataKey={grp.groupId}
                    name={grp.shortName}
                    stackId={
                      chartType === 'STACKED_BAR' ? 'monthlyStack' : undefined
                    }
                    fill={grp.color}
                    radius={
                      chartType === 'GROUPED_BAR'
                        ? [6, 6, 0, 0]
                        : [2, 2, 0, 0]
                    }
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Per-Group Monthly Performance Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {revenueAnalytics.groupSummaries.map((grp) => {
            const isFocused = focusedGroupId === grp.groupId;
            return (
              <div
                key={grp.groupId}
                onClick={() =>
                  setFocusedGroupId(isFocused ? 'ALL' : grp.groupId)
                }
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/30'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: grp.color }}
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {grp.shortName}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums shrink-0">
                    {grp.growthPercent >= 0
                      ? `+${grp.growthPercent}%`
                      : `${grp.growthPercent}%`}{' '}
                    نمو
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between tabular-nums">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      إيراد شهر نوفمبر
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {grp.currentMonthRevenue.toLocaleString()}{' '}
                      {state.config.currency}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] text-slate-500">المساهمة</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {grp.shareOfTotalPercent}% من الدخل
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    إجمالي 4 شهور: {grp.totalNetRevenue.toLocaleString()}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    السنتر: {grp.totalCenterShare.toLocaleString()}{' '}
                    {state.config.currency}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forms Row: Tuition Collection with Installments (7 cols) + Operational Expense Form (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Collect Student Payment with Live Split & Installments Calculator */}
        <form
          onSubmit={handleCollectPayment}
          className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تحصيل مصروفات طالب (كامل أو أقساط) وتوزيع النسب
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يدعم السداد الكامل أو سداد دفعة جزئية مع تسجيل المتبقي وتوليد إشعار واتساب تلقائي.
              </p>
            </div>

            {/* Full vs Installment Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsInstallmentMode(false)}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  !isInstallmentMode
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                سداد كامل
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInstallmentMode(true);
                  setPaidAmountNow(Math.round(grossAmount / 2));
                }}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  isInstallmentMode
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                سداد على دفعات (قسط)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اختر الطالب
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  const stId = e.target.value;
                  setSelectedStudentId(stId);
                  const st = state.students.find((s) => s.id === stId);
                  if (st) {
                    setDiscountPercent(st.discountPercent || 0);
                    const firstGrpId =
                      st.groupIds[0] || state.groups[0]?.id || '';
                    setSelectedGroupId(firstGrpId);
                    const grp = state.groups.find((g) => g.id === firstGrpId);
                    if (grp) {
                      setGrossAmount(grp.monthlyFee);
                      setPaidAmountNow(grp.monthlyFee);
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                {state.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.code}) — مديونية: {st.balanceDue}{' '}
                    {state.config.currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المجموعة الدراسية / المدرس
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  const grp = state.groups.find((g) => g.id === e.target.value);
                  if (grp) {
                    setGrossAmount(grp.monthlyFee);
                    setPaidAmountNow(grp.monthlyFee);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                {state.groups.map((grp) => {
                  const tch = state.teachers.find(
                    (t) => t.id === grp.teacherId
                  );
                  return (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} — {tch?.fullName} ({grp.monthlyFee}{' '}
                      {state.config.currency})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                إجمالي الاشتراك المطلوب ({state.config.currency})
              </label>
              <input
                type="number"
                min={10}
                required
                value={grossAmount}
                onChange={(e) => setGrossAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                قاعدة الخصم المطبقة
              </label>
              <select
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value={0}>بدون خصم (0%)</option>
                {state.config.discountRules
                  .filter((r) => r.active)
                  .map((r) => (
                    <option key={r.id} value={r.percent}>
                      {r.title} ({r.percent}%)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                وسيلة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'CASH' | 'INSTAPAY' | 'VODAFONE_CASH'
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="CASH">نقدي بالخزينة (Cash)</option>
                <option value="INSTAPAY">إنستا باي (InstaPay)</option>
                <option value="VODAFONE_CASH">فودافون كاش</option>
              </select>
            </div>
          </div>

          {isInstallmentMode && (
            <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                  المبلغ المسدد الآن كدفعة / قسط ({state.config.currency})
                </label>
                <input
                  type="number"
                  min={10}
                  max={liveSplit.netRequiredAmount}
                  value={paidAmountNow}
                  onChange={(e) => setPaidAmountNow(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-sm font-bold text-slate-900 dark:text-white tabular-nums"
                />
              </div>
              <div className="text-xs space-y-1 tabular-nums">
                <div className="text-slate-600 dark:text-slate-300">
                  الصافي المطلوب بعد الخصم:{' '}
                  <strong>
                    {liveSplit.netRequiredAmount} {state.config.currency}
                  </strong>
                </div>
                <div className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                  المتبقي المستحق على الطالب: {liveSplit.remainingInstallment}{' '}
                  {state.config.currency}
                </div>
              </div>
            </div>
          )}

          {/* Live Split Breakdown Bar */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4 text-center tabular-nums">
            <div>
              <div className="text-xs text-slate-500">المبلغ المحصل فعلياً</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {liveSplit.netAmount} {state.config.currency}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                حصة المدرس ({teacherSplitPct}%)
              </div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {liveSplit.teacherShare} {state.config.currency}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                صافي السنتر ({100 - teacherSplitPct}%)
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {liveSplit.centerShare} {state.config.currency}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {isInstallmentMode
              ? 'تأكيد تحصيل القسط وتسجيل المتبقي على الطالب'
              : 'تأكيد السداد الكامل وإصدار إيصال رسمي بالخزينة'}
          </button>
        </form>

        {/* Record Operational Expense with Dynamic Categories & Custom Fields */}
        <form
          onSubmit={handleAddExpense}
          className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تسجيل مصروف تشغيلي أو نثرية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يخصم المصروف مباشرة من صافي خزينة السنتر مع دعم البنود الديناميكية.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              + بند جديد
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              بيان المصروف
            </label>
            <input
              type="text"
              required
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="مثال: شراء رزم ورق A4 وأحبار ماكينة التصوير"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                بند المصروف الديناميكي
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المبلغ ({state.config.currency})
              </label>
              <input
                type="number"
                min={5}
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>

          <DynamicCustomFieldsInputGrid
            entity="expense"
            customFields={state.config.customFields}
            values={expenseCustomValues}
            onChange={setExpenseCustomValues}
          />

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            تسجيل المصروف وخصمه من الخزينة
          </button>
        </form>
      </div>

      {/* Printable Ledger Table Area */}
      <div
        ref={printAreaRef}
        dir="rtl"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {state.config.exportBranding?.showLogoInExports !== false &&
              state.config.exportBranding?.logoDataUrl && (
                <img
                  src={state.config.exportBranding.logoDataUrl}
                  alt="شعار السنتر"
                  className="w-11 h-11 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0"
                />
              )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                دفتر حركات الخزينة وتوزيع الأرباح ({filteredTransactions.length}{' '}
                حركة)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {state.config.centerName} ·{' '}
                {state.config.exportBranding?.headerSubtitle ||
                  state.config.receiptFooter}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setTxFilter('ALL')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  txFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTxFilter('TUITION_COLLECTION')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  txFilter === 'TUITION_COLLECTION'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                إيرادات الطلاب
              </button>
              <button
                onClick={() => setTxFilter('EXPENSE')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  txFilter === 'EXPENSE'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                المصروفات
              </button>
              <button
                onClick={() => setTxFilter('PAYROLL')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  txFilter === 'PAYROLL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                الرواتب
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الإيصال أو البيان..."
                className="pr-8 pl-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">رقم الإيصال</th>
                <th className="py-2.5 px-3 font-semibold">البيان والتفاصيل</th>
                <th className="py-2.5 px-3 font-semibold">التصنيف</th>
                <th className="py-2.5 px-3 font-semibold">المبلغ الصافي</th>
                <th className="py-2.5 px-3 font-semibold">حصة المدرس</th>
                <th className="py-2.5 px-3 font-semibold">حصة السنتر</th>
                {expenseCustomFields.map((cf) => (
                  <th
                    key={cf.id}
                    className="py-2.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    {cf.label}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-semibold">الدفع والوقت</th>
                <th className="py-2.5 px-3 font-semibold text-left no-print">
                  إجراءات الرقابة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {tx.receiptNumber}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {tx.title}
                    {tx.discountApplied > 0 && (
                      <span className="block text-xs font-normal text-emerald-600 dark:text-emerald-400">
                        شامل خصم بقيمة {tx.discountApplied}{' '}
                        {state.config.currency}
                      </span>
                    )}
                    {tx.remainingInstallment && tx.remainingInstallment > 0 ? (
                      <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400">
                        متبقي قسط على الطالب: {tx.remainingInstallment}{' '}
                        {state.config.currency}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                    {tx.category}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums font-bold text-slate-900 dark:text-white">
                    {tx.netAmount} {state.config.currency}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                    {tx.teacherShare > 0
                      ? `${tx.teacherShare} ${state.config.currency}`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums font-bold">
                    <span
                      className={
                        tx.centerShare >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {tx.centerShare > 0
                        ? `+${tx.centerShare}`
                        : tx.centerShare}{' '}
                      {state.config.currency}
                    </span>
                  </td>
                  {expenseCustomFields.map((cf) => (
                    <td
                      key={cf.id}
                      className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300"
                    >
                      {tx.customFields?.[cf.id] || '—'}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                    {tx.paymentMethod} · {tx.createdAt}
                  </td>
                  <td className="py-2.5 px-3 text-left no-print">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTx(tx);
                          setEditTxTitle(tx.title);
                          setEditTxAmount(tx.netAmount);
                          setEditTxReason('مراجعة وتصحيح محاسبي معتمد');
                        }}
                        aria-label={`تعديل حركة الخزنة ${tx.receiptNumber}`}
                        className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          erpStore.deleteTreasuryTransaction(
                            tx.id,
                            'حذف حركة مالية من دفتر الخزنة'
                          );
                          showToast(
                            `تم حذف الحركة المالية (${tx.receiptNumber}) وتسجيل العملية في سجل نشاطات النظام.`
                          );
                        }}
                        aria-label={`حذف حركة الخزنة ${tx.receiptNumber}`}
                        className="px-2 py-1 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treasury Transaction Modification Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            dir="rtl"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تعديل حركة خزينة ({editingTx.receiptNumber})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يتم توثيق هذا التعديل فوراً في سجل نشاطات النظام للرقابة المالية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                erpStore.updateTreasuryTransaction(editingTx.id, {
                  title: editTxTitle,
                  netAmount: editTxAmount,
                  reason: editTxReason,
                });
                setEditingTx(null);
                showToast(
                  `تم تعديل حركة الخزينة (${editingTx.receiptNumber}) وتوثيق العملية في سجل نشاطات النظام.`
                );
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  بيان الحركة المالية
                </label>
                <input
                  type="text"
                  required
                  value={editTxTitle}
                  onChange={(e) => setEditTxTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المالي المعدل ({state.config.currency})
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editTxAmount}
                  onChange={(e) => setEditTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل الرقابي (يظهر في سجل نشاطات المدير)
                </label>
                <input
                  type="text"
                  required
                  value={editTxReason}
                  onChange={(e) => setEditTxReason(e.target.value)}
                  placeholder="مثال: تصحيح قيمة القسط بعد مراجعة الإيصال الورقي"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ التعديل وتوثيق بالرقابة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Fields Builder Modal for Expenses */}
      {showCustomFieldModal && (
        <CustomFieldBuilderModal
          entity="expense"
          customFields={state.config.customFields}
          onClose={() => setShowCustomFieldModal(false)}
          onSuccess={showToast}
        />
      )}

      {/* Category Manager Modal for Expense Categories */}
      {showCategoryModal && (
        <CategoryManagerModal
          state={state}
          initialTab="expenseCategories"
          onClose={() => setShowCategoryModal(false)}
          onSuccess={showToast}
        />
      )}
    </div>
  );
}
