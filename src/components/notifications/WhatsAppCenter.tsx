import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckSquare,
  Square,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Search,
  Filter,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  ExternalLink,
  Smartphone,
  CheckCheck,
  ShieldCheck,
  Sliders,
  X,
  Save,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { normalizePhoneNumber, generateWhatsAppUrl } from '../../lib/scheduler-engine';

export interface QueuedWhatsAppMessage {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  phone: string;
  type: 'ABSENCE' | 'OVERDUE_PAYMENT' | 'CLASS_CANCEL' | 'SCHEDULE_CHANGE' | 'EXAM_GRADE';
  title: string;
  messageText: string;
  queuedAt: string;
  status: 'PENDING_APPROVAL' | 'SENT' | 'DISCARDED';
}

export interface AutomationRuleItem {
  id: string;
  title: string;
  category: string;
  enabled: boolean;
  description: string;
  template: string;
  tags: string[];
}

const INITIAL_QUEUE: QueuedWhatsAppMessage[] = [
  {
    id: 'msg-01',
    studentId: 'std-101',
    studentName: 'يوسف أحمد الشناوي',
    parentName: 'أحمد الشناوي',
    phone: '01019283741',
    type: 'ABSENCE',
    title: 'غياب عن حصة الفيزياء',
    messageText: 'عزيزي ولي أمر الطالب يوسف أحمد الشناوي، نحيطكم علماً بتغيب الطالب عن موعد حصة الفيزياء اليوم الساعة 4:30 م. يرجى الاطمئنان عليه والتواصل مع إدارة السنتر.',
    queuedAt: 'اليوم، 04:45 م',
    status: 'PENDING_APPROVAL'
  },
  {
    id: 'msg-02',
    studentId: 'std-102',
    studentName: 'مريم طارق العوضي',
    parentName: 'طارق العوضي',
    phone: '01224567890',
    type: 'OVERDUE_PAYMENT',
    title: 'تذكير بمصروفات متأخرة',
    messageText: 'مرحباً أستاذ طارق العوضي، نود تذكيركم بلطف بأن اشتراك الطالبة مريم طارق لمجموعة الكيمياء بمبلغ 350 ج.م مستحق منذ 2026/10/22. شاكرين تعاونكم المستمر.',
    queuedAt: 'اليوم، 03:15 م',
    status: 'PENDING_APPROVAL'
  },
  {
    id: 'msg-03',
    studentId: 'std-103',
    studentName: 'عمر خالد المنشاوي',
    parentName: 'خالد المنشاوي',
    phone: '01098765432',
    type: 'CLASS_CANCEL',
    title: 'تأجيل حصة الرياضيات',
    messageText: 'تنويه هام: تم تأجيل حصة الرياضيات المقررة غداً للأستاذ محمود رضوان إلى يوم الخميس الساعة 5:00 م نظراً لظرف طارئ. نعتذر عن أي إزعاج.',
    queuedAt: 'اليوم، 02:20 م',
    status: 'PENDING_APPROVAL'
  },
  {
    id: 'msg-04',
    studentId: 'std-104',
    studentName: 'نور الهدى إبراهيم',
    parentName: 'إبراهيم منصور',
    phone: '01511223344',
    type: 'EXAM_GRADE',
    title: 'نتيجة الاختبار الشهري',
    messageText: 'يسعدنا إبلاغكم بأن الطالبة نور الهدى إبراهيم حصلت على 49 من 50 (ممتاز) في امتحان الأحياء الشهري. نشكر مجهودها ونتمنى لها دوام التفوق!',
    queuedAt: 'اليوم، 01:10 م',
    status: 'PENDING_APPROVAL'
  },
  {
    id: 'msg-05',
    studentId: 'std-105',
    studentName: 'كريم وائل الصاوي',
    parentName: 'وائل الصاوي',
    phone: '01123456789',
    type: 'OVERDUE_PAYMENT',
    title: 'سداد رسوم الحصص',
    messageText: 'عزيزي ولي أمر الطالب كريم وائل، يرجى تسوية رسوم حصص المراجعة النهائية بمبلغ 200 ج.م لاستلام كارت الامتحان.',
    queuedAt: 'أمس، 06:00 م',
    status: 'PENDING_APPROVAL'
  }
];

