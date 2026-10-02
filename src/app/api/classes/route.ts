// ---------------------------------------------------------------------------
// 🎓 GET /api/classes — فهرست عمومی کلاس‌ها (فاز ۴۲)
//
// منبع: جدول CourseClass (ادمین). فقط وضعیت‌های active و full برمی‌گردند
// (inactive/draft/archived عمومی نیستند). کلاینت برای رندر فوری با آیتم‌های
// فایل محتوا شروع می‌کند و بعد پاسخ این API را جایگزین می‌کند — پس تغییرات
// ادمین بدون ری‌استارت روی سایت عمومی دیده می‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { listPublicClasses } from '@/lib/classes/store'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = rateLimit('classes-list', req, 60, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const classes = await listPublicClasses()
    return NextResponse.json(
      { classes },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[classes] public list failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
