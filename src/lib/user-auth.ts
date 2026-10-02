import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// 👤 احراز هویت کاربران عادی سایت (مشتریان) — فاز ۳۰
//
// جدا از احراز هویت ادمین (src/lib/admin-auth.ts) و کاملاً مستقل از آن:
//  • رمز عبور با scrypt هش می‌شود — فرمت «salt:hash» (hex)؛ هرگز رمز خام
//    یا هش به هیچ کلاینتی برنمی‌گردد (حتی به ادمین).
//  • سشن: توکن تصادفی ۳۲بایتی در کوکی httpOnly؛ فقط sha256 توکن در جدول
//    UserSession ذخیره می‌شود — نشست‌ها روی دیتابیس‌اند (برخلاف سشن ادمین)
//    تا با ری‌استارت سرور از بین نروند.
//  • کوکی: SameSite=Lax + httpOnly + مسیر / — بدون Secure چون پیش‌نمایش
//    سندباکس روی http است.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = 'ct_user_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // ۳۰ روز
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // توکن بازیابی رمز: ۶۰ دقیقه

/** هش scrypt رمز — خروجی «salt:hash» */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/** مقایسهٔ امن رمز با هش ذخیره‌شده (بدون نشت زمانی) */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const attempt = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return attempt.length === expected.length && timingSafeEqual(attempt, expected)
  } catch {
    return false
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** ساخت نشست جدید — خروجی توکن خام (فقط برای کوکی) و انقضا */
export async function createUserSession(
  userId: string,
  userAgent = '',
  ttlMs: number = SESSION_TTL_MS
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ttlMs)
  await db.userSession.create({
    data: { tokenHash: sha256(token), userId, userAgent: userAgent.slice(0, 180), expiresAt },
  })
  return { token, expiresAt }
}

/**
 * پاک‌سازی دوره‌ای نشست‌ها و توکن‌های بازیابی منقضی/مصرف‌شده —
 * fire-and-forget؛ در لاگین و forgot-password صدا زده می‌شود (کوستی روی SQLite).
 */
export function purgeExpiredAuthRecords(): void {
  const now = new Date()
  void db.userSession.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {})
  void db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {})
}

/** کاربرِ درخواست‌دهنده از روی کوکی سشن — null یعنی مهمان */
export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || token.length !== 64) return null
  const session = await db.userSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    // نشست منقضی — پاک‌سازی تنبل
    db.userSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

/** حذف نشست جاری (خروج) */
export async function revokeSession(token: string | undefined | null): Promise<void> {
  if (!token || token.length !== 64) return
  await db.userSession.deleteMany({ where: { tokenHash: sha256(token) } })
}

/** تنظیم کوکی سشن روی پاسخ — expires null یعنی «کوکی سشن مرورگر» (با بستن مرورگر تمام می‌شود) */
export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date | null): void {
  // 🛡️ فاز ۳۶ — پرچم Secure: در استقرار واقعی روی HTTPS، متغیر SESSION_COOKIE_SECURE=1
  // را در .env بگذارید تا کوکی فقط روی اتصال امن ارسال شود. در پیش‌نمایش http
  // سندباکس باید خاموش بماند (وگرنه لاگین کار نمی‌کند).
  const secure = process.env.SESSION_COOKIE_SECURE === '1'
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  })
}

/** پاک‌کردن کوکی سشن */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

// ---------------------------------------------------------------------------
// خروجی امن کاربر — passwordHash هرگز اینجا نیست
// ---------------------------------------------------------------------------

export interface SafeUser {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  countryCode: string
  phone: string | null
  telegramUsername: string | null
  telegramId: string | null
  // 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر (هرگز بازتولید نمی‌شود)
  uniqueCode: string | null
  createdAt: string
  lastLoginAt: string | null
}

export function toSafeUser(user: {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  countryCode: string
  phone: string | null
  telegramUsername: string | null
  telegramId: string | null
  uniqueCode?: string | null
  createdAt: Date
  lastLoginAt: Date | null
}): SafeUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    country: user.country,
    countryCode: user.countryCode,
    phone: user.phone,
    telegramUsername: user.telegramUsername,
    telegramId: user.telegramId,
    uniqueCode: user.uniqueCode ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  }
}

// ---------------------------------------------------------------------------
// اعتبارسنجی و نرمال‌سازی فیلدهای ثبت‌نام
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// قواعد یوزرنیم تلگرام: ۴ تا ۳۲ کاراکتر، حروف/رقم/زیرخط، شروع با حرف
export const TELEGRAM_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/

/** نرمال‌سازی یوزرنیم تلگرام — @ ابتدای ورودی حذف می‌شود؛ null یعنی نامعتبر */
export function normalizeTelegram(raw: string): string | null {
  const value = raw.trim().replace(/^@+/, '')
  if (!value) return null
  return TELEGRAM_RE.test(value) ? value : null
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim())
}

/** تمیزکاری شمارهٔ تلفن — فقط رقم + + و فاصله مجاز است */
export function sanitizePhone(raw: string): string | null {
  const value = raw.replace(/[^\d+\s()-]/g, '').trim()
  return value ? value.slice(0, 32) : null
}
