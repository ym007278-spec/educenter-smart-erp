/**
 * EduCenter Smart ERP - Unified Reactive Store & No-Code Meta-Customization Engine
 * Connects Academic Hierarchy (Dynamic Grades -> Subjects -> Teachers -> Groups -> Students),
 * Dynamic Custom Fields Builder (Students, Teachers, Groups, Expenses, Staff),
 * Flexible Teacher Profit Splits (70/30, 65/35, 80/20 + per-group/subject overrides),
 * Tuition Installments & Partial Payments, Bulk & Make-up Attendance,
 * Manual WhatsApp Approval Queue with Smart Variable Templates, and Super Admin Settings.
 */

export type AcademicGrade = string;

export const ACADEMIC_GRADES: string[] = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الصف الأول الإعدادي',
  'الصف الثاني الإعدادي',
  'الصف الثالث الإعدادي',
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
];

export const ACADEMIC_SUBJECTS: string[] = [
  'الفيزياء',
  'الكيمياء',
  'الرياضيات',
  'الأحياء',
  'اللغة الإنجليزية',
  'اللغة العربية',
];

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'مطبوعات وتشغيل',
  'إيجار ومرافق وكهرباء',
  'ضيافة ونظافة',
  'صيانة أجهزة وقاعات',
  'دعاية وإعلانات وتسويق',
  'رواتب وأجور الموظفين',
];

export type CustomFieldEntity = 'student' | 'teacher' | 'group' | 'expense' | 'staff';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  entity: CustomFieldEntity;
  label: string;
  type: CustomFieldType;
  options?: string[]; // Used when type === 'select'
  placeholder?: string;
}

export type ModuleSectionKey =
  | 'dashboard'
  | 'academic_tree'
  | 'people'
  | 'finance'
  | 'attendance'
  | 'suggestions'
  | 'users_permissions'
  | 'settings';

export type StaffPermissionsMap = Record<
  ModuleSectionKey,
  {
    view: boolean;
    edit: boolean;
  }
>;

export type SystemUserRole =
  | 'SUPER_ADMIN'
  | 'ASSISTANT_ADMIN'
  | 'RECEPTIONIST'
  | 'ACCOUNTANT'
  | 'CUSTOM';

export interface UserPermissionsMatrix {
  manageStudents: boolean; // صلاحية إدارة الطلاب (إضافة/تعديل/حذف) والحضور
  manageGroupsAndTeachers: boolean; // صلاحية إدارة المجموعات والمدرسين
  manageFinance: boolean; // صلاحية الإدارة المالية والخزنة ومتابعة المصروفات
  manageWhatsApp: boolean; // صلاحية مركز موافقات الواتساب
  manageSettingsAndBackup: boolean; // صلاحية تعديل الإعدادات العامة أو النسخ الاحتياطي
}

export interface SystemUserRecord {
  id: string;
  code: string;
  fullName: string;
  username: string;
  password: string;
  role: SystemUserRole;
  status: 'ACTIVE' | 'DISABLED';
  permissions: UserPermissionsMatrix;
  createdAt: string;
  lastLoginAt?: string;
  isPrimarySuperAdmin?: boolean;
}

export const SYSTEM_ROLE_LABELS: Record<SystemUserRole, string> = {
  SUPER_ADMIN: 'المدير العام (Super Admin)',
  ASSISTANT_ADMIN: 'مدير مساعد (Assistant Admin)',
  RECEPTIONIST: 'موظف استقبال (Receptionist)',
  ACCOUNTANT: 'محاسب (Accountant)',
  CUSTOM: 'تخصيص يدوي (Custom)',
};

export interface StudentExamRecord {
  id: string;
  examTitle: string;
  subject: string;
  examType: 'MONTHLY' | 'WEEKLY';
  date: string;
  score: number;
  maxScore: number;
  evaluation: string;
}

export interface StudentNoteRecord {
  id: string;
  date: string;
  author: string;
  category: 'ACADEMIC' | 'BEHAVIORAL';
  content: string;
}

export interface ActiveSessionState {
  groupId: string;
  startedAt: string;
  quickPayOpen: boolean;
}

export interface StudentRecord {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  grade: AcademicGrade;
  groupIds: string[];
  enrolledSubjects: string[];
  monthlyTuition: number;
  balanceDue: number;
  discountPercent: number;
  status: 'ACTIVE' | 'INACTIVE';
  registeredAt: string;
  notes?: string;
  customFields?: Record<string, string>;
  examGrades?: StudentExamRecord[];
  followUpNotes?: StudentNoteRecord[];
}

