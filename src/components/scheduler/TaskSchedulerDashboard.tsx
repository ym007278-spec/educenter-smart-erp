import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Send,
  MessageSquare,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  CheckCheck,
  ChevronDown,
  Layers,
  Save,
  Trash2,
  PhoneCall,
  Bell,
  RefreshCw,
  Info
} from 'lucide-react';

import {
  SchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
  StudentOverdueRecord,
  TeacherSessionRecord,
  WhatsAppDispatchItem,
  normalizePhoneNumber,
  generateWhatsAppUrl,
  interpolateTemplate,
  executeSchedulerEvaluation
} from '../../lib/scheduler-engine';

// Mock Initial Datasets for realistic center simulation
const INITIAL_OVERDUE_STUDENTS: StudentOverdueRecord[] = [
  {
    studentId: 'std-101',
    studentName: 'يوسف أحمد الشناوي',
    studentCode: 'STU-2026-9041',
    parentName: 'أحمد الشناوي',
    parentPhone: '01019283741',
    amountDue: 350.0,
    billingPeriod: 'شهر أكتوبر 2026',
    dueDate: '2026-10-22',
    daysOverdue: 9,
    groupName: 'الصف الثالث الثانوي - فيزياء متقدمة'
  },
  {
    studentId: 'std-102',
    studentName: 'مريم طارق العوضي',
    studentCode: 'STU-2026-8812',
    parentName: 'طارق العوضي',
    parentPhone: '01224567890',
    amountDue: 300.0,
    billingPeriod: 'شهر أكتوبر 2026',
    dueDate: '2026-10-17',
    daysOverdue: 14,
    groupName: 'الصف الثاني الثانوي - كيمياء عضوية'
  },
  {
    studentId: 'std-103',
    studentName: 'عمر خالد الهواري',
    studentCode: 'STU-2026-7734',
    parentName: 'خالد الهواري',
    parentPhone: '01138475920',
    amountDue: 700.0,
    billingPeriod: 'شهري سبتمبر وأكتوبر 2026',
    dueDate: '2026-10-09',
    daysOverdue: 22,
    groupName: 'الصف الثالث الثانوي - لغة عربية'
  },
  {
    studentId: 'std-104',
    studentName: 'سارة محمود عبد الوهاب',
    studentCode: 'STU-2026-6651',
    parentName: 'محمود عبد الوهاب',
    parentPhone: '01004561234',
    amountDue: 280.0,
    billingPeriod: 'شهر أكتوبر 2026',
    dueDate: '2026-10-26',
    daysOverdue: 5,
    groupName: 'الصف الأول الثانوي - رياضيات عامة'
  },
  {
    studentId: 'std-105',
    studentName: 'زياد مصطفى الباز',
    studentCode: 'STU-2026-5542',
    parentName: 'مصطفى الباز',
    parentPhone: '01552341298',
    amountDue: 400.0,
    billingPeriod: 'شهر أكتوبر 2026',
    dueDate: '2026-10-20',
    daysOverdue: 11,
    groupName: 'الصف الثالث الثانوي - أحياء ولغات'
  }
];

const INITIAL_TEACHER_SESSIONS: TeacherSessionRecord[] = [
  {
    sessionId: 'ses-01',
    teacherId: 'tch-1',
    teacherName: 'أ. محمد عبد المنعم',
    teacherPhone: '01122334455',
    subjectName: 'الفيزياء',
    groupName: 'مجموعة أوائل الفيزياء - الصف 3 ث',
    hallName: 'قاعة الفردوس الكبرى (120 مقعد)',
    sessionTime: '04:00 م - 06:00 م',
    enrolledCount: 95,
    minutesUntil: 45
  },
  {
    sessionId: 'ses-02',
    teacherId: 'tch-2',
    teacherName: 'أ. هاني سليم',
    teacherPhone: '01099887766',
    subjectName: 'الكيمياء',
    groupName: 'الكيمياء العامة - الصف 2 ث',
    hallName: 'قاعة النخبة (70 مقعد)',
    sessionTime: '04:30 م - 06:30 م',
    enrolledCount: 65,
    minutesUntil: 75
  },
  {
    sessionId: 'ses-03',
    teacherId: 'tch-3',
    teacherName: 'أ. إبراهيم رضوان',
    teacherPhone: '01233445566',
    subjectName: 'اللغة العربية',
    groupName: 'البلاغة والنحو - الصف 3 ث',
    hallName: 'قاعة الأندلس (90 مقعد)',
    sessionTime: '05:00 م - 07:00 م',
    enrolledCount: 80,
    minutesUntil: 105
  }
];

