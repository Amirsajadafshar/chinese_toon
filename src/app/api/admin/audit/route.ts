// ---------------------------------------------------------------------------
// 🧾 GET /api/admin/audit — فهرست گزارش فعالیت ادمین (فاز ۵۳ — بند ۱۴)
// فقط خواندنی — هیچ مسیر ویرایش/حذف وجود ندارد (append-oriented)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = await rateLimit('admin-audit', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const url = new URL(req.url)
    const action = (url.searchParams.get('action') ?? '').trim().slice(0, 60)
    const page = Math.max(1, Math.min(50, Math.floor(Number(url.searchParams.get('page')) || 1)))
    const take = 50

    const where = action ? { action } : {}
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      db.auditLog.count({ where }),
    ])
    return NextResponse.json({
      items: items.map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        meta: a.meta,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / take)),
    })
  } catch (e) {
    console.error('[GET /api/admin/audit] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
  }
}
