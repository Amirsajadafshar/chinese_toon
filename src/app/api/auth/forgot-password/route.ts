// ---------------------------------------------------------------------------
// 👤 POST /api/auth/forgot-password — درخواست لینک بازیابی رمز (فاز ۴۰)
//
// امنیت:
//   • پاسخ همیشه 200 عمومی است — وجود/عدم‌وجود ایمیل هرگز لو نمی‌رود
//     (ضد account enumeration).
//   • توکن تصادفی ۳۲بایتی (۲۵۶ بیت انتروپی) — فقط sha256 آن در دیتابیس ذخیره
//     می‌شود؛ ۶۰ دقیقه اعتبار دارد و یک‌بارمصرف است.
//   • هر درخواستِ تازه، توکن‌های «باز» قبلی همان حساب را باطل می‌کند.
//   • محدودسازی نرخ: ۵ درخواست در ۱۰ دقیقه برای هر IP + ۴ برای هر ایمیل
//     (مستقل از IP — اسپم ایمیل مهاجم با چرخش IP هم بسته است).
//   • رمز عبور هرگز در ایمیل/URL/لاگ نمی‌آید — فقط لینک یک‌بارمصرف.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { randomBytes, createHash } from 'crypto'
import { RESET_TOKEN_TTL_MS, purgeExpiredAuthRecords } from '@/lib/user-auth'
import { sendPasswordResetEmail } from '@/lib/mail'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

const RESET_MINUTES = RESET_TOKEN_TTL_MS / 60_000

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** آدرس پایهٔ سایت از روی هدرهای درخواست (بدون مسیر) — برای ساخت لینک ایمیل */
function siteBaseUrl(req: NextRequest): string {
  const envBase = (process.env.APP_BASE_URL ?? '').trim()
  if (envBase) return envBase.replace(/\/+$/, '')
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000').trim()
  const proto = (req.headers.get('x-forwarded-proto') ?? 'http').split(',')[0].trim()
  return `${proto}://${host}`
}

export async function POST(req: NextRequest) {
  // 🛡️ هم‌مبدأ + سقف حجم بدنه
  const guard = guardResponse(req)
  if (guard) return guard

  // ۵ درخواست در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('auth-forgot', req, 5, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }

  // ۴ درخواست در ۳۰ دقیقه برای هر ایمیل — مستقل از IP
  const rlEmail = rateLimit(`auth-forgot-email:${email}`, req, 4, 1800, 1800)
  if (!rlEmail.ok) return tooManyRequests(rlEmail)

  // پاسخ عمومی — مستقل از وجود/عدم‌وجود حساب
  const genericOk = NextResponse.json({
    ok: true,
    message:
      'If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).',
  })

  try {
    // پاک‌سازی دوره‌ای نشست/توکن‌های منقضی — fire-and-forget
    purgeExpiredAuthRecords()

    const user = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return genericOk // ⬅️ همان پاسخ عمومی — هیچ اطلاعی لو نمی‌رود

    // توکن‌های «باز» قبلی این حساب باطل می‌شوند (همیشه فقط آخرین لینک معتبر است)
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

    // توکن تصادفی ۳۲بایتی — فقط هش آن ذخیره می‌شود
    const token = randomBytes(32).toString('hex')
    await db.passwordResetToken.create({
      data: {
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })

    const resetUrl = `${siteBaseUrl(req)}/#/reset-password?token=${token}`
    const mail = await sendPasswordResetEmail(email, resetUrl, RESET_MINUTES)
    if (!mail.sent && mail.provider === 'resend') {
      // ارائه‌دهنده تنظیم بود ولی ارسال شکست — برای عیب‌یابی مالک لاگ می‌شود؛
      // پاسخ به کاربر همچنان همان پیام عمومی می‌ماند.
      console.error('[forgot-password] reset email could not be delivered via provider — owner should check mail configuration')
    }
    return genericOk
  } catch (e) {
    console.error('[POST /api/auth/forgot-password] error:', e instanceof Error ? e.message : e)
    // حتی با خطای سرور، پاسخ عمومی برمی‌گردد: شکست دیتابیس نباید امکان حدس
    // وجود حساب را بدهد. کاربر می‌تواند درخواست را تکرار کند.
    return genericOk
  }
}
