/**
 * EduCenter Smart ERP - Database Audit Engine
 * Pure logic for calculating object diffs, audit trail filtering,
 * severity classification, and transparency logs.
 */

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditRecord {
  id: number;
  userId?: string;
  username: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changedFields: string[];
  description: string;
  ipAddress?: string;
  createdAt: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Calculates differences between old and new state objects.
 * Returns array of changed field names and details.
 */
export function calculateJsonDiff(
  oldObj: Record<string, any> | null | undefined,
  newObj: Record<string, any> | null | undefined
): { changedFields: string[]; diffs: FieldDiff[] } {
  if (!oldObj && !newObj) {
    return { changedFields: [], diffs: [] };
  }

  if (!oldObj && newObj) {
    const keys = Object.keys(newObj);
    return {
      changedFields: keys,
      diffs: keys.map((k) => ({ field: k, oldValue: null, newValue: newObj[k] }))
    };
  }

  if (oldObj && !newObj) {
    const keys = Object.keys(oldObj);
    return {
      changedFields: keys,
      diffs: keys.map((k) => ({ field: k, oldValue: oldObj[k], newValue: null }))
    };
  }

  const allKeys = Array.from(new Set([...Object.keys(oldObj!), ...Object.keys(newObj!)]));
  const changedFields: string[] = [];
  const diffs: FieldDiff[] = [];

  for (const key of allKeys) {
    const oldVal = oldObj![key];
    const newVal = newObj![key];

    // Deep-comparable check or string equality
    const isDifferent =
      JSON.stringify(oldVal === undefined ? null : oldVal) !==
      JSON.stringify(newVal === undefined ? null : newVal);

    if (isDifferent) {
      changedFields.push(key);
      diffs.push({
        field: key,
        oldValue: oldVal === undefined ? null : oldVal,
        newValue: newVal === undefined ? null : newVal
      });
    }
  }

  return { changedFields, diffs };
}

/**
 * Categorizes operational sensitivity / severity.
 */
export function categorizeOperationSeverity(
  tableName: string,
  action: AuditAction,
  changedFields: string[]
): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (action === 'DELETE') {
    return 'CRITICAL';
  }

  const sensitiveFinancialTables = [
    'treasury_transactions',
    'student_payments',
    'teacher_wallets',
    'staff_salaries'
  ];

  if (sensitiveFinancialTables.includes(tableName)) {
    const hasMoneyField = changedFields.some((f) =>
      ['amount', 'balance', 'price', 'net_paid', 'discount_percentage', 'balance_due'].includes(f)
    );
    return hasMoneyField || action === 'UPDATE' ? 'CRITICAL' : 'WARNING';
  }

  if (tableName === 'students' && (changedFields.includes('discount_percentage') || changedFields.includes('status'))) {
    return 'WARNING';
  }

  return 'INFO';
}

/**
 * Generates clear, human-readable Arabic explanation of the sensitive change.
 */
export function formatAuditDescription(
  action: AuditAction,
  tableName: string,
  recordId: string,
  username: string,
  changedFields: string[]
): string {
  const tableNamesAr: Record<string, string> = {
    treasury_transactions: 'الخزنة المركزية',
    students: 'ملف الطلاب',
    student_payments: 'مدفوعات واشتراكات الطلاب',
    teacher_wallets: 'محافظ المعلمين المالية',
    staff_salaries: 'مسير رواتب الموظفين',
    staff_attendance: 'حضور وبصمة الموظفين'
  };

  const friendlyTable = tableNamesAr[tableName] || tableName;

  if (action === 'INSERT') {
    return `إضافة حركة جديدة في جدول ${friendlyTable} (المعرف: ${recordId}) بواسطة ${username}.`;
  }
  if (action === 'DELETE') {
    return `حذف سجل من جدول ${friendlyTable} (المعرف: ${recordId}) بواسطة ${username}.`;
  }

  return `تعديل حساس في جدول ${friendlyTable} (المعرف: ${recordId}). تم تغيير: [${changedFields.join('، ')}] بواسطة ${username}.`;
}

/**
 * Filter audit records based on action, table, user, and text search.
 */
export function filterAuditLogs(
  logs: AuditRecord[],
  filters: {
    action?: string;
    tableName?: string;
    search?: string;
    severity?: string;
  }
): AuditRecord[] {
  return logs.filter((log) => {
    if (filters.action && filters.action !== 'ALL' && log.action !== filters.action) {
      return false;
    }
    if (filters.tableName && filters.tableName !== 'ALL' && log.tableName !== filters.tableName) {
      return false;
    }
    if (filters.severity && filters.severity !== 'ALL' && log.severity !== filters.severity) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchDesc = log.description.toLowerCase().includes(q);
      const matchUser = log.username.toLowerCase().includes(q);
      const matchId = log.recordId.toLowerCase().includes(q);
      const matchTable = log.tableName.toLowerCase().includes(q);
      return matchDesc || matchUser || matchId || matchTable;
    }
    return true;
  });
}