export interface TeacherRecord {
  id: string;
  code: string;
  fullName: string;
  subject: string;
  grades: AcademicGrade[];
  phone: string;
  splitPercentage: number; // Flexible e.g. 70%, 65%, 80% for teacher, remainder for center
  subjectSplitOverrides?: Record<string, number>; // Optional custom percentage per subject/stage
  sessionPrice: number;
  monthlyGroupFee: number;
  status: 'ACTIVE' | 'INACTIVE';
  hiredAt: string;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface StaffRecord {
  id: string;
  code: string;
  fullName: string;
  roleTitle: string;
  phone: string;
  monthlySalary: number;
  shift: 'MORNING' | 'EVENING' | 'FULL_DAY';
  accessLevel: 'ADMIN' | 'RECEPTION' | 'ACCOUNTANT' | 'SUPERVISOR';
  status: 'ACTIVE' | 'INACTIVE';
  hiredAt: string;
  permissions?: StaffPermissionsMap;
  customFields?: Record<string, string>;
}

export interface GroupRecord {
  id: string;
  code: string;
  name: string;
  grade: AcademicGrade;
  subject: string;
  teacherId: string;
  scheduleDays: string;
  scheduleTime: string;
  room: string;
  monthlyFee: number;
  maxCapacity: number;
  customSplitPercentage?: number; // Optional override for this specific group
  studentIds: string[];
  customFields?: Record<string, string>;
}

export interface TreasuryTransaction {
  id: string;
  receiptNumber: string;
  type: 'TUITION_COLLECTION' | 'EXPENSE' | 'PAYROLL';
  title: string;
  category: string;
  grossAmount: number;
  discountApplied: number;
  netAmount: number;
  requiredAmount?: number; // Total net amount required before installment split
  remainingInstallment?: number; // Remaining unpaid amount from this installment
  isInstallment?: boolean;
  teacherShare: number;
  centerShare: number;
  teacherId?: string;
  studentId?: string;
  groupId?: string;
  staffId?: string;
  monthKey?: string;
  createdAt: string;
  paymentMethod: 'CASH' | 'INSTAPAY' | 'VODAFONE_CASH';
  customFields?: Record<string, string>;
}

export type RevenueMetricMode = 'NET_REVENUE' | 'CENTER_SHARE' | 'TEACHER_SHARE';

export interface MonthlyGroupRevenuePoint {
  monthKey: string;
  monthLabel: string;
  totalRevenue: number;
  totalCenterShare: number;
  totalTeacherShare: number;
  [groupId: string]: string | number;
}

export interface GroupRevenueSummary {
  groupId: string;
  groupCode: string;
  groupName: string;
  shortName: string;
  subject: string;
  grade: string;
  color: string;
  totalNetRevenue: number;
  totalCenterShare: number;
  totalTeacherShare: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  growthPercent: number;
  shareOfTotalPercent: number;
}

export interface AttendanceEntry {
  id: string;
  studentId: string;
  groupId: string;
  date: string;
  time: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  scannedVia: 'QR_CODE' | 'MANUAL' | 'BULK_GROUP' | 'MAKEUP_SESSION';
  sessionType?: 'REGULAR' | 'MAKEUP_EXCEPTION';
  note?: string;
}

export type WhatsAppTriggerType =
  | 'ABSENCE'
  | 'OVERDUE_PAYMENT'
  | 'INSTALLMENT_REMAINING'
  | 'SESSION_CANCEL'
  | 'SESSION_RESCHEDULE'
  | 'CUSTOM';

export interface WhatsAppDraft {
  id: string;
  triggerType: WhatsAppTriggerType;
  title: string;
  studentId?: string;
  studentName: string;
  parentName: string;
  phone: string;
  groupName: string;
  draftMessage: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED_SENT' | 'REJECTED';
}

export interface DiscountRule {
  id: string;
  title: string;
  percent: number;
  description: string;
  active: boolean;
}

export type MessageTemplateKey =
  | 'ABSENCE'
  | 'OVERDUE_PAYMENT'
  | 'INSTALLMENT_REMAINING'
  | 'SESSION_CANCEL'
  | 'SESSION_RESCHEDULE';

export type ExportBrandingThemeId =
  | 'SLATE_INSTITUTIONAL'
  | 'ROYAL_BLUE'
  | 'EMERALD_OFFICIAL'
  | 'VIOLET_ACADEMIC'
  | 'CRIMSON_CLASSIC'
  | 'CHARCOAL_FORMAL'
  | 'CUSTOM';

export interface ExportBrandingConfig {
  logoDataUrl: string;
  headerSubtitle: string;
  headerAddress: string;
  headerTaxOrLicense: string;
  showLogoInExports: boolean;
  includeHeaderInExcel: boolean;
  themeId: ExportBrandingThemeId;
  primaryTableColor: string;
  headerTextColor: string;
  zebraRowColor: string;
  borderAccentColor: string;
}

export interface ExportColorThemePreset {
  id: Exclude<ExportBrandingThemeId, 'CUSTOM'>;
  name: string;
  description: string;
  primaryTableColor: string;
  headerTextColor: string;
  zebraRowColor: string;
  borderAccentColor: string;
}

export const EXPORT_COLOR_THEMES: ExportColorThemePreset[] = [
  {
    id: 'SLATE_INSTITUTIONAL',
    name: 'كحلي مؤسسي داكن (الافتراضي)',
    description: 'رسمي كلاسيكي عالي التباين للطباعة والمستندات المعتمدة',
    primaryTableColor: '#0f172a',
    headerTextColor: '#ffffff',
    zebraRowColor: '#f8fafc',
    borderAccentColor: '#cbd5e1',
  },
  {
    id: 'ROYAL_BLUE',
    name: 'أزرق ملكي أكاديمي',
    description: 'هوية تعليمية عصرية مناسبة للكشوف الأكاديمية وبطاقات المتابعة',
    primaryTableColor: '#1e3a8a',
    headerTextColor: '#ffffff',
    zebraRowColor: '#eff6ff',
    borderAccentColor: '#bfdbfe',
  },
  {
    id: 'EMERALD_OFFICIAL',
    name: 'زمردي مالي معتمد',
    description: 'مثالي للتقارير المالية، كشوف الخزينة، وإيصالات السداد',
    primaryTableColor: '#064e3b',
    headerTextColor: '#ffffff',
    zebraRowColor: '#ecfdf5',
    borderAccentColor: '#a7f3d0',
  },
  {
    id: 'VIOLET_ACADEMIC',
    name: 'بنفسجي جامعي فاخر',
    description: 'طابع أكاديمي راقٍ لشهادات التقدير وتقارير المتفوقين',
    primaryTableColor: '#3b0764',
    headerTextColor: '#ffffff',
    zebraRowColor: '#faf5ff',
    borderAccentColor: '#e9d5ff',
  },
  {
    id: 'CRIMSON_CLASSIC',
    name: 'عنابي كلاسيكي رسمي',
    description: 'هوية عريقة واضحة في الطباعة الملونة والأبيض والأسود',
    primaryTableColor: '#7f1d1d',
    headerTextColor: '#ffffff',
    zebraRowColor: '#fef2f2',
    borderAccentColor: '#fecaca',
  },
  {
    id: 'CHARCOAL_FORMAL',
    name: 'رمادي فحمي هندسي',
    description: 'تصميم محايد مخصص للطابعات الليزرية عالية الدقة',
    primaryTableColor: '#18181b',
    headerTextColor: '#ffffff',
    zebraRowColor: '#f4f4f5',
    borderAccentColor: '#d4d4d8',
  },
];

export const CENTER_LOGO_PRESETS: { id: string; label: string; dataUrl: string }[] = [
  {
    id: 'crest-navy',
    label: 'شعار الدرع الأكاديمي الكحلي',
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
          <rect width="120" height="120" rx="24" fill="#0f172a"/>
          <path d="M60 22 L100 40 L60 58 L20 40 Z" fill="#38bdf8"/>
          <path d="M34 49 V74 C34 84 46 92 60 92 C74 92 86 84 86 74 V49 L60 61 Z" fill="#f8fafc"/>
          <circle cx="96" cy="64" r="5" fill="#fbbf24"/>
          <path d="M96 42 V64" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
        </svg>`
      ),
  },
  {
    id: 'crest-emerald',
    label: 'وسام التفوق الزمردي',
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
          <rect width="120" height="120" rx="24" fill="#064e3b"/>
          <circle cx="60" cy="60" r="40" fill="none" stroke="#34d399" stroke-width="5"/>
          <path d="M60 28 L69 48 L90 50 L74 65 L78 86 L60 75 L42 86 L46 65 L30 50 L51 48 Z" fill="#fbbf24"/>
        </svg>`
      ),
  },
  {
    id: 'crest-royal',
    label: 'شعار الكتاب الذهبي الملكي',
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
          <rect width="120" height="120" rx="24" fill="#1e3a8a"/>
          <path d="M26 38 C38 34 52 38 60 46 C68 38 82 34 94 38 V84 C82 80 68 84 60 92 C52 84 38 80 26 84 Z" fill="#ffffff"/>
          <path d="M60 44 V90" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
          <circle cx="60" cy="26" r="7" fill="#fbbf24"/>
        </svg>`
      ),
  },
];

export const DEFAULT_EXPORT_BRANDING: ExportBrandingConfig = {
  logoDataUrl: CENTER_LOGO_PRESETS[0].dataUrl,
  headerSubtitle: 'مؤسسة تعليمية معتمدة للمرحلة الابتدائية والإعدادية والثانوية',
  headerAddress: 'القاهرة - مدينة نصر - شارع عباس العقاد الرئيسي',
  headerTaxOrLicense: 'اعتماد أكاديمي رقم 4092/2026 • إدارة المتابعة والجودة',
  showLogoInExports: true,
  includeHeaderInExcel: true,
  themeId: 'SLATE_INSTITUTIONAL',
  primaryTableColor: '#0f172a',
  headerTextColor: '#ffffff',
  zebraRowColor: '#f8fafc',
  borderAccentColor: '#cbd5e1',
};

export interface CenterConfig {
  centerName: string;
  currency: string;
  centerPhone: string;
  defaultTeacherSplit: number;
  receiptFooter: string;
  enabledSections: Record<ModuleSectionKey, boolean>;
  discountRules: DiscountRule[];
  grades: string[];
  subjects: string[];
  expenseCategories: string[];
  customFields: CustomFieldDefinition[];
  messageTemplates: Record<MessageTemplateKey, string>;
  exportBranding: ExportBrandingConfig;
}

export type SystemAuditCategory =
  | 'STUDENTS_PEOPLE'
  | 'TREASURY_FINANCE'
  | 'USERS_PERMISSIONS'
  | 'ACADEMIC_GROUPS'
  | 'SYSTEM_SETTINGS';

export type SystemAuditSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SystemAuditLogEntry {
  id: string;
  actionCode: string;
  category: SystemAuditCategory;
  severity: SystemAuditSeverity;
  actionTitle: string;
  details: string;
  targetEntity?: string;
  performedByUserId: string;
  performedByName: string;
  performedByUsername: string;
  performedByRole: SystemUserRole;
  timestamp: string;
  isoTimestamp: string;
}

export interface ERPDatabaseState {
  version: string;
  lastUpdated: string;
  config: CenterConfig;
  users: SystemUserRecord[];
  currentUserId: string;
  teachers: TeacherRecord[];
  students: StudentRecord[];
  staff: StaffRecord[];
  groups: GroupRecord[];
  transactions: TreasuryTransaction[];
  attendance: AttendanceEntry[];
  suggestions: WhatsAppDraft[];
  auditLogs: SystemAuditLogEntry[];
  activeSession?: ActiveSessionState | null;
}

const STORAGE_KEY = 'educenter_unified_erp_v5';

export const GROUP_CHART_PALETTE: string[] = [
  '#2563eb', // Blue 600
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
];

export const DEFAULT_ACADEMIC_MONTHS: { key: string; label: string }[] = [
  { key: '2026-08', label: 'أغسطس 2026' },
  { key: '2026-09', label: 'سبتمبر 2026' },
  { key: '2026-10', label: 'أكتوبر 2026' },
  { key: '2026-11', label: 'نوفمبر 2026' },
];

export const DEFAULT_MESSAGE_TEMPLATES: Record<MessageTemplateKey, string> = {
  ABSENCE:
    'تنبيه: تغيب ابنكم/تاريخ اليوم ({studentName}) عن حضور حصة {subject} ({groupName}) مع {teacherName}. يرجى المتابعة مع إدارة {centerName}.',
  OVERDUE_PAYMENT:
    'عزيزي ولي أمر الطالب/ة {studentName}، نذكركم بوجود رصيد مستحق قدره {remainingAmount} {currency} من الاشتراكات الدراسية. شاكرين تعاونكم الدائم مع إدارة {centerName}.',
  INSTALLMENT_REMAINING:
    'إيصال سداد جزئي لولي أمر الطالب/ة {studentName}: تم استلام دفعة بقيمة {amount} {currency} لاشتراك {groupName}، ويتبقى رصيد {remainingAmount} {currency}. شكراً لتعاونكم.',
  SESSION_CANCEL:
    'عزيزي ولي الأمر، تم إلغاء/تأجيل حصة {subject} المقرر لها اليوم لمجموعة ({groupName}) مع {teacherName}: {note}',
  SESSION_RESCHEDULE:
    'تنبيه هام لولي أمر الطالب/ة {studentName} بخصوص موعد {groupName} مع {teacherName}: {note}',
};

export function formatSmartMessageTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

export function buildDefaultStaffPermissions(
  accessLevel: StaffRecord['accessLevel']
): StaffPermissionsMap {
  if (accessLevel === 'ADMIN') {
    return {
      dashboard: { view: true, edit: true },
      academic_tree: { view: true, edit: true },
      people: { view: true, edit: true },
      finance: { view: true, edit: true },
      attendance: { view: true, edit: true },
      suggestions: { view: true, edit: true },
      users_permissions: { view: true, edit: true },
      settings: { view: true, edit: true },
    };
  }
  if (accessLevel === 'ACCOUNTANT') {
    return {
      dashboard: { view: true, edit: false },
      academic_tree: { view: true, edit: false },
      people: { view: true, edit: false },
      finance: { view: true, edit: true },
      attendance: { view: false, edit: false },
      suggestions: { view: true, edit: false },
      users_permissions: { view: false, edit: false },
      settings: { view: false, edit: false },
    };
  }
  if (accessLevel === 'SUPERVISOR') {
    return {
      dashboard: { view: true, edit: false },
      academic_tree: { view: true, edit: true },
      people: { view: true, edit: false },
      finance: { view: false, edit: false },
      attendance: { view: true, edit: true },
      suggestions: { view: true, edit: true },
      users_permissions: { view: false, edit: false },
      settings: { view: false, edit: false },
    };
  }
  // RECEPTION
  return {
    dashboard: { view: true, edit: false },
    academic_tree: { view: true, edit: true },
    people: { view: true, edit: true },
    finance: { view: true, edit: false },
    attendance: { view: true, edit: true },
    suggestions: { view: true, edit: false },
    users_permissions: { view: false, edit: false },
    settings: { view: false, edit: false },
  };
}

export function buildDefaultPermissionsForRole(
  role: SystemUserRole
): UserPermissionsMatrix {
  if (role === 'SUPER_ADMIN') {
    return {
      manageStudents: true,
      manageGroupsAndTeachers: true,
      manageFinance: true,
      manageWhatsApp: true,
      manageSettingsAndBackup: true,
    };
  }
  if (role === 'ASSISTANT_ADMIN') {
    return {
      manageStudents: true,
      manageGroupsAndTeachers: true,
      manageFinance: false,
      manageWhatsApp: true,
      manageSettingsAndBackup: false,
    };
  }
  if (role === 'ACCOUNTANT') {
    return {
      manageStudents: false,
      manageGroupsAndTeachers: false,
      manageFinance: true,
      manageWhatsApp: false,
      manageSettingsAndBackup: false,
    };
  }
  if (role === 'RECEPTIONIST') {
    return {
      manageStudents: true,
      manageGroupsAndTeachers: true,
      manageFinance: false,
      manageWhatsApp: false,
      manageSettingsAndBackup: false,
    };
  }
  // CUSTOM
  return {
    manageStudents: true,
    manageGroupsAndTeachers: false,
    manageFinance: false,
    manageWhatsApp: false,
    manageSettingsAndBackup: false,
  };
}

/**
 * Pure security guard: checks if a SystemUserRecord has access to a given ModuleSectionKey.
 */
export function canUserAccessSection(
  user: SystemUserRecord | null | undefined,
  section: ModuleSectionKey
): boolean {
  if (!user || user.status === 'DISABLED') return false;
  if (user.role === 'SUPER_ADMIN' || user.isPrimarySuperAdmin) return true;

  // Users & Permissions panel is strictly Super Admin only
  if (section === 'users_permissions') {
    return false;
  }
  if (section === 'dashboard') {
    return true;
  }
  if (section === 'people') {
    return Boolean(
      user.permissions.manageStudents || user.permissions.manageGroupsAndTeachers
    );
  }
  if (section === 'attendance') {
    return Boolean(user.permissions.manageStudents);
  }
  if (section === 'academic_tree') {
    return Boolean(user.permissions.manageGroupsAndTeachers);
  }
  if (section === 'finance') {
    return Boolean(user.permissions.manageFinance);
  }
  if (section === 'suggestions') {
    return Boolean(user.permissions.manageWhatsApp);
  }
  if (section === 'settings') {
    return Boolean(user.permissions.manageSettingsAndBackup);
  }
  return false;
}

/**
 * Resolves the effective teacher split percentage using hierarchy:
 * 1) Group-level customSplitPercentage override
 * 2) Teacher-level subjectSplitOverrides[subject]
 * 3) Teacher-level splitPercentage
 * 4) Center defaultTeacherSplit
 */
export function resolveEffectiveTeacherSplit(
  teacher?: TeacherRecord | null,
  group?: GroupRecord | null,
  defaultCenterSplit: number = 70
): number {
  if (
    group &&
    typeof group.customSplitPercentage === 'number' &&
    group.customSplitPercentage > 0 &&
    group.customSplitPercentage <= 100
  ) {
    return group.customSplitPercentage;
  }
  if (teacher && group && teacher.subjectSplitOverrides) {
    const subjOverride = teacher.subjectSplitOverrides[group.subject];
    if (typeof subjOverride === 'number' && subjOverride > 0 && subjOverride <= 100) {
      return subjOverride;
    }
  }
  if (teacher && typeof teacher.splitPercentage === 'number') {
    return teacher.splitPercentage;
  }
  return defaultCenterSplit;
}

export function resolveTransactionMonthKey(tx: TreasuryTransaction): string {
  if (tx.monthKey && /^\d{4}-\d{2}$/.test(tx.monthKey)) {
    return tx.monthKey;
  }
  const match = tx.createdAt.match(/^(\d{4}-\d{2})/);
  if (match) {
    return match[1];
  }
  return '2026-11';
}

/**
 * Pure aggregation engine for Recharts monthly revenue evolution separated by educational group.
 */
export function buildMonthlyGroupRevenueAnalytics(
  groups: GroupRecord[],
  transactions: TreasuryTransaction[],
  metricMode: RevenueMetricMode = 'NET_REVENUE'
): {
  monthlySeries: MonthlyGroupRevenuePoint[];
  groupSummaries: GroupRevenueSummary[];
  grandTotalMetric: number;
} {
  const tuitionTxs = transactions.filter((t) => t.type === 'TUITION_COLLECTION');

  const monthMap = new Map<string, string>();
  DEFAULT_ACADEMIC_MONTHS.forEach((m) => monthMap.set(m.key, m.label));
  tuitionTxs.forEach((tx) => {
    const mKey = resolveTransactionMonthKey(tx);
    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, mKey);
    }
  });

  const sortedMonths = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, label]) => ({ key, label }));

  const pickValue = (tx: TreasuryTransaction): number => {
    if (metricMode === 'CENTER_SHARE') return tx.centerShare;
    if (metricMode === 'TEACHER_SHARE') return tx.teacherShare;
    return tx.netAmount;
  };

  const monthlySeries: MonthlyGroupRevenuePoint[] = sortedMonths.map(({ key, label }) => {
    const monthTxs = tuitionTxs.filter((tx) => resolveTransactionMonthKey(tx) === key);
    const point: MonthlyGroupRevenuePoint = {
      monthKey: key,
      monthLabel: label,
      totalRevenue: 0,
      totalCenterShare: 0,
      totalTeacherShare: 0,
    };

    groups.forEach((grp) => {
      const grpTxs = monthTxs.filter((tx) => tx.groupId === grp.id);
      const val = grpTxs.reduce((sum, tx) => sum + pickValue(tx), 0);
      point[grp.id] = val;
      point.totalRevenue += val;
      point.totalCenterShare += grpTxs.reduce((sum, tx) => sum + tx.centerShare, 0);
      point.totalTeacherShare += grpTxs.reduce((sum, tx) => sum + tx.teacherShare, 0);
    });

    return point;
  });

  const rawSummaries = groups.map((grp, idx) => {
    const grpTxs = tuitionTxs.filter((tx) => tx.groupId === grp.id);
    const totalNetRevenue = grpTxs.reduce((sum, tx) => sum + tx.netAmount, 0);
    const totalCenterShare = grpTxs.reduce((sum, tx) => sum + tx.centerShare, 0);
    const totalTeacherShare = grpTxs.reduce((sum, tx) => sum + tx.teacherShare, 0);

    const lastMonthPoint = monthlySeries[monthlySeries.length - 1];
    const prevMonthPoint = monthlySeries[monthlySeries.length - 2];

    const currentMonthRevenue = lastMonthPoint ? Number(lastMonthPoint[grp.id] || 0) : 0;
    const previousMonthRevenue = prevMonthPoint ? Number(prevMonthPoint[grp.id] || 0) : 0;

    const growthPercent =
      previousMonthRevenue > 0
        ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
        : currentMonthRevenue > 0
        ? 100
        : 0;

    const shortName = grp.name.replace(/\s*\(.*?\)\s*/g, '').trim();

    const metricTotal =
      metricMode === 'CENTER_SHARE'
        ? totalCenterShare
        : metricMode === 'TEACHER_SHARE'
        ? totalTeacherShare
        : totalNetRevenue;

    return {
      groupId: grp.id,
      groupCode: grp.code,
      groupName: grp.name,
      shortName,
      subject: grp.subject,
      grade: grp.grade,
      color: GROUP_CHART_PALETTE[idx % GROUP_CHART_PALETTE.length],
      totalNetRevenue,
      totalCenterShare,
      totalTeacherShare,
      currentMonthRevenue,
      previousMonthRevenue,
      growthPercent,
      metricTotal,
    };
  });

  const grandTotalMetric = rawSummaries.reduce((sum, g) => sum + g.metricTotal, 0);

  const groupSummaries: GroupRevenueSummary[] = rawSummaries.map((item) => ({
    groupId: item.groupId,
    groupCode: item.groupCode,
    groupName: item.groupName,
    shortName: item.shortName,
    subject: item.subject,
    grade: item.grade,
    color: item.color,
    totalNetRevenue: item.totalNetRevenue,
    totalCenterShare: item.totalCenterShare,
    totalTeacherShare: item.totalTeacherShare,
    currentMonthRevenue: item.currentMonthRevenue,
    previousMonthRevenue: item.previousMonthRevenue,
    growthPercent: item.growthPercent,
    shareOfTotalPercent:
      grandTotalMetric > 0 ? Math.round((item.metricTotal / grandTotalMetric) * 100) : 0,
  }));

  return {
    monthlySeries,
    groupSummaries,
    grandTotalMetric,
  };
}

/**
 * Pure calculation for 70/30 (or custom) Teacher vs Center revenue split with optional discount
 * and optional partial installment payment.
 */
export function calculateRevenueSplit(
  grossAmount: number,
  discountPercent: number = 0,
  teacherSplitPercent: number = 70,
  paidAmountOverride?: number
): {
  grossAmount: number;
  discountApplied: number;
  netRequiredAmount: number;
  netAmount: number;
  remainingInstallment: number;
  teacherShare: number;
  centerShare: number;
} {
  const safeGross = Math.max(0, Number(grossAmount) || 0);
  const clampedDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const clampedSplit = Math.min(100, Math.max(0, Number(teacherSplitPercent) || 70));

  const discountApplied = Math.round((safeGross * clampedDiscount) / 100);
  const netRequiredAmount = Math.max(0, safeGross - discountApplied);

  const actualPaid =
    paidAmountOverride !== undefined && paidAmountOverride !== null
      ? Math.min(netRequiredAmount, Math.max(0, Number(paidAmountOverride) || 0))
      : netRequiredAmount;

  const remainingInstallment = Math.max(0, netRequiredAmount - actualPaid);
  const teacherShare = Math.round((actualPaid * clampedSplit) / 100);
  const centerShare = actualPaid - teacherShare;

  return {
    grossAmount: safeGross,
    discountApplied,
    netRequiredAmount,
    netAmount: actualPaid,
    remainingInstallment,
    teacherShare,
    centerShare,
  };
}

/**
 * Pure filter for Academic Tree mapping: filters groups by grade, subject, and teacherId.
 */
export function filterAcademicGroups(
  groups: GroupRecord[],
  filters: {
    grade?: string;
    subject?: string;
    teacherId?: string;
    search?: string;
  }
): GroupRecord[] {
  return groups.filter((g) => {
    if (filters.grade && filters.grade !== 'ALL' && g.grade !== filters.grade) return false;
    if (filters.subject && filters.subject !== 'ALL' && g.subject !== filters.subject) return false;
    if (filters.teacherId && filters.teacherId !== 'ALL' && g.teacherId !== filters.teacherId) return false;
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      if (
        !g.name.toLowerCase().includes(q) &&
        !g.code.toLowerCase().includes(q) &&
        !g.room.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Formats Egyptian/International phone numbers for WhatsApp Official API links.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0')
    ? `2${digits}`
    : digits.startsWith('20')
    ? digits
    : `20${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function evaluateExamGrade(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  if (pct >= 90) return 'ممتاز (تفوق)';
  if (pct >= 80) return 'جيد جداً';
  if (pct >= 65) return 'جيد';
  if (pct >= 50) return 'مقبول';
  return 'يحتاج متابعة مكثفة';
}

export function buildDefaultExamGradesForStudent(
  student: StudentRecord
): StudentExamRecord[] {
  if (Array.isArray(student.examGrades) && student.examGrades.length > 0) {
    return student.examGrades;
  }
  const primarySubject = student.enrolledSubjects[0] || 'الفيزياء';
  const secondarySubject = student.enrolledSubjects[1] || primarySubject;
  return [
    {
      id: `ex-${student.id}-1`,
      examTitle: 'الامتحان الشهري الشامل - أكتوبر',
      subject: primarySubject,
      examType: 'MONTHLY',
      date: '2026-10-28',
      score: student.discountPercent >= 20 ? 59 : 54,
      maxScore: 60,
      evaluation: student.discountPercent >= 20 ? 'ممتاز (تفوق)' : 'ممتاز (تفوق)',
    },
    {
      id: `ex-${student.id}-2`,
      examTitle: 'اختبار الأسبوع الأول - نوفمبر',
      subject: primarySubject,
      examType: 'WEEKLY',
      date: '2026-11-01',
      score: 18,
      maxScore: 20,
      evaluation: 'ممتاز (تفوق)',
    },
    {
      id: `ex-${student.id}-3`,
      examTitle: 'تقييم التطبيقات العملية',
      subject: secondarySubject,
      examType: 'WEEKLY',
      date: '2026-10-20',
      score: 26,
      maxScore: 30,
      evaluation: 'جيد جداً',
    },
  ];
}

export function buildDefaultFollowUpNotesForStudent(
  student: StudentRecord
): StudentNoteRecord[] {
  if (Array.isArray(student.followUpNotes) && student.followUpNotes.length > 0) {
    return student.followUpNotes;
  }
  const list: StudentNoteRecord[] = [
    {
      id: `nt-${student.id}-1`,
      date: '2026-11-01',
      author: 'إدارة المتابعة الأكاديمية',
      category: 'ACADEMIC',
      content:
        student.notes ||
        'مستوى علمي متميز والتزام واضح بتسليم الواجبات الأسبوعية وحل نماذج الامتحانات.',
    },
    {
      id: `nt-${student.id}-2`,
      date: '2026-10-25',
      author: 'مشرف القاعات والانضباط',
      category: 'BEHAVIORAL',
      content:
        'سلوك راقٍ جداً داخل القاعة الدراسية، والتزام تام بمواعيد الحضور والانصراف.',
    },
  ];
  return list;
}

export function computeStudentFollowUpSummary(
  student: StudentRecord,
  state: ERPDatabaseState
): {
  enrolledGroups: GroupRecord[];
  totalRequiredTuition: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatusLabel: string;
  examGrades: StudentExamRecord[];
  followUpNotes: StudentNoteRecord[];
  attendanceCount: { present: number; absent: number };
} {
  const enrolledGroups = state.groups.filter(
    (g) => student.groupIds.includes(g.id) || g.studentIds.includes(student.id)
  );
  const grossTuition =
    student.monthlyTuition > 0
      ? student.monthlyTuition
      : enrolledGroups.reduce((s, g) => s + g.monthlyFee, 0);
  const discountVal = Math.round(
    (grossTuition * (student.discountPercent || 0)) / 100
  );
  const netTuition = Math.max(0, grossTuition - discountVal);
  const remainingAmount = Math.max(0, student.balanceDue || 0);
  const totalRequiredTuition = Math.max(netTuition, remainingAmount);
  const paidAmount = Math.max(0, totalRequiredTuition - remainingAmount);

  const paymentStatusLabel =
    remainingAmount === 0
      ? 'خالص بالكامل'
      : paidAmount > 0
      ? 'سداد جزئي (متبقي قسط)'
      : 'غير مسدد (مديونية مستحقة)';

  const studentAtt = state.attendance.filter((a) => a.studentId === student.id);
  const present = studentAtt.filter((a) => a.status === 'PRESENT').length;
  const absent = studentAtt.filter((a) => a.status === 'ABSENT').length;

  return {
    enrolledGroups,
    totalRequiredTuition,
    paidAmount,
    remainingAmount,
    paymentStatusLabel,
    examGrades: buildDefaultExamGradesForStudent(student),
    followUpNotes: buildDefaultFollowUpNotesForStudent(student),
    attendanceCount: { present, absent },
  };
}

export const INITIAL_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: 'cf-std-alt-parent',
    entity: 'student',
    label: 'ولي أمر بديل / طوارئ',
    type: 'text',
    placeholder: 'اسم ورقم قريب للطوارئ',
  },
  {
    id: 'cf-std-payment-pref',
    entity: 'student',
    label: 'طريقة الدفع المفضلة',
    type: 'select',
    options: ['نقدي بالخزينة', 'إنستا باي', 'فودافون كاش'],
  },
  {
    id: 'cf-tch-contract',
    entity: 'teacher',
    label: 'نظام التعاقد',
    type: 'select',
    options: ['نسبة مئوية شاملة', 'نسبة مخصصة حسب المرحلة', 'إيجار قاعة ثابت'],
  },
  {
    id: 'cf-grp-assistant',
    entity: 'group',
    label: 'المساعد المشرف (Assistant)',
    type: 'text',
    placeholder: 'اسم مساعد المدرس المسؤول',
  },
  {
    id: 'cf-exp-recipient',
    entity: 'expense',
    label: 'المستلم / المورد',
    type: 'text',
    placeholder: 'اسم الجهة أو المستلم',
  },
];

export const INITIAL_ERP_STATE: ERPDatabaseState = {
  version: '3.0.0',
  lastUpdated: '2026-11-01T09:00:00.000Z',
  config: {
    centerName: 'سنتر النخبة التعليمي الذكي',
    currency: 'ج.م',
    centerPhone: '01001234567',
    defaultTeacherSplit: 70,
    receiptFooter: 'إيصال رسمي معتمد - سنتر النخبة التعليمي. يرجى الاحتفاظ بالإيصال للمراجعة.',
    enabledSections: {
      dashboard: true,
      academic_tree: true,
      people: true,
      finance: true,
      attendance: true,
      suggestions: true,
      users_permissions: true,
      settings: true,
    },
    grades: [...ACADEMIC_GRADES],
    subjects: [...ACADEMIC_SUBJECTS],
    expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    customFields: [...INITIAL_CUSTOM_FIELDS],
    messageTemplates: { ...DEFAULT_MESSAGE_TEMPLATES },
    exportBranding: { ...DEFAULT_EXPORT_BRANDING },
    discountRules: [
      {
        id: 'disc-sibling',
        title: 'خصم الأشقاء والإخوة',
        percent: 15,
        description: 'خصم 15% للأخ الثاني المسجل في نفس المرحلة أو مراحل مختلفة بالسنتر.',
        active: true,
      },
      {
        id: 'disc-excellence',
        title: 'منحة المتفوقين أوائل الشهور',
        percent: 25,
        description: 'خصم 25% للطلاب الحاصلين على أكثر من 95% في الامتحان الشهري الشامل.',
        active: true,
      },
      {
        id: 'disc-orphan',
        title: 'إعفاء الحالات الاجتماعية والأيتام',
        percent: 50,
        description: 'دعم مجتمعي بقيمة 50% من المصروفات الشهرية بموافقة مدير السنتر.',
        active: true,
      },
    ],
  },
  currentUserId: 'usr-admin-1',
  users: [
    {
      id: 'usr-admin-1',
      code: 'USR-01',
      fullName: 'د. محمود عبد العزيز (المدير العام)',
      username: 'admin',
      password: 'admin123',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isPrimarySuperAdmin: true,
      permissions: buildDefaultPermissionsForRole('SUPER_ADMIN'),
      createdAt: '2026-01-01',
      lastLoginAt: 'الآن (نشط)',
    },
    {
      id: 'usr-assist-1',
      code: 'USR-02',
      fullName: 'أ. أحمد نبيل (مدير مساعد)',
      username: 'assistant_ahmed',
      password: '123456',
      role: 'ASSISTANT_ADMIN',
      status: 'ACTIVE',
      permissions: buildDefaultPermissionsForRole('ASSISTANT_ADMIN'),
      createdAt: '2026-03-10',
      lastLoginAt: 'اليوم 10:15 ص',
    },
    {
      id: 'usr-recep-1',
      code: 'USR-03',
      fullName: 'أ. سارة محمود (موظفة استقبال)',
      username: 'reception_sara',
      password: '123456',
      role: 'RECEPTIONIST',
      status: 'ACTIVE',
      permissions: buildDefaultPermissionsForRole('RECEPTIONIST'),
      createdAt: '2026-05-20',
      lastLoginAt: 'اليوم 09:00 ص',
    },
    {
      id: 'usr-acc-1',
      code: 'USR-04',
      fullName: 'أ. وائل كمال (محاسب الخزينة)',
      username: 'accountant_wael',
      password: '123456',
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
      permissions: buildDefaultPermissionsForRole('ACCOUNTANT'),
      createdAt: '2026-06-15',
      lastLoginAt: 'أمس 08:30 م',
    },
  ],
  teachers: [
    {
      id: 'tch-1',
      code: 'TR-201',
      fullName: 'أ.د محمود رضوان',
      subject: 'الفيزياء',
      grades: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
      phone: '01011223344',
      splitPercentage: 70,
      subjectSplitOverrides: { الفيزياء: 70 },
      sessionPrice: 80,
      monthlyGroupFee: 320,
      status: 'ACTIVE',
      hiredAt: '2025-08-15',
      notes: 'خبير الفيزياء للثانوية العامة',
      customFields: {
        'cf-tch-contract': 'نسبة مئوية شاملة',
      },
    },
    {
      id: 'tch-2',
      code: 'TR-202',
      fullName: 'أ. سامح عبد العزيز',
      subject: 'الكيمياء',
      grades: ['الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
      phone: '01122334455',
      splitPercentage: 70,
      sessionPrice: 75,
      monthlyGroupFee: 300,
      status: 'ACTIVE',
      hiredAt: '2025-09-01',
      notes: 'متخصص الكيمياء العضوية والتحليلية',
      customFields: {
        'cf-tch-contract': 'نسبة مئوية شاملة',
      },
    },
    {
      id: 'tch-3',
      code: 'TR-203',
      fullName: 'أ. طارق المنشاوي',
      subject: 'الرياضيات',
      grades: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
      phone: '01233445566',
      splitPercentage: 70,
      sessionPrice: 85,
      monthlyGroupFee: 340,
      status: 'ACTIVE',
      hiredAt: '2025-09-10',
      notes: 'الجبر والتفاضل والميكانيكا',
      customFields: {
        'cf-tch-contract': 'نسبة مخصصة حسب المرحلة',
      },
    },
    {
      id: 'tch-4',
      code: 'TR-204',
      fullName: 'د. نهى الكيلاني',
      subject: 'الأحياء',
      grades: ['الصف الأول الثانوي', 'الصف الثالث الثانوي'],
      phone: '01099887766',
      splitPercentage: 70,
      sessionPrice: 75,
      monthlyGroupFee: 300,
      status: 'ACTIVE',
      hiredAt: '2026-01-12',
      notes: 'الأحياء والجيولوجيا للثانوية العامة',
      customFields: {
        'cf-tch-contract': 'نسبة مئوية شاملة',
      },
    },
  ],
  groups: [
    {
      id: 'grp-1',
      code: 'G-PHY-301',
      name: 'مجموعة الفيزياء المكثفة (سبت وثلاثاء)',
      grade: 'الصف الثالث الثانوي',
      subject: 'الفيزياء',
      teacherId: 'tch-1',
      scheduleDays: 'السبت والثلاثاء',
      scheduleTime: '04:00 م - 06:00 م',
      room: 'قاعة نيوتن الكبرى (A1)',
      monthlyFee: 320,
      maxCapacity: 60,
      studentIds: ['std-1', 'std-2', 'std-4'],
      customFields: {
        'cf-grp-assistant': 'م. إسلام عبد الرحمن',
      },
    },
    {
      id: 'grp-2',
      code: 'G-CHM-302',
      name: 'مجموعة الكيمياء العضوية (أحد وأربعاء)',
      grade: 'الصف الثالث الثانوي',
      subject: 'الكيمياء',
      teacherId: 'tch-2',
      scheduleDays: 'الأحد والأربعاء',
      scheduleTime: '06:00 م - 08:00 م',
      room: 'قاعة زويل العلمية (B2)',
      monthlyFee: 300,
      maxCapacity: 50,
      studentIds: ['std-1', 'std-2'],
      customFields: {
        'cf-grp-assistant': 'أ. هدير مصطفى',
      },
    },
    {
      id: 'grp-3',
      code: 'G-MTH-201',
      name: 'مجموعة الرياضيات التطبيقية (اثنين وخميس)',
      grade: 'الصف الثاني الثانوي',
      subject: 'الرياضيات',
      teacherId: 'tch-3',
      scheduleDays: 'الاثنين والخميس',
      scheduleTime: '03:00 م - 05:00 م',
      room: 'قاعة الخوارزمي (C1)',
      monthlyFee: 340,
      maxCapacity: 45,
      studentIds: ['std-3', 'std-5'],
      customFields: {
        'cf-grp-assistant': 'أ. كريم عادل',
      },
    },
    {
      id: 'grp-4',
      code: 'G-BIO-101',
      name: 'مجموعة أساسيات الأحياء (جمعة وثلاثاء)',
      grade: 'الصف الأول الثانوي',
      subject: 'الأحياء',
      teacherId: 'tch-4',
      scheduleDays: 'الثلاثاء والجمعة',
      scheduleTime: '02:00 م - 04:00 م',
      room: 'قاعة ابن سينا (A2)',
      monthlyFee: 300,
      maxCapacity: 40,
      studentIds: ['std-6'],
      customFields: {
        'cf-grp-assistant': 'د. منة الله سمير',
      },
    },
  ],
  students: [
    {
      id: 'std-1',
      code: 'ST-1001',
      fullName: 'يوسف أحمد الشناوي',
      phone: '01019283741',
      parentName: 'أحمد الشناوي',
      parentPhone: '01019283741',
      grade: 'الصف الثالث الثانوي',
      groupIds: ['grp-1', 'grp-2'],
      enrolledSubjects: ['الفيزياء', 'الكيمياء'],
      monthlyTuition: 620,
      balanceDue: 0,
      discountPercent: 0,
      status: 'ACTIVE',
      registeredAt: '2026-09-01',
      notes: 'طالب ملتزم ومتميز في الامتحانات الدورية',
      customFields: {
        'cf-std-alt-parent': 'الأم - 01099881122',
        'cf-std-payment-pref': 'نقدي بالخزينة',
      },
    },
    {
      id: 'std-2',
      code: 'ST-1002',
      fullName: 'مريم طارق العوضي',
      phone: '01224567890',
      parentName: 'طارق العوضي',
      parentPhone: '01224567890',
      grade: 'الصف الثالث الثانوي',
      groupIds: ['grp-1', 'grp-2'],
      enrolledSubjects: ['الفيزياء', 'الكيمياء'],
      monthlyTuition: 620,
      balanceDue: 300,
      discountPercent: 15,
      status: 'ACTIVE',
      registeredAt: '2026-09-03',
      notes: 'متبقي قسط مادة الكيمياء لشهر نوفمبر',
      customFields: {
        'cf-std-alt-parent': 'الخال - 01200112233',
        'cf-std-payment-pref': 'إنستا باي',
      },
    },
    {
      id: 'std-3',
      code: 'ST-1003',
      fullName: 'عمر خالد المنشاوي',
      phone: '01098765432',
      parentName: 'خالد المنشاوي',
      parentPhone: '01098765432',
      grade: 'الصف الثاني الثانوي',
      groupIds: ['grp-3'],
      enrolledSubjects: ['الرياضيات'],
      monthlyTuition: 340,
      balanceDue: 0,
      discountPercent: 0,
      status: 'ACTIVE',
      registeredAt: '2026-09-05',
      customFields: {
        'cf-std-alt-parent': 'الأم - 01144556611',
        'cf-std-payment-pref': 'فودافون كاش',
      },
    },
    {
      id: 'std-4',
      code: 'ST-1004',
      fullName: 'سلمى وائل الدسوقي',
      phone: '01155667788',
      parentName: 'وائل الدسوقي',
      parentPhone: '01155667788',
      grade: 'الصف الثالث الثانوي',
      groupIds: ['grp-1'],
      enrolledSubjects: ['الفيزياء'],
      monthlyTuition: 320,
      balanceDue: 320,
      discountPercent: 0,
      status: 'ACTIVE',
      registeredAt: '2026-09-10',
      notes: 'لم تسدد اشتراك شهر نوفمبر بعد',
      customFields: {
        'cf-std-alt-parent': 'الأم - 01122339988',
        'cf-std-payment-pref': 'نقدي بالخزينة',
      },
    },
    {
      id: 'std-5',
      code: 'ST-1005',
      fullName: 'كريم حسن الجندي',
      phone: '01066554433',
      parentName: 'حسن الجندي',
      parentPhone: '01066554433',
      grade: 'الصف الثاني الثانوي',
      groupIds: ['grp-3'],
      enrolledSubjects: ['الرياضيات'],
      monthlyTuition: 340,
      balanceDue: 170,
      discountPercent: 0,
      status: 'ACTIVE',
      registeredAt: '2026-09-12',
      customFields: {
        'cf-std-alt-parent': 'العم - 01022113344',
        'cf-std-payment-pref': 'فودافون كاش',
      },
    },
    {
      id: 'std-6',
      code: 'ST-1006',
      fullName: 'نور الدين سامي',
      phone: '01288776655',
      parentName: 'سامي عبد الرحمن',
      parentPhone: '01288776655',
      grade: 'الصف الأول الثانوي',
      groupIds: ['grp-4'],
      enrolledSubjects: ['الأحياء'],
      monthlyTuition: 300,
      balanceDue: 0,
      discountPercent: 25,
      status: 'ACTIVE',
      registeredAt: '2026-09-15',
      customFields: {
        'cf-std-alt-parent': 'الأم - 01277665544',
        'cf-std-payment-pref': 'نقدي بالخزينة',
      },
    },
  ],
  staff: [
    {
      id: 'stf-1',
      code: 'EMP-01',
      fullName: 'أحمد سمير عبد القادر',
      roleTitle: 'مدير التشغيل والاستقبال',
      phone: '01033445566',
      monthlySalary: 6500,
      shift: 'MORNING',
      accessLevel: 'ADMIN',
      status: 'ACTIVE',
      hiredAt: '2024-05-01',
      permissions: buildDefaultStaffPermissions('ADMIN'),
    },
    {
      id: 'stf-2',
      code: 'EMP-02',
      fullName: 'سارة نبيل محمود',
      roleTitle: 'مسؤولة الخزينة والحسابات',
      phone: '01144556677',
      monthlySalary: 5800,
      shift: 'MORNING',
      accessLevel: 'ACCOUNTANT',
      status: 'ACTIVE',
      hiredAt: '2025-02-15',
      permissions: buildDefaultStaffPermissions('ACCOUNTANT'),
    },
    {
      id: 'stf-3',
      code: 'EMP-03',
      fullName: 'مصطفى كمال السيد',
      roleTitle: 'مشرف القاعات والباركود',
      phone: '01255667788',
      monthlySalary: 4500,
      shift: 'EVENING',
      accessLevel: 'SUPERVISOR',
      status: 'ACTIVE',
      hiredAt: '2025-07-01',
      permissions: buildDefaultStaffPermissions('SUPERVISOR'),
    },
  ],
  transactions: [
    // نوفمبر 2026 (Current Month)
    {
      id: 'trx-101',
      receiptNumber: 'RCP-2026-116',
      type: 'TUITION_COLLECTION',
      title: 'دفعة اشتراكات مجموعة الفيزياء المكثفة (نوفمبر) - يوسف أحمد وزملاؤه',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 9600,
      discountApplied: 0,
      netAmount: 9600,
      teacherShare: 6720,
      centerShare: 2880,
      teacherId: 'tch-1',
      studentId: 'std-1',
      groupId: 'grp-1',
      monthKey: '2026-11',
      createdAt: '2026-11-01 09:30 ص',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-102',
      receiptNumber: 'RCP-2026-115',
      type: 'TUITION_COLLECTION',
      title: 'دفعة اشتراكات مجموعة الكيمياء العضوية (نوفمبر) - مريم طارق وزملاؤها',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 7800,
      discountApplied: 300,
      netAmount: 7500,
      teacherShare: 5250,
      centerShare: 2250,
      teacherId: 'tch-2',
      studentId: 'std-2',
      groupId: 'grp-2',
      monthKey: '2026-11',
      createdAt: '2026-11-01 10:15 ص',
      paymentMethod: 'INSTAPAY',
    },
    {
      id: 'trx-103',
      receiptNumber: 'RCP-2026-114',
      type: 'TUITION_COLLECTION',
      title: 'دفعة اشتراكات مجموعة الرياضيات التطبيقية (نوفمبر) - عمر خالد وزملاؤه',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 6800,
      discountApplied: 0,
      netAmount: 6800,
      teacherShare: 4760,
      centerShare: 2040,
      teacherId: 'tch-3',
      studentId: 'std-3',
      groupId: 'grp-3',
      monthKey: '2026-11',
      createdAt: '2026-11-01 11:00 ص',
      paymentMethod: 'VODAFONE_CASH',
    },
    {
      id: 'trx-104',
      receiptNumber: 'RCP-2026-113',
      type: 'TUITION_COLLECTION',
      title: 'دفعة اشتراكات مجموعة أساسيات الأحياء (نوفمبر) - نور الدين سامي وزملاؤه',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 5400,
      discountApplied: 200,
      netAmount: 5200,
      teacherShare: 3640,
      centerShare: 1560,
      teacherId: 'tch-4',
      studentId: 'std-6',
      groupId: 'grp-4',
      monthKey: '2026-11',
      createdAt: '2026-11-01 11:20 ص',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-105',
      receiptNumber: 'EXP-2026-01',
      type: 'EXPENSE',
      title: 'شراء ورق ومطبوعات ملازم المراجعة وأحبار طابعة',
      category: 'مطبوعات وتشغيل',
      grossAmount: 850,
      discountApplied: 0,
      netAmount: 850,
      teacherShare: 0,
      centerShare: -850,
      monthKey: '2026-11',
      createdAt: '2026-11-01 11:45 ص',
      paymentMethod: 'CASH',
      customFields: {
        'cf-exp-recipient': 'المطبعة الحديثة للأوفست',
      },
    },
    // أكتوبر 2026
    {
      id: 'trx-091',
      receiptNumber: 'RCP-2026-112',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الفيزياء المكثفة - شهر أكتوبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 8640,
      discountApplied: 0,
      netAmount: 8640,
      teacherShare: 6048,
      centerShare: 2592,
      teacherId: 'tch-1',
      groupId: 'grp-1',
      monthKey: '2026-10',
      createdAt: '2026-10-15 04:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-092',
      receiptNumber: 'RCP-2026-111',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الكيمياء العضوية - شهر أكتوبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 6900,
      discountApplied: 0,
      netAmount: 6900,
      teacherShare: 4830,
      centerShare: 2070,
      teacherId: 'tch-2',
      groupId: 'grp-2',
      monthKey: '2026-10',
      createdAt: '2026-10-14 06:00 م',
      paymentMethod: 'INSTAPAY',
    },
    {
      id: 'trx-093',
      receiptNumber: 'RCP-2026-110',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الرياضيات التطبيقية - شهر أكتوبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 6120,
      discountApplied: 0,
      netAmount: 6120,
      teacherShare: 4284,
      centerShare: 1836,
      teacherId: 'tch-3',
      groupId: 'grp-3',
      monthKey: '2026-10',
      createdAt: '2026-10-12 05:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-094',
      receiptNumber: 'RCP-2026-109',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة أساسيات الأحياء - شهر أكتوبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 4500,
      discountApplied: 0,
      netAmount: 4500,
      teacherShare: 3150,
      centerShare: 1350,
      teacherId: 'tch-4',
      groupId: 'grp-4',
      monthKey: '2026-10',
      createdAt: '2026-10-10 03:30 م',
      paymentMethod: 'VODAFONE_CASH',
    },
    // سبتمبر 2026
    {
      id: 'trx-081',
      receiptNumber: 'RCP-2026-108',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الفيزياء المكثفة - شهر سبتمبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 7680,
      discountApplied: 0,
      netAmount: 7680,
      teacherShare: 5376,
      centerShare: 2304,
      teacherId: 'tch-1',
      groupId: 'grp-1',
      monthKey: '2026-09',
      createdAt: '2026-09-18 04:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-082',
      receiptNumber: 'RCP-2026-107',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الكيمياء العضوية - شهر سبتمبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 6000,
      discountApplied: 0,
      netAmount: 6000,
      teacherShare: 4200,
      centerShare: 1800,
      teacherId: 'tch-2',
      groupId: 'grp-2',
      monthKey: '2026-09',
      createdAt: '2026-09-16 06:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-083',
      receiptNumber: 'RCP-2026-106',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الرياضيات التطبيقية - شهر سبتمبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 5440,
      discountApplied: 0,
      netAmount: 5440,
      teacherShare: 3808,
      centerShare: 1632,
      teacherId: 'tch-3',
      groupId: 'grp-3',
      monthKey: '2026-09',
      createdAt: '2026-09-14 05:00 م',
      paymentMethod: 'INSTAPAY',
    },
    {
      id: 'trx-084',
      receiptNumber: 'RCP-2026-105',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة أساسيات الأحياء - شهر سبتمبر',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 3900,
      discountApplied: 0,
      netAmount: 3900,
      teacherShare: 2730,
      centerShare: 1170,
      teacherId: 'tch-4',
      groupId: 'grp-4',
      monthKey: '2026-09',
      createdAt: '2026-09-11 03:00 م',
      paymentMethod: 'CASH',
    },
    // أغسطس 2026
    {
      id: 'trx-071',
      receiptNumber: 'RCP-2026-104',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الفيزياء المكثفة - شهر أغسطس',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 6400,
      discountApplied: 0,
      netAmount: 6400,
      teacherShare: 4480,
      centerShare: 1920,
      teacherId: 'tch-1',
      groupId: 'grp-1',
      monthKey: '2026-08',
      createdAt: '2026-08-20 04:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-072',
      receiptNumber: 'RCP-2026-103',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الكيمياء العضوية - شهر أغسطس',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 5100,
      discountApplied: 0,
      netAmount: 5100,
      teacherShare: 3570,
      centerShare: 1530,
      teacherId: 'tch-2',
      groupId: 'grp-2',
      monthKey: '2026-08',
      createdAt: '2026-08-18 06:00 م',
      paymentMethod: 'CASH',
    },
    {
      id: 'trx-073',
      receiptNumber: 'RCP-2026-102',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة الرياضيات التطبيقية - شهر أغسطس',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 4760,
      discountApplied: 0,
      netAmount: 4760,
      teacherShare: 3332,
      centerShare: 1428,
      teacherId: 'tch-3',
      groupId: 'grp-3',
      monthKey: '2026-08',
      createdAt: '2026-08-15 05:00 م',
      paymentMethod: 'VODAFONE_CASH',
    },
    {
      id: 'trx-074',
      receiptNumber: 'RCP-2026-101',
      type: 'TUITION_COLLECTION',
      title: 'تحصيل اشتراكات مجموعة أساسيات الأحياء - شهر أغسطس',
      category: 'اشتراكات الطلاب (70/30)',
      grossAmount: 3300,
      discountApplied: 0,
      netAmount: 3300,
      teacherShare: 2310,
      centerShare: 1170 - 180,
      teacherId: 'tch-4',
      groupId: 'grp-4',
      monthKey: '2026-08',
      createdAt: '2026-08-12 03:00 م',
      paymentMethod: 'CASH',
    },
  ],
  attendance: [
    {
      id: 'att-1',
      studentId: 'std-1',
      groupId: 'grp-1',
      date: '2026-11-01',
      time: '03:55 م',
      status: 'PRESENT',
      scannedVia: 'QR_CODE',
      sessionType: 'REGULAR',
    },
    {
      id: 'att-2',
      studentId: 'std-2',
      groupId: 'grp-1',
      date: '2026-11-01',
      time: '04:02 م',
      status: 'PRESENT',
      scannedVia: 'QR_CODE',
      sessionType: 'REGULAR',
    },
    {
      id: 'att-3',
      studentId: 'std-4',
      groupId: 'grp-1',
      date: '2026-11-01',
      time: '04:15 م',
      status: 'ABSENT',
      scannedVia: 'MANUAL',
      sessionType: 'REGULAR',
    },
  ],
  suggestions: [
    {
      id: 'sug-1',
      triggerType: 'ABSENCE',
      title: 'إشعار غياب طالب عن حصة الفيزياء',
      studentId: 'std-4',
      studentName: 'سلمى وائل الدسوقي',
      parentName: 'وائل الدسوقي',
      phone: '01155667788',
      groupName: 'مجموعة الفيزياء المكثفة (سبت وثلاثاء)',
      draftMessage:
        'تحية طيبة لولي أمر الطالبة سلمى وائل الدسوقي، نود إبلاغكم بتغيب الطالبة اليوم عن حصة الفيزياء (أ.د محمود رضوان). يرجى الاطمئنان والتواصل مع إدارة السنتر.',
      createdAt: 'منذ 15 دقيقة',
      status: 'PENDING',
    },
    {
      id: 'sug-2',
      triggerType: 'OVERDUE_PAYMENT',
      title: 'تذكير لطيف بموعد سداد اشتراك الشهر',
      studentId: 'std-2',
      studentName: 'مريم طارق العوضي',
      parentName: 'طارق العوضي',
      phone: '01224567890',
      groupName: 'مجموعة الكيمياء العضوية (أحد وأربعاء)',
      draftMessage:
        'عزيزي ولي أمر الطالبة مريم طارق العوضي، نذكركم بوجود رصيد متبقٍ قدره 300 ج.م لاشتراك مادة الكيمياء لشهر نوفمبر. شاكرين تعاونكم الدائم مع إدارة السنتر.',
      createdAt: 'منذ 40 دقيقة',
      status: 'PENDING',
    },
    {
      id: 'sug-3',
      triggerType: 'SESSION_RESCHEDULE',
      title: 'تعديل موعد حصة الرياضيات التطبيقية',
      studentId: 'std-5',
      studentName: 'كريم حسن الجندي',
      parentName: 'حسن الجندي',
      phone: '01066554433',
      groupName: 'مجموعة الرياضيات التطبيقية (اثنين وخميس)',
      draftMessage:
        'تنبيه هام لولي أمر الطالب كريم حسن الجندي: تم تقديم موعد حصة الرياضيات القادمة مع أ. طارق المنشاوي لتبدأ الساعة 02:30 م بدلاً من 03:00 م في قاعة الخوارزمي.',
      createdAt: 'منذ ساعة',
      status: 'PENDING',
    },
  ],
  auditLogs: [
    {
      id: 'aud-seed-1',
      actionCode: 'AUD-905',
      category: 'STUDENTS_PEOPLE',
      severity: 'CRITICAL',
      actionTitle: 'حذف سجل طالب من النظام',
      details:
        'تم حذف ملف الطالب "رامي عصام الششتاوي" (كود ST-1009 - الصف الثالث الثانوي) وفك ارتباطه من مجموعتي الفيزياء والكيمياء بناءً على طلب سحب الملف.',
      targetEntity: 'ST-1009 • رامي عصام الششتاوي',
      performedByUserId: 'usr-recep-1',
      performedByName: 'أ. سارة محمود (موظفة استقبال)',
      performedByUsername: 'reception_sara',
      performedByRole: 'RECEPTIONIST',
      timestamp: '2026-11-01 • 03:45 م',
      isoTimestamp: '2026-11-01T15:45:00.000Z',
    },
    {
      id: 'aud-seed-2',
      actionCode: 'AUD-904',
      category: 'TREASURY_FINANCE',
      severity: 'CRITICAL',
      actionTitle: 'تعديل حركة مالية في الخزنة',
      details:
        'تعديل قيمة إيصال الخزنة رقم RCP-2026-102 من 350 ج.م إلى 280 ج.م بعد تطبيق خصم التفوق الدراسي وإعادة احتساب صافي الخزينة.',
      targetEntity: 'RCP-2026-102 • خزينة السنتر',
      performedByUserId: 'usr-acc-1',
      performedByName: 'أ. وائل كمال (محاسب الخزينة)',
      performedByUsername: 'accountant_wael',
      performedByRole: 'ACCOUNTANT',
      timestamp: '2026-11-01 • 02:30 م',
      isoTimestamp: '2026-11-01T14:30:00.000Z',
    },
    {
      id: 'aud-seed-3',
      actionCode: 'AUD-903',
      category: 'TREASURY_FINANCE',
      severity: 'WARNING',
      actionTitle: 'صرف مصروف تشغيلي وخصم من الخزنة',
      details:
        'تسجيل حركة سحب من الخزينة بقيمة 450 ج.م تحت بند "مطبوعات وتشغيل" (شراء مذكرات مراجعة الفيزياء وأحبار تصوير) بإيصال EXP-2026-103.',
      targetEntity: 'EXP-2026-103 • -450 ج.م',
      performedByUserId: 'usr-acc-1',
      performedByName: 'أ. وائل كمال (محاسب الخزينة)',
      performedByUsername: 'accountant_wael',
      performedByRole: 'ACCOUNTANT',
      timestamp: '2026-11-01 • 01:15 م',
      isoTimestamp: '2026-11-01T13:15:00.000Z',
    },
    {
      id: 'aud-seed-4',
      actionCode: 'AUD-902',
      category: 'USERS_PERMISSIONS',
      severity: 'CRITICAL',
      actionTitle: 'تغيير صلاحيات مستخدم',
      details:
        'تحديث مصفوفة صلاحيات حساب "أ. أحمد نبيل (مدير مساعد)" وتفعيل صلاحية اعتماد رسائل الواتساب وإدارة المجموعات مع حجب تعديل الخزنة.',
      targetEntity: 'USR-02 • assistant_ahmed',
      performedByUserId: 'usr-admin-1',
      performedByName: 'د. محمود عبد العزيز (المدير العام)',
      performedByUsername: 'admin',
      performedByRole: 'SUPER_ADMIN',
      timestamp: '2026-11-01 • 11:20 ص',
      isoTimestamp: '2026-11-01T11:20:00.000Z',
    },
    {
      id: 'aud-seed-5',
      actionCode: 'AUD-901',
      category: 'ACADEMIC_GROUPS',
      severity: 'INFO',
      actionTitle: 'تحديث السعة الاستيعابية للمجموعة',
      details:
        'تعديل الحد الأقصى لمجموعة "مجموعة الفيزياء المكثفة (سبت وثلاثاء)" في قاعة ابن الهيثم الكبرى.',
      targetEntity: 'G-101 • الفيزياء',
      performedByUserId: 'usr-assist-1',
      performedByName: 'أ. أحمد نبيل (مدير مساعد)',
      performedByUsername: 'assistant_ahmed',
      performedByRole: 'ASSISTANT_ADMIN',
      timestamp: '2026-11-01 • 10:05 ص',
      isoTimestamp: '2026-11-01T10:05:00.000Z',
    },
  ],
};

export function formatAuditTimestamp(date: Date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${datePart} • ${timePart}`;
}

export function createAuditLogRecord(
  state: ERPDatabaseState,
  params: {
    category: SystemAuditCategory;
    severity: SystemAuditSeverity;
    actionTitle: string;
    details: string;
    targetEntity?: string;
  }
): SystemAuditLogEntry {
  const activeUser =
    state.users.find((u) => u.id === state.currentUserId) ||
    state.users.find((u) => u.role === 'SUPER_ADMIN') ||
    INITIAL_ERP_STATE.users[0];
  const now = new Date();
  const nextSeq = 900 + (Array.isArray(state.auditLogs) ? state.auditLogs.length : 0) + 1;

  return {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionCode: `AUD-${nextSeq}`,
    category: params.category,
    severity: params.severity,
    actionTitle: params.actionTitle,
    details: params.details,
    targetEntity: params.targetEntity,
    performedByUserId: activeUser.id,
    performedByName: activeUser.fullName,
    performedByUsername: activeUser.username,
    performedByRole: activeUser.role,
    timestamp: formatAuditTimestamp(now),
    isoTimestamp: now.toISOString(),
  };
}

function normalizeLoadedState(parsed: ERPDatabaseState): ERPDatabaseState {
  const cfg = parsed.config || INITIAL_ERP_STATE.config;
  const isLegacyThreeSecondaryOnly =
    Array.isArray(cfg.grades) &&
    cfg.grades.length === 3 &&
    cfg.grades.every((g) => g.includes('الثانوي'));

  return {
    ...parsed,
    config: {
      ...INITIAL_ERP_STATE.config,
      ...cfg,
      grades:
        !Array.isArray(cfg.grades) ||
        cfg.grades.length === 0 ||
        isLegacyThreeSecondaryOnly
          ? [...ACADEMIC_GRADES]
          : cfg.grades,
      subjects:
        Array.isArray(cfg.subjects) && cfg.subjects.length > 0
          ? cfg.subjects
          : [...ACADEMIC_SUBJECTS],
      expenseCategories:
        Array.isArray(cfg.expenseCategories) && cfg.expenseCategories.length > 0
          ? cfg.expenseCategories
          : [...DEFAULT_EXPENSE_CATEGORIES],
      customFields: Array.isArray(cfg.customFields)
        ? cfg.customFields
        : [...INITIAL_CUSTOM_FIELDS],
      messageTemplates: {
        ...DEFAULT_MESSAGE_TEMPLATES,
        ...(cfg.messageTemplates || {}),
      },
      exportBranding: {
        ...DEFAULT_EXPORT_BRANDING,
        ...(cfg.exportBranding || {}),
      },
    },
    staff: (parsed.staff || INITIAL_ERP_STATE.staff).map((s) => ({
      ...s,
      permissions: s.permissions || buildDefaultStaffPermissions(s.accessLevel),
    })),
    users:
      Array.isArray(parsed.users) && parsed.users.length > 0
        ? parsed.users
        : [...INITIAL_ERP_STATE.users],
    currentUserId:
      parsed.currentUserId &&
      (Array.isArray(parsed.users) ? parsed.users : INITIAL_ERP_STATE.users).some(
        (u) => u.id === parsed.currentUserId && u.status === 'ACTIVE'
      )
        ? parsed.currentUserId
        : 'usr-admin-1',
    auditLogs:
      Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
        ? parsed.auditLogs
        : [...INITIAL_ERP_STATE.auditLogs],
  };
}

type Listener = (state: ERPDatabaseState) => void;

class ERPStoreManager {
  private listeners: Set<Listener> = new Set();
  private memoryState: ERPDatabaseState = INITIAL_ERP_STATE;

  public getState(): ERPDatabaseState {
    if (typeof window === 'undefined') {
      return this.memoryState;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveState(INITIAL_ERP_STATE);
        return INITIAL_ERP_STATE;
      }
      const parsed = JSON.parse(raw) as ERPDatabaseState;
      if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.groups)) {
        return INITIAL_ERP_STATE;
      }
      return normalizeLoadedState(parsed);
    } catch {
      return INITIAL_ERP_STATE;
    }
  }

  public saveState(nextState: ERPDatabaseState): ERPDatabaseState {
    const stamped: ERPDatabaseState = normalizeLoadedState({
      ...nextState,
      lastUpdated: new Date().toISOString(),
    });
    this.memoryState = stamped;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
      } catch (e) {
        console.error('Failed to persist ERP state:', e);
      }
    }
    this.listeners.forEach((listener) => listener(stamped));
    return stamped;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public resetToDemoData(): ERPDatabaseState {
    return this.saveState(INITIAL_ERP_STATE);
  }

  // =========================================================================
  // 0. Dynamic Meta-Customization Engine (Custom Fields & Unlimited Categories)
  // =========================================================================

  public addCustomField(
    fieldInput: Omit<CustomFieldDefinition, 'id'>
  ): ERPDatabaseState {
    const state = this.getState();
    const cleanLabel = fieldInput.label.trim();
    if (!cleanLabel) return state;

    const newField: CustomFieldDefinition = {
      ...fieldInput,
      label: cleanLabel,
      id: `cf-${fieldInput.entity}-${Date.now()}`,
      options:
        fieldInput.type === 'select'
          ? (fieldInput.options || []).map((o) => o.trim()).filter(Boolean)
          : undefined,
    };

    return this.saveState({
      ...state,
      config: {
        ...state.config,
        customFields: [...state.config.customFields, newField],
      },
    });
  }

  public deleteCustomField(fieldId: string): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        customFields: state.config.customFields.filter((f) => f.id !== fieldId),
      },
    });
  }

  public addCategoryItem(
    categoryType: 'grades' | 'subjects' | 'expenseCategories',
    value: string
  ): ERPDatabaseState {
    const state = this.getState();
    const trimmed = value.trim();
    if (!trimmed) return state;
    const list = state.config[categoryType] || [];
    if (list.includes(trimmed)) return state;

    return this.saveState({
      ...state,
      config: {
        ...state.config,
        [categoryType]: [...list, trimmed],
      },
    });
  }

  public updateCategoryItem(
    categoryType: 'grades' | 'subjects' | 'expenseCategories',
    oldValue: string,
    newValue: string
  ): ERPDatabaseState {
    const state = this.getState();
    const trimmed = newValue.trim();
    if (!trimmed || oldValue === trimmed) return state;

    const updatedList = (state.config[categoryType] || []).map((item) =>
      item === oldValue ? trimmed : item
    );

    // Propagate rename across entities so relational integrity stays 100% intact
    let updatedStudents = state.students;
    let updatedTeachers = state.teachers;
    let updatedGroups = state.groups;
    let updatedTransactions = state.transactions;

    if (categoryType === 'grades') {
      updatedStudents = state.students.map((st) =>
        st.grade === oldValue ? { ...st, grade: trimmed } : st
      );
      updatedGroups = state.groups.map((grp) =>
        grp.grade === oldValue ? { ...grp, grade: trimmed } : grp
      );
      updatedTeachers = state.teachers.map((tch) => ({
        ...tch,
        grades: tch.grades.map((g) => (g === oldValue ? trimmed : g)),
      }));
    } else if (categoryType === 'subjects') {
      updatedGroups = state.groups.map((grp) =>
        grp.subject === oldValue ? { ...grp, subject: trimmed } : grp
      );
      updatedTeachers = state.teachers.map((tch) =>
        tch.subject === oldValue ? { ...tch, subject: trimmed } : tch
      );
      updatedStudents = state.students.map((st) => ({
        ...st,
        enrolledSubjects: st.enrolledSubjects.map((s) => (s === oldValue ? trimmed : s)),
      }));
    } else if (categoryType === 'expenseCategories') {
      updatedTransactions = state.transactions.map((tx) =>
        tx.category === oldValue ? { ...tx, category: trimmed } : tx
      );
    }

    return this.saveState({
      ...state,
      config: {
        ...state.config,
        [categoryType]: updatedList,
      },
      students: updatedStudents,
      teachers: updatedTeachers,
      groups: updatedGroups,
      transactions: updatedTransactions,
    });
  }

  public deleteCategoryItem(
    categoryType: 'grades' | 'subjects' | 'expenseCategories',
    value: string
  ): ERPDatabaseState {
    const state = this.getState();
    const list = state.config[categoryType] || [];
    if (list.length <= 1) return state; // Keep at least 1 item
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        [categoryType]: list.filter((item) => item !== value),
      },
    });
  }

  public updateMessageTemplate(
    key: MessageTemplateKey,
    templateText: string
  ): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        messageTemplates: {
          ...state.config.messageTemplates,
          [key]: templateText,
        },
      },
    });
  }

  // =========================================================================
  // 1. Academic & Group Mapping Operations
  // =========================================================================

  public addGroup(
    groupInput: Omit<GroupRecord, 'id' | 'code' | 'studentIds'>
  ): ERPDatabaseState {
    const state = this.getState();
    const newGroup: GroupRecord = {
      ...groupInput,
      id: `grp-${Date.now()}`,
      code: `G-${Math.floor(100 + Math.random() * 900)}`,
      studentIds: [],
    };
    return this.saveState({
      ...state,
      groups: [newGroup, ...state.groups],
    });
  }

  public saveGroup(
    groupInput: Omit<GroupRecord, 'id' | 'code' | 'studentIds'> & {
      id?: string;
      studentIds?: string[];
    }
  ): ERPDatabaseState {
    const state = this.getState();
    if (groupInput.id) {
      const updatedGroups = state.groups.map((g) =>
        g.id === groupInput.id
          ? {
              ...g,
              ...groupInput,
              id: g.id,
              code: g.code,
              studentIds: groupInput.studentIds ?? g.studentIds,
            }
          : g
      );
      return this.saveState({
        ...state,
        groups: updatedGroups,
      });
    }
    return this.addGroup(groupInput);
  }

  public deleteGroup(groupId: string): ERPDatabaseState {
    const state = this.getState();
    const targetGroup = state.groups.find((g) => g.id === groupId);
    const updatedGroups = state.groups.filter((g) => g.id !== groupId);
    const updatedStudents = state.students.map((st) => {
      if (!st.groupIds.includes(groupId)) return st;
      const nextGroupIds = st.groupIds.filter((id) => id !== groupId);
      const enrolledGroups = updatedGroups.filter((g) => nextGroupIds.includes(g.id));
      const enrolledSubjects = Array.from(new Set(enrolledGroups.map((g) => g.subject)));
      const monthlyTuition = enrolledGroups.reduce((sum, g) => sum + g.monthlyFee, 0);
      return {
        ...st,
        groupIds: nextGroupIds,
        enrolledSubjects,
        monthlyTuition,
      };
    });
    const auditEntry = createAuditLogRecord(state, {
      category: 'ACADEMIC_GROUPS',
      severity: 'CRITICAL',
      actionTitle: 'حذف مجموعة دراسية وفك ارتباط الطلاب',
      details: targetGroup
        ? `تم حذف المجموعة "${targetGroup.name}" (${targetGroup.code} - ${targetGroup.subject}) وإلغاء تسجيل ${targetGroup.studentIds.length} طلاب منها.`
        : `تم حذف مجموعة دراسية بمعرف (${groupId}).`,
      targetEntity: targetGroup ? `${targetGroup.code} • ${targetGroup.name}` : groupId,
    });
    return this.saveState({
      ...state,
      groups: updatedGroups,
      students: updatedStudents,
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public enrollStudentInGroup(studentId: string, groupId: string): ERPDatabaseState {
    const state = this.getState();
    const targetGroup = state.groups.find((g) => g.id === groupId);
    if (!targetGroup) return state;

    const updatedGroups = state.groups.map((g) => {
      if (g.id !== groupId) return g;
      if (g.studentIds.includes(studentId)) return g;
      return {
        ...g,
        studentIds: [...g.studentIds, studentId],
      };
    });

    const updatedStudents = state.students.map((st) => {
      if (st.id !== studentId) return st;
      const nextGroupIds = st.groupIds.includes(groupId)
        ? st.groupIds
        : [...st.groupIds, groupId];
      const enrolledGroups = updatedGroups.filter((g) => nextGroupIds.includes(g.id));
      const enrolledSubjects = Array.from(new Set(enrolledGroups.map((g) => g.subject)));
      const monthlyTuition = enrolledGroups.reduce((sum, g) => sum + g.monthlyFee, 0);
      const addedFee = st.groupIds.includes(groupId) ? 0 : targetGroup.monthlyFee;
      return {
        ...st,
        groupIds: nextGroupIds,
        enrolledSubjects,
        monthlyTuition,
        balanceDue: st.balanceDue + addedFee,
      };
    });

    return this.saveState({
      ...state,
      groups: updatedGroups,
      students: updatedStudents,
    });
  }

  public removeStudentFromGroup(studentId: string, groupId: string): ERPDatabaseState {
    const state = this.getState();
    const updatedGroups = state.groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        studentIds: g.studentIds.filter((id) => id !== studentId),
      };
    });

    const updatedStudents = state.students.map((st) => {
      if (st.id !== studentId) return st;
      const nextGroupIds = st.groupIds.filter((id) => id !== groupId);
      const enrolledGroups = updatedGroups.filter((g) => nextGroupIds.includes(g.id));
      const enrolledSubjects = Array.from(new Set(enrolledGroups.map((g) => g.subject)));
      const monthlyTuition = enrolledGroups.reduce((sum, g) => sum + g.monthlyFee, 0);
      return {
        ...st,
        groupIds: nextGroupIds,
        enrolledSubjects,
        monthlyTuition,
      };
    });

    return this.saveState({
      ...state,
      groups: updatedGroups,
      students: updatedStudents,
    });
  }

  /**
   * Generates manual WhatsApp notification drafts for all students in a group when a session is cancelled or rescheduled.
   */
  public triggerGroupSessionAlert(
    groupId: string,
    alertType: 'SESSION_CANCEL' | 'SESSION_RESCHEDULE',
    customNote: string
  ): { state: ERPDatabaseState; createdCount: number } {
    const state = this.getState();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return { state, createdCount: 0 };

    const teacher = state.teachers.find((t) => t.id === group.teacherId);
    const enrolledStudents = state.students.filter((s) => group.studentIds.includes(s.id));
    const template =
      state.config.messageTemplates[alertType] || DEFAULT_MESSAGE_TEMPLATES[alertType];

    const newDrafts: WhatsAppDraft[] = enrolledStudents.map((st, idx) => {
      const actionTitle =
        alertType === 'SESSION_CANCEL'
          ? `إلغاء/تأجيل حصة ${group.subject} (${group.name})`
          : `تغيير موعد حصة ${group.subject} (${group.name})`;

      const defaultReason =
        customNote.trim() ||
        (alertType === 'SESSION_CANCEL'
          ? 'نظراً لظرف طارئ، تم تأجيل حصة اليوم وسيتم تعويضها في الموعد القادم.'
          : `تم تعديل موعد الحصة القادمة لتكون في تمام ${group.scheduleTime} بقاعة ${group.room}.`);

      const formattedMessage =
        alertType === 'SESSION_CANCEL'
          ? `عزيزي ولي الأمر، تم إلغاء/تأجيل حصة ${group.subject} المقرر لها اليوم لمجموعة (${group.name}) مع ${
              teacher?.fullName || 'مدرس المادة'
            } — الطالب: ${st.fullName}. ${defaultReason}`
          : formatSmartMessageTemplate(template, {
              studentName: st.fullName,
              parentName: st.parentName,
              groupName: group.name,
              subject: group.subject,
              teacherName: teacher?.fullName || 'مدرس المادة',
              note: defaultReason,
              centerName: state.config.centerName,
            });

      return {
        id: `sug-${Date.now()}-${idx}`,
        triggerType: alertType,
        title: actionTitle,
        studentId: st.id,
        studentName: st.fullName,
        parentName: st.parentName,
        phone: st.parentPhone || st.phone,
        groupName: group.name,
        draftMessage: formattedMessage,
        createdAt: 'الآن',
        status: 'PENDING',
      };
    });

    const nextState = this.saveState({
      ...state,
      activeSession:
        state.activeSession?.groupId === groupId ? null : state.activeSession,
      suggestions: [...newDrafts, ...state.suggestions],
    });

    return { state: nextState, createdCount: newDrafts.length };
  }

  // =========================================================================
  // 1B. Session Lifecycle & Smart Automation Triggers (Start, Cancel, End)
  // =========================================================================

  /**
   * 1) Session Start Trigger ("بدء الحصة"):
   * Activates the session for the group, flags quick-payment collection open,
   * and returns the updated state + group metadata.
   */
  public startGroupSession(groupId: string): {
    state: ERPDatabaseState;
    group?: GroupRecord;
  } {
    const state = this.getState();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return { state };

    const nextState = this.saveState({
      ...state,
      activeSession: {
        groupId: group.id,
        startedAt: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        quickPayOpen: true,
      },
    });
    return { state: nextState, group };
  }

  public setQuickPayOpen(open: boolean): ERPDatabaseState {
    const state = this.getState();
    if (!state.activeSession) return state;
    return this.saveState({
      ...state,
      activeSession: {
        ...state.activeSession,
        quickPayOpen: open,
      },
    });
  }

  /**
   * 2) Session Cancellation Trigger ("إلغاء / تأجيل الحصة"):
   * Immediately queues WhatsApp drafts for all parents of students in the group
   * formatted as: "عزيزي ولي الأمر، تم إلغاء/تأجيل حصة [اسم المادة] المقرر لها اليوم..."
   */
  public cancelGroupSession(
    groupId: string,
    customReason?: string
  ): {
    state: ERPDatabaseState;
    createdCount: number;
    group?: GroupRecord;
  } {
    const state = this.getState();
    const group = state.groups.find((g) => g.id === groupId);
    const res = this.triggerGroupSessionAlert(
      groupId,
      'SESSION_CANCEL',
      customReason ||
        'يرجى العلم بأنه تم إلغاء/تأجيل حصة اليوم وسيتم إبلاغكم بالموعد التعويضي.'
    );
    return { ...res, group };
  }

  /**
   * 3) Session End Trigger ("إنهاء الحصة"):
   * Automatically scans the group roster, records attendance for the session,
   * identifies all students marked ABSENT or not checked in as PRESENT today,
   * and generates bulk WhatsApp absence drafts in the Manager's Approval Center:
   * "تنبيه: تغيب ابنكم/تاريخ اليوم عن حضور حصة..."
   */
  public endGroupSession(
    groupId: string,
    explicitAbsentStudentIds?: string[]
  ): {
    state: ERPDatabaseState;
    absentCount: number;
    presentCount: number;
    createdDraftIds: string[];
    group?: GroupRecord;
  } {
    const state = this.getState();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) {
      return {
        state,
        absentCount: 0,
        presentCount: 0,
        createdDraftIds: [],
      };
    }

    const teacher = state.teachers.find((t) => t.id === group.teacherId);
    const groupStudents = state.students.filter((s) =>
      group.studentIds.includes(s.id)
    );
    const todayIso = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Determine who is absent:
    // If explicitAbsentStudentIds is provided and non-empty, use it;
    // Otherwise check today's attendance records for this group:
    // Any student explicitly marked ABSENT today, OR (if some students were scanned today) any student not marked PRESENT today.
    let resolvedAbsentIds: string[] = [];
    if (
      Array.isArray(explicitAbsentStudentIds) &&
      explicitAbsentStudentIds.length > 0
    ) {
      resolvedAbsentIds = explicitAbsentStudentIds;
    } else {
      const todayGroupAtt = state.attendance.filter(
        (a) => a.groupId === group.id && (a.date === todayIso || a.date === '2026-11-01')
      );
      const explicitlyAbsentToday = todayGroupAtt
        .filter((a) => a.status === 'ABSENT')
        .map((a) => a.studentId);
      const presentTodayIds = new Set(
        todayGroupAtt
          .filter((a) => a.status === 'PRESENT')
          .map((a) => a.studentId)
      );

      if (presentTodayIds.size > 0 || explicitlyAbsentToday.length > 0) {
        resolvedAbsentIds = groupStudents
          .filter(
            (st) =>
              explicitlyAbsentToday.includes(st.id) ||
              !presentTodayIds.has(st.id)
          )
          .map((st) => st.id);
      } else {
        // Fallback if no one was scanned at all before clicking End Session:
        // Any student with balanceDue > 0 or last student in roster is flagged or all un-scanned
        resolvedAbsentIds = groupStudents.map((st) => st.id);
      }
    }

    const newEntries: AttendanceEntry[] = [];
    const newDrafts: WhatsAppDraft[] = [];
    const createdDraftIds: string[] = [];
    let presentCount = 0;
    let absentCount = 0;

    groupStudents.forEach((st, idx) => {
      const isAbsent = resolvedAbsentIds.includes(st.id);
      if (isAbsent) {
        absentCount += 1;
      } else {
        presentCount += 1;
      }

      newEntries.push({
        id: `att-end-${Date.now()}-${idx}`,
        studentId: st.id,
        groupId: group.id,
        date: todayIso,
        time: timeStr,
        status: isAbsent ? 'ABSENT' : 'PRESENT',
        scannedVia: 'BULK_GROUP',
        sessionType: 'REGULAR',
        note: isAbsent ? 'حصر غياب تلقائي عند إنهاء الحصة' : 'حضور معتمد بالحصة',
      });

      if (isAbsent) {
        const draftId = `sug-end-${Date.now()}-${idx}`;
        createdDraftIds.push(draftId);
        const draftMsg = `تنبيه: تغيب ابنكم/تاريخ اليوم (${todayIso}) الطالب/ة ${st.fullName} عن حضور حصة ${group.subject} (${group.name}) مع ${
          teacher?.fullName || 'مدرس المادة'
        }. يرجى التواصل مع إدارة ${state.config.centerName}.`;

        newDrafts.push({
          id: draftId,
          triggerType: 'ABSENCE',
          title: `تقرير غياب نهاية الحصة: ${group.subject} (${group.name})`,
          studentId: st.id,
          studentName: st.fullName,
          parentName: st.parentName,
          phone: st.parentPhone || st.phone,
          groupName: group.name,
          draftMessage: draftMsg,
          createdAt: 'الآن (نهاية الحصة)',
          status: 'PENDING',
        });
      }
    });

    const nextState = this.saveState({
      ...state,
      activeSession:
        state.activeSession?.groupId === groupId ? null : state.activeSession,
      attendance: [...newEntries, ...state.attendance],
      suggestions: [...newDrafts, ...state.suggestions],
    });

    return {
      state: nextState,
      absentCount,
      presentCount,
      createdDraftIds,
      group,
    };
  }

  // =========================================================================
  // 2B. Student Follow-Up Card Operations (Exam Grades & Notes)
  // =========================================================================

  public addStudentExamGrade(
    studentId: string,
    examInput: Omit<StudentExamRecord, 'id' | 'evaluation'> & {
      evaluation?: string;
    }
  ): ERPDatabaseState {
    const state = this.getState();
    const updatedStudents = state.students.map((st) => {
      if (st.id !== studentId) return st;
      const existingExams = buildDefaultExamGradesForStudent(st);
      const evaluation =
        examInput.evaluation?.trim() ||
        evaluateExamGrade(examInput.score, examInput.maxScore);
      const newExam: StudentExamRecord = {
        ...examInput,
        id: `ex-${Date.now()}`,
        evaluation,
      };
      return {
        ...st,
        examGrades: [newExam, ...existingExams],
      };
    });
    return this.saveState({
      ...state,
      students: updatedStudents,
    });
  }

  public addStudentFollowUpNote(
    studentId: string,
    noteInput: Omit<StudentNoteRecord, 'id' | 'date'>
  ): ERPDatabaseState {
    const state = this.getState();
    const updatedStudents = state.students.map((st) => {
      if (st.id !== studentId) return st;
      const existingNotes = buildDefaultFollowUpNotesForStudent(st);
      const newNote: StudentNoteRecord = {
        ...noteInput,
        id: `nt-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
      };
      return {
        ...st,
        notes: noteInput.content,
        followUpNotes: [newNote, ...existingNotes],
      };
    });
    return this.saveState({
      ...state,
      students: updatedStudents,
    });
  }

  // =========================================================================
  // 2. People Management CRUD (Students, Teachers, Staff)
  // =========================================================================

  public saveStudent(
    studentData: Omit<StudentRecord, 'id' | 'code' | 'registeredAt'> & { id?: string }
  ): ERPDatabaseState {
    const state = this.getState();
    let updatedStudents: StudentRecord[];
    let targetStudentId = studentData.id;
    let studentCode = '';
    const isEdit = Boolean(studentData.id);

    if (studentData.id) {
      const existing = state.students.find((s) => s.id === studentData.id);
      studentCode = existing?.code || 'ST-0000';
      updatedStudents = state.students.map((s) =>
        s.id === studentData.id ? { ...s, ...studentData, id: s.id, code: s.code } : s
      );
    } else {
      targetStudentId = `std-${Date.now()}`;
      studentCode = `ST-${1000 + state.students.length + 1}`;
      const newStudent: StudentRecord = {
        ...studentData,
        id: targetStudentId,
        code: studentCode,
        registeredAt: new Date().toISOString().slice(0, 10),
      };
      updatedStudents = [newStudent, ...state.students];
    }

    const updatedGroups = state.groups.map((grp) => {
      const shouldBeInGroup = studentData.groupIds.includes(grp.id);
      const isInGroup = grp.studentIds.includes(targetStudentId!);
      if (shouldBeInGroup && !isInGroup) {
        return { ...grp, studentIds: [...grp.studentIds, targetStudentId!] };
      }
      if (!shouldBeInGroup && isInGroup) {
        return {
          ...grp,
          studentIds: grp.studentIds.filter((id) => id !== targetStudentId),
        };
      }
      return grp;
    });

    const auditEntry = createAuditLogRecord(state, {
      category: 'STUDENTS_PEOPLE',
      severity: isEdit ? 'WARNING' : 'INFO',
      actionTitle: isEdit ? 'تعديل سجل وبيانات طالب' : 'إضافة وتسجيل طالب جديد',
      details: isEdit
        ? `تم تعديل ملف الطالب "${studentData.fullName}" (${studentCode} - ${studentData.grade}) وتحديث مجموعاته والرصيد المتبقي (${studentData.balanceDue} ${state.config.currency}).`
        : `تم تسجيل الطالب الجديد "${studentData.fullName}" (${studentCode} - ${studentData.grade}) وربطه بـ ${studentData.groupIds.length} مجموعات دراسية.`,
      targetEntity: `${studentCode} • ${studentData.fullName}`,
    });

    return this.saveState({
      ...state,
      students: updatedStudents,
      groups: updatedGroups,
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public deleteStudent(studentId: string): ERPDatabaseState {
    const state = this.getState();
    const targetStudent = state.students.find((s) => s.id !== undefined && s.id === studentId);
    const auditEntry = createAuditLogRecord(state, {
      category: 'STUDENTS_PEOPLE',
      severity: 'CRITICAL',
      actionTitle: 'حذف سجل طالب من النظام',
      details: targetStudent
        ? `تم حذف سجل الطالب "${targetStudent.fullName}" (كود ${targetStudent.code} - ${targetStudent.grade}) نهائياً وإزالته من ${targetStudent.groupIds.length} مجموعات (كان عليه رصيد مستحق: ${targetStudent.balanceDue} ${state.config.currency}).`
        : `تم حذف سجل طالب بمعرف (${studentId}) من قاعدة بيانات السنتر.`,
      targetEntity: targetStudent
        ? `${targetStudent.code} • ${targetStudent.fullName}`
        : studentId,
    });
    return this.saveState({
      ...state,
      students: state.students.filter((s) => s.id !== studentId),
      groups: state.groups.map((g) => ({
        ...g,
        studentIds: g.studentIds.filter((id) => id !== studentId),
      })),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public saveTeacher(
    teacherData: Omit<TeacherRecord, 'id' | 'code' | 'hiredAt'> & { id?: string }
  ): ERPDatabaseState {
    const state = this.getState();
    if (teacherData.id) {
      const existing = state.teachers.find((t) => t.id === teacherData.id);
      const auditEntry = createAuditLogRecord(state, {
        category: 'STUDENTS_PEOPLE',
        severity: 'WARNING',
        actionTitle: 'تعديل بيانات ونسب مدرس مالية',
        details: `تم تحديث بيانات المدرس "${teacherData.fullName}" (${existing?.code || 'TR'}) لمادة ${teacherData.subject} وتعديل نسبة الشراكة المالية إلى ${teacherData.splitPercentage}%.`,
        targetEntity: `${existing?.code || 'TR'} • ${teacherData.fullName}`,
      });
      return this.saveState({
        ...state,
        teachers: state.teachers.map((t) =>
          t.id === teacherData.id ? { ...t, ...teacherData, id: t.id, code: t.code } : t
        ),
        auditLogs: [auditEntry, ...state.auditLogs],
      });
    }
    const newCode = `TR-${200 + state.teachers.length + 1}`;
    const newTeacher: TeacherRecord = {
      ...teacherData,
      id: `tch-${Date.now()}`,
      code: newCode,
      hiredAt: new Date().toISOString().slice(0, 10),
    };
    const auditEntry = createAuditLogRecord(state, {
      category: 'STUDENTS_PEOPLE',
      severity: 'INFO',
      actionTitle: 'إضافة مدرس جديد للكادر الأكاديمي',
      details: `تم التعاقد مع المدرس "${teacherData.fullName}" (${newCode}) لتدريس مادة ${teacherData.subject} بنسبة شراكة ${teacherData.splitPercentage}%.`,
      targetEntity: `${newCode} • ${teacherData.fullName}`,
    });
    return this.saveState({
      ...state,
      teachers: [newTeacher, ...state.teachers],
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public deleteTeacher(teacherId: string): ERPDatabaseState {
    const state = this.getState();
    const targetTeacher = state.teachers.find((t) => t.id === teacherId);
    const auditEntry = createAuditLogRecord(state, {
      category: 'STUDENTS_PEOPLE',
      severity: 'CRITICAL',
      actionTitle: 'حذف سجل مدرس من الكادر الأكاديمي',
      details: targetTeacher
        ? `تم حذف ملف المدرس "${targetTeacher.fullName}" (${targetTeacher.code} - مادة ${targetTeacher.subject}) من سجلات السنتر.`
        : `تم حذف سجل مدرس بمعرف (${teacherId}).`,
      targetEntity: targetTeacher
        ? `${targetTeacher.code} • ${targetTeacher.fullName}`
        : teacherId,
    });
    return this.saveState({
      ...state,
      teachers: state.teachers.filter((t) => t.id !== teacherId),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public saveStaff(
    staffData: Omit<StaffRecord, 'id' | 'code' | 'hiredAt'> & { id?: string }
  ): ERPDatabaseState {
    const state = this.getState();
    const resolvedPermissions =
      staffData.permissions || buildDefaultStaffPermissions(staffData.accessLevel);

    if (staffData.id) {
      return this.saveState({
        ...state,
        staff: state.staff.map((s) =>
          s.id === staffData.id
            ? {
                ...s,
                ...staffData,
                permissions: resolvedPermissions,
                id: s.id,
                code: s.code,
              }
            : s
        ),
      });
    }
    const newStaff: StaffRecord = {
      ...staffData,
      permissions: resolvedPermissions,
      id: `stf-${Date.now()}`,
      code: `EMP-0${state.staff.length + 1}`,
      hiredAt: new Date().toISOString().slice(0, 10),
    };
    return this.saveState({
      ...state,
      staff: [newStaff, ...state.staff],
    });
  }

  public updateStaffPermissions(
    staffId: string,
    permissions: StaffPermissionsMap
  ): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      staff: state.staff.map((s) =>
        s.id === staffId ? { ...s, permissions } : s
      ),
    });
  }

  public deleteStaff(staffId: string): ERPDatabaseState {
    const state = this.getState();
    const targetStaff = state.staff.find((s) => s.id === staffId);
    const auditEntry = createAuditLogRecord(state, {
      category: 'STUDENTS_PEOPLE',
      severity: 'CRITICAL',
      actionTitle: 'حذف سجل موظف إداري',
      details: targetStaff
        ? `تم حذف ملف الموظف "${targetStaff.fullName}" (${targetStaff.code} - ${targetStaff.roleTitle}) من سجلات الموظفين.`
        : `تم حذف سجل موظف بمعرف (${staffId}).`,
      targetEntity: targetStaff ? `${targetStaff.code} • ${targetStaff.fullName}` : staffId,
    });
    return this.saveState({
      ...state,
      staff: state.staff.filter((s) => s.id !== staffId),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  // =========================================================================
  // 3. Financial Treasury, Dynamic Split & Installment Engine
  // =========================================================================

  public collectStudentPayment(params: {
    studentId: string;
    groupId: string;
    grossAmount: number;
    paidAmount?: number; // Optional partial installment paid today
    discountPercent?: number;
    paymentMethod: 'CASH' | 'INSTAPAY' | 'VODAFONE_CASH';
    customFields?: Record<string, string>;
  }): ERPDatabaseState {
    const state = this.getState();
    const student = state.students.find((s) => s.id === params.studentId);
    const group = state.groups.find((g) => g.id === params.groupId);
    const teacher = state.teachers.find((t) => t.id === group?.teacherId);

    const splitPercent = resolveEffectiveTeacherSplit(
      teacher,
      group,
      state.config.defaultTeacherSplit
    );
    const discountPct = params.discountPercent ?? student?.discountPercent ?? 0;

    const split = calculateRevenueSplit(
      params.grossAmount,
      discountPct,
      splitPercent,
      params.paidAmount
    );

    const isInstallment = split.remainingInstallment > 0;
    const receiptNumber = `RCP-2026-${100 + state.transactions.length + 1}`;

    const newTx: TreasuryTransaction = {
      id: `trx-${Date.now()}`,
      receiptNumber,
      type: 'TUITION_COLLECTION',
      title: isInstallment
        ? `سداد قسط جزئي (${split.netAmount} من ${split.netRequiredAmount}) ${
            group?.subject || 'مادة'
          } - ${student?.fullName || 'طالب'}`
        : `سداد اشتراك ${group?.subject || 'مادة'} - ${student?.fullName || 'طالب'}`,
      category: `اشتراكات الطلاب (${splitPercent}/${100 - splitPercent})`,
      grossAmount: split.grossAmount,
      discountApplied: split.discountApplied,
      requiredAmount: split.netRequiredAmount,
      netAmount: split.netAmount,
      remainingInstallment: split.remainingInstallment,
      isInstallment,
      teacherShare: split.teacherShare,
      centerShare: split.centerShare,
      teacherId: teacher?.id,
      studentId: student?.id,
      groupId: group?.id,
      monthKey: '2026-11',
      createdAt: `2026-11-01 ${new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      paymentMethod: params.paymentMethod,
      customFields: params.customFields,
    };

    const updatedStudents = state.students.map((st) => {
      if (st.id !== params.studentId) return st;
      // If student paid an installment, remainingInstallment stays on their balanceDue
      const nextBalance = isInstallment
        ? Math.max(0, st.balanceDue - split.netAmount) || split.remainingInstallment
        : Math.max(0, st.balanceDue - split.grossAmount);
      return {
        ...st,
        balanceDue: nextBalance,
      };
    });

    let updatedSuggestions = state.suggestions;

    if (isInstallment && student && group) {
      const template =
        state.config.messageTemplates.INSTALLMENT_REMAINING ||
        DEFAULT_MESSAGE_TEMPLATES.INSTALLMENT_REMAINING;
      const draftMsg = formatSmartMessageTemplate(template, {
        studentName: student.fullName,
        parentName: student.parentName,
        groupName: group.name,
        subject: group.subject,
        teacherName: teacher?.fullName || '',
        amount: split.netAmount,
        remainingAmount: split.remainingInstallment,
        currency: state.config.currency,
        centerName: state.config.centerName,
      });

      const installmentDraft: WhatsAppDraft = {
        id: `sug-inst-${Date.now()}`,
        triggerType: 'INSTALLMENT_REMAINING',
        title: `إيصال قسط جزئي ومتبقي (${split.remainingInstallment} ${state.config.currency})`,
        studentId: student.id,
        studentName: student.fullName,
        parentName: student.parentName,
        phone: student.parentPhone || student.phone,
        groupName: group.name,
        draftMessage: draftMsg,
        createdAt: 'الآن',
        status: 'PENDING',
      };
      updatedSuggestions = [installmentDraft, ...state.suggestions];
    }

    const auditEntry = createAuditLogRecord(state, {
      category: 'TREASURY_FINANCE',
      severity: 'INFO',
      actionTitle: 'تحصيل اشتراك وإيداع بالخزنة',
      details: `تحصيل مبلغ ${split.netAmount} ${state.config.currency} من الطالب "${
        student?.fullName || 'طالب'
      }" لمجموعة "${group?.name || '—'}" بإيصال رقم ${receiptNumber} (حصة السنتر: +${
        split.centerShare
      } ${state.config.currency}).`,
      targetEntity: `${receiptNumber} • +${split.netAmount} ${state.config.currency}`,
    });

    return this.saveState({
      ...state,
      students: updatedStudents,
      transactions: [newTx, ...state.transactions],
      suggestions: updatedSuggestions,
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public recordOperationalExpense(params: {
    title: string;
    category: string;
    amount: number;
    type?: 'EXPENSE' | 'PAYROLL';
    staffId?: string;
    paymentMethod: 'CASH' | 'INSTAPAY' | 'VODAFONE_CASH';
    customFields?: Record<string, string>;
  }): ERPDatabaseState {
    const state = this.getState();
    const cleanAmount = Math.max(0, Number(params.amount) || 0);
    const txType = params.type || 'EXPENSE';
    const receiptNumber = `${txType === 'PAYROLL' ? 'PAY' : 'EXP'}-2026-${
      100 + state.transactions.length + 1
    }`;

    const newTx: TreasuryTransaction = {
      id: `trx-${Date.now()}`,
      receiptNumber,
      type: txType,
      title: params.title,
      category: params.category,
      grossAmount: cleanAmount,
      discountApplied: 0,
      netAmount: cleanAmount,
      teacherShare: 0,
      centerShare: -cleanAmount,
      staffId: params.staffId,
      createdAt: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      paymentMethod: params.paymentMethod,
      customFields: params.customFields,
    };

    const auditEntry = createAuditLogRecord(state, {
      category: 'TREASURY_FINANCE',
      severity: 'WARNING',
      actionTitle:
        txType === 'PAYROLL'
          ? 'صرف راتب وخصم من الخزنة'
          : 'تسجيل مصروف تشغيلي وخصم من الخزنة',
      details: `خصم مبلغ ${cleanAmount} ${state.config.currency} من خزينة السنتر لبيان "${params.title}" ضمن بند (${params.category}) بإيصال ${receiptNumber}.`,
      targetEntity: `${receiptNumber} • -${cleanAmount} ${state.config.currency}`,
    });

    return this.saveState({
      ...state,
      transactions: [newTx, ...state.transactions],
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public updateTreasuryTransaction(
    txId: string,
    updates: {
      title?: string;
      netAmount?: number;
      category?: string;
      paymentMethod?: 'CASH' | 'INSTAPAY' | 'VODAFONE_CASH';
      reason?: string;
    }
  ): ERPDatabaseState {
    const state = this.getState();
    const targetTx = state.transactions.find((t) => t.id === txId);
    if (!targetTx) return state;

    const oldAmount = targetTx.netAmount;
    const nextAmount =
      updates.netAmount !== undefined && !Number.isNaN(Number(updates.netAmount))
        ? Math.max(0, Number(updates.netAmount))
        : targetTx.netAmount;
    const nextTitle = updates.title?.trim() || targetTx.title;
    const nextCategory = updates.category?.trim() || targetTx.category;
    const nextMethod = updates.paymentMethod || targetTx.paymentMethod;

    let nextTeacherShare = targetTx.teacherShare;
    let nextCenterShare = targetTx.centerShare;

    if (targetTx.type === 'TUITION_COLLECTION') {
      const ratio =
        targetTx.netAmount > 0 ? targetTx.teacherShare / targetTx.netAmount : 0.7;
      nextTeacherShare = Math.round(nextAmount * ratio);
      nextCenterShare = nextAmount - nextTeacherShare;
    } else {
      nextTeacherShare = 0;
      nextCenterShare = -nextAmount;
    }

    const updatedTransactions = state.transactions.map((t) =>
      t.id === txId
        ? {
            ...t,
            title: nextTitle,
            category: nextCategory,
            paymentMethod: nextMethod,
            grossAmount: nextAmount,
            netAmount: nextAmount,
            teacherShare: nextTeacherShare,
            centerShare: nextCenterShare,
          }
        : t
    );

    const reasonSuffix = updates.reason?.trim()
      ? ` — سبب التعديل: ${updates.reason.trim()}`
      : '';

    const auditEntry = createAuditLogRecord(state, {
      category: 'TREASURY_FINANCE',
      severity: 'CRITICAL',
      actionTitle: 'تعديل حركة مالية في الخزنة',
      details: `تم تعديل حركة الخزنة رقم (${targetTx.receiptNumber}) لبيان "${nextTitle}" من مبلغ ${oldAmount} ${state.config.currency} إلى ${nextAmount} ${state.config.currency}${reasonSuffix}.`,
      targetEntity: `${targetTx.receiptNumber} • ${oldAmount} ← ${nextAmount} ${state.config.currency}`,
    });

    return this.saveState({
      ...state,
      transactions: updatedTransactions,
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public deleteTreasuryTransaction(txId: string, reason?: string): ERPDatabaseState {
    const state = this.getState();
    const targetTx = state.transactions.find((t) => t.id === txId);
    if (!targetTx) return state;

    const reasonSuffix = reason?.trim() ? ` (السبب: ${reason.trim()})` : '';
    const auditEntry = createAuditLogRecord(state, {
      category: 'TREASURY_FINANCE',
      severity: 'CRITICAL',
      actionTitle: 'حذف حركة مالية من الخزنة',
      details: `تم حذف حركة الخزنة رقم (${targetTx.receiptNumber}) الخاصة بـ "${targetTx.title}" بقيمة ${targetTx.netAmount} ${state.config.currency} وإعادة احتساب رصيد الخزينة${reasonSuffix}.`,
      targetEntity: `${targetTx.receiptNumber} • ${targetTx.netAmount} ${state.config.currency}`,
    });

    return this.saveState({
      ...state,
      transactions: state.transactions.filter((t) => t.id !== txId),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  // =========================================================================
  // 4. Flexible Attendance (QR, Bulk Group Attendance, Make-up Sessions)
  // =========================================================================

  public recordAttendance(params: {
    studentId: string;
    groupId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    scannedVia: 'QR_CODE' | 'MANUAL' | 'BULK_GROUP' | 'MAKEUP_SESSION';
    sessionType?: 'REGULAR' | 'MAKEUP_EXCEPTION';
    note?: string;
  }): ERPDatabaseState {
    const state = this.getState();
    const student = state.students.find((s) => s.id === params.studentId);
    const group = state.groups.find((g) => g.id === params.groupId);
    const teacher = state.teachers.find((t) => t.id === group?.teacherId);

    const newEntry: AttendanceEntry = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: params.studentId,
      groupId: params.groupId,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: params.status,
      scannedVia: params.scannedVia,
      sessionType: params.sessionType || 'REGULAR',
      note: params.note,
    };

    let updatedSuggestions = state.suggestions;

    if (params.status === 'ABSENT' && student && group) {
      const template =
        state.config.messageTemplates.ABSENCE || DEFAULT_MESSAGE_TEMPLATES.ABSENCE;
      const draftMsg = formatSmartMessageTemplate(template, {
        studentName: student.fullName,
        parentName: student.parentName,
        groupName: group.name,
        subject: group.subject,
        teacherName: teacher?.fullName || '',
        centerName: state.config.centerName,
      });

      const draft: WhatsAppDraft = {
        id: `sug-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        triggerType: 'ABSENCE',
        title: `إشعار غياب طالب: ${group.subject}`,
        studentId: student.id,
        studentName: student.fullName,
        parentName: student.parentName,
        phone: student.parentPhone || student.phone,
        groupName: group.name,
        draftMessage: draftMsg,
        createdAt: 'الآن',
        status: 'PENDING',
      };
      updatedSuggestions = [draft, ...state.suggestions];
    }

    return this.saveState({
      ...state,
      attendance: [newEntry, ...state.attendance],
      suggestions: updatedSuggestions,
    });
  }

  /**
   * Bulk Group Attendance: Marks the entire group as PRESENT except the specified absentStudentIds,
   * and automatically queues WhatsApp absence drafts for the excluded absent students.
   */
  public recordBulkGroupAttendance(params: {
    groupId: string;
    absentStudentIds: string[];
  }): {
    state: ERPDatabaseState;
    presentCount: number;
    absentCount: number;
  } {
    const state = this.getState();
    const group = state.groups.find((g) => g.id === params.groupId);
    if (!group) {
      return { state, presentCount: 0, absentCount: 0 };
    }

    const teacher = state.teachers.find((t) => t.id === group.teacherId);
    const groupStudents = state.students.filter((s) => group.studentIds.includes(s.id));
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntries: AttendanceEntry[] = [];
    const newDrafts: WhatsAppDraft[] = [];
    let presentCount = 0;
    let absentCount = 0;

    const template =
      state.config.messageTemplates.ABSENCE || DEFAULT_MESSAGE_TEMPLATES.ABSENCE;

    groupStudents.forEach((st, idx) => {
      const isAbsent = params.absentStudentIds.includes(st.id);
      if (isAbsent) {
        absentCount += 1;
      } else {
        presentCount += 1;
      }

      newEntries.push({
        id: `att-bulk-${Date.now()}-${idx}`,
        studentId: st.id,
        groupId: group.id,
        date: dateStr,
        time: timeStr,
        status: isAbsent ? 'ABSENT' : 'PRESENT',
        scannedVia: 'BULK_GROUP',
        sessionType: 'REGULAR',
      });

      if (isAbsent) {
        const draftMsg = formatSmartMessageTemplate(template, {
          studentName: st.fullName,
          parentName: st.parentName,
          groupName: group.name,
          subject: group.subject,
          teacherName: teacher?.fullName || '',
          centerName: state.config.centerName,
        });
        newDrafts.push({
          id: `sug-bulk-${Date.now()}-${idx}`,
          triggerType: 'ABSENCE',
          title: `إشعار غياب طالب: ${group.subject}`,
          studentId: st.id,
          studentName: st.fullName,
          parentName: st.parentName,
          phone: st.parentPhone || st.phone,
          groupName: group.name,
          draftMessage: draftMsg,
          createdAt: 'الآن',
          status: 'PENDING',
        });
      }
    });

    const nextState = this.saveState({
      ...state,
      attendance: [...newEntries, ...state.attendance],
      suggestions: [...newDrafts, ...state.suggestions],
    });

    return {
      state: nextState,
      presentCount,
      absentCount,
    };
  }

  public generateOverduePaymentSuggestions(): {
    state: ERPDatabaseState;
    addedCount: number;
  } {
    const state = this.getState();
    const overdueStudents = state.students.filter(
      (s) => s.balanceDue > 0 && s.status === 'ACTIVE'
    );
    const newDrafts: WhatsAppDraft[] = [];
    const template =
      state.config.messageTemplates.OVERDUE_PAYMENT ||
      DEFAULT_MESSAGE_TEMPLATES.OVERDUE_PAYMENT;

    overdueStudents.forEach((st, idx) => {
      const alreadyPending = state.suggestions.some(
        (sug) =>
          sug.studentId === st.id &&
          (sug.triggerType === 'OVERDUE_PAYMENT' ||
            sug.triggerType === 'INSTALLMENT_REMAINING') &&
          sug.status === 'PENDING'
      );
      if (!alreadyPending) {
        const draftMsg = formatSmartMessageTemplate(template, {
          studentName: st.fullName,
          parentName: st.parentName,
          remainingAmount: st.balanceDue,
          amount: st.balanceDue,
          currency: state.config.currency,
          centerName: state.config.centerName,
          groupName: st.grade,
        });

        newDrafts.push({
          id: `sug-ovd-${Date.now()}-${idx}`,
          triggerType: 'OVERDUE_PAYMENT',
          title: `تذكير بسداد مصروفات متأخرة (${st.balanceDue} ${state.config.currency})`,
          studentId: st.id,
          studentName: st.fullName,
          parentName: st.parentName,
          phone: st.parentPhone || st.phone,
          groupName: st.grade,
          draftMessage: draftMsg,
          createdAt: 'الآن',
          status: 'PENDING',
        });
      }
    });

    const nextState = this.saveState({
      ...state,
      suggestions: [...newDrafts, ...state.suggestions],
    });
    return { state: nextState, addedCount: newDrafts.length };
  }

  public updateSuggestionMessage(
    suggestionId: string,
    newMessage: string
  ): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      suggestions: state.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, draftMessage: newMessage } : s
      ),
    });
  }

  public approveSuggestions(suggestionIds: string[]): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      suggestions: state.suggestions.map((s) =>
        suggestionIds.includes(s.id) ? { ...s, status: 'APPROVED_SENT' } : s
      ),
    });
  }

  public rejectSuggestions(suggestionIds: string[]): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      suggestions: state.suggestions.map((s) =>
        suggestionIds.includes(s.id) ? { ...s, status: 'REJECTED' } : s
      ),
    });
  }

  public deleteSuggestion(suggestionId: string): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      suggestions: state.suggestions.filter((s) => s.id !== suggestionId),
    });
  }

  public addCustomSuggestion(
    draft: Omit<WhatsAppDraft, 'id' | 'createdAt' | 'status'>
  ): ERPDatabaseState {
    const state = this.getState();
    const newSug: WhatsAppDraft = {
      ...draft,
      id: `sug-${Date.now()}`,
      createdAt: 'الآن',
      status: 'PENDING',
    };
    return this.saveState({
      ...state,
      suggestions: [newSug, ...state.suggestions],
    });
  }

  // =========================================================================
  // 5. Super Admin Configuration & Discounts
  // =========================================================================

  public updateConfig(partial: Partial<CenterConfig>): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        ...partial,
      },
    });
  }

  public updateExportBranding(
    partial: Partial<ExportBrandingConfig>
  ): ERPDatabaseState {
    const state = this.getState();
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        exportBranding: {
          ...(state.config.exportBranding || DEFAULT_EXPORT_BRANDING),
          ...partial,
        },
      },
    });
  }

  public toggleSection(section: ModuleSectionKey): ERPDatabaseState {
    const state = this.getState();
    if (section === 'settings' || section === 'users_permissions') return state;
    return this.saveState({
      ...state,
      config: {
        ...state.config,
        enabledSections: {
          ...state.config.enabledSections,
          [section]: !state.config.enabledSections[section],
        },
      },
    });
  }

  // =========================================================================
  // 6. Super Admin Users & Dynamic Permissions Engine (RBAC & Auth)
  // =========================================================================

  public getCurrentUser(): SystemUserRecord {
    const state = this.getState();
    return (
      state.users.find((u) => u.id === state.currentUserId) ||
      state.users.find((u) => u.role === 'SUPER_ADMIN') ||
      INITIAL_ERP_STATE.users[0]
    );
  }

  public saveSystemUser(
    userInput: Omit<SystemUserRecord, 'id' | 'code' | 'createdAt'> & { id?: string }
  ): { state: ERPDatabaseState; error?: string } {
    const state = this.getState();
    const cleanUsername = userInput.username.trim();
    const cleanFullName = userInput.fullName.trim();
    if (!cleanUsername || !cleanFullName) {
      return { state, error: 'يرجى إدخال اسم المستخدم واسم الدخول بالكامل.' };
    }

    const duplicate = state.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() &&
        u.id !== userInput.id
    );
    if (duplicate) {
      return {
        state,
        error: `اسم الدخول "${cleanUsername}" مستخدم بالفعل لحساب آخر.`,
      };
    }

    if (userInput.id) {
      const existingUser = state.users.find((u) => u.id === userInput.id);
      const updatedUsers = state.users.map((u) => {
        if (u.id !== userInput.id) return u;
        const isPrimary = Boolean(u.isPrimarySuperAdmin);
        return {
          ...u,
          fullName: cleanFullName,
          username: cleanUsername,
          password: userInput.password.trim() || u.password,
          role: isPrimary ? 'SUPER_ADMIN' : userInput.role,
          status: isPrimary ? 'ACTIVE' : userInput.status,
          permissions: isPrimary
            ? buildDefaultPermissionsForRole('SUPER_ADMIN')
            : { ...userInput.permissions },
        };
      });
      const grantedList = [
        userInput.permissions.manageStudents && 'إدارة الطلاب',
        userInput.permissions.manageGroupsAndTeachers && 'المجموعات والمدرسين',
        userInput.permissions.manageFinance && 'المالية والخزنة',
        userInput.permissions.manageWhatsApp && 'موافقات الواتساب',
        userInput.permissions.manageSettingsAndBackup && 'الإعدادات والنسخ الاحتياطي',
      ]
        .filter(Boolean)
        .join('، ');
      const roleLabel =
        SYSTEM_ROLE_LABELS[userInput.role] || userInput.role;
      const prevRoleLabel = existingUser
        ? SYSTEM_ROLE_LABELS[existingUser.role] || existingUser.role
        : roleLabel;
      const auditEntry = createAuditLogRecord(state, {
        category: 'USERS_PERMISSIONS',
        severity: 'CRITICAL',
        actionTitle: 'تغيير صلاحيات مستخدم',
        details: `تم تعديل صلاحيات المستخدم "${cleanFullName}" (@${cleanUsername}) • الدور الوظيفي: ${roleLabel} • الصلاحيات المفعلة: (${
          grantedList || 'بدون صلاحيات'
        }).`,
        targetEntity: `${existingUser?.code || 'USR'} • @${cleanUsername}`,
      });
      return {
        state: this.saveState({
          ...state,
          users: updatedUsers,
          auditLogs: [auditEntry, ...state.auditLogs],
        }),
      };
    }

    const newCode = `USR-0${state.users.length + 1}`;
    const newUser: SystemUserRecord = {
      id: `usr-${Date.now()}`,
      code: newCode,
      fullName: cleanFullName,
      username: cleanUsername,
      password: userInput.password.trim() || '123456',
      role: userInput.role,
      status: userInput.status || 'ACTIVE',
      permissions:
        userInput.role === 'SUPER_ADMIN'
          ? buildDefaultPermissionsForRole('SUPER_ADMIN')
          : { ...userInput.permissions },
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: 'لم يسجل دخول بعد',
    };

    const auditEntry = createAuditLogRecord(state, {
      category: 'USERS_PERMISSIONS',
      severity: 'WARNING',
      actionTitle: 'إنشاء حساب مستخدم جديد بالنظام',
      details: `تمت إضافة حساب مستخدم جديد باسم "${cleanFullName}" (@${cleanUsername}) بدور وظيفي (${userInput.role}).`,
      targetEntity: `${newCode} • @${cleanUsername}`,
    });

    return {
      state: this.saveState({
        ...state,
        users: [...state.users, newUser],
        auditLogs: [auditEntry, ...state.auditLogs],
      }),
    };
  }

  public changeSystemUserPassword(
    userId: string,
    newPassword: string
  ): ERPDatabaseState {
    const state = this.getState();
    const trimmed = newPassword.trim();
    if (!trimmed) return state;
    const target = state.users.find((u) => u.id === userId);
    const auditEntry = createAuditLogRecord(state, {
      category: 'USERS_PERMISSIONS',
      severity: 'WARNING',
      actionTitle: 'تغيير كلمة مرور حساب مستخدم',
      details: `تم تغيير كلمة المرور الخاصة بحساب "${target?.fullName || userId}" (@${
        target?.username || '—'
      }).`,
      targetEntity: target ? `@${target.username}` : userId,
    });
    return this.saveState({
      ...state,
      users: state.users.map((u) =>
        u.id === userId ? { ...u, password: trimmed } : u
      ),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public toggleSystemUserStatus(userId: string): ERPDatabaseState {
    const state = this.getState();
    const target = state.users.find((u) => u.id === userId);
    if (!target || target.isPrimarySuperAdmin) return state;

    const nextStatus = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const nextCurrentUserId =
      nextStatus === 'DISABLED' && state.currentUserId === userId
        ? 'usr-admin-1'
        : state.currentUserId;

    const auditEntry = createAuditLogRecord(state, {
      category: 'USERS_PERMISSIONS',
      severity: nextStatus === 'DISABLED' ? 'CRITICAL' : 'WARNING',
      actionTitle:
        nextStatus === 'DISABLED'
          ? 'إيقاف وتعطيل حساب مستخدم'
          : 'إعادة تفعيل حساب مستخدم',
      details: `تم تغيير حالة حساب "${target.fullName}" (@${target.username}) إلى (${
        nextStatus === 'ACTIVE' ? 'نشط' : 'معطل'
      }).`,
      targetEntity: `${target.code} • @${target.username}`,
    });

    return this.saveState({
      ...state,
      currentUserId: nextCurrentUserId,
      users: state.users.map((u) =>
        u.id === userId ? { ...u, status: nextStatus } : u
      ),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public deleteSystemUser(userId: string): ERPDatabaseState {
    const state = this.getState();
    const target = state.users.find((u) => u.id === userId);
    if (!target || target.isPrimarySuperAdmin) return state;

    const nextCurrentUserId =
      state.currentUserId === userId ? 'usr-admin-1' : state.currentUserId;

    const auditEntry = createAuditLogRecord(state, {
      category: 'USERS_PERMISSIONS',
      severity: 'CRITICAL',
      actionTitle: 'حذف حساب مستخدم نهائياً',
      details: `تم حذف حساب المستخدم "${target.fullName}" (@${target.username}) من لوحة الصلاحيات.`,
      targetEntity: `${target.code} • @${target.username}`,
    });

    return this.saveState({
      ...state,
      currentUserId: nextCurrentUserId,
      users: state.users.filter((u) => u.id !== userId),
      auditLogs: [auditEntry, ...state.auditLogs],
    });
  }

  public authenticateUser(
    username: string,
    password: string
  ): {
    success: boolean;
    user?: SystemUserRecord;
    error?: string;
    state: ERPDatabaseState;
  } {
    const state = this.getState();
    const cleanUser = username.trim().toLowerCase();
    const matched = state.users.find(
      (u) => u.username.toLowerCase() === cleanUser
    );
    if (!matched || matched.password !== password) {
      return {
        success: false,
        error: 'اسم الدخول أو كلمة المرور غير صحيحة.',
        state,
      };
    }
    if (matched.status === 'DISABLED') {
      return {
        success: false,
        error: 'عذراً، هذا الحساب معطل حالياً من قِبل الإدارة ولا يمكنه تسجيل الدخول.',
        state,
      };
    }

    const nextState = this.saveState({
      ...state,
      currentUserId: matched.id,
      users: state.users.map((u) =>
        u.id === matched.id ? { ...u, lastLoginAt: 'الآن (نشط)' } : u
      ),
    });

    return {
      success: true,
      user: nextState.users.find((u) => u.id === matched.id),
      state: nextState,
    };
  }

  public switchActiveUser(userId: string): {
    success: boolean;
    user?: SystemUserRecord;
    error?: string;
    state: ERPDatabaseState;
  } {
    const state = this.getState();
    const matched = state.users.find((u) => u.id === userId);
    if (!matched) {
      return {
        success: false,
        error: 'المستخدم غير موجود.',
        state,
      };
    }
    if (matched.status === 'DISABLED') {
      return {
        success: false,
        error: 'عذراً، هذا الحساب معطل حالياً من قِبل الإدارة ولا يمكن التبديل إليه.',
        state,
      };
    }
    const nextState = this.saveState({
      ...state,
      currentUserId: matched.id,
      users: state.users.map((u) =>
        u.id === matched.id ? { ...u, lastLoginAt: 'الآن (نشط)' } : u
      ),
    });
    return {
      success: true,
      user: nextState.users.find((u) => u.id === matched.id),
      state: nextState,
    };
  }
}

export const erpStore = new ERPStoreManager();
