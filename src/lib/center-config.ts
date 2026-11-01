/**
 * Center Configuration & Master Policy Store
 * Allows the Center Manager (Admin) to configure all operational, financial,
 * attendance, WhatsApp, payroll, and security policies dynamically across the ERP.
 */

export interface CenterIdentityConfig {
  centerName: string;
  tagline: string;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappOfficial: string;
  email: string;
  address: string;
  currency: string;
  receiptFooterNote: string;
}

export interface CenterFinancialConfig {
  defaultTeacherSplitPercent: number; // e.g. 70
  defaultCenterSplitPercent: number;  // e.g. 30
  defaultPerSessionPrice: number;     // e.g. 60 EGP
  defaultMonthlySubscription: number; // e.g. 350 EGP
  overdueGraceDays: number;           // e.g. 5 days
  maxCashOutWithoutApproval: number;  // e.g. 2000 EGP
  enforceZeroDeficit: boolean;        // prevent spending if balance is insufficient
  taxPercentage: number;              // e.g. 0% or 14%
}

export interface CenterAttendanceConfig {
  qrCodeExpirySeconds: number;        // e.g. 300 seconds for anti-replay
  lateArrivalGraceMinutes: number;    // e.g. 15 minutes before marked LATE
  allowDuplicateScansPerDay: boolean; // false = blocks duplicates
  enableSoundFeedback: boolean;       // Web Audio feedback
  autoSubmitOnValidScan: boolean;     // auto post to /api/attendance
  hmacMasterSecret: string;
  studentDerivationSalt: string;
}

export interface CenterWhatsAutomationConfig {
  autoAlertOnAbsence: boolean;
  autoPaymentReminder: boolean;
  minOverdueDaysToRemind: number;     // e.g. 7 days
  dailyDispatchTime: string;          // e.g. "18:00"
  absenceTemplate: string;
  paymentReminderTemplate: string;
  attendanceWelcomeTemplate: string;
}

export interface CenterPayrollConfig {
  latePenaltyPerMinute: number;       // e.g. 1.5 EGP deducted per minute late
  monthlyPayday: number;              // day of month (e.g. 28)
  maxAdvancePercentOfSalary: number;  // e.g. 40%
  standardShiftHours: number;         // e.g. 8 hours
}

export interface CenterSecurityConfig {
  maxFailedLoginsBeforeLock: number;  // e.g. 5 attempts
  lockoutDurationSeconds: number;     // e.g. 60 seconds
  jwtSessionDurationHours: number;    // e.g. 12 hours
  strictAuditLogging: boolean;        // log all view/modify actions
  autoBackupFrequency: 'DAILY' | 'WEEKLY' | 'MANUAL';
}

export interface CenterModulesVisibilityConfig {
  attendance: boolean;
  qrGenerator: boolean;
  student360: boolean;
  teachers: boolean;
  payroll: boolean;
  finance: boolean;
  analytics: boolean;
  expenses: boolean;
  scheduler: boolean;
  notifications: boolean;
  audit: boolean;
  backup: boolean;
  roles: boolean;
  database: boolean;
  backend: boolean;
}

