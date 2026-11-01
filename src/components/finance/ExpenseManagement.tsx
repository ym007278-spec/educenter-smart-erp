import React, { useState } from 'react';
import {
  DollarSign,
  Receipt,
  Plus,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  Wrench,
  FileSpreadsheet,
  Wifi,
  Sparkles,
  ArrowDownRight,
  TrendingDown,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { authStorage } from '../../lib/auth-storage';

export type ExpenseCategory =
  | 'ELECTRICITY_WATER'
  | 'MAINTENANCE'
  | 'OFFICE_SUPPLIES'
  | 'INTERNET_TELECOM'
  | 'CLEANING_HOSPITALITY'
  | 'RENT_SECURITY';

export interface ExpenseRecord {
  id: string;
  voucherNumber: string;
  category: ExpenseCategory;
  categoryNameAr: string;
  amount: number;
  date: string;
  time: string;
  beneficiary: string;
  authorizedBy: string;
  balanceAfter: number;
  notes: string;
  receiptReference?: string;
}

const CATEGORY_MAP: Record<ExpenseCategory, { nameAr: string; icon: any; color: string; bg: string }> = {
  ELECTRICITY_WATER: {
    nameAr: 'فواتير الكهرباء والمياه',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20'
  },
  MAINTENANCE: {
    nameAr: 'صيانة القاعات والأجهزة',
    icon: Wrench,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20'
  },
  OFFICE_SUPPLIES: {
    nameAr: 'أدوات مكتبية وأوراق طباعة',
    icon: FileSpreadsheet,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20'
  },
  INTERNET_TELECOM: {
    nameAr: 'الإنترنت والاتصالات',
    icon: Wifi,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20'
  },
  CLEANING_HOSPITALITY: {
    nameAr: 'نظافة وضيافة واستقبال',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  },
  RENT_SECURITY: {
    nameAr: 'مستلزمات الأمن والسلامة',
    icon: ShieldCheck,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20'
  }
};

const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-01',
    voucherNumber: 'EXP-20261031-001',
    category: 'ELECTRICITY_WATER',
    categoryNameAr: 'فواتير الكهرباء والمياه',
    amount: 1450,
    date: '2026-10-31',
    time: '11:30 ص',
    beneficiary: 'شركة الكهرباء الوطنية (فاتورة أكتوبر القاعات)',
    authorizedBy: 'المدير العام',
    balanceAfter: 48500,
    notes: 'سداد فاتورة كهرباء قاعات المحاضرات والتكييفات لشهر أكتوبر',
    receiptReference: 'INV-ELEC-99482'
  },
  {
    id: 'exp-02',
    voucherNumber: 'EXP-20261030-014',
    category: 'OFFICE_SUPPLIES',
    categoryNameAr: 'أدوات مكتبية وأوراق طباعة',
    amount: 820,
    date: '2026-10-30',
    time: '02:15 م',
    beneficiary: 'مكتبة ومطبعة الأهرام',
    authorizedBy: 'المحاسب المالي',
    balanceAfter: 49950,
    notes: 'شراء 10 رزم ورق تصوير A4 + أحبار طابعات الإيصالات والامتحانات',
    receiptReference: 'BILL-8831'
  },
  {
    id: 'exp-03',
    category: 'MAINTENANCE',
    categoryNameAr: 'صيانة القاعات والأجهزة',
    voucherNumber: 'EXP-20261028-009',
    amount: 600,
    date: '2026-10-28',
    time: '04:45 م',
    beneficiary: 'فني صيانة بروجكتور الشاشات الذكية',
    authorizedBy: 'المدير العام',
    balanceAfter: 50770,
    notes: 'صيانة وتغيير كابلات العرض وشاشات قاعة رقم 3',
    receiptReference: 'TECH-7712'
  },
  {
    id: 'exp-04',
    category: 'INTERNET_TELECOM',
    categoryNameAr: 'الإنترنت والاتصالات',
    voucherNumber: 'EXP-20261025-003',
    amount: 950,
    date: '2026-10-25',
    time: '10:00 ص',
    beneficiary: 'شركة وي للاتصالات (إنترنت الألياف الضوئية)',
    authorizedBy: 'المحاسب المالي',
    balanceAfter: 51370,
    notes: 'اشتراك باقة الفايبر فائق السرعة لكاميرات وماسحات الحضور بالسنتر',
    receiptReference: 'WE-OCT-552'
  }
];

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [treasuryBalance, setTreasuryBalance] = useState<number>(48500);
  const [totalSpentMonth, setTotalSpentMonth] = useState<number>(3820);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newAmount, setNewAmount] = useState<number>(500);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('OFFICE_SUPPLIES');
  const [newBeneficiary, setNewBeneficiary] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newRef, setNewRef] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<ExpenseRecord | null>(null);

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch =
      exp.beneficiary.includes(searchQuery) ||
      exp.notes.includes(searchQuery) ||
      exp.voucherNumber.includes(searchQuery);
    const matchesCat = selectedCategory === 'ALL' || exp.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newAmount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح للصرف.');
      return;
    }

    if (!newBeneficiary.trim()) {
      setFormError('يرجى تحديد جهة الصرف أو المستفيد.');
      return;
    }

    // Trigger Deficit Prevention Check: Ensure treasury is solvent
    if (newAmount > treasuryBalance) {
      setFormError(
        `عملية مرفوضة: رصيد الخزنة المركزية الحالي (${treasuryBalance.toLocaleString()} ج.م) غير كافٍ لصرف المبلغ المطلوب (${newAmount.toLocaleString()} ج.م). تم تطبيق حماية التريجر fn_check_treasury_payout لمنع العجز.`
      );
      return;
    }

    const newBalance = treasuryBalance - newAmount;
    const now = new Date();
    const voucherNum = `EXP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const newRecord: ExpenseRecord = {
      id: 'exp-' + Date.now(),
      voucherNumber: voucherNum,
      category: newCategory,
      categoryNameAr: CATEGORY_MAP[newCategory].nameAr,
      amount: newAmount,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      beneficiary: newBeneficiary.trim(),
      authorizedBy: 'المدير العام (Super Admin)',
      balanceAfter: newBalance,
      notes: newNotes.trim() || 'صرف مصروفات تشغيلية',
      receiptReference: newRef.trim() || undefined
    };

    // Update Central Treasury & Records
    setTreasuryBalance(newBalance);
    setTotalSpentMonth(prev => prev + newAmount);
    setExpenses(prev => [newRecord, ...prev]);

    setIsModalOpen(false);
    setVoucherPreview(newRecord);

    // Reset Form
    setNewAmount(500);
    setNewBeneficiary('');
    setNewNotes('');
    setNewRef('');
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>إدارة المصروفات التشغيلية والربط بالخزنة (ExpenseManagement)</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              المصروفات التشغيلية وسندات الصرف المعتمدة (Cash Out)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تسجيل وضبط كافة نفقات السنتر (كهرباء، صيانة، مستلزمات مكتبية، إنترنت) مع الخصم التلقائي اللحظي من الخزنة المركزية، ومنع أي عجز مالي بفضل قواعد الـ Triggers الصارمة.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل سند صرف جديد (Cash Out)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Central Treasury Balance */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Building2 className="w-4 h-4" />
              رصيد الخزنة المركزية الحالي
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              مؤمن ذرياً
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {treasuryBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">يُخصم منه الصرف آلياً مع التحقق من الملاءة</p>
        </div>

        {/* Total Monthly Expenses */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <TrendingDown className="w-4 h-4" />
              إجمالي مصروفات الشهر
            </span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
              Cash Out
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {totalSpentMonth.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">مجموع سندات الصرف المعتمدة لشهر أكتوبر</p>
        </div>

        {/* Top Expense Category */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              أكبر بنود النفقات
            </span>
            <span className="text-[10px] text-slate-500">38% من الإجمالي</span>
          </div>
          <div className="text-base font-bold text-white">
            فواتير الكهرباء والمياه
          </div>
          <p className="text-[11px] text-slate-500">تشغيل تكييفات القاعات وشاشات العرض</p>
        </div>

        {/* Total Vouchers */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              سندات الصرف الرسمية
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Vouchers</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {expenses.length}{' '}
            <span className="text-xs font-normal text-slate-400">سند مسجل</span>
          </div>
          <p className="text-[11px] text-slate-500">مسجلة بالساعة والدقيقة واسم الصارف</p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم السند، المستفيد، أو الملاحظات..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">تصنيف المصروف:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="ALL">جميع البنود التشغيلية</option>
            <option value="ELECTRICITY_WATER">فواتير الكهرباء والمياه</option>
            <option value="MAINTENANCE">صيانة القاعات والأجهزة</option>
            <option value="OFFICE_SUPPLIES">أدوات مكتبية وأوراق طباعة</option>
            <option value="INTERNET_TELECOM">الإنترنت والاتصالات</option>
            <option value="CLEANING_HOSPITALITY">نظافة وضيافة واستقبال</option>
            <option value="RENT_SECURITY">مستلزمات الأمن والسلامة</option>
          </select>
        </div>
      </div>

      {/* Expenses History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>دفتر سندات صرف المصروفات التشغيلية (Expenses Ledger)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              يتم قيدها فوراً في الخزنة المركزية بحركة CASH_OUT مع قفل المعاملة لمنع التضارب
            </span>
          </div>
          <span className="text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl">
            {filteredExpenses.length} سند صرف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">رقم السند</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">بند المصروف</th>
                <th className="p-3">المستفيد / جهة الصرف</th>
                <th className="p-3">المبلغ المصروف</th>
                <th className="p-3">الرصيد بعد الصرف</th>
                <th className="p-3">المسؤول المصرح</th>
                <th className="p-3 text-center">سند الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredExpenses.map((exp) => {
                const CatConfig = CATEGORY_MAP[exp.category];
                const IconComponent = CatConfig.icon;

                return (
                  <tr key={exp.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-rose-400">
                      {exp.voucherNumber}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      <div>{exp.date}</div>
                      <div className="text-[10px] text-slate-500">{exp.time}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${CatConfig.bg} ${CatConfig.color}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{CatConfig.nameAr}</span>
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white">
                      <div>{exp.beneficiary}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{exp.notes}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-rose-400 text-sm">
                      - {exp.amount.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {exp.balanceAfter.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-slate-400">
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>{exp.authorizedBy}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setVoucherPreview(exp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="معاينة وطباعة سند الصرف"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تسجيل سند صرف مصروفات من الخزنة</h3>
                  <span className="text-[11px] text-slate-400">خصم فوري من الخزنة المركزية (CASH_OUT)</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              
              {/* Treasury Balance Pill */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">رصيد الخزنة المركزية المتوفر للصرف:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {treasuryBalance.toLocaleString()} ج.م
                </span>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">المبلغ المراد صرفه (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  max={treasuryBalance}
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-sm text-rose-400 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">بند المصروف التشغيلي:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="ELECTRICITY_WATER">فواتير الكهرباء والمياه (تكييفات وإنارة)</option>
                  <option value="MAINTENANCE">صيانة القاعات والأجهزة والبروجكتور</option>
                  <option value="OFFICE_SUPPLIES">أدوات مكتبية وأوراق طباعة وأحبار</option>
                  <option value="INTERNET_TELECOM">الإنترنت السريع والاتصالات</option>
                  <option value="CLEANING_HOSPITALITY">نظافة وضيافة واستقبال</option>
                  <option value="RENT_SECURITY">مستلزمات الأمن والسلامة والإيجار</option>
                </select>
              </div>

              {/* Beneficiary */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">المستفيد / جهة الصرف:</label>
                <input
                  type="text"
                  value={newBeneficiary}
                  onChange={(e) => setNewBeneficiary(e.target.value)}
                  placeholder="مثال: شركة الكهرباء أو اسم فني الصيانة أو المكتبة"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">سبب الصرف والملاحظات التفصيلية:</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="مثال: سداد فاتورة شهر أكتوبر للقاعات الرئيسية"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Reference Bill Number */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">رقم فاتورة المورد / المرجع الخارجي (اختياري):</label>
                <input
                  type="text"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  placeholder="مثال: INV-99482"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Automation Note */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-rose-400 block">⚡ أوتوميشن الخزنة وقواعد البيانات:</span>
                <p>• خصم فوري ومباشر من رصيد الخزنة المركزية بقيد CASH_OUT.</p>
                <p>• فحص الملاءة لمنع العجز المالي برفض العملية إذا تجاوز المبلغ الرصيد المتوفر.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأكيد الصرف من الخزنة المركزية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Official Voucher Preview Modal */}
      {voucherPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                سند صرف نقدية رسمي معتمد من الخزنة
              </span>
              <button
                onClick={() => setVoucherPreview(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 font-mono text-xs text-slate-300">
              <div className="text-center pb-2 border-b border-dashed border-slate-800 space-y-1">
                <h4 className="text-base font-bold font-sans text-white">السنتر التعليمي الذكي - EduCenter</h4>
                <p className="text-[10px] text-slate-500">سند صرف مصروفات تشغيلية (Payment Voucher)</p>
                <span className="text-rose-400 font-bold">{voucherPreview.voucherNumber}</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div>البند: <strong className="text-white font-sans">{voucherPreview.categoryNameAr}</strong></div>
                <div>المستفيد: <strong className="text-white font-sans">{voucherPreview.beneficiary}</strong></div>
                <div>البيان: <span className="font-sans text-slate-300">{voucherPreview.notes}</span></div>
                <div>التاريخ والوقت: {voucherPreview.date} - {voucherPreview.time}</div>
                <div>المصرح بالصرف: <span className="font-sans text-slate-300">{voucherPreview.authorizedBy}</span></div>
                {voucherPreview.receiptReference && (
                  <div>المرجع: <span className="text-slate-400">{voucherPreview.receiptReference}</span></div>
                )}
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="font-sans font-bold text-white">المبلغ المنصرف:</span>
                <span className="text-lg font-bold text-rose-400">{voucherPreview.amount}.00 ج.م</span>
              </div>

              <div className="text-[10px] text-slate-500 text-center space-y-0.5 pt-1">
                <p>تم الخصم آلياً من الخزنة المركزية بقيد أستاذ CASH_OUT</p>
                <p>الرصيد المتبقي بالخزنة: {voucherPreview.balanceAfter.toLocaleString()} ج.م</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة سند الصرف</span>
              </button>
              <button
                onClick={() => setVoucherPreview(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
