// ---------------------------------------------------------------------------
// 📊 Admin Session-Tier Discounts API — /api/discounts/tiers (فاز ۴۷)
// پله‌های تخفیف خودکارِ بسته بر اساس تعداد جلسه — در SiteSetting ذخیره می‌شود
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { getTiersAsync, saveTiers, sanitizeTiers, DEFAULT_TIERS, type SessionTier } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const tiers = await getTiersAsync()
    const saved = await db.siteSetting.findUnique({ where: { key: 'sessionDiscountTiers' } })
    return NextResponse.json({ tiers, isDefault: !saved })
  } catch (err) {
    console.error('[GET /api/discounts/tiers] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('discounts-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json()
    const tiers = sanitizeTiers(body?.tiers)
    if (!tiers) {
      return NextResponse.json(
        { error: 'Invalid tiers — expected [{min, max, percent}] with 1 ≤ min ≤ max and 0 ≤ percent ≤ 100' },
        { status: 400 }
      )
    }
    await saveTiers(tiers)
    console.info(`[discounts] TIERS updated: ${JSON.stringify(tiers)}`)
    return NextResponse.json({ ok: true, tiers })
  } catch (err) {
    console.error('[PUT /api/discounts/tiers] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export type { SessionTier }
export { DEFAULT_TIERS }
