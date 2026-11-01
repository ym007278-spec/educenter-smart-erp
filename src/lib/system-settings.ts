/**
 * EduCenter Smart ERP - System & Admin Settings State Management
 * Persists center identity, module toggles, discount rules, and system configurations with reactive event broadcasting.
 */

export type SystemModuleKey =
  | 'dashboard'
  | 'student360'
  | 'attendance'
  | 'finance'
  | 'analytics'
  | 'teachers'
  | 'payroll'
  | 'automation'
  | 'scheduler'
  | 'backup'
  | 'audit'
  | 'roles'
  | 'backend'
  | 'database';

export interface StudentDiscountRule {
  id: string;
  title: string;
  percent: number;
  description: string;
  active: boolean;
}

export interface SystemSettingsConfig {
  centerName: string;
  currency: string;
  centerPhone: string;
  defaultTeacherSplit: number;
  gracePeriodMinutes: number;
  autoMarkAbsent: boolean;
  autoSubmitAttendance: boolean;
  taxRatePercent: number;
  receiptFooterNote: string;
  requireManualApprovalForWhatsApp: boolean;
  superAdminPasscode: string;
  studentDiscounts: StudentDiscountRule[];
  enabledModules: Record<SystemModuleKey, boolean>;
}

export const DEFAULT_DISCOUNT_RULES: StudentDiscountRule[] = [
  {
    id: 'disc-sibling',
    title: 'خصم الأشقاء والإخوة (Sibling Discount)',
    percent: 15,
    description: 'يطبق تلقائياً للأخ الثاني أو الثالث المسجل في السنتر لتشجيع العائلات.',
    active: true
  },
  {
    id: 'disc-top-rank',
    title: 'منحة المتفوقين دراسياً (Top Achiever)',
    percent: 25,
    description: 'للطلاب الحاصلين على المركز الأول أو الثاني في الامتحانات الدورية.',
    active: true
  },
  {
    id: 'disc-humanitarian',
    title: 'إعفاء أبناء الشهداء والأيتام والحالات الخاصة',
    percent: 50,
    description: 'مساهمة اجتماعية وتيسيراً على الأسر الأكثر استحقاقاً.',
    active: true
  },
  {
    id: 'disc-early-term',
    title: 'خصم السداد المبكر للفصل الدراسي كاملاً',
    percent: 10,
    description: 'عند تسديد اشتراك الفصل الدراسي مقدماً خلال أول أسبوع.',
    active: true
  }
];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsConfig = {
  centerName: 'سنتر الأوائل التعليمي الذكي',
  currency: 'ج.م',
  centerPhone: '01001234567',
  defaultTeacherSplit: 70,
  gracePeriodMinutes: 15,
  autoMarkAbsent: true,
  autoSubmitAttendance: false,
  taxRatePercent: 0,
  receiptFooterNote: 'شكراً لتعاملكم مع سنتر الأوائل - يرجى الاحتفاظ بالإيصال',
  requireManualApprovalForWhatsApp: true,
  superAdminPasscode: 'admin2026',
  studentDiscounts: DEFAULT_DISCOUNT_RULES,
  enabledModules: {
    dashboard: true,
    student360: true,
    attendance: true,
    finance: true,
    analytics: true,
    teachers: true,
    payroll: true,
    automation: true,
    scheduler: true,
    backup: true,
    audit: true,
    roles: true,
    backend: false, // Hidden by default for clean admin UX
    database: false  // Hidden by default for clean admin UX
  }
};

const STORAGE_KEY = 'educenter_system_settings_v1';
const SETTINGS_EVENT = 'educenter_settings_updated';

export const systemSettingsManager = {
  getSettings(): SystemSettingsConfig {
    if (typeof window === 'undefined') return DEFAULT_SYSTEM_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_SYSTEM_SETTINGS;
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...parsed,
        studentDiscounts: parsed.studentDiscounts || DEFAULT_DISCOUNT_RULES,
        enabledModules: {
          ...DEFAULT_SYSTEM_SETTINGS.enabledModules,
          ...(parsed.enabledModules || {})
        }
      };
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },

  saveSettings(newSettings: Partial<SystemSettingsConfig>): SystemSettingsConfig {
    const current = this.getSettings();
    const updated: SystemSettingsConfig = {
      ...current,
      ...newSettings,
      enabledModules: {
        ...current.enabledModules,
        ...(newSettings.enabledModules || {})
      }
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: updated }));
    }
    return updated;
  },

  toggleModule(moduleKey: SystemModuleKey, enabled: boolean): SystemSettingsConfig {
    const current = this.getSettings();
    const updated = {
      ...current,
      enabledModules: {
        ...current.enabledModules,
        [moduleKey]: enabled
      }
    };
    return this.saveSettings(updated);
  },

  // Discount rule operations for Super Admin
  addDiscountRule(rule: Omit<StudentDiscountRule, 'id'>): SystemSettingsConfig {
    const current = this.getSettings();
    const newRule: StudentDiscountRule = {
      ...rule,
      id: `disc-${Date.now()}`
    };
    const updated = {
      ...current,
      studentDiscounts: [...current.studentDiscounts, newRule]
    };
    return this.saveSettings(updated);
  },

  updateDiscountRule(id: string, updates: Partial<StudentDiscountRule>): SystemSettingsConfig {
    const current = this.getSettings();
    const updated = {
      ...current,
      studentDiscounts: current.studentDiscounts.map(r => r.id === id ? { ...r, ...updates } : r)
    };
    return this.saveSettings(updated);
  },

  deleteDiscountRule(id: string): SystemSettingsConfig {
    const current = this.getSettings();
    const updated = {
      ...current,
      studentDiscounts: current.studentDiscounts.filter(r => r.id !== id)
    };
    return this.saveSettings(updated);
  },

  resetToDefaults(): SystemSettingsConfig {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: DEFAULT_SYSTEM_SETTINGS }));
    }
    return DEFAULT_SYSTEM_SETTINGS;
  },

  subscribe(callback: (settings: SystemSettingsConfig) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SystemSettingsConfig>;
      callback(customEvent.detail || this.getSettings());
    };
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }
};
