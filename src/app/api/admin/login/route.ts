import { NextRequest, NextResponse } from 'next/server'
import { verifyLogin, createAdminSession } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { logAppError } from '@/lib/error-log'

// ---------------------------------------------------------------------------
// 🔐 ورود به پنل مدیریت
// امنیت فاز ۲۲:
//  • محدودیت نرخ: حداکثر ۵ تلاش در ۱۰ دقیقه برای هر IP → قفل ۱۰ دقیقه‌ای (429)
//  • تأخیر ثابت کوتاه روی پاسخ ناموفق تا حملات سریع را کُند کند
//  • پیام خطای یکسان برای «نام کاربری غلط» و «رمز غلط» (بدون نشت اطلاعات)
//  • توکن سشن تصادفی با انقضا (به‌جای توکن ثابت قابل محاسبه)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ⛔️ اول از همه: سقف تلاش
  const rl = rateLimit('admin-login', req, 5, 10 * 60, 10 * 60)
  if (!rl.ok) {
    console.warn(`[admin-login] rate limited — IP blocked for ${rl.retryAfter}s`)
    return tooManyRequests(rl)
  }

  try {
    const body = await req.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password || !(await verifyLogin(username, password))) {
      // تأخیر ظریف روی شکست — brute-force را غیرعملی می‌کند
      await new Promise((r) => setTimeout(r, 450))
      // 🚨 فاز ۵۳ — تلاش ورود ناموفق (بند ۱۲) — فقط رویداد؛ هرگز رمز/نام‌کاربری حساس
      logAppError({
        category: 'AUTH',
        error: 'Admin login attempt rejected — invalid input',
        context: { path: '/api/admin/login', method: 'POST', note: 'failed admin login attempt' },
        statusCode: 401,
      })
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // 🧾 فاز ۵۳ — نام کاربری در سشن نگه داشته می‌شود تا Audit Log فعلِ ادمین را با هویت ثبت کند
    const session = createAdminSession(username.trim().toLowerCase())
    return NextResponse.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
    })
  } catch (err) {
    console.error('[POST /api/admin/login] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
