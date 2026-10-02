// ---------------------------------------------------------------------------
// 👤 POST /api/auth/register — ثبت‌نام مشتری (فاز ۳۰)
// فیلدها: firstName, lastName, email, password, confirmPassword,
//         dateOfBirth (🎂 اجباری — YYYY-MM-DD), telegram (اختیاری، با یا بدون @),
//         country/countryCode (سلکتور ISO), phone (اختیاری)
// پاسخ‌ها فیلد-محور است؛ passwordHash هرگز در پاسخ نیست.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests, clientIp } from '@/lib/rate-limit'
import {
  hashPassword,
  normalizeTelegram,
  isValidEmail,
  sanitizePhone,
  createUserSession,
  setSessionCookie,
  toSafeUser,
} from '@/lib/user-auth'
import { countryByCode } from '@/lib/countries'
import { guardResponse } from '@/lib/http-guard'
import { notifyUser } from '@/lib/notifications'
import { logAppError } from '@/lib/error-log'
import { ensureSchema, isSchemaDriftError } from '@/lib/ensure-schema'

export const dynamic = 'force-dynamic'

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  // 🛡️ فاز ۳۶ — هم‌مبدأ بودن + سقف حجم بدنه (ضد CSRF و ضد DoS بدنهٔ بزرگ)
  const guard = guardResponse(req)
  if (guard) return guard

  // ۶ ثبت‌نام در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('auth-register', req, 6, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const firstName = str(body.firstName, 60)
  const lastName = str(body.lastName, 60)
  const email = str(body.email, 120).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
  const telegramRaw = str(body.telegram, 64)
  const countryCode = str(body.countryCode, 2)
  const phoneRaw = str(body.phone, 40)
  const dobRaw = str(body.dateOfBirth, 10)

  // ⚠️ اعتبارسنجی سمت سرور — پیام‌های فیلد-محور برای UX حرفه‌ای
  const errors: Record<string, string> = {}
  if (firstName.length < 1) errors.firstName = 'First name is required'
  if (lastName.length < 1) errors.lastName = 'Last name is required'
  if (!email || !isValidEmail(email)) errors.email = 'Please enter a valid email address'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (password.length > 128) errors.password = 'Password is too long'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'

  // 🌍 کشور باید از لیست ISO باشد — نام از سمت سرور تعیین می‌شود
  const country = countryByCode(countryCode)
  if (!country) errors.country = 'Please select your country'

  // 📨 تلگرام اختیاری است — با یا بدون @ پذیرفته می‌شود و نرمال می‌شود
  let telegram: string | null = null
  if (telegramRaw) {
    telegram = normalizeTelegram(telegramRaw)
    if (!telegram) errors.telegram = 'Invalid Telegram username (4-32 letters, numbers or _)'
  }

  const phone = phoneRaw ? sanitizePhone(phoneRaw) : null
  if (phoneRaw && !phone) errors.phone = 'Invalid phone number'

  // 🎂 تاریخ تولد اجباری است — YYYY-MM-DD، نه آینده، نه قبل از ۱۹۰۰
  let dateOfBirth: Date | null = null
  if (!dobRaw) {
    errors.dateOfBirth = 'Date of birth is required'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    errors.dateOfBirth = 'Please enter a valid date of birth'
  } else {
    const d = new Date(`${dobRaw}T00:00:00Z`)
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now() || d.getUTCFullYear() < 1900) {
      errors.dateOfBirth = 'Please enter a valid date of birth'
    } else {
      dateOfBirth = d
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', errors }, { status: 400 })
  }

  // ♻️ فاز ۶۳ — ساخت حساب در یک تابع تا در صورت ناهم‌خوانی اسکیمای دیتابیس
  // (P2021 جدول غایب / P2022 ستون غایب — ریشهٔ واقعی «Could not create the
  // account» روی محیط استقرار) یک‌بار خودترمیمیِ اسکیما و تلاش دوباره انجام شود.
  const attemptCreate = async (): Promise<NextResponse> => {
    // ایمیل یکتاست — پیام واضح تکراری‌بودن
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists', errors: { email: 'This email is already registered — try signing in' } },
        { status: 409 }
      )
    }

    // ♻️ فاز ۶۱ — ثبت‌نام اتمی: ساخت حساب + کد یکتا داخل یک تراکنش.
    // قبلاً اگر کد یکتا وسط راه شکست می‌خورد، حسابِ بدون کد باقی می‌ماند؛
    // حالا یا حساب کامل (با کد) ساخته می‌شود یا هیچ‌چیز.
    const { assignUniqueCode } = await import('@/lib/unique-code')
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          firstName,
          lastName,
          dateOfBirth, // 🎂 اجباری در ثبت‌نام (بالاتر اعتبارسنجی شده)
          country: country!.name,
          countryCode: country!.code,
          phone,
          telegramUsername: telegram,
          // telegramId عمداً null می‌ماند — یوزرنیم ≠ شناسهٔ عددی تلگرام
        },
      })
      const uniqueCode = await assignUniqueCode(created.id, tx as never)
      return { ...created, uniqueCode }
    })
    const { token, expiresAt } = await createUserSession(user.id, req.headers.get('user-agent') ?? '')
    // 🔔 اعلان REGISTRATION — رویداد واقعی ساخت حساب در DB (فاز ۵۲)
    notifyUser({
      userId: user.id,
      category: 'account',
      kind: 'REGISTRATION',
      title: 'Welcome to Chinese Toon 🧧',
      body: `Your account is ready, ${firstName}. Your unique student code is ${user.uniqueCode} — keep it for reference. Browse classes, pick a package and pay by bank card — your order and enrollment status will always be visible here in your account.`,
    })
    const res = NextResponse.json({ user: toSafeUser(user) }, { status: 201 })
    setSessionCookie(res, token, expiresAt)
    return res
  }

  try {
    return await attemptCreate()
  } catch (initialError) {
    let e: unknown = initialError
    // 🛠️ فاز ۶۳ — خودترمیمی اسکیما: اگر جدول/ستون غایب بود، DDL افزایندهٔ
    // امن اجرا و ساخت حساب دقیقاً یک‌بار دوباره تلاش می‌شود.
    if (isSchemaDriftError(e)) {
      await ensureSchema({ force: true, reason: 'auth-register' })
      try {
        return await attemptCreate()
      } catch (retryError) {
        e = retryError
      }
    }
    // 🛡️ فاز ۴۰ — ضد مسابقه (race condition): اگر دو درخواست هم‌زمان با یک
    // ایمیل برسند، هر دو از pre-check رد می‌شوند ولی قید unique دیتابیس
    // (@unique روی User.email) فقط یکی را می‌پذیرد؛ برای دومی P2002 می‌آید.
    // این حالت باید همان پیام دوستانهٔ ۴۰۹ را بدهد، نه 500 مبهم.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists', errors: { email: 'This email is already registered — try signing in or reset your password' } },
        { status: 409 }
      )
    }
    console.error('[POST /api/auth/register] error:', e instanceof Error ? e.message : e)
    // 🚨 فاز ۵۳ — خطای ثبت‌نام (بند ۱۲) — پیام امن + 🆔 فاز ۶۳ — کد رهگیری
    // تا کاربر بتواند خطا را گزارش کند و ادمین همان ردیف ErrorLog را پیدا کند
    const errRef = randomBytes(4).toString('hex').toUpperCase()
    logAppError({
      category: 'AUTH',
      error: e,
      fallback: 'Account registration failed',
      context: { path: '/api/auth/register', method: 'POST' },
      refId: errRef,
    })
    return NextResponse.json(
      { error: 'Could not create the account. Please try again.', ref: errRef },
      { status: 500 }
    )
  }
}
