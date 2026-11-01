import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  DollarSign,
  AlertTriangle,
  Send,
  ShieldAlert,
  Settings,
  X,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
  Users,
  Building2,
  Trash2,
  Filter,
  ArrowRight
} from 'lucide-react';

export type NotificationCategory = 'TEACHER_DELAY' | 'WHATSAPP_ABSENCE' | 'LOW_TREASURY' | 'SECURITY';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  metadata?: {
    teacherName?: string;
    lateMinutes?: number;
    studentName?: string;
    parentPhone?: string;
    treasuryBalance?: number;
    threshold?: number;
  };
}

export interface NotificationSettings {
  autoSendWhatsAppOnAbsence: boolean;
  treasuryLowThreshold: number;
  teacherDelayGraceMinutes: number;
  soundAlertsEnabled: boolean;
  notifyOnSecurityTamper: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    category: 'TEACHER_DELAY',
    title: 'تأخر مدرس عن موعد بدء الحصة',
    description: 'أ. محمد عبد المنعم تأخر 18 دقيقة عن موعد مجموعة (الصف الثالث الثانوي - أوائل الفيزياء). تم تفعيل احتساب دقائق التأخير آلياً.',
    timestamp: 'منذ 10 دقائق',
    isRead: false,
    severity: 'WARNING',
    metadata: {
      teacherName: 'أ. محمد عبد المنعم',
      lateMinutes: 18
    }
  },
  {
    id: 'notif-02',
    category: 'WHATSAPP_ABSENCE',
    title: 'إرسال تنبيه غياب تلقائي لولي الأمر (WhatsApp API)',
    description: 'تم تسليم رسالة واتساب رسمية لولي أمر الطالب (مريم طارق الشريف) على الرقم 01155667788 بعد مرور 15 دقيقة من موعد الحصة.',
    timestamp: 'منذ 25 دقيقة',
    isRead: false,
    severity: 'INFO',
    metadata: {
      studentName: 'مريم طارق الشريف',
      parentPhone: '01155667788'
    }
  },
  {
    id: 'notif-03',
    category: 'LOW_TREASURY',
    title: 'تنبيه اقتراب رصيد الخزنة من الحد الأدنى',
    description: 'رصيد الخزنة المركزية الحالي (48,500 ج.م) يقترب من حد صرف رواتب نهاية الشهر (المستهدف: 50,000 ج.م). يرجى تسريع تحصيل الاشتراكات.',
    timestamp: 'منذ ساعة',
    isRead: false,
    severity: 'CRITICAL',
    metadata: {
      treasuryBalance: 48500,
      threshold: 50000
    }
  },
  {
    id: 'notif-04',
    category: 'SECURITY',
    title: 'رصد محاولة مسح كود QR غير صالح (HMAC Stamp)',
    description: 'رفضت نقطة الماسح الضوئي مسح كود طالب مجهول الهوية بسبب فشل مطابقة الختم الرقمي (Tampered QR Blocked).',
    timestamp: 'منذ ساعتين',
    isRead: true,
    severity: 'CRITICAL'
  }
];

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<'ALL' | NotificationCategory>('ALL');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<NotificationSettings>({
    autoSendWhatsAppOnAbsence: true,
    treasuryLowThreshold: 30000,
    teacherDelayGraceMinutes: 15,
    soundAlertsEnabled: true,
    notifyOnSecurityTamper: true
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'ALL') return true;
    return n.category === activeFilter;
  });

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Live Simulation: Trigger a New Live Alert
  const simulateLiveAlert = (category: NotificationCategory) => {
    let newAlert: AppNotification;
    const now = 'الآن';

    if (category === 'TEACHER_DELAY') {
      newAlert = {
        id: 'notif-' + Date.now(),
        category: 'TEACHER_DELAY',
        title: 'تنبيه لحظي: تأخر معلم',
        description: 'أ. طارق الشناوي تأخر 22 دقيقة عن بدء حصة الرياضيات. تم قيد التأخير في سجلات الرواتب.',
        timestamp: now,
        isRead: false,
        severity: 'WARNING',
        metadata: { teacherName: 'أ. طارق الشناوي', lateMinutes: 22 }
      };
    } else if (category === 'WHATSAPP_ABSENCE') {
      newAlert = {
        id: 'notif-' + Date.now(),
        category: 'WHATSAPP_ABSENCE',
        title: 'تم إرسال إشعار غياب لولي الأمر',
        description: 'تم إرسال رسالة واتساب بنجاح لولي أمر الطالب (يوسف حسام الدين) لإبلاغه بغياب الطالب اليوم.',
        timestamp: now,
        isRead: false,
        severity: 'INFO',
        metadata: { studentName: 'يوسف حسام الدين', parentPhone: '01223344556' }
      };
    } else {
      newAlert = {
        id: 'notif-' + Date.now(),
        category: 'LOW_TREASURY',
        title: 'تنبيه عاجل: انخفاض رصيد الخزنة',
        description: 'رصيد الخزنة انخفض عن حد الأمان الموصى به. يرجى مراجعة حركة الوارد والمنصرف.',
        timestamp: now,
        isRead: false,
        severity: 'CRITICAL',
        metadata: { treasuryBalance: 24000, threshold: settings.treasuryLowThreshold }
      };
    }

    setNotifications(prev => [newAlert, ...prev]);
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مركز العمليات والتنبيهات المباشرة (NotificationCenter)</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              مركز الإشعارات والتحكم في أوتوميشن التنبيهات
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              متابعة لحظية لكافة أحداث السنتر: تأخر المعلمين، رسائل الواتساب الآلية لأولياء الأمور، تنبيهات سيولة الخزنة، ومحاولات الأمان الرقمي.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>إعدادات التنبيهات</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>تحديد الكل كمقروء ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Simulation Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>محاكاة دفع تنبيهات حية للاختبار:</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => simulateLiveAlert('TEACHER_DELAY')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-amber-300 font-medium transition-colors"
          >
            + تنبيه تأخر معلم
          </button>
          <button
            onClick={() => simulateLiveAlert('WHATSAPP_ABSENCE')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-300 font-medium transition-colors"
          >
            + تنبيه غياب واتساب
          </button>
          <button
            onClick={() => simulateLiveAlert('LOW_TREASURY')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-rose-300 font-medium transition-colors"
          >
            + تنبيه انخفاض الخزنة
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>جميع التنبيهات ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('TEACHER_DELAY')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeFilter === 'TEACHER_DELAY'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>تأخر المدرسين</span>
        </button>

        <button
          onClick={() => setActiveFilter('WHATSAPP_ABSENCE')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeFilter === 'WHATSAPP_ABSENCE'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>إشعارات الواتساب</span>
        </button>

        <button
          onClick={() => setActiveFilter('LOW_TREASURY')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeFilter === 'LOW_TREASURY'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>الخزنة المركزية</span>
        </button>

        <button
          onClick={() => setActiveFilter('SECURITY')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeFilter === 'SECURITY'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>الأمان السيبراني</span>
        </button>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {filteredNotifications.map((notif) => {
          const isDelay = notif.category === 'TEACHER_DELAY';
          const isWhatsapp = notif.category === 'WHATSAPP_ABSENCE';
          const isTreasury = notif.category === 'LOW_TREASURY';
          const isSecurity = notif.category === 'SECURITY';

          return (
            <div
              key={notif.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 shadow-lg ${
                !notif.isRead
                  ? 'bg-slate-900/90 border-slate-700/80'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Category Icon */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    isDelay
                      ? 'bg-amber-500/10 text-amber-400'
                      : isWhatsapp
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : isTreasury
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  {isDelay && <Clock className="w-5 h-5" />}
                  {isWhatsapp && <MessageSquare className="w-5 h-5" />}
                  {isTreasury && <DollarSign className="w-5 h-5" />}
                  {isSecurity && <ShieldAlert className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        notif.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : notif.severity === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}
                    >
                      {notif.severity === 'CRITICAL' ? 'حرج' : notif.severity === 'WARNING' ? 'تنبيه' : 'معلوماتي'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{notif.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {notif.description}
                  </p>

                  {/* Metadata Tag */}
                  {notif.metadata && (
                    <div className="flex items-center gap-3 text-[11px] pt-1 text-slate-400 flex-wrap">
                      {notif.metadata.lateMinutes && (
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-amber-300 font-mono">
                          مدة التأخير: {notif.metadata.lateMinutes} دقيقة
                        </span>
                      )}
                      {notif.metadata.parentPhone && (
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-300 font-mono">
                          هاتف ولي الأمر: {notif.metadata.parentPhone}
                        </span>
                      )}
                      {notif.metadata.treasuryBalance && (
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-rose-300 font-mono">
                          الرصيد: {notif.metadata.treasuryBalance.toLocaleString()} ج.م
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!notif.isRead && (
                  <button
                    onClick={() => markSingleAsRead(notif.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="تحديد كمقروء"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                  title="حذف التنبيه"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">لا توجد تنبيهات في هذا القسم حالياً</h4>
            <p className="text-xs text-slate-500">كافة العمليات الحالية تسير بشكل طبيعي وبدون أي مشاكل.</p>
          </div>
        )}
      </div>

      {/* Settings Modal (زر التحكم في الإعدادات) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إعدادات أوتوميشن التنبيهات</h3>
                  <span className="text-[11px] text-slate-400">تخصيص قواعد وإشعارات السنتر</span>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Setting 1: WhatsApp Absence Auto Dispatch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">إرسال إشعارات الواتساب تلقائياً عند غياب الطالب</span>
                  <p className="text-[11px] text-slate-400">
                    استدعاء WhatsApp Cloud API تلقائياً فور بدء الحصة بـ 15 دقيقة لإخطار ولي الأمر.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSendWhatsAppOnAbsence}
                  onChange={(e) => setSettings({ ...settings, autoSendWhatsAppOnAbsence: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Setting 2: Treasury Threshold */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">حد أمان الخزنة المركزية (Low Treasury Alert):</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.treasuryLowThreshold.toLocaleString()} ج.م</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="100000"
                  step="5000"
                  value={settings.treasuryLowThreshold}
                  onChange={(e) => setSettings({ ...settings, treasuryLowThreshold: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  يتم إطلاق تنبيه حرج للمدير فور انخفاض رصيد الخزنة عن هذا الرقم لضمان تغطية الرواتب.
                </span>
              </div>

              {/* Setting 3: Teacher Delay Grace Period */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">مهلة سماح تأخر المعلم قبل تسجيل الجزاء:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.teacherDelayGraceMinutes} دقيقة</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={settings.teacherDelayGraceMinutes}
                  onChange={(e) => setSettings({ ...settings, teacherDelayGraceMinutes: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  إذا تجاوز تأخر المعلم هذه المدة، يتم احتساب خصم مالي آلي في مسير المرتبات.
                </span>
              </div>

              {/* Setting 4: Sound Alerts */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">التغذية الصوتية للتنبيهات الحرجة</span>
                  <p className="text-[11px] text-slate-400">إصدار نغمة تنبيه فورية عند ورود حدث حرج.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundAlertsEnabled}
                  onChange={(e) => setSettings({ ...settings, soundAlertsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
                />
              </div>

            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ وتطبيق الإعدادات</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
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
