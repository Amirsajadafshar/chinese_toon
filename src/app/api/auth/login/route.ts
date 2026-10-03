// ---------------------------------------------------------------------------
// 👤 POST /api/auth/login — ورود مشتری (فاز ۳۰)
// پیام خطا عمومی است (بدون افشای وجود/عدم‌وجود ایمیل)؛ آخرین ورود ثبت می‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { verifyPassword, createUserSession, setSessionCookie, toSafeUser, SESSION_TTL_MS, purgeExpiredAuthRecords } from '@/lib/user-auth'
import { guardResponse } from '@/lib/http-guard'
import { ensureSchema, isSchemaDriftError } from '@/lib/ensure-schema'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 🛡️ فاز ۳۶ — هم‌مبدأ بودن + سقف حجم بدنه (دفاع CSRF مکمل SameSite=Lax)
  const guard = guardResponse(req)
  if (guard) return guard

  // ۱۰ تلاش ورود در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('auth-login', req, 10, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const remember = body.remember === true
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // 🛡️ فاز ۳۶ — سقف دوم روی «همان ایمیل» مستقل از IP (کمبین IPC + account):
  // ۱۵ تلاش در ۱۰ دقیقه برای هر ایمیل؛ یک مهاجم با چرخش IP هم نمی‌تواند یک
  // حساب را بی‌پایان تست کند. پیام 429 عمومی است و وجود/عدم‌وجود حساب لو نمی‌رود.
  const rlEmail = await rateLimit(`auth-login-email:${email}`, req, 15, 600, 300)
  if (!rlEmail.ok) return tooManyRequests(rlEmail)

  // ♻️ فاز ۶۳ — منطق ورود در یک تابع تا در صورت ناهم‌خوانی اسکیمای دیتابیس
  // (P2021/P2022 — ریشهٔ واقعی «Could not sign in» روی محیط استقرار) یک‌بار
  // خودترمیمیِ اسکیما و تلاش دوباره انجام شود.
  const attemptLogin = async (): Promise<NextResponse> => {
    // پاک‌سازی دوره‌ای نشست‌های منقضی (fire-and-forget) — دیتابیس تمیز می‌ماند
    purgeExpiredAuthRecords()

    const user = await db.user.findUnique({ where: { email } })
    // پیام عمومی — نه وجود ایمیل نه درستی رمز لو نمی‌رود
    const genericError = NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    if (!user) return genericError

    if (!verifyPassword(password, user.passwordHash)) return genericError

    const updated = await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // «Remember me» تیک‌خورده → نشست ۳۰روزه (کوکی هم با همان انقضا)؛
    // تیک‌نخورده → کوکی سشنِ مرورگر (با بستن مرورگر تمام می‌شود) ولی
    // رکورد سشن سمت سرور همان ۳۰ روز اعتبار دارد — امن‌تر و استاندارد.
    const { token, expiresAt } = await createUserSession(user.id, req.headers.get('user-agent') ?? '', SESSION_TTL_MS)
    const res = NextResponse.json({ user: toSafeUser(updated) })
    setSessionCookie(res, token, remember ? expiresAt : null)
    return res
  }

  try {
    return await attemptLogin()
  } catch (initialError) {
    let e: unknown = initialError
    // 🛠️ فاز ۶۳ — خودترمیمی اسکیما: اگر جدول/ستون غایب بود، DDL افزایندهٔ
    // امن اجرا و ورود دقیقاً یک‌بار دوباره تلاش می‌شود.
    if (isSchemaDriftError(e)) {
      await ensureSchema({ force: true, reason: 'auth-login' })
      try {
        return await attemptLogin()
      } catch (retryError) {
        e = retryError
      }
    }
    console.error('[POST /api/auth/login] error:', e instanceof Error ? e.message : e)
    // 🆔 فاز ۶۳ — کد رهگیری برای گزارش‌پذیری خطا (ریسپانسی/لاگ هم‌بسته)
    const errRef = randomBytes(4).toString('hex').toUpperCase()
    try {
      const { logAppError } = await import('@/lib/error-log')
      logAppError({
        category: 'AUTH',
        error: e,
        fallback: 'Sign-in failed',
        context: { path: '/api/auth/login', method: 'POST' },
        refId: errRef,
      })
    } catch {
      /* لاگ‌گیری هرگز مسیر اصلی را نمی‌شکند */
    }
    return NextResponse.json(
      { error: 'Could not sign in. Please try again.', ref: errRef },
      { status: 500 }
    )
  }
}