export interface CenterSystemConfig {
  identity: CenterIdentityConfig;
  financial: CenterFinancialConfig;
  attendance: CenterAttendanceConfig;
  whatsapp: CenterWhatsAutomationConfig;
  payroll: CenterPayrollConfig;
  security: CenterSecurityConfig;
  modules: CenterModulesVisibilityConfig;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_CENTER_CONFIG: CenterSystemConfig = {
  identity: {
    centerName: 'سنتر الأوائل التعليمي الذكي',
    tagline: 'منظومة إدارة المراكز والسناتر التعليمية المتكاملة',
    phonePrimary: '01012345678',
    phoneSecondary: '01198765432',
    whatsappOfficial: '01012345678',
    email: 'info@educenter-smart.com',
    address: 'القاهرة - مدينة نصر - تقاطع شارع عباس العقاد مع مصطفى النحاس',
    currency: 'ج.م',
    receiptFooterNote: 'شكراً لثقتكم بنا. الإيصال المعتمد صالح لمدة 30 يوماً من تاريخ الإصدار.'
  },
  financial: {
    defaultTeacherSplitPercent: 70,
    defaultCenterSplitPercent: 30,
    defaultPerSessionPrice: 60,
    defaultMonthlySubscription: 350,
    overdueGraceDays: 5,
    maxCashOutWithoutApproval: 2000,
    enforceZeroDeficit: true,
    taxPercentage: 0
  },
  attendance: {
    qrCodeExpirySeconds: 300,
    lateArrivalGraceMinutes: 15,
    allowDuplicateScansPerDay: false,
    enableSoundFeedback: true,
    autoSubmitOnValidScan: false,
    hmacMasterSecret: 'educenter_super_secure_enterprise_random_jwt_secret_key_2026_hardened',
    studentDerivationSalt: 'educenter_std_salt_2026'
  },
  whatsapp: {
    autoAlertOnAbsence: true,
    autoPaymentReminder: true,
    minOverdueDaysToRemind: 7,
    dailyDispatchTime: '18:00',
    absenceTemplate: 'عزيزي ولي أمر الطالب/ة {student_name}، نحيطكم علماً بغيابه/ا اليوم عن حصة {group_name}. نرجو المتابعة حرصاً على مستواه/ا الدراسي.',
    paymentReminderTemplate: 'عزيزي ولي أمر الطالب/ة {student_name}، نود تذكيركم بموعد سداد استحقاق {billing_period} بقيمة {amount} ج.م لمجموعة {group_name}. نشكر حسن تعاونكم.',
    attendanceWelcomeTemplate: 'تم تسجيل حضور الطالب/ة {student_name} بحصة {group_name} في تمام الساعة {check_in_time}. نتمنى له/ا يوماً دراسياً موفقاً.'
  },
  payroll: {
    latePenaltyPerMinute: 1.5,
    monthlyPayday: 28,
    maxAdvancePercentOfSalary: 40,
    standardShiftHours: 8
  },
  security: {
    maxFailedLoginsBeforeLock: 5,
    lockoutDurationSeconds: 60,
    jwtSessionDurationHours: 12,
    strictAuditLogging: true,
    autoBackupFrequency: 'DAILY'
  },
  modules: {
    attendance: true,
    qrGenerator: true,
    student360: true,
    teachers: true,
    payroll: true,
    finance: true,
    analytics: true,
    expenses: true,
    scheduler: true,
    notifications: true,
    audit: true,
    backup: true,
    roles: true,
    database: true,
    backend: true
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'المدير العام (System Initializer)'
};

const STORAGE_KEY = 'educenter_master_system_config_v2';
const listeners: Set<(config: CenterSystemConfig) => void> = new Set();
let inMemoryConfig: CenterSystemConfig = { ...DEFAULT_CENTER_CONFIG };

/**
 * Retrieves current active configuration with fallback to defaults
 */
export function getCenterConfig(): CenterSystemConfig {
  if (typeof window === 'undefined') return inMemoryConfig;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryConfig;
    const parsed = JSON.parse(raw);
    // Deep merge with defaults in case new fields were added
    const config: CenterSystemConfig = {
      identity: { ...DEFAULT_CENTER_CONFIG.identity, ...(parsed.identity || {}) },
      financial: { ...DEFAULT_CENTER_CONFIG.financial, ...(parsed.financial || {}) },
      attendance: { ...DEFAULT_CENTER_CONFIG.attendance, ...(parsed.attendance || {}) },
      whatsapp: { ...DEFAULT_CENTER_CONFIG.whatsapp, ...(parsed.whatsapp || {}) },
      payroll: { ...DEFAULT_CENTER_CONFIG.payroll, ...(parsed.payroll || {}) },
      security: { ...DEFAULT_CENTER_CONFIG.security, ...(parsed.security || {}) },
      modules: { ...DEFAULT_CENTER_CONFIG.modules, ...(parsed.modules || {}) },
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      updatedBy: parsed.updatedBy || 'المدير العام'
    };
    inMemoryConfig = config;
    return config;
  } catch {
    return inMemoryConfig;
  }
}

/**
 * Saves updated configuration partially or completely, notifying subscribers
 */
export function saveCenterConfig(
  updates: Partial<CenterSystemConfig>,
  updatedBy: string = 'المدير العام'
): CenterSystemConfig {
  const current = getCenterConfig();
  const merged: CenterSystemConfig = {
    identity: { ...current.identity, ...(updates.identity || {}) },
    financial: { ...current.financial, ...(updates.financial || {}) },
    attendance: { ...current.attendance, ...(updates.attendance || {}) },
    whatsapp: { ...current.whatsapp, ...(updates.whatsapp || {}) },
    payroll: { ...current.payroll, ...(updates.payroll || {}) },
    security: { ...current.security, ...(updates.security || {}) },
    modules: { ...current.modules, ...(updates.modules || {}) },
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  // Enforce consistent split percentage math
  if (updates.financial?.defaultTeacherSplitPercent !== undefined) {
    const teacherPercent = Math.max(0, Math.min(100, updates.financial.defaultTeacherSplitPercent));
    merged.financial.defaultTeacherSplitPercent = teacherPercent;
    merged.financial.defaultCenterSplitPercent = 100 - teacherPercent;
  }

  inMemoryConfig = merged;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to persist center config:', e);
    }
  }

  listeners.forEach((listener) => {
    try {
      listener(merged);
    } catch (e) {
      console.error('Error in config listener:', e);
    }
  });

  return merged;
}

/**
 * Resets configuration back to system factory defaults
 */
export function resetCenterConfig(updatedBy: string = 'المدير العام (إعادة ضبط المصنع)'): CenterSystemConfig {
  const reset: CenterSystemConfig = {
    ...DEFAULT_CENTER_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy
  };
  inMemoryConfig = reset;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  }
  listeners.forEach((listener) => listener(reset));
  return reset;
}

/**
 * Subscribes to live config updates (returns unsubscribe function)
 */
export function subscribeCenterConfig(callback: (config: CenterSystemConfig) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Exports config as pretty formatted JSON string for backup
 */
export function exportCenterConfigJson(): string {
  return JSON.stringify(getCenterConfig(), null, 2);
}

/**
 * Imports and validates config JSON string
 */
export function importCenterConfigJson(jsonStr: string, updatedBy: string = 'المدير العام (استيراد ملف)'): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return false;
    saveCenterConfig(parsed, updatedBy);
    return true;
  } catch {
    return false;
  }
}