const INITIAL_RULES: AutomationRuleItem[] = [
  {
    id: 'rule-absence',
    title: 'تنبيه الغياب اللحظي (Absence Alert)',
    category: 'ABSENCE',
    enabled: true,
    description: 'يجهز رسالة تلقائية في طابور المراجعة بعد مرور 15 دقيقة من بدء الحصة دون مسح كود الـ QR.',
    template: 'عزيزي ولي أمر الطالب {student_name}، نحيطكم علماً بتغيب الطالب عن موعد حصة {course_name} المقررة اليوم في تمام الساعة {time}.',
    tags: ['{student_name}', '{parent_name}', '{course_name}', '{time}']
  },
  {
    id: 'rule-overdue',
    title: 'تذكير المصروفات المتأخرة (Fee Reminder)',
    category: 'OVERDUE_PAYMENT',
    enabled: true,
    description: 'تنبيه يوضع في طابور المراجعة عند تجاوز موعد سداد الاشتراك بـ 3 أيام.',
    template: 'مرحباً أستاذ {parent_name}، نود تذكيركم بلطف بأن اشتراك الطالب {student_name} لمجموعة {course_name} بمبلغ {amount} ج.م مستحق منذ تاريخ {due_date}.',
    tags: ['{student_name}', '{parent_name}', '{course_name}', '{amount}', '{due_date}']
  },
  {
    id: 'rule-cancel',
    title: 'إشعار إلغاء أو تأجيل حصة (Class Reschedule)',
    category: 'CLASS_CANCEL',
    enabled: true,
    description: 'إشعار فوري لجميع طلاب ومجموعات المعلم عند حدوث أي تعديل في الجدول.',
    template: 'تنويه هام: تم تأجيل حصة {course_name} المقررة اليوم إلى موعد {time} في {hall_name}. نعتذر عن أي إزعاج.',
    tags: ['{student_name}', '{course_name}', '{time}', '{hall_name}']
  }
];

