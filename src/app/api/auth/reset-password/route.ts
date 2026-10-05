// ---------------------------------------------------------------------------
// 👤 POST /api/auth/reset-password — تعیین رمز جدید با کد تأیید (فاز ۴۰)
//
// جریان کدمحور: بدنه {email, code, password, confirmPassword} — همان فرمی که
// کد به ایمیلش رفته است، خودش کد و رمز جدید را می‌فرستد.
//
// امنیت:
//   • کد فقط به‌صورت sha256 جست‌وجو می‌شود؛ کد خام در دیتابیس نیست.
//   • کد باید متعلق به همان ایمیلی باشد که در بدنه آمده (کد برای حسابِ دیگر
//     حتی اگر هشش پیدا شود رد می‌شود).
//   • یک‌بارمصرف: usedAt در همان تراکش ست می‌شود — کد مصرف‌شده هرگز دوباره
//     کار نمی‌کند (ضد replay).
//   • زمان‌محدود: کد ۱۰ دقیقه‌ای رد می‌شود.
//   • پیام خطا برای «نامعتبر»، «مصرف‌شده»، «منقضی» و «ایمیل بدون کد» یکی است
//     (ضد افشای وجود/عدم‌وجود حساب).
//   • فضای حدس کد ۱۰^۶ است → سقف تلاش سخت‌گیرانه: ۸ تلاش در ۱۰ دقیقه برای
//     هر IP؛ سهمیهٔ تولید کد هم در forgot-password جداگانه بسته است.
//   • بعد از تغییر موفق رمز: همهٔ کدهای باز دیگرِ کاربر و همهٔ نشست‌های فعالش
//     (همهٔ دستگاه‌ها) باطل می‌شوند — مهاجمی که سشن داشته باشد بیرون می‌افتد.
//   • رمز جدید با scrypt هش می‌شود؛ سقف طول ۱۲۸ (ضد DoS هش) حفظ است.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { createHash } from 'crypto'
import { hashPassword } from '@/lib/user-auth'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** پیام عمومی برای هر کدِ نامعتبر/مصرف‌شده/منقضی — بدون جزئیات بیشتر */
function invalidCode(): NextResponse {
  return NextResponse.json(
    {
      error:
        'This verification code is invalid or has expired. Please request a new code.',
      code: 'INVALID_CODE',
    },
    { status: 400 }
  )
}

export async function POST(req: NextRequest) {
  // 🛡️ هم‌مبدأ + سقف حجم بدنه
  const guard = guardResponse(req)
  if (guard) return guard

  // ۸ تلاش در ۱۰ دقیقه برای هر IP — فضای حدس کد ۱۰^۶ است
  const rl = await rateLimit('auth-reset', req, 8, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  // اعتبارسنجی ورودی — پیام‌های فیلد-محور برای UX
  const errors: Record<string, string> = {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'Please enter a valid email address'
  }
  if (!/^\d{6}$/.test(code)) errors.code = 'Enter the 6-digit code from your email'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (password.length > 128) errors.password = 'Password is too long'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', errors }, { status: 400 })
  }

  try {
    const [user, record] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true } }),
      db.passwordResetToken.findUnique({
        where: { tokenHash: sha256(code) },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      }),
    ])

    // نامعتبر / مصرف‌شده / منقضی / کدِ حسابِ دیگر — همه یک پیام
    if (
      !user ||
      !record ||
      record.usedAt ||
      record.userId !== user.id ||
      record.expiresAt.getTime() < Date.now()
    ) {
      return invalidCode()
    }

    const passwordHash = hashPassword(password)

    // تراکنش اتمی: رمز جدید + مصرف کد + ابطال کدهای باز + خروج از همه نشست‌ها
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      }),
      db.userSession.deleteMany({ where: { userId: record.userId } }),
    ])

    return NextResponse.json({
      ok: true,
      message: 'Your password has been changed successfully. You can now sign in with your new password.',
    })
  } catch (e) {
    console.error('[POST /api/auth/reset-password] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not reset the password. Please try again.' }, { status: 500 })
  }
}
