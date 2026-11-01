/**
 * Unit Tests for Center Configuration & Master Policy Store
 * Uses node:test and node:assert/strict
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CENTER_CONFIG,
  getCenterConfig,
  saveCenterConfig,
  resetCenterConfig,
  exportCenterConfigJson,
  importCenterConfigJson,
  subscribeCenterConfig
} from './center-config';

test('getCenterConfig returns default configuration when uninitialized', () => {
  const config = getCenterConfig();
  assert.ok(config);
  assert.equal(config.identity.currency, 'ج.م');
  assert.equal(config.financial.defaultTeacherSplitPercent, 70);
  assert.equal(config.financial.defaultCenterSplitPercent, 30);
  assert.equal(config.attendance.qrCodeExpirySeconds, 300);
  assert.equal(config.security.maxFailedLoginsBeforeLock, 5);
});

test('saveCenterConfig updates partial values and balances teacher/center splits', () => {
  const updated = saveCenterConfig({
    identity: {
      ...DEFAULT_CENTER_CONFIG.identity,
      centerName: 'سنتر النخبة المتميز'
    },
    financial: {
      ...DEFAULT_CENTER_CONFIG.financial,
      defaultTeacherSplitPercent: 75,
      defaultPerSessionPrice: 80
    }
  }, 'مدير الفرع');

  assert.equal(updated.identity.centerName, 'سنتر النخبة المتميز');
  assert.equal(updated.financial.defaultTeacherSplitPercent, 75);
  // Auto balanced to 25% for center
  assert.equal(updated.financial.defaultCenterSplitPercent, 25);
  assert.equal(updated.financial.defaultPerSessionPrice, 80);
  assert.equal(updated.updatedBy, 'مدير الفرع');
});

test('subscribeCenterConfig notifies listeners upon changes', () => {
  let notified = false;
  let receivedCenterName = '';

  const unsubscribe = subscribeCenterConfig((cfg) => {
    notified = true;
    receivedCenterName = cfg.identity.centerName;
  });

  saveCenterConfig({
    identity: {
      ...DEFAULT_CENTER_CONFIG.identity,
      centerName: 'أكاديمية المستقبل الذكية'
    }
  });

  assert.equal(notified, true);
  assert.equal(receivedCenterName, 'أكاديمية المستقبل الذكية');

  unsubscribe();
});

test('exportCenterConfigJson and importCenterConfigJson backup and restore correctly', () => {
  saveCenterConfig({
    financial: {
      ...DEFAULT_CENTER_CONFIG.financial,
      defaultPerSessionPrice: 95
    }
  });

  const exportedJson = exportCenterConfigJson();
  assert.ok(exportedJson.includes('"defaultPerSessionPrice": 95'));

  // Modify something else
  saveCenterConfig({
    financial: {
      ...DEFAULT_CENTER_CONFIG.financial,
      defaultPerSessionPrice: 50
    }
  });
  assert.equal(getCenterConfig().financial.defaultPerSessionPrice, 50);

  // Re-import
  const success = importCenterConfigJson(exportedJson);
  assert.equal(success, true);
  assert.equal(getCenterConfig().financial.defaultPerSessionPrice, 95);
});

test('resetCenterConfig restores defaults', () => {
  saveCenterConfig({
    identity: {
      ...DEFAULT_CENTER_CONFIG.identity,
      centerName: 'اسم مؤقت للتجربة'
    }
  });

  const restored = resetCenterConfig();
  assert.equal(restored.identity.centerName, DEFAULT_CENTER_CONFIG.identity.centerName);
});
