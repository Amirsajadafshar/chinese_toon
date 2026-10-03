// ---------------------------------------------------------------------------
// 👤 POST /api/auth/reset-password — تعیین رمز جدید با توکن بازیابی (فاز ۴۰)
//
// امنیت:
//   • توکن فقط به‌صورت sha256 جست‌وجو می‌شود؛ توکن خام در دیتابیس نیست.
//   • یک‌بارمصرف: usedAt در همان تراکنش ست می‌شود — لینک مصرف‌شده هرگز دوباره
//     کار نمی‌کند (ضد replay).
//   • زمان‌محدود: توکن منقضی رد می‌شود.
//   • پیام خطا برای «نامعتبر»، «مصرف‌شده» و «منقضی» یکی است (ضد افشا).
//   • بعد از تغییر موفق رمز: همهٔ توکن‌های باز دیگرِ کاربر و همهٔ نشست‌های
//     فعالش (همهٔ دستگاه‌ها) باطل می‌شوند — مهاجمی که سشن داشته باشد بیرون می‌افتد.
//   • رمز جدید با scrypt هش می‌شود؛ سقف طول ۱۲۸ (ضد DoS هش) حفظ است.
//   • محدودسازی نرخ: ۱۰ تلاش در ۱۰ دقیقه برای هر IP (حدس توکن عملاً غیرممکن
//     است ولی لایهٔ دوم هست).
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

/** پیام عمومی برای هر توکنِ نامعتبر/مصرف‌شده/منقضی — بدون جزئیات بیشتر */
function invalidToken(): NextResponse {
  return NextResponse.json(
    {
      error:
        'This password reset link is invalid or has expired. Please request a new password reset link.',
      code: 'INVALID_TOKEN',
    },
    { status: 400 }
  )
}

export async function POST(req: NextRequest) {
  // 🛡️ هم‌مبدأ + سقف حجم بدنه
  const guard = guardResponse(req)
  if (guard) return guard

  // ۱۰ تلاش در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('auth-reset', req, 10, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  // اعتبارسنجی ورودی — پیام‌های فیلد-محور برای UX
  const errors: Record<string, string> = {}
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return invalidToken()
  }
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (password.length > 128) errors.password = 'Password is too long'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', errors }, { status: 400 })
  }

  try {
    const tokenHash = sha256(token)
    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    })

    // نامعتبر / مصرف‌شده / منقضی — همه یک پیام
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return invalidToken()
    }

    const passwordHash = hashPassword(password)

    // تراکنش اتمی: رمز جدید + مصرف توکن + ابطال توکن‌های باز + خروج از همه نشست‌ها
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
