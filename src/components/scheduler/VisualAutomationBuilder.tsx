import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Bell,
  Clock,
  DollarSign,
  AlertTriangle,
  Send,
  Sliders,
  Smartphone,
  CheckCheck,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  ChevronRight,
  User,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { normalizePhoneNumber, generateWhatsAppUrl } from '../../lib/scheduler-engine';

export interface VisualAutomationRule {
  id: string;
  title: string;
  category: 'STUDENT_ABSENCE' | 'FINANCE_OVERDUE' | 'CLASS_REMINDER' | 'EXAM_GRADES' | 'TREASURY_ALERT';
  description: string;
  enabled: boolean;
  triggerDelay: number;
  triggerUnit: 'MINUTES' | 'HOURS' | 'DAYS';
  templateText: string;
  recipientRole: 'PARENT' | 'STUDENT' | 'TEACHER' | 'ADMIN';
  tags: string[];
}

export const DEFAULT_AUTOMATION_RULES: VisualAutomationRule[] = [
  {
    id: 'rule-absence',
    title: 'تنبيه الغياب الفوري لولي الأمر (Instant Absence Alert)',
    category: 'STUDENT_ABSENCE',
    description: 'إرسال رسالة واتساب فورية لولي الأمر عند مرور 15 دقيقة من بدء الحصة دون تسجيل كود الـ QR للطالب.',
    enabled: true,
    triggerDelay: 15,
    triggerUnit: 'MINUTES',
    templateText: 'عزيزي ولي أمر الطالب {student_name}، نحيطكم علماً بتغيب الطالب عن موعد حصة {group_name} المقررة اليوم في تمام الساعة {session_time}. يرجى الاطمئنان عليه والتواصل مع إدارة السنتر.',
    recipientRole: 'PARENT',
    tags: ['{student_name}', '{parent_name}', '{group_name}', '{session_time}']
  },
  {
    id: 'rule-overdue',
    title: 'تذكير المصروفات والأقساط المتأخرة (Overdue Payment Reminder)',
    category: 'FINANCE_OVERDUE',
    description: 'تنبيه ودي لولي الأمر عند تأخر سداد القسط الشهري أو قيمة الحصص عن موعد الاستحقاق.',
    enabled: true,
    triggerDelay: 3,
    triggerUnit: 'DAYS',
    templateText: 'مرحباً أستاذ {parent_name}، نود تذكيركم بلطف بأن اشتراك الطالب {student_name} لمجموعة {group_name} بمبلغ {amount} ج.م مستحق منذ تاريخ {due_date}. شاكرين تعاونكم المستمر.',
    recipientRole: 'PARENT',
    tags: ['{student_name}', '{parent_name}', '{group_name}', '{amount}', '{due_date}']
  },
  {
    id: 'rule-upcoming',
    title: 'تذكير موعد الحصة القادمة والقاعة (Upcoming Session Reminder)',
    category: 'CLASS_REMINDER',
    description: 'إشعار تذكيري للطلاب والمعلم قبل انطلاق الحصة بوقت كافٍ لتأكيد الحضور وتحديد القاعة.',
    enabled: true,
    triggerDelay: 30,
    triggerUnit: 'MINUTES',
    templateText: 'تذكير: حصتكم القادمة {group_name} ستبدأ بعد 30 دقيقة في {hall_name}. يرجى التواجد في الموعد وتجهيز كارت الـ QR لمسح الحضور.',
    recipientRole: 'STUDENT',
    tags: ['{student_name}', '{group_name}', '{hall_name}', '{session_time}']
  },
  {
    id: 'rule-grades',
    title: 'إشعار درجات الامتحان والواجبات (Exam Results & Report)',
    category: 'EXAM_GRADES',
    description: 'إرسال تقرير فوري بنتيجة الاختبار الشهري ودرجة الواجب فور اعتمادها من المعلم في النظام.',
    enabled: true,
    triggerDelay: 5,
    triggerUnit: 'MINUTES',
    templateText: 'يسعدنا إبلاغكم بأن الطالب {student_name} حصل على درجة {exam_score} في امتحان {group_name}. نشكر مجهوده ونتمنى له دوام التفوق!',
    recipientRole: 'PARENT',
    tags: ['{student_name}', '{parent_name}', '{group_name}', '{exam_score}']
  },
  {
    id: 'rule-treasury',
    title: 'إشعار إيداعات الخزنة الكبرى للمدير (Treasury Inflow Alert)',
    category: 'TREASURY_ALERT',
    description: 'إشعار واتساب للمدير العام فور تسجيل إيداع مالي أو سداد يتجاوز 1,000 ج.م في الخزنة المركزية.',
    enabled: false,
    triggerDelay: 0,
    triggerUnit: 'MINUTES',
    templateText: 'تنبيه الخزنة: تم تسجيل حركة إيداع جديدة بقيمة {amount} ج.م بواسطة المحاسب. الرصيد الحالي للخزنة: {treasury_balance} ج.م.',
    recipientRole: 'ADMIN',
    tags: ['{amount}', '{treasury_balance}', '{accountant_name}']
  }
];