const STORAGE_KEY_CONFIG = 'educenter_scheduler_config_v2';
const STORAGE_KEY_LOGS = 'educenter_scheduler_logs_v2';

export default function TaskSchedulerDashboard() {
  // Configuration State
  const [config, setConfig] = useState<SchedulerConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load scheduler config from storage', e);
    }
    return DEFAULT_SCHEDULER_CONFIG;
  });

  // Logs History State
  const [logs, setLogs] = useState<WhatsAppDispatchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load dispatch logs from storage', e);
    }
    return [
      {
        id: 'DISP-INIT-01',
        jobType: 'OVERDUE_FEES',
        recipientRole: 'STUDENT_PARENT',
        recipientName: 'ولي أمر الطالب: يوسف أحمد الشناوي',
        recipientPhone: '+201019283741',
        renderedMessage:
          'السلام عليكم ورحمة الله، ولي أمر الطالب يوسف أحمد الشناوي المحترم. نود تذكيركم بلطف بوجود مصروفات دراسية مستحقة قدرها 350.00 ج.م عن (شهر أكتوبر 2026)، وكان موعد سدادها المحدد 2026-10-22. شاكرين حسن تعاونكم وحرصكم الدائم. — إدارة سنتر الفردوس التعليمي الذكي',
        status: 'DELIVERED',
        dispatchedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        whatsappUrl: generateWhatsAppUrl(
          '+201019283741',
          'السلام عليكم ورحمة الله، ولي أمر الطالب يوسف أحمد الشناوي المحترم...'
        ),
        metadata: { studentId: 'std-101', amount: 350 }
      },
      {
        id: 'DISP-INIT-02',
        jobType: 'UPCOMING_SESSION',
        recipientRole: 'TEACHER',
        recipientName: 'أ. محمد عبد المنعم',
        recipientPhone: '+201122334455',
        renderedMessage:
          "أهلاً بك أستاذ محمد عبد المنعم. تذكير بموعد حصتك القادمة اليوم لمجموعة 'مجموعة أوائل الفيزياء - الصف 3 ث' في تمام الساعة 04:00 م - 06:00 م بـ قاعة الفردوس الكبرى (120 مقعد). إجمالي الطلاب المسجلين: 95 طالب. تمنياتنا بحصة موفقة! — سنتر الفردوس التعليمي الذكي",
        status: 'DELIVERED',
        dispatchedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        whatsappUrl: generateWhatsAppUrl('+201122334455', 'أهلاً بك أستاذ محمد عبد المنعم...'),
        metadata: { teacherName: 'أ. محمد عبد المنعم', hall: 'قاعة الفردوس الكبرى' }
      }
    ];
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'fees' | 'teachers'>('fees');
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT_PARENT' | 'TEACHER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [lastRunNotice, setLastRunNotice] = useState<string | null>(null);

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('01019283741');

  // Save to localStorage whenever config or logs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [logs]);

  // Insert token chip into textarea at current position
  const handleInsertToken = (token: string, templateType: 'fees' | 'teachers') => {
    if (templateType === 'fees') {
      setConfig((prev) => ({
        ...prev,
        overdueMessageTemplate: prev.overdueMessageTemplate + ` {${token}} `
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        teacherMessageTemplate: prev.teacherMessageTemplate + ` {${token}} `
      }));
    }
  };

  // Run Manual Trigger
  const handleRunNow = async () => {
    setIsExecuting(true);
    setLastRunNotice(null);

    // Simulate backend job execution via pure engine
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = executeSchedulerEvaluation(
      config,
      INITIAL_OVERDUE_STUDENTS,
      INITIAL_TEACHER_SESSIONS
    );

    const nowIso = new Date().toISOString();
    setConfig((prev) => ({
      ...prev,
      lastRunAt: nowIso,
      nextRunAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }));

    if (result.dispatched.length > 0) {
      setLogs((prev) => [...result.dispatched, ...prev].slice(0, 50));
      setLastRunNotice(
        `تم تشغيل الفحص والجدولة بنجاح: تم تجهيز وإرسال ${result.dispatched.length} رسالة واتساب (${result.overdueCount} مطالبات متأخرة + ${result.teacherSessionCount} تنبيهات حصص).`
      );
    } else {
      setLastRunNotice('تم تشغيل الفحص: لا توجد حسابات متأخرة أو حصص تستوفي معايير التنبيه حالياً.');
    }

    setIsExecuting(false);
  };

  // Save Config Notice
  const handleSaveConfig = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Clear Logs
  const handleClearLogs = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في تفريغ سجل رسائل الواتساب؟')) {
      setLogs([]);
    }
  };

  // Preview Calculations
  const sampleFeeVars = {
    student_name: 'أحمد محمود كمال',
    student_code: 'STU-2026-1029',
    parent_name: 'محمود كمال',
    amount_due: '450.00',
    billing_period: 'شهر أكتوبر 2026',
    due_date: '2026-10-25',
    days_overdue: 6,
    group_name: 'الصف الثالث الثانوي - فيزياء',
    center_name: config.centerBrandName
  };

  const sampleTeacherVars = {
    teacher_name: 'أ. محمد عبد المنعم',
    subject_name: 'الفيزياء للثانوية العامة',
    group_name: 'مجموعة أوائل الفيزياء',
    hall_name: 'قاعة الفردوس الكبرى',
    session_time: '04:00 م - 06:00 م',
    enrolled_count: 95,
    center_name: config.centerBrandName
  };

  const feePreview = interpolateTemplate(config.overdueMessageTemplate, sampleFeeVars).rendered;
  const teacherPreview = interpolateTemplate(config.teacherMessageTemplate, sampleTeacherVars).rendered;

  // Filtered Logs
  const filteredLogs = logs.filter((item) => {
    if (filterRole !== 'ALL' && item.recipientRole !== filterRole) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.recipientName.toLowerCase().includes(q);
      const matchPhone = item.recipientPhone.includes(q);
      const matchMsg = item.renderedMessage.toLowerCase().includes(q);
      return matchName || matchPhone || matchMsg;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-100">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Calendar className="w-8 h-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  نظام جدولة المهام والتنبيهات التلقائية
                </h1>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  محرك الجدولة يعمل (Scheduler Active)
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                إرسال تنبيهات ورسائل واتساب مؤتمتة لأولياء أمور الطلاب المتأخرين عن السداد، وتذكير المدرسين بمواعيد الحصص القادمة مع تخصيص القوالب.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs">
              <span className="text-slate-400 block text-[11px]">المهام النشطة:</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">
                {(config.overdueFeesEnabled ? 1 : 0) + (config.teacherSessionsEnabled ? 1 : 0)} مهام مجدولة
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs">
              <span className="text-slate-400 block text-[11px]">إجمالي الإرسال اليوم:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">{logs.length} رسالة عبر WhatsApp</span>
            </div>

            <button
              onClick={handleRunNow}
              disabled={isExecuting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>جارِ الفحص والإرسال...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>تشغيل الفحص والجدولة الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notices */}
        {lastRunNotice && (
          <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{lastRunNotice}</span>
          </div>
        )}

        {saveSuccessNotice && (
          <div className="mt-4 p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs text-cyan-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>تم حفظ وتحديث إعدادات الجدولة والقوالب بنجاح!</span>
          </div>
        )}
      </div>

      {/* Main Grid: Settings & Template Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Tabs & Template Editors */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            {/* Tab Selectors */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('fees')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'fees'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/60'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>تنبيهات المصروفات المتأخرة</span>
                  {config.overdueFeesEnabled && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'teachers'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>تنبيهات الحصص القادمة للمدرسين</span>
                  {config.teacherSessionsEnabled && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </button>
              </div>

              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>حفظ التعديلات</span>
              </button>
            </div>

            {/* TAB 1: Overdue Tuition Fees Template & Rule */}
            {activeTab === 'fees' && (
              <div className="space-y-5 animate-fade-in">
                {/* Switch & Frequency Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.overdueFeesEnabled}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, overdueFeesEnabled: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                    <div>
                      <span className="text-sm font-bold text-white block">
                        تفعيل الإرسال التلقائي للطلاب المتأخرين
                      </span>
                      <span className="text-xs text-slate-400">
                        فحص سجلات الدفع وإرسال واتساب لولي الأمر تلقائياً
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">أيام التأخر قبل التنبيه:</span>
                      <select
                        value={config.overdueDaysThreshold}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            overdueDaysThreshold: Number(e.target.value)
                          }))
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                      >
                        <option value={1}>بعد يوم واحد (1 day)</option>
                        <option value={3}>بعد 3 أيام (3 days - مستحسن)</option>
                        <option value={5}>بعد 5 أيام (5 days)</option>
                        <option value={7}>بعد أسبوع (7 days)</option>
                        <option value={14}>بعد أسبوعين (14 days)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">موعد التكرار اليومي:</span>
                      <select
                        value={config.overdueScheduleCron}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, overdueScheduleCron: e.target.value }))
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-mono"
                      >
                        <option value="0 10 * * *">يومياً 10:00 صباحاً</option>
                        <option value="0 14 * * *">يومياً 02:00 ظهراً</option>
                        <option value="0 18 * * *">يومياً 06:00 مساءً</option>
                        <option value="0 */6 * * *">كل 6 ساعات</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Variable Tokens Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>المتغيرات الديناميكية المتاحة (انقر للإدراج داخل القالب):</span>
                    </label>
                    <span className="text-[11px] text-slate-400">تستبدل آلياً ببيانات الطالب الفعلي</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'student_name', label: 'اسم الطالب' },
                      { key: 'amount_due', label: 'المبلغ المستحق (ج.م)' },
                      { key: 'billing_period', label: 'الفترة / الشهر' },
                      { key: 'due_date', label: 'تاريخ الاستحقاق' },
                      { key: 'days_overdue', label: 'أيام التأخر' },
                      { key: 'student_code', label: 'كود الطالب' },
                      { key: 'group_name', label: 'اسم المجموعة' },
                      { key: 'center_name', label: 'اسم السنتر' }
                    ].map((tok) => (
                      <button
                        key={tok.key}
                        type="button"
                        onClick={() => handleInsertToken(tok.key, 'fees')}
                        className="text-xs bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/60 text-slate-200 hover:text-amber-300 px-2.5 py-1 rounded-xl transition-all font-mono flex items-center gap-1"
                        title={`إدراج {${tok.key}}`}
                      >
                        <span>{`{${tok.key}}`}</span>
                        <span className="text-[10px] text-slate-400">({tok.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Textarea */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    نص قالب رسالة الواتساب:
                  </label>
                  <textarea
                    rows={5}
                    value={config.overdueMessageTemplate}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, overdueMessageTemplate: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all leading-relaxed font-sans"
                    placeholder="اكتب صيغة رسالة الواتساب هنا..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>يتم تشفير الرسالة وتجهيزها مباشرة للـ WhatsApp Cloud API و wa.me</span>
                    <span>عدد الحروف: {config.overdueMessageTemplate.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Upcoming Teacher Classes Template & Rule */}
            {activeTab === 'teachers' && (
              <div className="space-y-5 animate-fade-in">
                {/* Switch & Frequency Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.teacherSessionsEnabled}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, teacherSessionsEnabled: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                    <div>
                      <span className="text-sm font-bold text-white block">
                        تفعيل تنبيه المدرسين بالحصص القادمة
                      </span>
                      <span className="text-xs text-slate-400">
                        إرسال رسالة تذكير للمدرس بالقاعة والموعد وعدد الطلاب المسجلين
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">وقت التنبيه قبل الحصة:</span>
                      <select
                        value={config.teacherLeadMinutes}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            teacherLeadMinutes: Number(e.target.value)
                          }))
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                      >
                        <option value={30}>قبل 30 دقيقة</option>
                        <option value={60}>قبل ساعة واحدة (60 دقيقة - مستحسن)</option>
                        <option value={120}>قبل ساعتين (120 دقيقة)</option>
                        <option value={1440}>صباح يوم الحصة (24 ساعة)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">تكرار فحص الجدول:</span>
                      <select
                        value={config.teacherScheduleCron}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, teacherScheduleCron: e.target.value }))
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        <option value="*/15 * * * *">كل 15 دقيقة</option>
                        <option value="*/30 * * * *">كل 30 دقيقة (مستحسن)</option>
                        <option value="0 * * * *">كل رأس ساعة</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Variable Tokens Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>المتغيرات الديناميكية الخاصة بالمدرسين (انقر للإدراج):</span>
                    </label>
                    <span className="text-[11px] text-slate-400">تستبدل آلياً ببيانات الحصة والمدرس</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'teacher_name', label: 'اسم المدرس' },
                      { key: 'subject_name', label: 'المادة الدراسية' },
                      { key: 'group_name', label: 'اسم المجموعة' },
                      { key: 'hall_name', label: 'اسم القاعة' },
                      { key: 'session_time', label: 'موعد الحصة' },
                      { key: 'enrolled_count', label: 'عدد الطلاب المسجلين' },
                      { key: 'center_name', label: 'اسم السنتر' }
                    ].map((tok) => (
                      <button
                        key={tok.key}
                        type="button"
                        onClick={() => handleInsertToken(tok.key, 'teachers')}
                        className="text-xs bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 px-2.5 py-1 rounded-xl transition-all font-mono flex items-center gap-1"
                        title={`إدراج {${tok.key}}`}
                      >
                        <span>{`{${tok.key}}`}</span>
                        <span className="text-[10px] text-slate-400">({tok.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Textarea */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    نص قالب رسالة تذكير المدرس:
                  </label>
                  <textarea
                    rows={5}
                    value={config.teacherMessageTemplate}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, teacherMessageTemplate: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all leading-relaxed font-sans"
                    placeholder="اكتب صيغة رسالة تذكير المدرس هنا..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>يتم إرسالها لرقم هاتف المدرس المعتمد في السنتر</span>
                    <span>عدد الحروف: {config.teacherMessageTemplate.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Authentic WhatsApp Bubble Preview & General Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Authentic WhatsApp Bubble Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950">
                  <MessageSquare className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">معاينة الرسالة الحقيقية في واتساب</h3>
                  <span className="text-[10px] text-slate-400">Live WhatsApp Chat Bubble</span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {activeTab === 'fees' ? 'طالب / ولي أمر' : 'مدرس الحصة'}
              </span>
            </div>

            {/* WhatsApp Chat Window Container */}
            <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-800 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
              {/* WhatsApp Chat Wallpaper subtle pattern */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

              {/* Chat Header inside phone simulation */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow">
                    {activeTab === 'fees' ? 'أ' : 'م'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-100 block">
                      {activeTab === 'fees' ? 'ولي أمر الطالب (أحمد كمال)' : 'أ. محمد عبد المنعم (فيزياء)'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">+20 101 928 3741</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">اليوم</span>
              </div>

              {/* Message Bubble (WhatsApp Official Outgoing Green #005c4b) */}
              <div className="my-auto z-10 self-end max-w-[92%] bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none shadow-md space-y-1.5 border border-emerald-700/30">
                <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {activeTab === 'fees' ? feePreview : teacherPreview}
                </p>
                <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-emerald-200/70 font-mono">
                  <span>10:30 ص</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              </div>

              {/* WhatsApp direct test button */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between z-10">
                <span className="text-[10px] text-slate-400">تحقق من التنسيق والرموز قبل الإطلاق</span>
                <a
                  href={generateWhatsAppUrl(
                    '201019283741',
                    activeTab === 'fees' ? feePreview : teacherPreview
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح في WhatsApp Web</span>
                </a>
              </div>
            </div>

            {/* General Center Branding Settings */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  اسم السنتر التجاري داخل الرسائل:
                </label>
                <input
                  type="text"
                  value={config.centerBrandName}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, centerBrandName: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">آخر تنفيذ تلقائي:</span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {config.lastRunAt ? new Date(config.lastRunAt).toLocaleTimeString('ar-EG') : 'لم يتم بعد'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">التنفيذ المجدول القادم:</span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    {config.nextRunAt ? new Date(config.nextRunAt).toLocaleTimeString('ar-EG') : 'بعد ساعة'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Audit Dispatch Logs Table (سجل الإرسال والمراقبة) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                سجل إرسال رسائل الواتساب الآلية (WhatsApp Dispatch & Audit Logs)
              </h2>
              <p className="text-xs text-slate-400">
                متابعة لحظية للرسائل المرسلة، المستلمين، حالة التسليم، وروابط المحادثة المباشرة
              </p>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="ALL">جميع المستلمين</option>
              <option value="STUDENT_PARENT">أولياء أمور الطلاب</option>
              <option value="TEACHER">المدرسين</option>
            </select>

            {/* Clear Logs */}
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-xl transition-all"
              title="تفريغ السجل"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">المستلم والصفة</th>
                <th className="py-3 px-4 font-semibold">رقم الواتساب</th>
                <th className="py-3 px-4 font-semibold">نوع التنبيه المجدول</th>
                <th className="py-3 px-4 font-semibold">نص الرسالة المنفذة</th>
                <th className="py-3 px-4 font-semibold">حالة التسليم</th>
                <th className="py-3 px-4 font-semibold">وقت الإرسال</th>
                <th className="py-3 px-4 font-semibold text-center">إجراء فوري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    لا توجد سجلات مطابقة للبحث أو التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{log.recipientName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.recipientRole === 'STUDENT_PARENT' ? 'ولي أمر طالب' : 'مدرس معتمد'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold" dir="ltr">
                      {log.recipientPhone}
                    </td>

                    <td className="py-3 px-4">
                      {log.jobType === 'OVERDUE_FEES' ? (
                        <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>مصروفات متأخرة</span>
                        </span>
                      ) : (
                        <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>حصة قادمة</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-300 leading-relaxed font-sans" title={log.renderedMessage}>
                        {log.renderedMessage}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 font-mono">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>DELIVERED</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.dispatchedAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <a
                        href={log.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-xl text-xs font-bold transition-all"
                        title="فتح المحادثة في واتساب مباشرة"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح واتساب</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
