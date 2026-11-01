/**
 * Unit Tests for Audit Engine & Differential Transparency Logic
 * Uses node:test and node:assert/strict as mandated by Ultra Mode.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJsonDiff,
  categorizeOperationSeverity,
  formatAuditDescription,
  filterAuditLogs,
  AuditRecord
} from './audit-engine';

test('calculateJsonDiff returns correct changed keys and old/new values on update', () => {
  const oldState = { amount: 12500, verified: false, notes: 'old' };
  const newState = { amount: 14200, verified: true, notes: 'old' };

  const { changedFields, diffs } = calculateJsonDiff(oldState, newState);

  assert.deepEqual(changedFields.sort(), ['amount', 'verified'].sort());
  assert.equal(diffs.length, 2);

  const amountDiff = diffs.find((d) => d.field === 'amount');
  assert.ok(amountDiff);
  assert.equal(amountDiff.oldValue, 12500);
  assert.equal(amountDiff.newValue, 14200);

  const verifiedDiff = diffs.find((d) => d.field === 'verified');
  assert.ok(verifiedDiff);
  assert.equal(verifiedDiff.oldValue, false);
  assert.equal(verifiedDiff.newValue, true);
});

test('calculateJsonDiff handles null oldState for INSERT operations', () => {
  const newState = { full_name: 'أحمد كمال', balance: 500 };
  const { changedFields, diffs } = calculateJsonDiff(null, newState);

  assert.deepEqual(changedFields.sort(), ['balance', 'full_name'].sort());
  assert.equal(diffs[0].oldValue, null);
});

test('calculateJsonDiff handles null newState for DELETE operations', () => {
  const oldState = { student_id: 'std-99', name: 'سجل محذوف' };
  const { changedFields, diffs } = calculateJsonDiff(oldState, null);

  assert.deepEqual(changedFields.sort(), ['name', 'student_id'].sort());
  assert.equal(diffs[0].newValue, null);
});

test('categorizeOperationSeverity identifies sensitive operations correctly', () => {
  // DELETE should always be CRITICAL
  assert.equal(categorizeOperationSeverity('students', 'DELETE', []), 'CRITICAL');

  // Changing money amount in treasury should be CRITICAL
  assert.equal(categorizeOperationSeverity('treasury_transactions', 'UPDATE', ['amount']), 'CRITICAL');

  // Updating student discount percentage should be WARNING
  assert.equal(categorizeOperationSeverity('students', 'UPDATE', ['discount_percentage']), 'WARNING');

  // Adding ordinary student should be INFO
  assert.equal(categorizeOperationSeverity('students', 'INSERT', ['full_name', 'phone']), 'INFO');
});

test('formatAuditDescription produces friendly Arabic message', () => {
  const desc = formatAuditDescription('UPDATE', 'treasury_transactions', 'TX-100', 'أحمد (المحاسب)', ['amount', 'notes']);
  assert.ok(desc.includes('الخزنة المركزية'));
  assert.ok(desc.includes('TX-100'));
  assert.ok(desc.includes('أحمد (المحاسب)'));
  assert.ok(desc.includes('amount'));
});

test('filterAuditLogs filters records accurately by action, table, and search query', () => {
  const dummyLogs: AuditRecord[] = [
    {
      id: 1,
      username: 'محاسب 1',
      action: 'UPDATE',
      tableName: 'treasury_transactions',
      recordId: 'TX-1',
      changedFields: ['amount'],
      description: 'تعديل مبلغ الخزنة',
      createdAt: '2026-10-31T12:00:00Z',
      severity: 'CRITICAL'
    },
    {
      id: 2,
      username: 'شؤون الطلاب',
      action: 'DELETE',
      tableName: 'students',
      recordId: 'STU-2',
      changedFields: [],
      description: 'حذف طالب مكرر',
      createdAt: '2026-10-31T13:00:00Z',
      severity: 'CRITICAL'
    },
    {
      id: 3,
      username: 'الاستقبال',
      action: 'INSERT',
      tableName: 'students',
      recordId: 'STU-3',
      changedFields: ['name'],
      description: 'إضافة طالب جديد',
      createdAt: '2026-10-31T14:00:00Z',
      severity: 'INFO'
    }
  ];

  // Filter by action DELETE
  const deleteLogs = filterAuditLogs(dummyLogs, { action: 'DELETE' });
  assert.equal(deleteLogs.length, 1);
  assert.equal(deleteLogs[0].recordId, 'STU-2');

  // Filter by search query
  const searchLogs = filterAuditLogs(dummyLogs, { search: 'الخزنة' });
  assert.equal(searchLogs.length, 1);
  assert.equal(searchLogs[0].recordId, 'TX-1');
});
