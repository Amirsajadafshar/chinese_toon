// ---------------------------------------------------------------------------
// 👤 POST /api/auth/logout — خروج مشتری (فاز ۳۰)
// نشست از دیتابیس حذف و کوکی پاک می‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { revokeSession, clearSessionCookie, SESSION_COOKIE } from '@/lib/user-auth'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 🛡️ فاز ۳۶ — هم‌مبدأ بودن (mutation کوکی‌محور)
  const guard = guardResponse(req)
  if (guard) return guard

  try {
    await revokeSession(req.cookies.get(SESSION_COOKIE)?.value)
  } catch (e) {
    console.error('[POST /api/auth/logout] error:', e instanceof Error ? e.message : e)
  }
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
