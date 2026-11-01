import React, { useState } from 'react';
import {
  Download,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Upload,
  Palette,
  FileText,
  FileSpreadsheet,
  Printer,
  Image as ImageIcon,
  Building2,
} from 'lucide-react';
import {
  ERPDatabaseState,
  ModuleSectionKey,
  CustomFieldEntity,
  ExportBrandingThemeId,
  EXPORT_COLOR_THEMES,
  CENTER_LOGO_PRESETS,
  DEFAULT_EXPORT_BRANDING,
  erpStore,
} from '../../lib/erp-store';
import {
  exportToPrintablePdf,
  exportToCsvExcel,
} from '../../lib/export-engine';
import {
  CustomFieldBuilderModal,
  CategoryManagerModal,
} from '../common/CustomizationModals';

interface AdminSettingsCenterProps {
  state?: ERPDatabaseState;
  onNavigateToView?: (view: any) => void;
}

const SECTION_LABELS: { key: ModuleSectionKey; label: string; desc: string }[] = [
  {
    key: 'dashboard',
    label: 'لوحة المؤشرات الرئيسية',
    desc: 'عرض الإحصائيات الفورية ومواعيد المجموعات اليومية',
  },
  {
    key: 'academic_tree',
    label: 'المجموعات والربط الشجري',
    desc: 'ربط المراحل والمواد والمدرسين بالمجموعات والطلاب',
  },
  {
    key: 'people',
    label: 'شاشة إدارة الأفراد',
    desc: 'إدارة سجلات الطلاب والمدرسين والموظفين',
  },
  {
    key: 'finance',
    label: 'الخزنة والماليات (70/30)',
    desc: 'تحصيل المصروفات، الأقساط، حساب نسب المدرسين، والمصروفات',
  },
  {
    key: 'attendance',
    label: 'الحضور والانصراف بالـ QR',
    desc: 'مسح كروت الطلاب والتسجيل الجماعي وحصص التعويض',
  },
  {
    key: 'suggestions',
    label: 'صندوق الاقتراحات والواتساب',
    desc: 'مراجعة واعتماد رسائل أولياء الأمور يدوياً قبل الإرسال',
  },
];

