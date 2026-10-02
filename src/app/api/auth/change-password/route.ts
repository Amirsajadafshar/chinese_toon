// ---------------------------------------------------------------------------
// 👤 POST /api/auth/change-password — تغییر رمز از داخل حساب (فاز ۶۷)
//
// کاربر واردشده با ارائهٔ رمز فعلی، رمز جدید می‌گذارد. امنیت:
//   • نیازمند سشن معتبر (کوکی httpOnly) — مهمان → 401
//   • رمز فعلی با verifyPassword (scrypt + timingSafeEqual) سنجیده می‌شود —
//     رمز اشتباه → 400 فیلد-محور (currentPassword) بدون نشت اطلاعات
//   • رمز جدید: حداقل ۸ / حداکثر ۱۲۸ کاراکتر و متفاوت از رمز فعلی
//   • بعد از تغییر، «همهٔ» نشست‌های کاربر (سایر دستگاه‌ها) ابطال می‌شوند و
//     نشست تازه‌ای برای همین دستگاه ساخته می‌شود — کاربر از حساب بیرون نمی‌افتد
//     ولی مهاجمی که نشست قدیمی دارد بیرون می‌ماند.
//   • رویداد در AuditLog ثبت می‌شود (بدون هیچ رمزی در متادیتا)
//   • محدودسازی نرخ: ۵ درخواست در ۱۰ دقیقه برای هر IP
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import {
  getUserFromRequest,
  verifyPassword,
  hashPassword,
  createUserSession,
  setSessionCookie,
} from '@/lib/user-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 🛡️ هم‌مبدأ بودن + سقف حجم بدنه (ضد CSRF کوکی‌محور و ضد DoS)
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = rateLimit('auth-change-pw', req, 5, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  // ⚠️ اعتبارسنجی فیلد-محور — هم‌قالب با register
  const errors: Record<string, string> = {}
  if (!currentPassword) errors.currentPassword = 'Please enter your current password'
  if (newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters'
  if (newPassword.length > 128) errors.newPassword = 'Password is too long'
  if (confirmPassword !== newPassword) errors.confirmPassword = 'New passwords do not match'
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { errors: { newPassword: 'New password must be different from the current one' } },
      { status: 400 }
    )
  }

  // 🔍 رمز فعلی درست است؟ — مقایسهٔ امن بدون نشت زمانی
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { errors: { currentPassword: 'Current password is incorrect' } },
      { status: 400 }
    )
  }

  try {
    const passwordHash = hashPassword(newPassword)

    // 🗃️ اتمی: به‌روزرسانی هش + ابطال همهٔ نشست‌های قدیمی (سایر دستگاه‌ها بیرون می‌روند)
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } })
      await tx.userSession.deleteMany({ where: { userId: user.id } })
    })

    // 🍪 نشست تازه برای همین دستگاه — کاربر واردشده می‌ماند
    const { token, expiresAt } = await createUserSession(
      user.id,
      req.headers.get('user-agent') ?? ''
    )
    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, token, expiresAt)

    // 🧾 ردپای ممیزی — بدون هیچ رازی (رمز/هش هرگز ثبت نمی‌شود)
    await db.auditLog
      .create({
        data: {
          actor: 'user',
          action: 'auth.password-change',
          targetType: 'user',
          targetId: user.id.slice(0, 80),
          meta: JSON.stringify({ via: 'account-page' }),
        },
      })
      .catch(() => {}) // AuditLog حیاتی نیست — عملیات اصلی انجام شده

    return res
  } catch (e) {
    console.error(
      '[POST /api/auth/change-password] error:',
      e instanceof Error ? e.message : e
    )
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
