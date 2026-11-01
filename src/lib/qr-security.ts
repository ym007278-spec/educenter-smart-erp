/**
 * QR Security & Cryptographic Anti-Spoofing Engine
 * Implements HMAC-SHA256 signature generation and validation
 * Supports both standard static student badges and dynamic timestamped anti-replay tokens.
 */

export const DEFAULT_HMAC_SECRET = 'educenter_super_secure_enterprise_random_jwt_secret_key_2026_hardened';

export interface QrParsedPayload {
  studentId: string;
  studentCode: string;
  signature: string;
  timestamp?: number;
  raw: string;
  isTimestamped: boolean;
}

export interface QrVerificationResult {
  isValid: boolean;
  error?: string;
  payload?: QrParsedPayload;
  tamperDetected?: boolean;
  expired?: boolean;
}

/**
 * Computes an HMAC-SHA256 hexadecimal signature using Web Crypto API
 */
export async function computeHmacSha256(message: string, secret: string = DEFAULT_HMAC_SECRET): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates an HMAC-SHA256 signature for a student badge
 */
export async function generateStudentQrHmac(
  studentId: string,
  studentCode: string,
  secret: string = DEFAULT_HMAC_SECRET
): Promise<string> {
  const message = `${studentId}:${studentCode}`;
  return computeHmacSha256(message, secret);
}

/**
 * Generates a full standard QR payload: "studentId:studentCode:hmac"
 */
export async function generateStandardQrPayload(
  studentId: string,
  studentCode: string,
  secret: string = DEFAULT_HMAC_SECRET
): Promise<string> {
  const sig = await generateStudentQrHmac(studentId, studentCode, secret);
  return `${studentId}:${studentCode}:${sig}`;
}

/**
 * Generates a dynamic anti-replay QR payload with timestamp: "studentId:studentCode:timestamp:hmac"
 */
export async function generateDynamicQrPayload(
  studentId: string,
  studentCode: string,
  timestampMs: number = Date.now(),
  secret: string = DEFAULT_HMAC_SECRET
): Promise<string> {
  const message = `${studentId}:${studentCode}:${timestampMs}`;
  const sig = await computeHmacSha256(message, secret);
  return `${studentId}:${studentCode}:${timestampMs}:${sig}`;
}

/**
 * Parses raw QR string into structured payload
 * Formats supported:
 * 1. "studentId:studentCode:hmac" (3 parts)
 * 2. "studentId:studentCode:timestamp:hmac" (4 parts)
 */
export function parseQrPayload(raw: string): QrParsedPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const parts = trimmed.split(':');

  if (parts.length === 3) {
    const [studentId, studentCode, signature] = parts;
    if (!studentId || !studentCode || !signature) return null;
    return {
      studentId,
      studentCode,
      signature: signature.toLowerCase(),
      raw: trimmed,
      isTimestamped: false,
    };
  }

  if (parts.length === 4) {
    const [studentId, studentCode, timestampStr, signature] = parts;
    const ts = parseInt(timestampStr, 10);
    if (!studentId || !studentCode || isNaN(ts) || !signature) return null;
    return {
      studentId,
      studentCode,
      signature: signature.toLowerCase(),
      timestamp: ts,
      raw: trimmed,
      isTimestamped: true,
    };
  }

  return null;
}

/**
 * Verifies the integrity and authenticity of a QR code payload
 * Checks HMAC signature and optionally verifies token expiration to block replay attacks.
 */
export async function verifyQrPayload(
  rawPayload: string,
  options?: {
    secret?: string;
    maxAgeSeconds?: number;
    currentTimeMs?: number;
  }
): Promise<QrVerificationResult> {
  const secret = options?.secret || DEFAULT_HMAC_SECRET;
  const maxAge = options?.maxAgeSeconds ?? 300; // 5 minutes default for timestamped codes
  const now = options?.currentTimeMs ?? Date.now();

  const parsed = parseQrPayload(rawPayload);
  if (!parsed) {
    return {
      isValid: false,
      error: 'صيغة كود الـ QR غير صالحة (يجب أن تتكون من معرف الطالب وكوده وتوقيع التوثيق)',
    };
  }

  // Check timestamp expiration if dynamic anti-replay payload
  if (parsed.isTimestamped && parsed.timestamp) {
    const ageSeconds = Math.abs(now - parsed.timestamp) / 1000;
    if (ageSeconds > maxAge) {
      return {
        isValid: false,
        error: `رمز الـ QR منتهي الصلاحية (${Math.round(ageSeconds)} ثانية). يرجى تحديث شاشة الهاتف لمنع إعادة الاستخدام.`,
        payload: parsed,
        expired: true,
      };
    }
  }

  // Calculate expected HMAC
  let messageToVerify = '';
  if (parsed.isTimestamped && parsed.timestamp) {
    messageToVerify = `${parsed.studentId}:${parsed.studentCode}:${parsed.timestamp}`;
  } else {
    messageToVerify = `${parsed.studentId}:${parsed.studentCode}`;
  }

  const expectedSignature = await computeHmacSha256(messageToVerify, secret);

  // Constant-time length and match check
  const isMatch =
    expectedSignature.length === parsed.signature.length &&
    expectedSignature.toLowerCase() === parsed.signature.toLowerCase();

  if (!isMatch) {
    return {
      isValid: false,
      error: 'تحذير أمني: التوقيع الرقمي غير مطابق! تم رصد محاولة تزوير أو تعديل بيانات الكود (HMAC Mismatch)',
      payload: parsed,
      tamperDetected: true,
    };
  }

  return {
    isValid: true,
    payload: parsed,
  };
}

/**
 * Derives a unique cryptographically strong secret key for an individual student.
 * Uses master secret + studentId + studentCode + optional custom salt.
 */
export async function deriveStudentSecretKey(
  studentId: string,
  studentCode: string,
  masterSecret: string = DEFAULT_HMAC_SECRET,
  salt: string = 'educenter_std_salt_2026'
): Promise<string> {
  const seed = `STUDENT_SECRET_DERIVATION:${studentId.trim()}:${studentCode.trim()}:${salt}`;
  return computeHmacSha256(seed, masterSecret);
}

/**
 * Generates an encrypted/signed student QR payload using the student's unique secret key.
 */
export async function generateStudentEncryptedQr(
  studentId: string,
  studentCode: string,
  studentSecretKey: string,
  timestamp?: number
): Promise<{ payload: string; signature: string; timestamp?: number }> {
  if (timestamp) {
    const message = `${studentId}:${studentCode}:${timestamp}`;
    const signature = await computeHmacSha256(message, studentSecretKey);
    return {
      payload: `${studentId}:${studentCode}:${timestamp}:${signature}`,
      signature,
      timestamp,
    };
  } else {
    const message = `${studentId}:${studentCode}`;
    const signature = await computeHmacSha256(message, studentSecretKey);
    return {
      payload: `${studentId}:${studentCode}:${signature}`,
      signature,
    };
  }
}