export default function WhatsAppCenter() {
  const [activeTab, setActiveTab] = useState<'queue' | 'rules'>('queue');
  
  // Queue state
  const [queue, setQueue] = useState<QueuedWhatsAppMessage[]>(() => {
    try {
      const stored = localStorage.getItem('educenter_whatsapp_queue_v1');
      return stored ? JSON.parse(stored) : INITIAL_QUEUE;
    } catch {
      return INITIAL_QUEUE;
    }
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Message modal state
  const [editingMessage, setEditingMessage] = useState<QueuedWhatsAppMessage | null>(null);

  // Rules state
  const [rules, setRules] = useState<AutomationRuleItem[]>(() => {
    try {
      const stored = localStorage.getItem('educenter_whatsapp_rules_v2');
      return stored ? JSON.parse(stored) : INITIAL_RULES;
    } catch {
      return INITIAL_RULES;
    }
  });

  const [isNewRuleModalOpen, setIsNewRuleModalOpen] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('GENERAL');
  const [newRuleTemplate, setNewRuleTemplate] = useState('');

  // Persist queue
  useEffect(() => {
    try {
      localStorage.setItem('educenter_whatsapp_queue_v1', JSON.stringify(queue));
    } catch (e) {
      console.error(e);
    }
  }, [queue]);

  // Persist rules
  useEffect(() => {
    try {
      localStorage.setItem('educenter_whatsapp_rules_v2', JSON.stringify(rules));
    } catch (e) {
      console.error(e);
    }
  }, [rules]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered queue items
  const filteredQueue = queue.filter((item) => {
    const matchesFilter = filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      item.studentName.includes(searchQuery) ||
      item.parentName.includes(searchQuery) ||
      item.phone.includes(searchQuery) ||
      item.messageText.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = queue.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const isAllSelected = filteredQueue.length > 0 && filteredQueue.every((q) => selectedIds.includes(q.id));

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQueue.map((q) => q.id));
    }
  };

  // Bulk send approval
  const handleBulkApproveAndSend = () => {
    if (selectedIds.length === 0) {
      showToast('يرجى تحديد رسالة واحدة على الأقل للمراجعة والإرسال');
      return;
    }

    const count = selectedIds.length;
    setQueue((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id) ? { ...item, status: 'SENT' } : item
      )
    );
    setSelectedIds([]);
    showToast(`تم اعتماد وإرسال (${count}) رسالة واتساب بنجاح إلى أولياء الأمور!`);
  };

  // Discard single message from queue
  const handleDiscardMessage = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    showToast('تم حذف الرسالة من طابور الانتظار');
  };

  // Save edited message text
  const handleSaveEditedMessage = () => {
    if (!editingMessage) return;
    setQueue((prev) =>
      prev.map((q) => (q.id === editingMessage.id ? editingMessage : q))
    );
    setEditingMessage(null);
    showToast('تم تعديل نص الرسالة بنجاح في طابور الانتظار');
  };

  // Rule operations (Add & Delete)
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim() || !newRuleTemplate.trim()) return;

    const newRule: AutomationRuleItem = {
      id: `rule-${Date.now()}`,
      title: newRuleTitle,
      category: newRuleCategory,
      enabled: true,
      description: 'تنبيه أوتوميشن مخصص من المدير العام.',
      template: newRuleTemplate,
      tags: ['{student_name}', '{parent_name}', '{amount}', '{time}']
    };

    setRules((prev) => [...prev, newRule]);
    setIsNewRuleModalOpen(false);
    setNewRuleTitle('');
    setNewRuleTemplate('');
    showToast(`تمت إضافة التنبيه الجديد [${newRule.title}] بنجاح`);
  };

  const handleDeleteRule = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف تنبيه "${title}" بالكامل؟`)) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast('تم حذف التنبيه بنجاح');
    }
  };

  const handleToggleRuleStatus = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const getTypeBadge = (type: QueuedWhatsAppMessage['type']) => {
    switch (type) {
      case 'ABSENCE':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">تنبيه غياب</span>;
      case 'OVERDUE_PAYMENT':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">تذكير مصروفات</span>;
      case 'CLASS_CANCEL':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">تأجيل / إلغاء حصة</span>;
      case 'EXAM_GRADE':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">نتيجة اختبار</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">إشعار عام</span>;
    }
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-3.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام المراجعة اليدوية والأوتوميشن بدون أكواد (Admin WhatsApp Center)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              رسائل وأوتوميشن الواتساب المعتمدة للمدير
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تحكم يدوي كامل: لا تُرسل أي رسالة تلقائياً قبل مراجعتها وتأكيدها بمربعات الاختيار. يمكنك تحديد المستلمين، تعديل النص، وإرسال الرسائل بضغطة زر واحدة بكل ثقة وسهولة.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-center min-w-[120px]">
              <span className="text-[10px] text-slate-400 block font-semibold">بانتظار الاعتماد</span>
              <span className="text-xl font-mono font-bold text-amber-400">{pendingCount} رسائل</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-center min-w-[120px]">
              <span className="text-[10px] text-slate-400 block font-semibold">المحددة للإرسال</span>
              <span className="text-xl font-mono font-bold text-emerald-400">{selectedIds.length} مستلم</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>طابور المراجعة اليدوية والاعتماد ({pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>محرر التنبيهات البسيط (بدون أكواد)</span>
            </button>
          </div>

          {activeTab === 'queue' && (
            <button
              onClick={handleBulkApproveAndSend}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الرسائل المحددة ({selectedIds.length})</span>
            </button>
          )}

          {activeTab === 'rules' && (
            <button
              onClick={() => setIsNewRuleModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة تنبيه جديد</span>
            </button>
          )}
        </div>

        {toastMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Manual Approval Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          
          {/* Queue Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد كل المعروض'}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setFilterType('ABSENCE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'ABSENCE' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الغياب
                </button>
                <button
                  onClick={() => setFilterType('OVERDUE_PAYMENT')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'OVERDUE_PAYMENT' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  المصروفات
                </button>
                <button
                  onClick={() => setFilterType('CLASS_CANCEL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'CLASS_CANCEL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  تأجيل الحصص
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Messages Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">اختيار</th>
                    <th className="p-3">الطالب وولي الأمر</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">نوع التنبيه</th>
                    <th className="p-3">نص الرسالة المعتمد</th>
                    <th className="p-3">حالة الإرسال</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        لا توجد رسائل معلقة في طابور المراجعة حالياً.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      const isSent = item.status === 'SENT';
                      const waUrl = generateWhatsAppUrl(item.phone, item.messageText);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-950/40 transition-colors ${
                            isSelected ? 'bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(item.id)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-white block">{item.studentName}</span>
                            <span className="text-[11px] text-slate-400">ولي الأمر: {item.parentName}</span>
                          </td>

                          <td className="p-3 font-mono text-slate-300">
                            {item.phone}
                          </td>

                          <td className="p-3">
                            {getTypeBadge(item.type)}
                          </td>

                          <td className="p-3 max-w-md">
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {item.messageText}
                            </p>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {isSent ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>تم الاعتماد والإرسال</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>بانتظار موافقة المدير</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingMessage(item)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                title="تعديل نص الرسالة قبل الإرسال"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                                title="إرسال مباشر عبر واتساب ويب / التطبيق"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => handleDiscardMessage(item.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                title="حذف من الطابور دون إرسال"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Queue Footer */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                <span>إجمالي الرسائل في الطابور: <strong>{filteredQueue.length}</strong></span>
                <span className="mx-2">•</span>
                <span>المحددة حالياً: <strong className="text-emerald-400">{selectedIds.length}</strong></span>
              </div>
              
              <button
                onClick={handleBulkApproveAndSend}
                disabled={selectedIds.length === 0}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال الرسائل المحددة ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Visual No-Code Rules Builder */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  rule.enabled
                    ? 'bg-slate-900 border-slate-800 shadow-lg'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                      {rule.category}
                    </span>

                    {/* Toggle Switch */}
                    <div
                      onClick={() => handleToggleRuleStatus(rule.id)}
                      className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        rule.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                      title={rule.enabled ? 'إيقاف هذا التنبيه' : 'تفعيل هذا التنبيه'}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{rule.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{rule.description}</p>
                  </div>

                  {/* Template Text Preview */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-['Cairo',sans-serif]">
                    {rule.template}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className={`text-[10px] font-bold ${rule.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {rule.enabled ? 'مفعل ويضخ في طابور الاعتماد' : 'متوقف حالياً'}
                  </span>

                  <button
                    onClick={() => handleDeleteRule(rule.id, rule.title)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="حذف هذا التنبيه نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">تعديل نص الرسالة قبل الإرسال</h3>
              </div>
              <button onClick={() => setEditingMessage(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">المستلم:</span>
                  <span className="text-white font-bold">{editingMessage.parentName} (ولي أمر {editingMessage.studentName})</span>
                </div>
                <div className="text-left font-mono text-emerald-400">{editingMessage.phone}</div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">نص رسالة الواتساب:</label>
                <textarea
                  rows={5}
                  value={editingMessage.messageText}
                  onChange={(e) => setEditingMessage({ ...editingMessage, messageText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-white leading-relaxed focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveEditedMessage}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديل في الطابور</span>
              </button>
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Rule Modal */}
      {isNewRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddRule} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">إضافة تنبيه أوتوميشن جديد (No-Code)</h3>
              </div>
              <button type="button" onClick={() => setIsNewRuleModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">عنوان التنبيه:</label>
                <input
                  type="text"
                  placeholder="مثلاً: تنبيه درجات الكويز الأسبوعي"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">التصنيف:</label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="GENERAL">إشعار عام</option>
                  <option value="ABSENCE">غياب وحضور</option>
                  <option value="FINANCE">مصروفات واشتراكات</option>
                  <option value="SCHEDULE">تأجيل وتعديل مواعيد</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">نص قالب الرسالة:</label>
                <textarea
                  rows={4}
                  placeholder="اكتب نص الرسالة هنا مع استخدام وسوم مثل {student_name} و {course_name}"
                  value={newRuleTemplate}
                  onChange={(e) => setNewRuleTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white leading-relaxed focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Tag Badges */}
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">اضغط لإدراج وسم:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {['{student_name}', '{parent_name}', '{course_name}', '{amount}', '{time}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewRuleTemplate(prev => prev + ' ' + tag)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                تأكيد وإضافة التنبيه
              </button>
              <button
                type="button"
                onClick={() => setIsNewRuleModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
