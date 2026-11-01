/**
 * Unit Tests for QR Security & Anti-Spoofing HMAC Engine
 * Uses node:test and node:assert/strict
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HMAC_SECRET,
  computeHmacSha256,
  generateStudentQrHmac,
  generateStandardQrPayload,
  generateDynamicQrPayload,
  parseQrPayload,
  verifyQrPayload,
  deriveStudentSecretKey,
  generateStudentEncryptedQr,
} from './qr-security';

test('computeHmacSha256 generates consistent SHA256 hex string', async () => {
  const hash1 = await computeHmacSha256('test-msg', 'test-secret');
  const hash2 = await computeHmacSha256('test-msg', 'test-secret');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64); // SHA-256 is 64 hex characters (32 bytes)
});

test('parseQrPayload accurately parses 3-part and 4-part tokens', () => {
  // 3-part: studentId:code:hmac
  const payload3 = 'std-100:ST-2026-99:a1b2c3d4e5f6';
  const parsed3 = parseQrPayload(payload3);
  assert.ok(parsed3);
  assert.equal(parsed3.studentId, 'std-100');
  assert.equal(parsed3.studentCode, 'ST-2026-99');
  assert.equal(parsed3.signature, 'a1b2c3d4e5f6');
  assert.equal(parsed3.isTimestamped, false);

  // 4-part: studentId:code:timestamp:hmac
  const payload4 = 'std-200:ST-2026-88:1730000000000:f6e5d4c3b2a1';
  const parsed4 = parseQrPayload(payload4);
  assert.ok(parsed4);
  assert.equal(parsed4.studentId, 'std-200');
  assert.equal(parsed4.studentCode, 'ST-2026-88');
  assert.equal(parsed4.timestamp, 1730000000000);
  assert.equal(parsed4.signature, 'f6e5d4c3b2a1');
  assert.equal(parsed4.isTimestamped, true);

  // Invalid payload
  assert.equal(parseQrPayload('invalid-string'), null);
  assert.equal(parseQrPayload('only:two'), null);
});

test('verifyQrPayload validates genuine standard QR and flags tampered QR', async () => {
  const studentId = 'stu-01';
  const studentCode = 'ST-2026-0012';

  // Generate legitimate QR payload
  const validPayload = await generateStandardQrPayload(studentId, studentCode);
  const result = await verifyQrPayload(validPayload);
  assert.equal(result.isValid, true);
  assert.equal(result.tamperDetected, undefined);
  assert.equal(result.payload?.studentId, studentId);
  assert.equal(result.payload?.studentCode, studentCode);

  // Tampered payload: studentId swapped to steal attendance
  const tamperedPayload = `stu-99:${studentCode}:${result.payload?.signature}`;
  const tamperedResult = await verifyQrPayload(tamperedPayload);
  assert.equal(tamperedResult.isValid, false);
  assert.equal(tamperedResult.tamperDetected, true);
  assert.ok(tamperedResult.error?.includes('التوقيع الرقمي غير مطابق'));

  // Corrupted signature
  const corruptedPayload = `${studentId}:${studentCode}:0000000000000000000000000000000000000000000000000000000000000000`;
  const corruptedResult = await verifyQrPayload(corruptedPayload);
  assert.equal(corruptedResult.isValid, false);
  assert.equal(corruptedResult.tamperDetected, true);
});

test('verifyQrPayload validates dynamic anti-replay payload and rejects expired tokens', async () => {
  const studentId = 'stu-dynamic';
  const studentCode = 'ST-DYNAMIC-01';
  const fixedNow = 1730390000000;

  // Fresh token (generated at same time)
  const freshPayload = await generateDynamicQrPayload(studentId, studentCode, fixedNow);
  const freshResult = await verifyQrPayload(freshPayload, {
    currentTimeMs: fixedNow + 30 * 1000, // 30 seconds later
    maxAgeSeconds: 120,
  });
  assert.equal(freshResult.isValid, true);

  // Expired token (generated 10 minutes ago, maxAge is 2 minutes)
  const oldPayload = await generateDynamicQrPayload(studentId, studentCode, fixedNow - 600 * 1000);
  const expiredResult = await verifyQrPayload(oldPayload, {
    currentTimeMs: fixedNow,
    maxAgeSeconds: 120,
  });
  assert.equal(expiredResult.isValid, false);
  assert.equal(expiredResult.expired, true);
  assert.ok(expiredResult.error?.includes('منتهي الصلاحية'));
});

test('verifyQrPayload rejects wrong secret key', async () => {
  const payload = await generateStandardQrPayload('stu-test', 'ST-TEST', 'secret-A');
  const result = await verifyQrPayload(payload, { secret: 'secret-B' });
  assert.equal(result.isValid, false);
  assert.equal(result.tamperDetected, true);
});

test('deriveStudentSecretKey produces unique, deterministic 64-char hex key per student', async () => {
  const key1 = await deriveStudentSecretKey('std-1', 'CODE-1');
  const key2 = await deriveStudentSecretKey('std-1', 'CODE-1');
  const key3 = await deriveStudentSecretKey('std-2', 'CODE-2');

  assert.equal(key1, key2); // Deterministic
  assert.notEqual(key1, key3); // Unique per student
  assert.equal(key1.length, 64);
  assert.equal(key3.length, 64);
});

test('generateStudentEncryptedQr generates verifiable payload with student-specific key', async () => {
  const studentKey = await deriveStudentSecretKey('std-unique', 'ST-UNIQUE-99');
  const { payload } = await generateStudentEncryptedQr('std-unique', 'ST-UNIQUE-99', studentKey);

  // Verifies with student's own key
  const validResult = await verifyQrPayload(payload, { secret: studentKey });
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.payload?.studentId, 'std-unique');
  assert.equal(validResult.payload?.studentCode, 'ST-UNIQUE-99');

  // Fails with a different student's key
  const otherStudentKey = await deriveStudentSecretKey('std-other', 'ST-OTHER-88');
  const failedResult = await verifyQrPayload(payload, { secret: otherStudentKey });
  assert.equal(failedResult.isValid, false);
  assert.equal(failedResult.tamperDetected, true);
});