export default function AdminSettingsCenter({
  state: propState,
}: AdminSettingsCenterProps) {
  const [internalState, setInternalState] = useState<ERPDatabaseState>(() =>
    erpStore.getState()
  );
  const state = propState || internalState;

  React.useEffect(() => {
    if (propState) return;
    return erpStore.subscribe(setInternalState);
  }, [propState]);

  const currentBranding = state.config.exportBranding || DEFAULT_EXPORT_BRANDING;

  // Center Identity & Financial Split State
  const [centerName, setCenterName] = useState(state.config.centerName);
  const [currency, setCurrency] = useState(state.config.currency);
  const [centerPhone, setCenterPhone] = useState(state.config.centerPhone);
  const [defaultSplit, setDefaultSplit] = useState(
    state.config.defaultTeacherSplit
  );
  const [receiptFooter, setReceiptFooter] = useState(
    state.config.receiptFooter
  );

  // Export Branding & Institutional Table Color State
  const [logoDataUrl, setLogoDataUrl] = useState(currentBranding.logoDataUrl);
  const [headerSubtitle, setHeaderSubtitle] = useState(
    currentBranding.headerSubtitle
  );
  const [headerAddress, setHeaderAddress] = useState(
    currentBranding.headerAddress
  );
  const [headerTaxOrLicense, setHeaderTaxOrLicense] = useState(
    currentBranding.headerTaxOrLicense
  );
  const [showLogoInExports, setShowLogoInExports] = useState(
    currentBranding.showLogoInExports
  );
  const [includeHeaderInExcel, setIncludeHeaderInExcel] = useState(
    currentBranding.includeHeaderInExcel
  );
  const [themeId, setThemeId] = useState<ExportBrandingThemeId>(
    currentBranding.themeId
  );
  const [primaryTableColor, setPrimaryTableColor] = useState(
    currentBranding.primaryTableColor
  );
  const [headerTextColor, setHeaderTextColor] = useState(
    currentBranding.headerTextColor
  );
  const [zebraRowColor, setZebraRowColor] = useState(
    currentBranding.zebraRowColor
  );
  const [borderAccentColor, setBorderAccentColor] = useState(
    currentBranding.borderAccentColor
  );

  // Sync local form state if external store resets
  React.useEffect(() => {
    const b = state.config.exportBranding || DEFAULT_EXPORT_BRANDING;
    setCenterName(state.config.centerName);
    setCurrency(state.config.currency);
    setCenterPhone(state.config.centerPhone);
    setDefaultSplit(state.config.defaultTeacherSplit);
    setReceiptFooter(state.config.receiptFooter);
    setLogoDataUrl(b.logoDataUrl);
    setHeaderSubtitle(b.headerSubtitle);
    setHeaderAddress(b.headerAddress);
    setHeaderTaxOrLicense(b.headerTaxOrLicense);
    setShowLogoInExports(b.showLogoInExports);
    setIncludeHeaderInExcel(b.includeHeaderInExcel);
    setThemeId(b.themeId);
    setPrimaryTableColor(b.primaryTableColor);
    setHeaderTextColor(b.headerTextColor);
    setZebraRowColor(b.zebraRowColor);
    setBorderAccentColor(b.borderAccentColor);
  }, [state.config]);

  // Discount Rule Form
  const [newDiscountTitle, setNewDiscountTitle] = useState('');
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(20);
  const [newDiscountDesc, setNewDiscountDesc] = useState('');

  // Customization Modals
  const [customFieldEntity, setCustomFieldEntity] =
    useState<CustomFieldEntity | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    erpStore.updateConfig({
      centerName: centerName.trim() || 'سنتر النخبة التعليمي الذكي',
      currency: currency.trim() || 'ج.م',
      centerPhone: centerPhone.trim(),
      defaultTeacherSplit: Number(defaultSplit) || 70,
      receiptFooter: receiptFooter.trim(),
    });
    showToast('تم حفظ إعدادات السنتر ونسبة التقسيم الافتراضية بنجاح.');
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = String(event.target?.result || '');
      if (dataUrl.startsWith('data:image/')) {
        setLogoDataUrl(dataUrl);
        setShowLogoInExports(true);
        erpStore.updateExportBranding({
          logoDataUrl: dataUrl,
          showLogoInExports: true,
        });
        showToast('تم رفع شعار السنتر الجديد وتفعيله في جميع تقارير PDF بنجاح.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectColorPreset = (
    preset: (typeof EXPORT_COLOR_THEMES)[number]
  ) => {
    setThemeId(preset.id);
    setPrimaryTableColor(preset.primaryTableColor);
    setHeaderTextColor(preset.headerTextColor);
    setZebraRowColor(preset.zebraRowColor);
    setBorderAccentColor(preset.borderAccentColor);
    erpStore.updateExportBranding({
      themeId: preset.id,
      primaryTableColor: preset.primaryTableColor,
      headerTextColor: preset.headerTextColor,
      zebraRowColor: preset.zebraRowColor,
      borderAccentColor: preset.borderAccentColor,
    });
    showToast(`تم تطبيق هوية الألوان المؤسسية: "${preset.name}" بنجاح.`);
  };

  const handleSaveBrandingAndHeader = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCenterName = centerName.trim() || 'سنتر النخبة التعليمي الذكي';
    const cleanPhone = centerPhone.trim() || '01001234567';
    const cleanFooter =
      receiptFooter.trim() ||
      'إيصال وتقرير رسمي معتمد - يرجى الاحتفاظ بالمستند للمراجعة.';

    erpStore.updateConfig({
      centerName: cleanCenterName,
      centerPhone: cleanPhone,
      currency: currency.trim() || 'ج.م',
      defaultTeacherSplit: Number(defaultSplit) || 70,
      receiptFooter: cleanFooter,
      exportBranding: {
        logoDataUrl,
        headerSubtitle:
          headerSubtitle.trim() ||
          'مؤسسة تعليمية معتمدة للمرحلة الابتدائية والإعدادية والثانوية',
        headerAddress:
          headerAddress.trim() || 'القاهرة - مدينة نصر - شارع عباس العقاد الرئيسي',
        headerTaxOrLicense:
          headerTaxOrLicense.trim() ||
          'اعتماد أكاديمي رقم 4092/2026 • إدارة المتابعة والجودة',
        showLogoInExports,
        includeHeaderInExcel,
        themeId,
        primaryTableColor,
        headerTextColor,
        zebraRowColor,
        borderAccentColor,
      },
    });
    showToast(
      'تم حفظ شعار السنتر، بيانات الترويسة الرسمية، وألوان الجداول المؤسسية وتعميمها على كافة ملفات PDF و Excel.'
    );
  };

  const handleTestPdfExport = () => {
    exportToPrintablePdf({
      title: 'كشف متابعة وإيرادات المجموعات الدراسية (نموذج معاينة الهوية)',
      subtitle: headerSubtitle,
      centerName,
      headers: [
        'كود المجموعة',
        'اسم المجموعة والمادة',
        'المرحلة الدراسية',
        'عدد الطلاب المسجلين',
        'صافي الإيراد المحصل',
      ],
      rows: [
        [
          'G-101',
          'مجموعة الفيزياء المتقدمة (سبت وثلاثاء)',
          'الصف الثالث الثانوي',
          '48 طالب',
          `9,600 ${currency}`,
        ],
        [
          'G-102',
          'مجموعة الكيمياء العضوية (أحد وأربعاء)',
          'الصف الثالث الثانوي',
          '42 طالب',
          `7,500 ${currency}`,
        ],
        [
          'G-103',
          'مجموعة الرياضيات التطبيقية (اثنين وخميس)',
          'الصف الثاني الثانوي',
          '38 طالب',
          `6,800 ${currency}`,
        ],
      ],
      summaryCards: [
        { label: 'إجمالي المجموعات النشطة', value: `${state.groups.length} مجموعات` },
        { label: 'إجمالي الطلاب المسجلين', value: `${state.students.length} طالب` },
        { label: 'هوية التقرير', value: 'معتمد رسمياً' },
      ],
      brandingOverrides: {
        centerName,
        centerPhone,
        currency,
        receiptFooter,
        logoDataUrl,
        headerSubtitle,
        headerAddress,
        headerTaxOrLicense,
        showLogoInExports,
        includeHeaderInExcel,
        themeId,
        primaryTableColor,
        headerTextColor,
        zebraRowColor,
        borderAccentColor,
      },
    });
    showToast('تم فتح معاينة طباعة PDF بشعار السنتر والترويسة وألوان الجداول المختارة.');
  };

  const handleTestExcelExport = () => {
    exportToCsvExcel(
      'نموذج_تقرير_مؤسسي_بالترويسة.csv',
      ['كود الطالب', 'اسم الطالب', 'المرحلة الدراسية', 'المجموعة', 'حالة السداد'],
      [
        ['ST-1001', 'أحمد محمد الجارحي', 'الصف الثالث الثانوي', 'مجموعة الفيزياء المتقدمة', 'خالص بالكامل'],
        ['ST-1002', 'مريم طارق الشاذلي', 'الصف الثالث الثانوي', 'مجموعة الكيمياء العضوية', 'متبقي قسط'],
        ['ST-1003', 'يوسف وائل الكيلاني', 'الصف الثاني الثانوي', 'مجموعة الرياضيات التطبيقية', 'خالص بالكامل'],
      ],
      {
        centerName,
        centerPhone,
        currency,
        receiptFooter,
        logoDataUrl,
        headerSubtitle,
        headerAddress,
        headerTaxOrLicense,
        showLogoInExports,
        includeHeaderInExcel,
        themeId,
        primaryTableColor,
        headerTextColor,
        zebraRowColor,
        borderAccentColor,
      }
    );
    showToast('تم تصدير ملف Excel التجريبي شاملاً بيانات الترويسة الرسمية بأعلى الجدول.');
  };

  const handleAddDiscountRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscountTitle.trim()) return;
    const nextRules = [
      ...state.config.discountRules,
      {
        id: `disc-${Date.now()}`,
        title: newDiscountTitle.trim(),
        percent: Math.min(100, Math.max(1, Number(newDiscountPercent) || 10)),
        description: newDiscountDesc.trim() || 'خصم معتمد من إدارة السنتر',
        active: true,
      },
    ];
    erpStore.updateConfig({ discountRules: nextRules });
    setNewDiscountTitle('');
    setNewDiscountDesc('');
    showToast('تمت إضافة قاعدة الخصم الجديدة وتفعيلها في شاشة التحصيل.');
  };

  const handleToggleDiscountRule = (id: string) => {
    const nextRules = state.config.discountRules.map((r) =>
      r.id === id ? { ...r, active: !r.active } : r
    );
    erpStore.updateConfig({ discountRules: nextRules });
  };

  const handleDeleteDiscountRule = (id: string) => {
    const nextRules = state.config.discountRules.filter((r) => r.id !== id);
    erpStore.updateConfig({ discountRules: nextRules });
    showToast('تم حذف قاعدة الخصم.');
  };

  const handleDownloadFullBackup = () => {
    const fullSnapshot = erpStore.getState();
    const jsonString = JSON.stringify(fullSnapshot, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `EduCenter_Full_Backup_${dateStamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(
      'تم سحب النسخة الاحتياطية الكاملة (شاملة الشعار والترويسة والحقول المخصصة) وحفظها على جهازك.'
    );
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        if (
          parsed &&
          Array.isArray(parsed.students) &&
          Array.isArray(parsed.groups)
        ) {
          erpStore.saveState(parsed);
          showToast(
            'تم استعادة النسخة الاحتياطية وتحديث جميع الأقسام وإعدادات الترويسة بنجاح.'
          );
        }
      } catch {
        showToast(
          'تعذر قراءة ملف النسخة الاحتياطية. تأكد من اختيار ملف JSON صحيح.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Instant Backup / Meta-Customization */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            لوحة تحكم المدير العام ومحرك التخصيص الحر (No-Code Engine)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            تحكم كامل بنسبة 100% في شعار السنتر وترويسة وألوان تقارير PDF & Excel، الحقول المخصصة، والتصنيفات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomFieldEntity('student')}
            className="px-3.5 py-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ إضافة حقل مخصص</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>إدارة وتعديل التصنيفات</span>
          </button>

          <button
            onClick={handleDownloadFullBackup}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>سحب نسخة احتياطية كاملة (Backup)</span>
          </button>

          <label className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap">
            <span>استعادة نسخة من الجهاز</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackupFile}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              erpStore.resetToDemoData();
              showToast('تمت استعادة البيانات الافتراضية للنظام بنجاح.');
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط البيانات</span>
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

      {/* ===================================================================== */}
      {/* NEW: Institutional Branding, Logo Upload, Header & Table Color Studio */}
      {/* ===================================================================== */}
      <form
        onSubmit={handleSaveBrandingAndHeader}
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Palette className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  تخصيص شعار السنتر (Logo) وبيانات الترويسة (Header) وألوان الجداول المؤسسية
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تظهر هذه الإعدادات والشعار والألوان تلقائياً في جميع ملفات الـ PDF والـ Excel وبطاقات متابعة الطلاب الصادرة من النظام.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestPdfExport}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>معاينة وطباعة PDF تجريبي</span>
            </button>

            <button
              type="button"
              onClick={handleTestExcelExport}
              className="px-3.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel تجريبي بالترويسة</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الهوية والترويسة وألوان الجداول</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Logo Upload & Header Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Logo Uploader Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>1. شعار السنتر الرسمي (Center Logo)</span>
                </h4>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogoInExports}
                    onChange={(e) => setShowLogoInExports(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>إظهار الشعار في ملفات الـ PDF المطبوعة</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                  {logoDataUrl && showLogoInExports ? (
                    <img
                      src={logoDataUrl}
                      alt="شعار السنتر"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 text-center leading-tight">
                      بدون شعار
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 min-w-[220px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع شعار من الجهاز (PNG / JPG / SVG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoInExports(false);
                        erpStore.updateExportBranding({ showLogoInExports: false });
                        showToast('تم إخفاء الشعار من الترويسة المطبوعة.');
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold cursor-pointer"
                    >
                      إخفاء الشعار
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 ml-1">
                      أو اختر شعاراً أكاديمياً جاهزاً:
                    </span>
                    {CENTER_LOGO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setLogoDataUrl(preset.dataUrl);
                          setShowLogoInExports(true);
                          erpStore.updateExportBranding({
                            logoDataUrl: preset.dataUrl,
                            showLogoInExports: true,
                          });
                          showToast(`تم اختيار "${preset.label}" كشعار رسمي للسنتر.`);
                        }}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Header Metadata Fields */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>2. بيانات الترويسة الرسمية (PDF & Excel Header)</span>
                </h4>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaderInExcel}
                    onChange={(e) => setIncludeHeaderInExcel(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تضمين بيانات الترويسة تلقائياً أعلى ملفات Excel</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم السنتر الرئيسي في الترويسة
                  </label>
                  <input
                    type="text"
                    required
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="مثال: سنتر النخبة التعليمي الذكي"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم هاتف الإدارة بالترويسة
                  </label>
                  <input
                    type="text"
                    value={centerPhone}
                    onChange={(e) => setCenterPhone(e.target.value)}
                    placeholder="01001234567"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الوصف المؤسسي / العنوان الفرعي بالترويسة (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={headerSubtitle}
                    onChange={(e) => setHeaderSubtitle(e.target.value)}
                    placeholder="مثال: مؤسسة تعليمية معتمدة للمرحلة الابتدائية والإعدادية والثانوية"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان المقر / الفرع بالترويسة
                  </label>
                  <input
                    type="text"
                    value={headerAddress}
                    onChange={(e) => setHeaderAddress(e.target.value)}
                    placeholder="مثال: القاهرة - مدينة نصر - شارع عباس العقاد"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    بيانات الاعتماد / الترخيص الأكاديمي
                  </label>
                  <input
                    type="text"
                    value={headerTaxOrLicense}
                    onChange={(e) => setHeaderTaxOrLicense(e.target.value)}
                    placeholder="مثال: اعتماد أكاديمي رقم 4092/2026"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نص التذييل السفلي للتقارير والإيصالات (Footer)
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="إيصال وتقرير رسمي معتمد - يرجى الاحتفاظ بالمستند للمراجعة."
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* 3. Institutional Table Color Themes */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  <span>3. ألوان الجداول المؤسسية وهوية المطبوعات (Table Color Themes)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  اختر سمة لونية جاهزة أو خصص ألوان رأس الجدول والصفوف المتبادلة والحدود يدوياً.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {EXPORT_COLOR_THEMES.map((preset) => {
                  const isSelected =
                    themeId === preset.id &&
                    primaryTableColor.toLowerCase() ===
                      preset.primaryTableColor.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectColorPreset(preset)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.primaryTableColor }}
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {preset.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Fine-Grained Color Pickers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    لون رأس الجدول الأساسي
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      aria-label="لون رأس الجدول الأساسي"
                      value={primaryTableColor}
                      onChange={(e) => {
                        setThemeId('CUSTOM');
                        setPrimaryTableColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {primaryTableColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    لون نص رأس الجدول
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      aria-label="لون نص رأس الجدول"
                      value={headerTextColor}
                      onChange={(e) => {
                        setThemeId('CUSTOM');
                        setHeaderTextColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {headerTextColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    لون الصفوف المتبادلة
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      aria-label="لون الصفوف المتبادلة"
                      value={zebraRowColor}
                      onChange={(e) => {
                        setThemeId('CUSTOM');
                        setZebraRowColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {zebraRowColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    لون حدود الجدول
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      aria-label="لون حدود الجدول"
                      value={borderAccentColor}
                      onChange={(e) => {
                        setThemeId('CUSTOM');
                        setBorderAccentColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {borderAccentColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Live Interactive Document Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>معاينة حية للترويسة والجدول المؤسسي (Live A4 Preview)</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                تحديث فوري
              </span>
            </div>

            {/* Simulated A4 Document Sheet */}
            <div className="p-5 rounded-xl bg-white text-slate-900 border-2 border-slate-200 shadow-sm space-y-4">
              {/* Document Header Preview */}
              <div
                className="pb-3 flex items-center justify-between gap-3"
                style={{ borderBottom: `3px solid ${primaryTableColor}` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {showLogoInExports && logoDataUrl && (
                    <img
                      src={logoDataUrl}
                      alt="شعار الترويسة"
                      className="w-12 h-12 object-contain rounded-lg p-1 bg-white shrink-0"
                      style={{ border: `1px solid ${borderAccentColor}` }}
                    />
                  )}
                  <div className="min-w-0">
                    <div
                      className="text-sm font-black truncate"
                      style={{ color: primaryTableColor }}
                    >
                      تقرير المتابعة والكشوف المؤسسية
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {centerName}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">
                      {headerSubtitle}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {headerAddress} • هاتف: {centerPhone}
                    </div>
                  </div>
                </div>

                <div className="text-left text-[10px] text-slate-600 shrink-0 leading-relaxed">
                  <div>
                    <strong>التاريخ:</strong> ٢٠ نوفمبر ٢٠٢٦
                  </div>
                  <div className="truncate max-w-[130px]">
                    {headerTaxOrLicense}
                  </div>
                </div>
              </div>

              {/* Mini Summary Strip inside Preview */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'إجمالي الطلاب', val: `${state.students.length} طالب` },
                  { label: 'المجموعات', val: `${state.groups.length} مجموعات` },
                  { label: 'العملة', val: currency },
                ].map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: zebraRowColor,
                      border: `1px solid ${borderAccentColor}`,
                    }}
                  >
                    <div className="text-[10px] text-slate-500">{c.label}</div>
                    <div
                      className="text-xs font-extrabold mt-0.5"
                      style={{ color: primaryTableColor }}
                    >
                      {c.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Institutional Table Preview */}
              <div className="overflow-hidden rounded-lg">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      {['الكود', 'اسم الطالب / البيان', 'المجموعة', 'الحالة'].map(
                        (h) => (
                          <th
                            key={h}
                            className="py-2 px-2.5 text-right font-bold"
                            style={{
                              backgroundColor: primaryTableColor,
                              color: headerTextColor,
                              border: `1px solid ${primaryTableColor}`,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        code: 'ST-1001',
                        name: 'أحمد محمد الجارحي',
                        group: 'فيزياء 3ث',
                        status: 'خالص بالكامل',
                      },
                      {
                        code: 'ST-1002',
                        name: 'مريم طارق الشاذلي',
                        group: 'كيمياء 3ث',
                        status: 'قسط جزئي',
                      },
                      {
                        code: 'ST-1003',
                        name: 'يوسف وائل الكيلاني',
                        group: 'رياضيات 2ث',
                        status: 'خالص بالكامل',
                      },
                    ].map((r, idx) => (
                      <tr
                        key={r.code}
                        style={{
                          backgroundColor:
                            idx % 2 === 0 ? '#ffffff' : zebraRowColor,
                        }}
                      >
                        <td
                          className="py-1.5 px-2.5 font-mono"
                          style={{ border: `1px solid ${borderAccentColor}` }}
                        >
                          {r.code}
                        </td>
                        <td
                          className="py-1.5 px-2.5 font-bold"
                          style={{ border: `1px solid ${borderAccentColor}` }}
                        >
                          {r.name}
                        </td>
                        <td
                          className="py-1.5 px-2.5"
                          style={{ border: `1px solid ${borderAccentColor}` }}
                        >
                          {r.group}
                        </td>
                        <td
                          className="py-1.5 px-2.5 font-bold"
                          style={{
                            border: `1px solid ${borderAccentColor}`,
                            color: primaryTableColor,
                          }}
                        >
                          {r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Footer Preview */}
              <div
                className="pt-2.5 flex items-center justify-between text-[10px] text-slate-500"
                style={{ borderTop: `1px dashed ${borderAccentColor}` }}
              >
                <span className="truncate max-w-[260px]">* {receiptFooter}</span>
                <span className="font-bold" style={{ color: primaryTableColor }}>
                  ختم الإدارة المعتمد
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Meta-Customization Overview Strip */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>مركز الحقول المخصصة السريع لجميع شاشات النظام</span>
            </h3>
            <p className="text-xs text-slate-500">
              اضغط على أي قسم لإضافة أو حذف الحقول المخصصة الخاصة به فوراً
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              { key: 'student', label: 'حقول الطلاب' },
              { key: 'teacher', label: 'حقول المدرسين' },
              { key: 'group', label: 'حقول المجموعات' },
              { key: 'expense', label: 'حقول المصروفات' },
              { key: 'staff', label: 'حقول الموظفين' },
            ] as { key: CustomFieldEntity; label: string }[]
          ).map((item) => {
            const count = state.config.customFields.filter(
              (f) => f.entity === item.key
            ).length;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCustomFieldEntity(item.key)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 text-right transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.label}
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                  {count} حقل مخصص نشط · + إضافة
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Show/Hide System Modules & Identity (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Show / Hide Sections Without Code */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إظهار وإخفاء أقسام النظام (بدون أكواد)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك إخفاء أي قسم عن شريط التنقل لتبسيط الواجهة للموظفين وإظهاره في أي وقت بضغطة زر.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {SECTION_LABELS.map((item) => {
                const isEnabled =
                  state.config.enabledSections[item.key] !== false;
                return (
                  <div
                    key={item.key}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => erpStore.toggleSection(item.key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isEnabled
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>ظاهر بالواجهة</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>مخفي حالياً</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Financial Policy & Split */}
          <form
            onSubmit={handleSaveIdentity}
            className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                السياسة المالية ونسبة التقسيم الافتراضية (70/30)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  العملة المعتمدة
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  النسبة الافتراضية للمدرس %
                </label>
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={defaultSplit}
                  onChange={(e) => setDefaultSplit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              حفظ السياسة المالية الافتراضية
            </button>
          </form>
        </div>

        {/* Right Column: Student Discounts & Scholarships Engine (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              إدارة نسب الخصومات والإعفاءات للطلاب
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تظهر هذه الخصومات مباشرة عند تسجيل الطالب أو تحصيل المصروفات في الخزنة.
            </p>
          </div>

          <form
            onSubmit={handleAddDiscountRule}
            className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الخصم أو المنحة
                </label>
                <input
                  type="text"
                  required
                  value={newDiscountTitle}
                  onChange={(e) => setNewDiscountTitle(e.target.value)}
                  placeholder="مثال: خصم أبناء العاملين بالتعليم"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نسبة الخصم %
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newDiscountPercent}
                  onChange={(e) =>
                    setNewDiscountPercent(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDiscountDesc}
                onChange={(e) => setNewDiscountDesc(e.target.value)}
                placeholder="وصف مختصر لشروط استحقاق الخصم..."
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خصم</span>
              </button>
            </div>
          </form>

          {/* Active Discount Rules List */}
          <div className="space-y-2.5">
            {state.config.discountRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {rule.title}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      ({rule.percent}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rule.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleDiscountRule(rule.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                      rule.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {rule.active ? 'مفعل' : 'معطل'}
                  </button>
                  <button
                    onClick={() => handleDeleteDiscountRule(rule.id)}
                    aria-label={`حذف ${rule.title}`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Fields Builder Modal */}
      {customFieldEntity && (
        <CustomFieldBuilderModal
          entity={customFieldEntity}
          customFields={state.config.customFields}
          onClose={() => setCustomFieldEntity(null)}
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
    </div>
  );
}