export default function VisualAutomationBuilder() {
  const [rules, setRules] = useState<VisualAutomationRule[]>(() => {
    try {
      const stored = localStorage.getItem('educenter_whatsapp_rules_v1');
      return stored ? JSON.parse(stored) : DEFAULT_AUTOMATION_RULES;
    } catch {
      return DEFAULT_AUTOMATION_RULES;
    }
  });

  const [activeRuleId, setActiveRuleId] = useState<string>(rules[0]?.id || 'rule-absence');
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>('01012345678');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRule = rules.find((r) => r.id === activeRuleId) || rules[0];

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdateActiveRule = (updates: Partial<VisualAutomationRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === activeRuleId ? { ...r, ...updates } : r))
    );
  };

  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeRule.templateText;
    const updated = text.substring(0, start) + ' ' + tag + ' ' + text.substring(end);
    handleUpdateActiveRule({ templateText: updated });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 50);
  };

  const handleSaveRules = () => {
    try {
      localStorage.setItem('educenter_whatsapp_rules_v1', JSON.stringify(rules));
      setSaveToast('تم حفظ قواعد الأوتوميشن وقوالب الواتساب بنجاح!');
      setTimeout(() => setSaveToast(null), 3500);
    } catch {
      setSaveToast('حدث خطأ أثناء حفظ القواعد');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('هل تريد استعادة جميع قوالب وقواعد الواتساب الافتراضية؟')) {
      setRules(DEFAULT_AUTOMATION_RULES);
      localStorage.setItem('educenter_whatsapp_rules_v1', JSON.stringify(DEFAULT_AUTOMATION_RULES));
      setSaveToast('تمت استعادة الإعدادات الافتراضية بنجاح.');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Preview data dictionary for real-time smartphone rendering
  const sampleData: Record<string, string> = {
    '{student_name}': 'أحمد محمود رضوان',
    '{parent_name}': 'أ. محمود رضوان',
    '{group_name}': 'فيزياء الصف الثالث الثانوي (متقدم)',
    '{session_time}': '4:30 مساءً',
    '{amount}': '350',
    '{due_date}': '2026/10/25',
    '{hall_name}': 'قاعة ابن الهيثم (1)',
    '{exam_score}': '48 من 50 (ممتاز)',
    '{treasury_balance}': '84,650',
    '{accountant_name}': 'طارق الشافعي'
  };

  const getSimulatedMessage = (template: string) => {
    let result = template;
    for (const [tag, val] of Object.entries(sampleData)) {
      result = result.replaceAll(tag, val);
    }
    return result;
  };

  const simulatedText = getSimulatedMessage(activeRule.templateText);
  const testWaUrl = generateWhatsAppUrl(testPhoneNumber, simulatedText);

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-3.5 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>محرر الأوتوميشن وقوالب الواتساب بدون أكواد (Visual No-Code Builder)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              أوتوميشن ورسائل الواتساب التلقائية (WhatsApp Automation)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تحكم كامل في إرسال رسائل الواتساب الآلية لأولياء الأمور والطلاب، وتعديل النصوص ونقاط التفعيل، مع وسوم ديناميكية قابلة للنقر وشاشة محاكاة حية للهاتف الذكي.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>استعادة الافتراضي</span>
            </button>
            <button
              onClick={handleSaveRules}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات والتفعيل</span>
            </button>
          </div>
        </div>

        {saveToast && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Rules List, Center Visual Template Editor, Right Smartphone Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Rules Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>قواعد الأوتوميشن الخمسة:</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {rules.filter(r => r.enabled).length} مفعلة من {rules.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {rules.map((rule) => {
              const isActive = rule.id === activeRuleId;
              return (
                <div
                  key={rule.id}
                  onClick={() => setActiveRuleId(rule.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isActive
                      ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            rule.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <h4 className="text-xs font-bold text-white line-clamp-1">{rule.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRule(rule.id);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        rule.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                      title={rule.enabled ? 'تعطيل القاعدة' : 'تفعيل القاعدة'}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono">
                      التأخير: {rule.triggerDelay} {rule.triggerUnit === 'MINUTES' ? 'دقيقة' : rule.triggerUnit === 'HOURS' ? 'ساعة' : 'أيام'}
                    </span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                      المستلم: {rule.recipientRole === 'PARENT' ? 'ولي الأمر' : rule.recipientRole === 'STUDENT' ? 'الطالب' : 'الإدارة'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Template Editor & Clickable Placeholders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>محرر نص وقالب الرسالة: {activeRule.title.split('(')[0]}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                يمكنك كتابة أي نص وتضمين الوسوم بالضغط المباشر عليها
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                activeRule.enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {activeRule.enabled ? 'القاعدة مفعلة' : 'القاعدة معطلة'}
            </span>
          </div>

          {/* Timing & Trigger Controls */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                وقت الإرسال بعد الحدث:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={activeRule.triggerDelay}
                  onChange={(e) => handleUpdateActiveRule({ triggerDelay: Number(e.target.value) || 0 })}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono text-center focus:ring-1 focus:ring-emerald-500"
                />
                <select
                  value={activeRule.triggerUnit}
                  onChange={(e) => handleUpdateActiveRule({ triggerUnit: e.target.value as any })}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="MINUTES">دقيقة</option>
                  <option value="HOURS">ساعة</option>
                  <option value="DAYS">أيام</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                المستلم المستهدف:
              </label>
              <select
                value={activeRule.recipientRole}
                onChange={(e) => handleUpdateActiveRule({ recipientRole: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="PARENT">ولي أمر الطالب (WhatsApp)</option>
                <option value="STUDENT">الطالب شخصياً</option>
                <option value="TEACHER">المدرس المسؤول</option>
                <option value="ADMIN">المدير العام (إشعار إداري)</option>
              </select>
            </div>
          </div>

          {/* Clickable Placeholder Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>اضغط لإدراج وسم تلقائي في النص (Dynamic Placeholders):</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeRule.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="انقر لإدراج هذا الوسم في مكان المؤشر"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Template Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>نص الرسالة:</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeRule.templateText.length} حرف
              </span>
            </label>
            <textarea
              ref={textareaRef}
              rows={6}
              value={activeRule.templateText}
              onChange={(e) => handleUpdateActiveRule({ templateText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-['Cairo',sans-serif]"
              placeholder="اكتب قالب رسالة الواتساب هنا..."
            />
          </div>

          {/* Test WhatsApp Direct Send */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 block">
              اختبار إرسال تجريبي عبر الواتساب (Live Test via wa.me):
            </span>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="01012345678"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500"
              />
              <a
                href={testWaUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال تجريبي</span>
              </a>
            </div>
          </div>

        </div>

        {/* Column 3: Live WhatsApp Smartphone Simulator (3 cols) */}
        <div className="lg:col-span-3 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>محاكاة شاشة الواتساب الحية</span>
          </div>

          {/* Realistic Smartphone Shell */}
          <div className="w-full max-w-[280px] bg-slate-950 border-4 border-slate-800 rounded-[38px] p-2.5 shadow-2xl shadow-emerald-950/30 relative">
            {/* Camera notch */}
            <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
            </div>

            {/* WhatsApp App Mock Header */}
            <div className="bg-[#075E54] text-white p-2.5 rounded-t-2xl flex items-center justify-between shadow">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-300 text-slate-900 font-bold flex items-center justify-center text-[10px]">
                  سنتر
                </div>
                <div>
                  <div className="text-[11px] font-bold leading-tight">سنتر الأوائل الذكي</div>
                  <div className="text-[8px] text-emerald-200">متصل الآن (Online)</div>
                </div>
              </div>
            </div>

            {/* Chat Area Wallpaper */}
            <div className="bg-[#0b141a] p-3 min-h-[340px] max-h-[380px] rounded-b-2xl overflow-y-auto flex flex-col justify-end space-y-2 border border-slate-900">
              
              {/* Security Banner */}
              <div className="bg-[#182229] border border-amber-500/20 rounded-lg p-1.5 text-center text-[9px] text-amber-200/90 leading-tight">
                🔒 الرسائل مشفرة تماماً بين الطرفين (End-to-End)
              </div>

              {/* Chat Bubble (Incoming to parent/student) */}
              <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none shadow-md space-y-2 max-w-[92%] self-start text-right">
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-['Cairo',sans-serif]">
                  {simulatedText}
                </p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 font-mono">
                  <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              </div>

            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-3 max-w-[240px]">
            * هكذا تظهر الرسالة تماماً على هاتف ولي الأمر فور إطلاق التنبيه التلقائي.
          </p>
        </div>

      </div>

    </div>
  );
}
