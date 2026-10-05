// ---------------------------------------------------------------------------
// 👤 POST /api/auth/forgot-password — ارسال کد تأیید بازیابی رمز (فاز ۴۰)
//
// جریان کدمحور: به‌جای لینک، یک کد ۶ رقمی ایمیلی می‌شود که کاربر در همان فرم
// بازیابی همراه رمز جدید وارد می‌کند (مقاوم در برابر لینک‌های استفاده‌نشده،
// بازکردن ایمیل روی دستگاه دیگر و مهاجرت‌های مسیر).
//
// امنیت:
//   • پاسخ همیشه 200 عمومی است — وجود/عدم‌وجود ایمیل هرگز لو نمی‌رود
//     (ضد account enumeration).
//   • کد ۶ رقمی با crypto.randomInt (فضای ۱۰۰۰۰۰۰ حالت) — فقط sha256 آن در
//     دیتابیس ذخیره می‌شود؛ ۱۰ دقیقه اعتبار دارد و یک‌بارمصرف است.
//   • برخورد تصادفیِ هشِ کد دو کاربر (tokenHash unique) → تولید کد جدید (retry).
//   • هر درخواستِ تازه، کدهای «باز» قبلی همان حساب را باطل می‌کند.
//   • محدودسازی نرخ: ۵ درخواست در ۱۰ دقیقه برای هر IP + ۴ برای هر ایمیل
//     (مستقل از IP — اسپم ایمیل مهاجم با چرخش IP هم بسته است).
//   • رمز عبور هرگز در ایمیل/لاگ نمی‌آید — فقط کد یک‌بارمصرف.
//   • حالت توسعهٔ بدون ارائه‌دهنده: کد برای تست لوکال در devCode برگردانده
//     می‌شود (فقط وقتی NODE_ENV !== 'production' و ارائه‌دهنده تنظیم نیست).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { createHash } from 'crypto'
import { RESET_CODE_TTL_MS, purgeExpiredAuthRecords } from '@/lib/user-auth'
import { sendPasswordResetCode, isDevMailPreview } from '@/lib/mail'
import { guardResponse } from '@/lib/http-guard'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const RESET_MINUTES = RESET_CODE_TTL_MS / 60_000

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** کد ۶ رقمی امن با crypto — بدون بایاس معنادار در فضای ۱۰^۶ */
function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export async function POST(req: NextRequest) {
  // 🛡️ هم‌مبدأ + سقف حجم بدنه
  const guard = guardResponse(req)
  if (guard) return guard

  // ۵ درخواست در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('auth-forgot', req, 5, 600, 600)
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
  const rlEmail = await rateLimit(`auth-forgot-email:${email}`, req, 4, 1800, 1800)
  if (!rlEmail.ok) return tooManyRequests(rlEmail)

  // پاسخ عمومی — مستقل از وجود/عدم‌وجود حساب
  const genericBody = {
    ok: true as const,
    message:
      'If an account exists for this email, a 6-digit verification code has been sent. Please check your inbox (and spam folder).',
  }
  const genericOk = NextResponse.json(genericBody)

  try {
    // پاک‌سازی دوره‌ای نشست/توکن‌های منقضی — fire-and-forget
    purgeExpiredAuthRecords()

    const user = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return genericOk // ⬅️ همان پاسخ عمومی — هیچ اطلاعی لو نمی‌رود

    // کدهای «باز» قبلی این حساب باطل می‌شوند (همیشه فقط آخرین کد معتبر است)
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

    // تولید کد تا هش آن با کد بازِ کاربر دیگری تصادفی برخورد نکند (tokenHash unique)
    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateSixDigitCode()
      try {
        await db.passwordResetToken.create({
          data: {
            tokenHash: sha256(code),
            userId: user.id,
            expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
          },
        })
        break
      } catch (e) {
        const isHashCollision =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
        if (!isHashCollision || attempt === 4) throw e
      }
    }

    const mail = await sendPasswordResetCode(email, code, RESET_MINUTES)
    if (!mail.sent && mail.provider === 'resend') {
      // ارائه‌دهنده تنظیم بود ولی ارسال شکست — برای عیب‌یابی مالک لاگ می‌شود؛
      // پاسخ به کاربر همچنان همان پیام عمومی می‌ماند.
      console.error('[forgot-password] reset code email could not be delivered via provider — owner should check mail configuration')
    }

    // 🧪 فقط توسعهٔ محلی بدون ارائه‌دهنده — در production هرگز
    if (isDevMailPreview()) {
      return NextResponse.json({ ...genericBody, devCode: code })
    }
    return genericOk
  } catch (e) {
    console.error('[POST /api/auth/forgot-password] error:', e instanceof Error ? e.message : e)
    // حتی با خطای سرور، پاسخ عمومی برمی‌گردد: شکست دیتابیس نباید امکان حدس
    // وجود حساب را بدهد. کاربر می‌تواند درخواست را تکرار کند.
    return genericOk
  }
}
