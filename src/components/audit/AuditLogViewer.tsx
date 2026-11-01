import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Database,
  History,
  FileCode,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  PlusCircle,
  Clock,
  User,
  ArrowRight,
  Eye,
  RefreshCw,
  Zap,
  Code,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';

import {
  AuditRecord,
  AuditAction,
  calculateJsonDiff,
  categorizeOperationSeverity,
  formatAuditDescription,
  filterAuditLogs
} from '../../lib/audit-engine';

const INITIAL_LOGS_DATA: AuditRecord[] = [
  {
    id: 101,
    username: 'أحمد الشناوي (مدير الخزنة)',
    action: 'UPDATE',
    tableName: 'treasury_transactions',
    recordId: 'TX-TREAS-8812',
    oldValues: {
      amount: 12500.0,
      category: 'TUITION_FEES',
      verified: false,
      notes: 'توريد اشتراكات فيزياء'
    },
    newValues: {
      amount: 14200.0,
      category: 'TUITION_FEES',
      verified: true,
      notes: 'توريد اشتراكات فيزياء بعد جرد القسائم الإضافية'
    },
    changedFields: ['amount', 'verified', 'notes'],
    description: 'تعديل قيمة حركة الخزنة من 12,500.00 إلى 14,200.00 ج.م مع اعتماد الجرد.',
    ipAddress: '192.168.1.14',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    severity: 'CRITICAL'
  },
  {
    id: 102,
    username: 'سارة عبد الرحمن (شؤون الطلاب)',
    action: 'UPDATE',
    tableName: 'students',
    recordId: 'STU-2026-9041',
    oldValues: {
      full_name: 'يوسف أحمد الشناوي',
      parent_phone: '01019283741',
      discount_percentage: 0.0,
      status: 'ACTIVE'
    },
    newValues: {
      full_name: 'يوسف أحمد الشناوي',
      parent_phone: '01019283741',
      discount_percentage: 15.0,
      status: 'ACTIVE'
    },
    changedFields: ['discount_percentage'],
    description: 'تطبيق منحة خصم تفوق دراسي 15% على الطالب يوسف أحمد الشناوي.',
    ipAddress: '192.168.1.22',
    createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    severity: 'WARNING'
  },
  {
    id: 103,
    username: 'محمود كمال (المدير المالي)',
    action: 'INSERT',
    tableName: 'staff_salaries',
    recordId: 'PAYROLL-2026-10-OCT',
    oldValues: null,
    newValues: {
      employee_name: 'م. كريم حسني (مسؤول الشبكات والـ IT)',
      base_salary: 6500.0,
      deductions: 150.0,
      net_paid: 6350.0,
      disbursement_channel: 'CENTRAL_SAFE'
    },
    changedFields: ['employee_name', 'base_salary', 'deductions', 'net_paid', 'disbursement_channel'],
    description: 'صرف راتب شهر أكتوبر للمهندس كريم حسني بمبلغ صافي 6,350.00 ج.م نقداً من الخزنة.',
    ipAddress: '192.168.1.10',
    createdAt: new Date(Date.now() - 165 * 60 * 1000).toISOString(),
    severity: 'CRITICAL'
  },
  {
    id: 104,
    username: 'محمود كمال (المدير المالي)',
    action: 'UPDATE',
    tableName: 'teacher_wallets',
    recordId: 'TCH-WLT-001',
    oldValues: {
      teacher_name: 'أ. محمد عبد المنعم',
      balance: 18400.0,
      total_withdrawn: 45000.0
    },
    newValues: {
      teacher_name: 'أ. محمد عبد المنعم',
      balance: 8400.0,
      total_withdrawn: 55000.0
    },
    changedFields: ['balance', 'total_withdrawn'],
    description: 'صرف دفعة مستحقات بقيمة 10,000.00 ج.م للأستاذ محمد عبد المنعم وخصمها من محفظته المالية.',
    ipAddress: '192.168.1.10',
    createdAt: new Date(Date.now() - 255 * 60 * 1000).toISOString(),
    severity: 'CRITICAL'
  },
  {
    id: 105,
    username: 'طارق رضوان (موظف الاستقبال)',
    action: 'DELETE',
    tableName: 'students',
    recordId: 'STU-2026-9912',
    oldValues: {
      student_name: 'إبراهيم ماهر يونس',
      student_code: 'STU-2026-9912',
      stage: 'الصف الأول الثانوي',
      reason: 'تسجيل مكرر بالخطأ'
    },
    newValues: null,
    changedFields: [],
    description: 'حذف ملف الطالب المسجل بالخطأ (إبراهيم ماهر يونس) بعد مراجعة شؤون الطلاب.',
    ipAddress: '192.168.1.18',
    createdAt: new Date(Date.now() - 390 * 60 * 1000).toISOString(),
    severity: 'CRITICAL'
  }
];

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditRecord[]>(INITIAL_LOGS_DATA);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Log for Deep Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);

  // SQL Trigger Code Modal State
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Simulator State
  const [simulatorPreset, setSimulatorPreset] = useState<
    'TREASURY_EDIT' | 'STUDENT_DISCOUNT' | 'SALARY_PAYOUT' | 'STUDENT_DELETE'
  >('TREASURY_EDIT');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulateSuccessNotice, setSimulateSuccessNotice] = useState<string | null>(null);

  // Filtered List
  const filtered = useMemo(() => {
    return filterAuditLogs(logs, {
      action: actionFilter,
      tableName: tableFilter,
      severity: severityFilter,
      search: searchQuery
    });
  }, [logs, actionFilter, tableFilter, severityFilter, searchQuery]);

  // Quick Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;
    const inserts = logs.filter((l) => l.action === 'INSERT').length;
    const critical = logs.filter((l) => l.severity === 'CRITICAL').length;
    return { total, updates, deletes, inserts, critical };
  }, [logs]);

  // Execute Simulated Database Event to test Trigger
  const handleSimulateEvent = () => {
    setSimulating(true);
    setSimulateSuccessNotice(null);

    setTimeout(() => {
      let newEntry: AuditRecord;
      const nowIso = new Date().toISOString();
      const nextId = logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 101;

      if (simulatorPreset === 'TREASURY_EDIT') {
        const oldState = { amount: 5000.0, category: 'GENERAL_EXPENSE', notes: 'فاتورة كهرباء سابقة' };
        const newState = { amount: 6200.0, category: 'GENERAL_EXPENSE', notes: 'فاتورة كهرباء معدلة بعد التدقيق' };
        const { changedFields } = calculateJsonDiff(oldState, newState);

        newEntry = {
          id: nextId,
          username: 'أحمد الشناوي (مدير الخزنة)',
          action: 'UPDATE',
          tableName: 'treasury_transactions',
          recordId: `TX-TREAS-${Math.floor(1000 + Math.random() * 9000)}`,
          oldValues: oldState,
          newValues: newState,
          changedFields,
          description: formatAuditDescription('UPDATE', 'treasury_transactions', 'TX-TREAS-NEW', 'أحمد الشناوي', changedFields),
          ipAddress: '192.168.1.14',
          createdAt: nowIso,
          severity: 'CRITICAL'
        };
      } else if (simulatorPreset === 'STUDENT_DISCOUNT') {
        const oldState = { student_name: 'مريم العوضي', discount_percentage: 0.0, status: 'REGULAR' };
        const newState = { student_name: 'مريم العوضي', discount_percentage: 20.0, status: 'SCHOLARSHIP' };
        const { changedFields } = calculateJsonDiff(oldState, newState);

        newEntry = {
          id: nextId,
          username: 'سارة عبد الرحمن (شؤون الطلاب)',
          action: 'UPDATE',
          tableName: 'students',
          recordId: 'STU-2026-8812',
          oldValues: oldState,
          newValues: newState,
          changedFields,
          description: 'تعديل نسبة الخصم للطالبة مريم العوضي من 0% إلى 20% (منحة المتفوقين).',
          ipAddress: '192.168.1.22',
          createdAt: nowIso,
          severity: 'WARNING'
        };
      } else if (simulatorPreset === 'SALARY_PAYOUT') {
        const newState = {
          teacher_name: 'أ. هاني سليم (كيمياء)',
          amount: 8500.0,
          disbursed_from: 'CENTRAL_SAFE',
          period: 'نوفمبر 2026'
        };
        const { changedFields } = calculateJsonDiff(null, newState);

        newEntry = {
          id: nextId,
          username: 'محمود كمال (المدير المالي)',
          action: 'INSERT',
          tableName: 'staff_salaries',
          recordId: `PAY-OUT-${Math.floor(1000 + Math.random() * 9000)}`,
          oldValues: null,
          newValues: newState,
          changedFields,
          description: 'صرف دفعة رواتب ونسب نقدية بقيمة 8,500.00 ج.م للأستاذ هاني سليم.',
          ipAddress: '192.168.1.10',
          createdAt: nowIso,
          severity: 'CRITICAL'
        };
      } else {
        const oldState = { student_code: 'STU-2026-9400', name: 'أحمد ماهر عبد العزيز', reason: 'نقل إلى محافظة أخرى' };
        newEntry = {
          id: nextId,
          username: 'طارق رضوان (الاستقبال)',
          action: 'DELETE',
          tableName: 'students',
          recordId: 'STU-2026-9400',
          oldValues: oldState,
          newValues: null,
          changedFields: [],
          description: 'حذف قيد الطالب (أحمد ماهر) بعد تسليم ملفه وطلب ولي الأمر.',
          ipAddress: '192.168.1.18',
          createdAt: nowIso,
          severity: 'CRITICAL'
        };
      }

      setLogs((prev) => [newEntry, ...prev]);
      setSimulateSuccessNotice(`تم تنفيذ العملية بنجاح! التريجر fn_audit_sensitive_changes() التقط الحدث وسجل الحقول المتغيرة والقيم السابقة والجديدة.`);
      setSimulating(false);
    }, 400);
  };

  const handleClearLogs = () => {
    if (window.confirm('هل أنت متأكد من تفريغ سجل التدقيق للأغراض التجريبية؟')) {
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-100 font-['Cairo',sans-serif]">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-8 h-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  سجل التدقيق والرقابة المالية (Database Audit Trail)
                </h1>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  PostgreSQL Triggers Active (ACID Safe)
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                تريجر مؤتمت على مستوى قاعدة البيانات يسجل كل عملية إضافة، تعديل مبالغ، أو حذف بيانات حساسة مع حفظ (اسم المستخدم، التاريخ، القيمة السابقة، والقيمة الجديدة).
              </p>
            </div>
          </div>

          {/* Trigger Code inspection button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlModal(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Code className="w-4 h-4 text-cyan-400" />
              <span>معاينة كود الـ PostgreSQL Trigger</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">إجمالي السجلات:</span>
            <span className="text-white font-mono font-bold text-lg">{stats.total} عملية</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">تعديلات حساسة (Updates):</span>
            <span className="text-amber-400 font-mono font-bold text-lg">{stats.updates} تعديل</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">عمليات حذف (Deletions):</span>
            <span className="text-rose-400 font-mono font-bold text-lg">{stats.deletes} حذف</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">إدخالات جديدة (Inserts):</span>
            <span className="text-emerald-400 font-mono font-bold text-lg">{stats.inserts} إضافة</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">حركات مالية عالية الحساسية:</span>
            <span className="text-cyan-400 font-mono font-bold text-lg">{stats.critical} حركة</span>
          </div>
        </div>

        {simulateSuccessNotice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{simulateSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* Simulator Section: Test Trigger Live */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">محاكي اختبار التريجر في الوقت الفعلي (Live Trigger Sandbox)</h3>
              <p className="text-[11px] text-slate-400">
                اختر نوع العملية الحساسة ولاحظ كيف يقوم تريجر قاعدة البيانات بتسجيل المقارنة (Diff) بين القيمة السابقة والجديدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={simulatorPreset}
              onChange={(e) => setSimulatorPreset(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
            >
              <option value="TREASURY_EDIT">تعديل مبلغ حركة خزنة (Treasury Edit)</option>
              <option value="STUDENT_DISCOUNT">تعديل نسبة خصم طالب (Student Discount)</option>
              <option value="SALARY_PAYOUT">صرف راتب موظف من الخزنة (Salary Payout)</option>
              <option value="STUDENT_DELETE">حذف سجل طالب من السنتر (Delete Student)</option>
            </select>

            <button
              onClick={handleSimulateEvent}
              disabled={simulating}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>جارِ التنفيذ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تشغيل التريجر الآن</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Logs Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              سجل التعديلات والعمليات الحساسة (Audit Log Trail)
            </h2>
            <span className="text-xs text-slate-400 font-mono">({filtered.length} سجل مطابق)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالمستخدم، المعرف، أو الوصف..."
                className="bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-56"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="ALL">جميع العمليات</option>
              <option value="UPDATE">تعديل (UPDATE)</option>
              <option value="INSERT">إضافة (INSERT)</option>
              <option value="DELETE">حذف (DELETE)</option>
            </select>

            {/* Table Filter */}
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="ALL">جميع الجداول</option>
              <option value="treasury_transactions">الخزنة المركزية</option>
              <option value="students">ملف الطلاب</option>
              <option value="staff_salaries">الرواتب والمسير</option>
              <option value="teacher_wallets">محافظ المعلمين</option>
            </select>

            {/* Clear Button */}
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-xl transition-all"
              title="تفريغ السجل للأغراض التجريبية"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">التوقيت والتاريخ</th>
                <th className="py-3 px-4 font-semibold">المستخدم المنفذ</th>
                <th className="py-3 px-4 font-semibold">نوع الإجراء</th>
                <th className="py-3 px-4 font-semibold">الجدول والمعرف</th>
                <th className="py-3 px-4 font-semibold">ملخص التغيير المسجل بالتريجر</th>
                <th className="py-3 px-4 font-semibold text-center">مقارنة القيم (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(log.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User className="w-3 h-3 text-cyan-400" />
                          <span>{log.username}</span>
                        </div>
                        {log.ipAddress && (
                          <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4">
                        {log.action === 'UPDATE' && (
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>تعديل (UPDATE)</span>
                          </span>
                        )}
                        {log.action === 'INSERT' && (
                          <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <PlusCircle className="w-3 h-3 text-emerald-400" />
                            <span>إضافة (INSERT)</span>
                          </span>
                        )}
                        {log.action === 'DELETE' && (
                          <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>حذف (DELETE)</span>
                          </span>
                        )}
                      </td>

                      {/* Table & Record Code */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-cyan-400 text-xs font-semibold">{log.tableName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{log.recordId}</span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-sm">
                        <p className="text-slate-300 leading-relaxed font-sans text-xs">
                          {log.description}
                        </p>
                        {log.changedFields && log.changedFields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {log.changedFields.map((f) => (
                              <span
                                key={f}
                                className="bg-slate-950 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded font-mono text-[9px]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Diff Viewer Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فحص التغيير</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Inspection Modal: Old Values vs New Values Comparison */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    مقارنة القيم المسجلة بالتريجر (Audit Diff Inspector)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    الجدول: {selectedLog.tableName} • المعرف: {selectedLog.recordId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operator and Metadata Card */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">المستخدم القائم بالعملية:</span>
                <span className="text-white font-bold">{selectedLog.username}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">نوع العملية:</span>
                <span className="text-amber-400 font-mono font-bold">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">التوقيت الدقيق:</span>
                <span className="text-slate-300 font-mono text-[11px]">{new Date(selectedLog.createdAt).toLocaleString('ar-EG')}</span>
              </div>
            </div>

            {/* Side-by-Side Old vs New Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Previous State (Old Values) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-400 pb-2 border-b border-rose-500/20">
                  <span>القيمة السابقة (OLD_VALUES)</span>
                  <span className="text-[10px] font-mono text-slate-500">قبل التعديل / الحذف</span>
                </div>
                {selectedLog.oldValues ? (
                  <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    لا توجد قيمة سابقة (عملية إضافة جديدة INSERT)
                  </p>
                )}
              </div>

              {/* New State (New Values) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 pb-2 border-b border-emerald-500/20">
                  <span>القيمة الجديدة (NEW_VALUES)</span>
                  <span className="text-[10px] font-mono text-slate-500">بعد التعديل / الإضافة</span>
                </div>
                {selectedLog.newValues ? (
                  <pre className="text-[11px] text-emerald-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-rose-400 italic py-4 text-center">
                    تم حذف السجل من قاعدة البيانات (DELETE)
                  </p>
                )}
              </div>
            </div>

            {/* Diff Summary */}
            {selectedLog.changedFields && selectedLog.changedFields.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-xs space-y-1">
                <span className="text-amber-300 font-bold block">
                  الحقول التي تم تعديل قيمتها فعلياً ورصدها التريجر:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLog.changedFields.map((f) => (
                    <span
                      key={f}
                      className="bg-slate-900 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-lg font-mono text-xs font-bold"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                إغلاق الفحص
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Trigger Code Inspection Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    كود PostgreSQL Trigger المعتمد في السيرفر (Production SQL Code)
                  </h3>
                  <span className="text-xs text-slate-400">
                    ملف <code className="text-cyan-400 font-mono">database/schema_and_triggers.sql</code>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <pre className="text-[11px] text-cyan-300 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto select-text" dir="ltr">
{`-- 1. Universal Audit Trail Trigger Function
CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_changed_fields JSONB := '[]'::jsonb;
    v_record_id VARCHAR(100);
    v_username VARCHAR(100);
    v_action VARCHAR(20);
    v_desc TEXT;
BEGIN
    -- Extract Operation Type & Payload
    IF (TG_OP = 'INSERT') THEN
        v_action := 'INSERT';
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(v_new_data->>'id', v_new_data->>'code', 'N/A');
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(v_new_data->>'id', v_old_data->>'id', 'N/A');

        -- Calculate Diff
        SELECT COALESCE(jsonb_agg(key), '[]'::jsonb) INTO v_changed_fields
        FROM jsonb_each(v_new_data)
        WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;

        IF jsonb_array_length(v_changed_fields) = 0 THEN
            RETURN NEW; -- Skip unchanged updates
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        v_old_data := to_jsonb(OLD);
        v_record_id := COALESCE(v_old_data->>'id', v_old_data->>'code', 'N/A');
    END IF;

    -- Extract Operator Username
    BEGIN
        v_username := NULLIF(current_setting('app.current_username', true), '');
    EXCEPTION WHEN OTHERS THEN
        v_username := NULL;
    END;
    IF v_username IS NULL THEN
        v_username := COALESCE(v_new_data->>'created_by', SESSION_USER);
    END IF;

    -- Insert Audit Record with Old and New values
    INSERT INTO audit_logs (
        username, action, table_name, record_id,
        old_values, new_values, changed_fields, description, created_at
    ) VALUES (
        COALESCE(v_username, 'SYSTEM'), v_action, TG_TABLE_NAME, v_record_id,
        v_old_data, v_new_data, v_changed_fields, v_desc, NOW()
    );

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attached to: students, treasury_transactions, student_payments, teacher_wallets, staff_attendance`}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
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
