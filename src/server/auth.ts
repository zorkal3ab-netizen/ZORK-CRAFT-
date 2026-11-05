import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import {
  OFFICIAL_OWNER_EMAIL,
  isAuthorizedOwnerEmail,
  validateNewPassword,
  hashIp,
} from '../utils/security';

export interface AdminAccount {
  email: string;
  is_temporary: number;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  token?: string;
  isTemporary?: boolean;
}

/**
 * Robust, production-grade Owner Password Authentication
 * Enforces strict allowlisting, bcrypt verification, rate limiting, and session generation.
 */
export function loginOwner(email: string, password: string, clientIp: string, userAgent = ''): LoginResult {
  const ipHash = hashIp(clientIp);

  // Strict email allowlist check - Reject all other emails
  if (!isAuthorizedOwnerEmail(email)) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('LOGIN_UNAUTHORIZED_EMAIL', `Rejected attempt for non-owner email: ${email}`, 'WARNING', ipHash, new Date().toISOString());

    return {
      success: false,
      message: 'بيانات الدخول غير صحيحة. النظام مخصص لمالك المنصة فقط.',
    };
  }

  const admin = db.prepare('SELECT * FROM admin_account WHERE email = ?').get(OFFICIAL_OWNER_EMAIL) as {
    email: string;
    password_hash: string;
    is_temporary: number;
  } | undefined;

  if (!admin) {
    return { success: false, message: 'حساب المالك غير موجود في قاعدة البيانات.' };
  }

  // Rate limiting: Maximum 5 failed attempts within 15 minutes
  const recentFails = db.prepare(`
    SELECT COUNT(*) as count FROM security_audit_logs
    WHERE event_type = 'LOGIN_FAILED_PASSWORD' AND ip_hash = ? AND datetime(created_at) > datetime('now', '-15 minutes')
  `).get(ipHash) as { count: number };

  if (recentFails.count >= 5) {
    return {
      success: false,
      message: 'تم تجاوز عدد محاولات الدخول المسموح بها. الرجاء الانتظار لمدة 15 دقيقة قبل المحاولة مجدداً.',
    };
  }

  const passwordValid = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordValid) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('LOGIN_FAILED_PASSWORD', `Failed password attempt for ${OFFICIAL_OWNER_EMAIL}`, 'HIGH', ipHash, new Date().toISOString());

    return {
      success: false,
      message: 'كلمة المرور غير صحيحة.',
    };
  }

  // Password is valid - generate a cryptographically secure 64-character session token
  const now = Date.now();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  db.prepare(`
    INSERT INTO admin_sessions (token, email, expires_at, created_at, user_agent, ip_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionToken, OFFICIAL_OWNER_EMAIL, sessionExpiresAt, now, userAgent, ipHash);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('LOGIN_SUCCESS', `Owner successfully authenticated via secure password`, 'INFO', ipHash, new Date().toISOString());

  return {
    success: true,
    token: sessionToken,
    isTemporary: admin.is_temporary === 1,
  };
}

/**
 * Change Owner Password (Security Settings & Mandatory Rotation from initial zork2026)
 */
export function changeOwnerPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  clientIp: string
): { success: boolean; message: string } {
  const ipHash = hashIp(clientIp);

  if (!isAuthorizedOwnerEmail(email)) {
    return { success: false, message: 'غير مصرح.' };
  }

  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    return { success: false, message: validation.message || 'كلمة المرور غير صالحة.' };
  }

  const admin = db.prepare('SELECT password_hash FROM admin_account WHERE email = ?').get(OFFICIAL_OWNER_EMAIL) as {
    password_hash: string;
  } | undefined;

  if (!admin) {
    return { success: false, message: 'حساب المالك غير موجود.' };
  }

  const currentMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
  if (!currentMatch) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('PASSWORD_CHANGE_FAILED', `Invalid current password attempt during password rotation`, 'HIGH', ipHash, new Date().toISOString());

    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE admin_account
    SET password_hash = ?, is_temporary = 0, updated_at = ?
    WHERE email = ?
  `).run(newHash, now, OFFICIAL_OWNER_EMAIL);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('PASSWORD_CHANGED', `Owner password successfully rotated to new secure password`, 'INFO', ipHash, now);

  return { success: true, message: 'تم تحديث كلمة المرور بنجاح وتم تفعيل حماية الحساب الدائمة.' };
}

/**
 * Validate active session token
 */
export function getAuthenticatedOwner(token: string | undefined): AdminAccount | null {
  if (!token) return null;

  const now = Date.now();
  const session = db.prepare(`
    SELECT * FROM admin_sessions
    WHERE token = ? AND expires_at > ?
  `).get(token, now) as { email: string } | undefined;

  if (!session || !isAuthorizedOwnerEmail(session.email)) {
    return null;
  }

  const admin = db.prepare('SELECT email, is_temporary, created_at, updated_at FROM admin_account WHERE email = ?').get(session.email) as AdminAccount | undefined;
  return admin || null;
}

/**
 * Revoke Session
 */
export function revokeSession(token: string) {
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

/**
 * Revoke all other sessions for owner
 */
export function revokeAllOtherSessions(currentToken: string) {
  db.prepare('DELETE FROM admin_sessions WHERE email = ? AND token != ?').run(OFFICIAL_OWNER_EMAIL, currentToken);
}
