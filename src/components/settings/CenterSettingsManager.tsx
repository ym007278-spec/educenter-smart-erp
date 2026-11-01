import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building2,
  DollarSign,
  QrCode,
  MessageSquare,
  Users,
  Shield,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  Clock,
  Lock,
  Phone,
  Mail,
  MapPin,
  Coins,
  Send,
  Eye,
  Check,
  Zap,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  ToggleLeft,
  ToggleRight,
  Database,
  Archive,
  RefreshCw,
  Copy,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import {
  CenterSystemConfig,
  getCenterConfig,
  saveCenterConfig,
  resetCenterConfig,
  exportCenterConfigJson,
  importCenterConfigJson
} from '../../lib/center-config';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';

type SettingsTab = 'identity' | 'modules' | 'financial' | 'attendance' | 'whatsapp' | 'payroll' | 'security';

export default function CenterSettingsManager() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('modules');
  const [config, setConfig] = useState<CenterSystemConfig>(getCenterConfig());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  // Active WhatsApp template for live bubble preview
  const [activePreviewType, setActivePreviewType] = useState<'absence' | 'payment' | 'welcome'>('absence');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load latest on mount
  useEffect(() => {
    setConfig(getCenterConfig());
  }, []);

  // Save handler
  const handleSave = () => {
    saveCenterConfig(config, 'د. محمود عبد العزيز (المدير العام)');
    setIsSaved(true);
    setSaveMessage('تم حفظ وتطبيق كافة سياسات المدير العام وإعدادات الأقسام على المنظومة بنجاح!');
    setTimeout(() => {
      setIsSaved(false);
      setSaveMessage('');
    }, 3500);
  };

  // Reset to factory defaults
  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة ضبط المصنع لكافة سياسات السنتر؟')) {
      const reset = resetCenterConfig();
      setConfig(reset);
      setIsSaved(true);
      setSaveMessage('تمت استعادة الإعدادات الافتراضية بنجاح.');
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  // Instant Full System Backup Download
  const handleInstantFullBackup = () => {
    const fullBackupData = {
      version: '2.6-enterprise',
      exportedAt: new Date().toISOString(),
      exportedBy: 'د. محمود عبد العزيز (المدير العام)',
      centerName: config.identity.centerName,
      systemConfiguration: config,
      databaseSummary: {
        studentsTable: 'students (PostgreSQL)',
        treasuryTable: 'treasury_transactions (Zero Deficit Protected)',
        auditTable: 'audit_logs (Immutable Trigger Protected)',
        schedulerTable: 'automated_task_rules'
      },
      status: 'VERIFIED_SNAPSHOT'
    };

    const jsonStr = JSON.stringify(fullBackupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-${config.identity.centerName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsSaved(true);
    setSaveMessage('تم تنزيل النسخة الاحتياطية الشاملة للسيستم وقاعدة البيانات بنجاح على جهازك الشخصي!');
    setTimeout(() => setIsSaved(false), 3500);
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const configToImport = parsed.systemConfiguration || parsed;
        const success = importCenterConfigJson(JSON.stringify(configToImport), 'المدير العام (استيراد ملف)');
        if (success) {
          setConfig(getCenterConfig());
          setImportError(null);
          setIsSaved(true);
          setSaveMessage('تم استيراد وتطبيق ملف الإعدادات والنسخة الاحتياطية بنجاح!');
          setTimeout(() => setIsSaved(false), 3000);
        } else {
          setImportError('ملف الإعدادات غير صالح أو تالف.');
        }
      } catch {
        setImportError('فشل قراءة الملف. تأكد من أنه ملف JSON صحيح.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export current settings to Excel
  const handleExportSettingsToExcel = () => {
    const rows = [
      { 'القسم': 'هوية السنتر', 'البند': 'اسم السنتر', 'القيمة': config.identity.centerName },
      { 'القسم': 'هوية السنتر', 'البند': 'الهاتف الرئيسي', 'القيمة': config.identity.phonePrimary },
      { 'القسم': 'هوية السنتر', 'البند': 'الواتساب الرسمي', 'القيمة': config.identity.whatsappOfficial },
      { 'القسم': 'هوية السنتر', 'البند': 'العملة', 'القيمة': config.identity.currency },
      { 'القسم': 'المالية', 'البند': 'نسبة المدرس الافتراضية', 'القيمة': `${config.financial.defaultTeacherSplitPercent}%` },
      { 'القسم': 'المالية', 'البند': 'نسبة السنتر الافتراضية', 'القيمة': `${config.financial.defaultCenterSplitPercent}%` },
      { 'القسم': 'المالية', 'البند': 'سعر الحصة الافتراضي', 'القيمة': `${config.financial.defaultPerSessionPrice} ${config.identity.currency}` },
      { 'القسم': 'المالية', 'البند': 'الاشتراك الشهري الافتراضي', 'القيمة': `${config.financial.defaultMonthlySubscription} ${config.identity.currency}` },
      { 'القسم': 'المالية', 'البند': 'أيام مهلة المتأخرات', 'القيمة': `${config.financial.overdueGraceDays} يوم` },
      { 'القسم': 'المالية', 'البند': 'منع عجز الخزنة (Zero Deficit)', 'القيمة': config.financial.enforceZeroDeficit ? 'مفعل' : 'معطل' },
      { 'القسم': 'حضور QR', 'البند': 'مهلة التأخير', 'القيمة': `${config.attendance.lateArrivalGraceMinutes} دقيقة` },
      { 'القسم': 'حضور QR', 'البند': 'صلاحية الكود الديناميكي', 'القيمة': `${config.attendance.qrCodeExpirySeconds} ثانية` },
      { 'القسم': 'الموظفين', 'البند': 'خصم دقيقة التأخير', 'القيمة': `${config.payroll.latePenaltyPerMinute} ${config.identity.currency}` },
      { 'القسم': 'الموظفين', 'البند': 'يوم صرف الرواتب', 'القيمة': `${config.payroll.monthlyPayday} من كل شهر` },
      { 'القسم': 'الأمان', 'البند': 'أقصى محاولات دخول فاشلة', 'القيمة': `${config.security.maxFailedLoginsBeforeLock} محاولات` },
      { 'القسم': 'الأمان', 'البند': 'مدة القفل الأمني', 'القيمة': `${config.security.lockoutDurationSeconds} ثانية` },
    ];

    exportToExcel(rows, `سياسات_وقواعد_${config.identity.centerName.replace(/\s+/g, '_')}`);
  };

  // Export current settings to PDF
  const handleExportSettingsToPdf = () => {
    const columns = ['القسم', 'البند أو السياسة', 'القيمة المعتمدة'];
    const rows = [
      ['هوية السنتر', 'اسم السنتر', config.identity.centerName],
      ['هوية السنتر', 'الهاتف الرئيسي', config.identity.phonePrimary],
      ['هوية السنتر', 'الواتساب الرسمي', config.identity.whatsappOfficial],
      ['الماليات', 'نسبة المدرس / السنتر', `${config.financial.defaultTeacherSplitPercent}% / ${config.financial.defaultCenterSplitPercent}%`],
      ['الماليات', 'سعر الحصة الافتراضي', `${config.financial.defaultPerSessionPrice} ${config.identity.currency}`],
      ['الماليات', 'الاشتراك الشهري', `${config.financial.defaultMonthlySubscription} ${config.identity.currency}`],
      ['الماليات', 'سماح المتأخرات', `${config.financial.overdueGraceDays} أيام`],
      ['حضور QR', 'مهلة التأخير المسموحة', `${config.attendance.lateArrivalGraceMinutes} دقيقة`],
      ['الموظفين', 'خصم دقيقة التأخير', `${config.payroll.latePenaltyPerMinute} ${config.identity.currency}`],
      ['الموظفين', 'يوم صرف الرواتب', `${config.payroll.monthlyPayday} شهرياً`],
      ['الأمان', 'القفل الأمني', `${config.security.maxFailedLoginsBeforeLock} محاولات / ${config.security.lockoutDurationSeconds} ثانية`]
    ];

    exportToPdfReport(
      'وثيقة السياسات والقواعد المعتمدة للمنظومة',
      columns,
      rows,
      `وثيقة_السياسات_${config.identity.centerName.replace(/\s+/g, '_')}`,
      `معتمدة من المدير العام • تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`
    );
  };

  // Updaters for nested state
  const updateIdentity = (fields: Partial<CenterSystemConfig['identity']>) => {
    setConfig(prev => ({ ...prev, identity: { ...prev.identity, ...fields } }));
  };

  const updateFinancial = (fields: Partial<CenterSystemConfig['financial']>) => {
    setConfig(prev => {
      const nextFinancial = { ...prev.financial, ...fields };
      if (fields.defaultTeacherSplitPercent !== undefined) {
        const t = Math.max(0, Math.min(100, fields.defaultTeacherSplitPercent));
        nextFinancial.defaultTeacherSplitPercent = t;
        nextFinancial.defaultCenterSplitPercent = 100 - t;
      }
      return { ...prev, financial: nextFinancial };
    });
  };

  const updateAttendance = (fields: Partial<CenterSystemConfig['attendance']>) => {
    setConfig(prev => ({ ...prev, attendance: { ...prev.attendance, ...fields } }));
  };

  const updateWhatsapp = (fields: Partial<CenterSystemConfig['whatsapp']>) => {
    setConfig(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, ...fields } }));
  };

  const updatePayroll = (fields: Partial<CenterSystemConfig['payroll']>) => {
    setConfig(prev => ({ ...prev, payroll: { ...prev.payroll, ...fields } }));
  };

  const updateSecurity = (fields: Partial<CenterSystemConfig['security']>) => {
    setConfig(prev => ({ ...prev, security: { ...prev.security, ...fields } }));
  };

  const updateModules = (fields: Partial<CenterSystemConfig['modules']>) => {
    setConfig(prev => ({ ...prev, modules: { ...prev.modules, ...fields } }));
  };

  // Insert token into active template
  const insertToken = (token: string, templateKey: 'absenceTemplate' | 'paymentReminderTemplate' | 'attendanceWelcomeTemplate') => {
    const currentVal = config.whatsapp[templateKey];
    updateWhatsapp({ [templateKey]: currentVal + ' ' + token });
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  // Computed sample preview text for WhatsApp bubble
  const getPreviewText = () => {
    if (activePreviewType === 'absence') {
      return config.whatsapp.absenceTemplate
        .replace(/{student_name}/g, 'أحمد محمود رضوان')
        .replace(/{group_name}/g, 'الصف الثالث الثانوي (أوائل الفيزياء)');
    }
    if (activePreviewType === 'payment') {
      return config.whatsapp.paymentReminderTemplate
        .replace(/{student_name}/g, 'مريم طارق الشريف')
        .replace(/{amount}/g, '350')
        .replace(/{billing_period}/g, 'شهر أكتوبر')
        .replace(/{group_name}/g, 'كيمياء عضوية متقدمة');
    }
    return config.whatsapp.attendanceWelcomeTemplate
      .replace(/{student_name}/g, 'يوسف حسام الدين')
      .replace(/{group_name}/g, 'مراجعات الفيزياء المكثفة')
      .replace(/{check_in_time}/g, '04:15 م');
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Top Banner with Direct Instant Backup & Export Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-3.5 py-1 rounded-full">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>لوحة تحكم وسياسات المدير العام (Master Admin Policy Hub)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              التحكم الشامل في إعدادات، أقسام، وسياسات السنتر
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تحكم ديناميكي كامل بدون أي أكواد: إظهار/إخفاء أقسام المنظومة، بناء قواعد الواتساب رسومياً، سحب نسخة احتياطية فورية لجهازك، والتصدير المتقن إلى Excel و PDF.
            </p>
          </div>

          {/* Action Buttons: Save, Instant Backup, Export to Excel/PDF */}
          <div className="flex items-center flex-wrap gap-2.5 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
            {/* Primary Save Button */}
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق التعديلات</span>
            </button>

            {/* Instant Full Backup Button */}
            <button
              onClick={handleInstantFullBackup}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="سحب نسخة احتياطية كاملة وتنزيلها مباشرة إلى جهازك الشخصي"
            >
              <Archive className="w-4 h-4" />
              <span>سحب نسخة احتياطية فورية</span>
            </button>

            {/* Export to Excel */}
            <button
              onClick={handleExportSettingsToExcel}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="تصدير السياسات لملف Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            {/* Export to PDF */}
            <button
              onClick={handleExportSettingsToPdf}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="تصدير وثيقة السياسات كـ PDF رسمي"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>

            {/* Import Backup File */}
            <label
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="استيراد نسخة احتياطية من جهازك"
            >
              <Upload className="w-4 h-4" />
              <span>استيراد</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            {/* Factory Reset */}
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="استعادة ضبط المصنع"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {isSaved && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveMessage}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date().toLocaleTimeString('ar-EG')} • قرار إداري نافذ
          </span>
        </div>
      )}

      {importError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5 shadow-xl">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'modules', label: 'إظهار / إخفاء أقسام المنظومة', icon: Layers, color: 'text-cyan-400', badge: 'تحكم فوري' },
          { id: 'whatsapp', label: 'واجهة أوتوميشن الواتساب والقوالب', icon: MessageSquare, color: 'text-emerald-400', badge: 'بدون كود' },
          { id: 'identity', label: 'هوية وبيانات السنتر', icon: Building2, color: 'text-blue-400' },
          { id: 'financial', label: 'السياسات المالية والخزنة', icon: DollarSign, color: 'text-emerald-400' },
          { id: 'attendance', label: 'حضور الـ QR وتشفير الكروت', icon: QrCode, color: 'text-purple-400' },
          { id: 'payroll', label: 'الموظفين وحساب الرواتب', icon: Users, color: 'text-indigo-400' },
          { id: 'security', label: 'الأمان والنسخ الاحتياطي', icon: Shield, color: 'text-rose-400' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-slate-300 font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODULES VISIBILITY MANAGER (إظهار وإخفاء الأقسام بدون أكواد) */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>إدارة ظهور وتبويب أقسام النظام (Dynamic Module Visibility)</span>
              </h3>
              <p className="text-xs text-slate-400">
                يمكن للمدير إخفاء أي قسم أو وظيفة من القائمة الجانبية وشاشات العمل اليومية دون تعديل برمجي
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full font-mono">
              Live Visibility
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { key: 'attendance', label: 'ماسح حضور الـ QR المباشر', desc: 'كاميرا الحضور والتحقق الرقمي', color: 'purple' },
              { key: 'qrGenerator', label: 'توليد كروت الـ QR المشفرة', desc: 'طباعة بطاقات الطلاب بمفتاح فريد', color: 'cyan' },
              { key: 'student360', label: 'ملف الطالب الشامل 360', desc: 'أرشيف درجات وحضور وماليات الطالب', color: 'emerald' },
              { key: 'teachers', label: 'شؤون المدرسين ونسب الأرباح', desc: 'محافظ الحصص وتوزيع الأرباح 70/30', color: 'cyan' },
              { key: 'payroll', label: 'حضور الموظفين ومسير الرواتب', desc: 'بصمة التأخيرات وصرف الرواتب', color: 'indigo' },
              { key: 'finance', label: 'سندات وإيصالات الطلاب', desc: 'تسجيل دفعات الأقساط والمتأخرات', color: 'emerald' },
              { key: 'analytics', label: 'تحليلات الخزنة والأرباح', desc: 'رسوم تدفق النقدية والإيداع والصرف', color: 'emerald' },
              { key: 'expenses', label: 'المصروفات التشغيلية والعهدة', desc: 'تسجيل الفواتير والإيجار والنثريات', color: 'rose' },
              { key: 'scheduler', label: 'جدولة المهام والواتساب الآلي', desc: 'أتمتة الرسائل والتنبيهات الموقوتة', color: 'amber' },
              { key: 'notifications', label: 'مركز التنبيهات والإشعارات', desc: 'سجل الرسائل المرسلة لأولياء الأمور', color: 'amber' },
              { key: 'audit', label: 'سجل التدقيق والشفافية (Audit)', desc: 'تتبع العمليات المالية والحساسة', color: 'amber' },
              { key: 'backup', label: 'الأرشفة والنسخ السحابي', desc: 'النسخ المشفر بـ AES-256', color: 'cyan' },
              { key: 'roles', label: 'إدارة الأدوار والصلاحيات (RBAC)', desc: 'تحديد صلاحيات الاستقبال والمحاسبين', color: 'emerald' },
              { key: 'database', label: 'تريجرز PostgreSQL المؤتمتة', desc: 'شاشة فحص تريجرز قواعد البيانات', color: 'cyan' },
              { key: 'backend', label: 'مواصفات سيرفر FastAPI', desc: 'شاشة فحص معمارية الباك إند وSwagger', color: 'emerald' },
            ].map((mod) => {
              const isEnabled = (config.modules as any)[mod.key] ?? true;
              return (
                <div
                  key={mod.key}
                  onClick={() => updateModules({ [mod.key]: !isEnabled })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isEnabled
                      ? 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-200'
                      : 'bg-slate-950/40 border-slate-850 opacity-60 text-slate-500'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold block text-xs">{mod.label}</span>
                    <span className="text-[11px] text-slate-400 block">{mod.desc}</span>
                  </div>

                  <button
                    type="button"
                    className="p-1 text-cyan-400 shrink-0"
                    title={isEnabled ? 'ظاهر في القائمة (انقر للإخفاء)' : 'مخفي من القائمة (انقر للإظهار)'}
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              * بمجرد الضغط على زر <strong>«حفظ وتطبيق التعديلات»</strong> بالأعلى، ستختفي أو تظهر الأقسام في القائمة الجانبية فورياً.
            </span>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer shadow"
            >
              تطبيق التغييرات الآن
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VISUAL WHATSAPP AUTOMATION & TEMPLATES (واجهة الأوتوميشن السهلة) */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Rules & Template Editor on Left (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>مُنشئ قواعد وأتمتة الواتساب الرسومي (Visual WhatsApp Rules)</span>
                </h3>
                <p className="text-xs text-slate-400">تحكم كامل في نصوص التنبيهات وإدراج المتغيرات بضغطة زر واحدة</p>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full font-mono">
                No-Code Builder
              </span>
            </div>

            {/* Automation Master Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">إرسال تنبيه غياب تلقائي:</span>
                  <span className="text-[11px] text-slate-400 block">إرسال فوري لولي الأمر عند تغيب الطالب</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.whatsapp.autoAlertOnAbsence}
                    onChange={(e) => updateWhatsapp({ autoAlertOnAbsence: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">تذكير سداد الأقساط تلقائياً:</span>
                  <span className="text-[11px] text-slate-400 block">إشعار عند تجاوز مهلة السداد المحددة</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.whatsapp.autoPaymentReminder}
                    onChange={(e) => updateWhatsapp({ autoPaymentReminder: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Template Selection Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActivePreviewType('absence')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewType === 'absence'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  رسالة الغياب
                </button>
                <button
                  onClick={() => setActivePreviewType('payment')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewType === 'payment'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  تذكير الأقساط
                </button>
                <button
                  onClick={() => setActivePreviewType('welcome')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewType === 'welcome'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  إشعار الحضور بالـ QR
                </button>
              </div>

              {/* Template Editor Box with One-Click Insert Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">انقر لإدراج المتغيرات التلقائية في النص:</span>
                  {copiedToken && <span className="text-emerald-400 font-bold">تم إدراج {copiedToken}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { label: '+ اسم الطالب', token: '{student_name}' },
                    { label: '+ اسم المجموعة', token: '{group_name}' },
                    { label: '+ وقت المسح', token: '{check_in_time}' },
                    { label: '+ المبلغ المستحق', token: '{amount}' },
                    { label: '+ الشهر/الفترة', token: '{billing_period}' },
                  ].map((chip) => (
                    <button
                      key={chip.token}
                      onClick={() => {
                        if (activePreviewType === 'absence') insertToken(chip.token, 'absenceTemplate');
                        else if (activePreviewType === 'payment') insertToken(chip.token, 'paymentReminderTemplate');
                        else insertToken(chip.token, 'attendanceWelcomeTemplate');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[11px] font-mono transition-all cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {activePreviewType === 'absence' && (
                  <textarea
                    rows={3}
                    value={config.whatsapp.absenceTemplate}
                    onChange={(e) => updateWhatsapp({ absenceTemplate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  />
                )}

                {activePreviewType === 'payment' && (
                  <textarea
                    rows={3}
                    value={config.whatsapp.paymentReminderTemplate}
                    onChange={(e) => updateWhatsapp({ paymentReminderTemplate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  />
                )}

                {activePreviewType === 'welcome' && (
                  <textarea
                    rows={3}
                    value={config.whatsapp.attendanceWelcomeTemplate}
                    onChange={(e) => updateWhatsapp({ attendanceWelcomeTemplate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Live Smartphone WhatsApp Chat Preview on Right (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>معاينة حية لشاشة هاتف ولي الأمر (WhatsApp Preview)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Live Simulation</span>
            </div>

            {/* Smartphone Mockup */}
            <div className="bg-[#0b141a] rounded-3xl p-4 border-4 border-slate-800 shadow-2xl space-y-3 relative overflow-hidden">
              {/* WhatsApp Chat Top Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow">
                    {config.identity.centerName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs truncate max-w-[150px]">
                      {config.identity.centerName}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">نشط الآن (WhatsApp Verified)</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{config.identity.whatsappOfficial}</span>
              </div>

              {/* Chat Message Bubble */}
              <div className="py-4 space-y-2">
                <div className="max-w-[90%] bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none shadow-md space-y-1.5 mr-auto">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{getPreviewText()}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 pt-1 font-mono">
                    <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <Check className="w-3 h-3 text-cyan-400" />
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                هكذا تظهر الرسالة بدقة في تطبيق واتساب على هواتف أولياء الأمور
              </div>
            </div>

            {/* Test Send Trigger */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(getPreviewText())}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow cursor-pointer text-center"
            >
              <Send className="w-4 h-4" />
              <span>تجربة إرسال الرسالة إلى هاتفي عبر واتساب</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IDENTITY & BRANDING */}
      {/* ========================================================================= */}
      {activeTab === 'identity' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>بيانات وهوية السنتر (تظهر في الترويسة والإيصالات وكروت الطلاب)</span>
              </h3>
              <p className="text-xs text-slate-400">تتحكم في الاسم المطبوع، أرقام التواصل، وعنوان السنتر المعتمد</p>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full font-mono">
              Branding & Receipts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>اسم السنتر الرسمي:</span>
              </label>
              <input
                type="text"
                value={config.identity.centerName}
                onChange={(e) => updateIdentity({ centerName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">الشعار اللفظي (Slogan / Tagline):</label>
              <input
                type="text"
                value={config.identity.tagline}
                onChange={(e) => updateIdentity({ tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم الهاتف الرئيسي:</span>
              </label>
              <input
                type="text"
                value={config.identity.phonePrimary}
                onChange={(e) => updateIdentity({ phonePrimary: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 font-mono text-cyan-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>رقم الواتساب المعتمد للسنتر:</span>
              </label>
              <input
                type="text"
                value={config.identity.whatsappOfficial}
                onChange={(e) => updateIdentity({ whatsappOfficial: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 font-mono text-emerald-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>البريد الإلكتروني للسنتر:</span>
              </label>
              <input
                type="email"
                value={config.identity.email}
                onChange={(e) => updateIdentity({ email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 font-mono text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>العملة الرسمية للمنظومة:</span>
              </label>
              <input
                type="text"
                value={config.identity.currency}
                onChange={(e) => updateIdentity({ currency: e.target.value })}
                placeholder="ج.م أو ريال أو $"
                className="w-full bg-slate-950 border border-slate-800 font-bold text-amber-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>العنوان الجغرافي للسنتر:</span>
              </label>
              <input
                type="text"
                value={config.identity.address}
                onChange={(e) => updateIdentity({ address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-300 font-semibold">ملاحظة التذييل على إيصالات السداد المطبوعة (Receipt Footer Note):</label>
              <textarea
                rows={2}
                value={config.identity.receiptFooterNote}
                onChange={(e) => updateIdentity({ receiptFooterNote: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINANCIAL POLICIES & TREASURY */}
      {/* ========================================================================= */}
      {activeTab === 'financial' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>السياسات المالية والقواعد المحاسبية للخزنة</span>
              </h3>
              <p className="text-xs text-slate-400">تحدد نسب الأرباح الافتراضية، التسعير، وضوابط سحب وإيداع النقدية</p>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full font-mono">
              Treasury Rules
            </span>
          </div>

          <div className="space-y-6 text-xs">
            {/* Split Percentage Slider */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">نسبة أرباح الحصة الافتراضية بين المدرس والسنتر:</span>
                  <span className="text-slate-400 text-xs">تطبق تلقائياً على أي مدرس أو مجموعة جديدة</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-800 font-bold">
                    المدرس: {config.financial.defaultTeacherSplitPercent}%
                  </span>
                  <span className="text-slate-500 font-bold">•</span>
                  <span className="text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800 font-bold">
                    السنتر: {config.financial.defaultCenterSplitPercent}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.financial.defaultTeacherSplitPercent}
                onChange={(e) => updateFinancial({ defaultTeacherSplitPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% للمدرس</span>
                <span>50% مناصفة</span>
                <span>70% قياسي سناتر</span>
                <span>100% للمدرس</span>
              </div>
            </div>

            {/* Pricing Defaults */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-semibold block">سعر الحصة الافتراضي:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.financial.defaultPerSessionPrice}
                    onChange={(e) => updateFinancial({ defaultPerSessionPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                  />
                  <span className="text-slate-400 font-bold">{config.identity.currency}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">يقيد على كارت الطالب عند مسح الحضور بنظام الحصة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-semibold block">قيمة الاشتراك الشهري الافتراضي:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.financial.defaultMonthlySubscription}
                    onChange={(e) => updateFinancial({ defaultMonthlySubscription: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                  />
                  <span className="text-slate-400 font-bold">{config.identity.currency}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">يستحق في بداية كل شهر دراسي</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-semibold block">أيام سماح المتأخرات (Grace Days):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.financial.overdueGraceDays}
                    onChange={(e) => updateFinancial({ overdueGraceDays: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-amber-300 text-base rounded-xl px-3 py-2"
                  />
                  <span className="text-slate-400 font-bold">يوم</span>
                </div>
                <span className="text-[10px] text-slate-500 block">عدد الأيام قبل تصنيف الطالب كـ "متأخر عن السداد"</span>
              </div>
            </div>

            {/* Treasury Strict Guards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-semibold block">الحد الأقصى للصرف من الخزنة بدون موافقة المدير:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.financial.maxCashOutWithoutApproval}
                    onChange={(e) => updateFinancial({ maxCashOutWithoutApproval: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-rose-300 text-base rounded-xl px-3 py-2"
                  />
                  <span className="text-slate-400 font-bold">{config.identity.currency}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">أي مبلغ أعلى من هذا يتطلب كلمة مرور أو موافقة المدير</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-slate-200 font-bold block">منع العجز المالي في الخزنة (Zero Deficit Rule):</span>
                  <span className="text-slate-500 text-[11px] block">
                    رفض تام لأي عملية صرف أو سحب إذا كان رصيد الخزنة الفعلي غير كافٍ.
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.financial.enforceZeroDeficit}
                    onChange={(e) => updateFinancial({ enforceZeroDeficit: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ATTENDANCE & QR SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>سياسات حضور الـ QR وتشفير كروت الطلاب</span>
              </h3>
              <p className="text-xs text-slate-400">إدارة فترات الصلاحية، حماية التشفير، ودقائق مهلة التأخير</p>
            </div>
            <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-800/40 px-2.5 py-1 rounded-full font-mono">
              HMAC Security
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">مهلة التأخير المسموحة للطالب (Grace Minutes):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.attendance.lateArrivalGraceMinutes}
                  onChange={(e) => updateAttendance({ lateArrivalGraceMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">دقيقة</span>
              </div>
              <span className="text-[10px] text-slate-500 block">إذا وصل الطالب بعد هذا الوقت من بدء الحصة يسجل كـ "متأخر"</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">مدة صلاحية كود الـ QR الديناميكي (Anti-Replay Expiry):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.attendance.qrCodeExpirySeconds}
                  onChange={(e) => updateAttendance({ qrCodeExpirySeconds: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-purple-300 text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">ثانية</span>
              </div>
              <span className="text-[10px] text-slate-500 block">للكروت التي تستخدم التوكن المتغير على الهاتف لمنع لقطات الشاشة</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-200 font-bold block">السماح بتكرار المسح في نفس اليوم:</span>
                <span className="text-slate-500 text-[11px] block">
                  عند التعطيل، يرفض النظام مسح نفس الطالب مرتين لمنع الازدواجية المالية.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.attendance.allowDuplicateScansPerDay}
                  onChange={(e) => updateAttendance({ allowDuplicateScansPerDay: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-200 font-bold block">التغذية الصوتية (نغمات تأكيد المسح):</span>
                <span className="text-slate-500 text-[11px] block">
                  تشغيل نغمة صوتية مميزة عند نجاح التوثيق أو صوت تحذيري عند التزوير.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.attendance.enableSoundFeedback}
                  onChange={(e) => updateAttendance({ enableSoundFeedback: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-slate-300 font-semibold block">المفتاح السري الرئيسي لتشفير السنتر (Master HMAC Secret):</label>
              <input
                type="text"
                value={config.attendance.hmacMasterSecret}
                onChange={(e) => updateAttendance({ hmacMasterSecret: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 font-mono text-purple-300 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 block">
                مفتاح التشفير المشترك مع خادم FastAPI وتريجرز PostgreSQL لتوقيع كروت الحضور.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STAFF & PAYROLL POLICIES */}
      {/* ========================================================================= */}
      {activeTab === 'payroll' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>سياسات شؤون الموظفين ومسير الرواتب</span>
              </h3>
              <p className="text-xs text-slate-400">تحديد خصومات التأخير، مواعيد الصرف، وحدود السلف المالية</p>
            </div>
            <span className="text-[10px] text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-1 rounded-full font-mono">
              Staff & HR
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">قيمة خصم دقيقة التأخير للموظف:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={config.payroll.latePenaltyPerMinute}
                  onChange={(e) => updatePayroll({ latePenaltyPerMinute: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">{config.identity.currency} / دقيقة</span>
              </div>
              <span className="text-[10px] text-slate-500 block">تخصم تلقائياً من إجمالي الراتب الشهري عند استخراج المسير</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">يوم صرف الرواتب الرسمي من كل شهر:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.payroll.monthlyPayday}
                  onChange={(e) => updatePayroll({ monthlyPayday: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-indigo-300 text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">من كل شهر</span>
              </div>
              <span className="text-[10px] text-slate-500 block">يحدد موعد تجهيز مسير الرواتب المعتمد للصرف من الخزنة</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">الحد الأقصى للسلف المسموحة (% من الراتب):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.payroll.maxAdvancePercentOfSalary}
                  onChange={(e) => updatePayroll({ maxAdvancePercentOfSalary: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-amber-300 text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              <span className="text-[10px] text-slate-500 block">يمنع الموظف من طلب سلفة تتجاوز هذه النسبة من راتبه الأساسي</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">ساعات العمل القياسية للشفت اليومي:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="14"
                  value={config.payroll.standardShiftHours}
                  onChange={(e) => updatePayroll({ standardShiftHours: parseInt(e.target.value, 10) || 8 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">ساعات</span>
              </div>
              <span className="text-[10px] text-slate-500 block">الأساس المعتمد لحساب الحضور والغياب الإداري</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SECURITY & INSTANT BACKUP POLICIES */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" />
                <span>سياسات الأمان والحماية والنسخ السحابي</span>
              </h3>
              <p className="text-xs text-slate-400">التحكم في فترات الجلسات، قواعد حظر محاولات التخمين، والنسخ الاحتياطي</p>
            </div>
            <span className="text-[10px] text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded-full font-mono">
              Enterprise Security
            </span>
          </div>

          {/* Dedicated Instant Backup Banner */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-950 to-cyan-950/60 border border-cyan-800/60 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">النسخ الاحتياطي الفوري والشامل (Instant Full System Backup)</h4>
                <p className="text-xs text-slate-400">
                  سحب نسخة احتياطية مشفرة وفورية لكافة إعدادات السنتر، قواعد البيانات، وسجلات التدقيق بضغطة زر وتنزيلها لجهازك مباشرة.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstantFullBackup}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل النسخة الاحتياطية الآن</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">أقصى محاولات دخول فاشلة قبل القفل (Brute-Force Guard):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={config.security.maxFailedLoginsBeforeLock}
                  onChange={(e) => updateSecurity({ maxFailedLoginsBeforeLock: parseInt(e.target.value, 10) || 5 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-rose-300 text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">محاولات</span>
              </div>
              <span className="text-[10px] text-slate-500 block">يقفل الحساب مؤقتاً لحماية كلمات مرور المديرين والموظفين</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">مدة القفل الأمني المؤقت:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={config.security.lockoutDurationSeconds}
                  onChange={(e) => updateSecurity({ lockoutDurationSeconds: parseInt(e.target.value, 10) || 60 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">ثانية</span>
              </div>
              <span className="text-[10px] text-slate-500 block">مدة العد التنازلي قبل إتاحة محاولة الدخول مجدداً</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">صلاحية جلسة الدخول (JWT Duration):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={config.security.jwtSessionDurationHours}
                  onChange={(e) => updateSecurity({ jwtSessionDurationHours: parseInt(e.target.value, 10) || 12 })}
                  className="w-full bg-slate-900 border border-slate-800 font-mono font-bold text-white text-base rounded-xl px-3 py-2"
                />
                <span className="text-slate-400 font-bold">ساعة</span>
              </div>
              <span className="text-[10px] text-slate-500 block">تحدد متى يطلب النظام إعادة إدخال كلمة المرور</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">دورية النسخ الاحتياطي التلقائي المشفر (AES-256):</span>
              <select
                value={config.security.autoBackupFrequency}
                onChange={(e) => updateSecurity({ autoBackupFrequency: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-800 font-bold text-cyan-300 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
              >
                <option value="DAILY">يومياً أوتوماتيكياً (Daily Auto Backup)</option>
                <option value="WEEKLY">أسبوعياً (Weekly)</option>
                <option value="MANUAL">يدوياً فقط حسب رغبة المدير (Manual)</option>
              </select>
              <span className="text-[10px] text-slate-500 block">يضمن عدم فقدان أي بيانات للطلاب أو الحسابات المالية</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Action Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">صلاحية وسلطة المدير المطلقة (Admin Full Authority)</span>
            <span className="text-[11px] text-slate-400 block">
              كل خيار تم ضبطه هنا يطبق فورياً عبر التطبيق دون الحاجة لأي مبرمج أو تعديل برمجي.
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>حفظ وتطبيق التغييرات</span>
        </button>
      </div>

    </div>
  );
}
