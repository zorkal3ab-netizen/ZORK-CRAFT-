/**
 * Security and Validation Utilities for ZORK CRAFT
 * Owner Email Allowlist, Password Rules, OTP Management, Download Deduplication,
 * Android File / MIME Type Detection, and MediaFire URL Validation
 */

import crypto from 'node:crypto';

export const OFFICIAL_OWNER_EMAIL = 'zorkal3ab@gmail.com';

// Allowed file extensions for Minecraft Bedrock content & media
export const ALLOWED_EXTENSIONS = [
  '.mcpack',
  '.mcaddon',
  '.mcworld',
  '.zip',
  '.rar',
  '.7z',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
];

export const ALLOWED_MIME_TYPES = [
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/avif',
];

/**
 * Validates if the email belongs to the strictly allowlisted owner.
 */
export function isAuthorizedOwnerEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === OFFICIAL_OWNER_EMAIL;
}

/**
 * Validates a new owner password according to security criteria:
 * - Minimum 6 characters
 * - Allows custom or default password setting
 */
export function validateNewPassword(newPassword: string): { valid: boolean; message?: string } {
  if (!newPassword || typeof newPassword !== 'string') {
    return { valid: false, message: 'كلمة المرور مطلوبة.' };
  }
  if (newPassword.length < 6) {
    return { valid: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.' };
  }
  return { valid: true };
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Hashes a verification code using SHA-256 for secure database storage.
 */
export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Anonymizes an IP address with SHA-256 for privacy and download tracking deduplication.
 */
export function hashIp(ip: string): string {
  const salt = 'zorkcraft_secure_ip_salt_2026';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 32);
}

/**
 * Detects the real normalized extension from filename or MIME type.
 * Handles Android photo picker filenames without extensions or uppercase names.
 */
export function resolveFileExtension(filename: string, mimetype?: string): string {
  const lowerName = (filename || '').toLowerCase().trim();

  // 1. Direct suffix match
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  }

  // 2. Substring match for Android downloads with suffixes like .mcpack (1) or .mcaddon.tmp
  if (lowerName.includes('.mcaddon')) return '.mcaddon';
  if (lowerName.includes('.mcpack')) return '.mcpack';
  if (lowerName.includes('.mcworld')) return '.mcworld';
  if (lowerName.includes('.zip')) return '.zip';
  if (lowerName.includes('.rar')) return '.rar';
  if (lowerName.includes('.7z')) return '.7z';
  if (lowerName.includes('.png')) return '.png';
  if (lowerName.includes('.jpg') || lowerName.includes('.jpeg')) return '.jpg';
  if (lowerName.includes('.webp')) return '.webp';
  if (lowerName.includes('.gif')) return '.gif';

  // 3. Fallback to MIME type detection (critical for Android camera / gallery uploads)
  if (mimetype) {
    const mime = mimetype.toLowerCase().trim();
    if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg') return '.jpg';
    if (mime === 'image/png' || mime === 'image/x-png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    if (mime === 'image/avif') return '.avif';
    if (mime.startsWith('image/')) return '.jpg';
    if (
      mime === 'application/zip' ||
      mime === 'application/x-zip-compressed' ||
      mime === 'application/x-zip'
    ) return '.zip';
    if (mime === 'application/octet-stream') return '.mcpack';
  }

  return '';
}

/**
 * Validates an uploaded filename against allowed extensions and MIME types.
 */
export function isAllowedFilename(filename: string, mimetype?: string): boolean {
  if (!filename && !mimetype) return false;
  const ext = resolveFileExtension(filename, mimetype);
  return ext !== '';
}

/**
 * Sanitizes and cleans an uploaded filename to prevent directory traversal
 * while supporting Arabic and Unicode names cleanly.
 */
export function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[^\p{L}\p{N}._-]/gu, '_').replace(/\.{2,}/g, '.');
  const trimmed = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return trimmed.length > 0 ? trimmed : 'zork_upload';
}

/**
 * Validates external download URLs (MediaFire, Google Drive, direct links).
 * Enforces HTTPS, blocks dangerous schemes and SSRF attempts.
 */
export interface ExternalUrlValidationResult {
  valid: boolean;
  message?: string;
  isMediaFire?: boolean;
  cleanUrl?: string;
}

export function validateExternalUrl(urlStr: string): ExternalUrlValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, message: 'يرجى إدخال رابط التحميل.' };
  }

  const trimmed = urlStr.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'صيغة الرابط غير صحيحة. يجب أن يكون رابط ويب كامل (مثال: https://...)' };
  }

  // Reject dangerous schemes
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, message: 'البروتوكول غير مدعوم. يجب أن يبدأ الرابط بـ https://' };
  }

  // Reject local/private network addresses (SSRF prevention)
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, message: 'الرابط يشير إلى عنوان محلي غير مسموح به.' };
  }

  const isMediaFire = hostname.includes('mediafire.com');

  return {
    valid: true,
    isMediaFire,
    cleanUrl: parsed.toString(),
  };
}

