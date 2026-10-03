import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, verifyLogin, setAdminCredentials, revokeAllSessions, getEffectiveUsername, hasCustomCredentials, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/audit'

// ---------------------------------------------------------------------------
// 🔑 تغییر نام کاربری/رمز عبور پنل — از تب Settings پنل مدیریت
//    • GET  → نام کاربری فعلی + اینکه رمز سفارشی ذخیره شده یا پیش‌فرض env است
//    • POST → با رمز فعلی تأیید می‌شود، بعد اعتبارنامهٔ جدید (scrypt hash در
//             جدول SiteSetting) ذخیره و «همهٔ سشن‌ها» باطل می‌شود تا دوباره وارد شوید.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    username: await getEffectiveUsername(),
    custom: await hasCustomCredentials(),
  })
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ⛔️ سقف تلاش — جلوگیری از تست رمزهای فعلی
  const rl = await rateLimit('admin-cred', req, 5, 10 * 60, 600)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json().catch(() => null)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }

    // ✅ رمز فعلی باید درست باشد (مقایسهٔ timing-safe داخل verifyLogin)
    if (!(await verifyLogin(await getEffectiveUsername(), currentPassword))) {
      await new Promise((r) => setTimeout(r, 450)) // تأخیر ضد brute-force
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // نام کاربری جدید (اختیاری — خالی = بدون تغییر)
    let finalUsername = await getEffectiveUsername()
    if (username) {
      if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3–40 characters (letters, numbers, . _ -)' },
          { status: 400 }
        )
      }
      finalUsername = username
    }

    // رمز جدید (اختیاری — خالی = فقط تغییر نام کاربری)
    let finalPassword = currentPassword
    if (newPassword) {
      if (newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json(
          { error: 'New password must be 8–128 characters' },
          { status: 400 }
        )
      }
      finalPassword = newPassword
    }

    await setAdminCredentials(finalUsername, finalPassword)

    // 🔒 همهٔ سشن‌ها (از جمله سشن فعلی) باطل می‌شوند — ورود دوباره با اعتبارنامهٔ جدید
    await revokeAllSessions()

    // 🧾 فاز ۵۳ — Audit Log: تغییر اعتبارنامهٔ پنل (بند ۱۴) — ⛔ هرگز رمز/هش در meta
    logAdminAction({ actor: getAdminActor(req), action: 'credentials.update', targetType: 'settings', targetId: finalUsername })

    return NextResponse.json({ ok: true, username: finalUsername })
  } catch (err) {
    console.error('[POST /api/admin/credentials] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
