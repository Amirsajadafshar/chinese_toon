// ---------------------------------------------------------------------------
// 🔔 /api/schedules/notifications (فاز ۴۸)
// GET  — هشدارهای درون‌حسابی مشتری (مالکیت از سشن)
// POST — علامت‌گذاری خوانده‌شده (همه یا شناسه‌های مشخص — فقط مال خود کاربر)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/user-auth'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const alerts = await db.scheduleNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({
      notifications: alerts.map((n) => ({
        id: n.id,
        kind: n.kind,
        category: n.category,
        orderRef: n.orderRef,
        title: n.title,
        body: n.body,
        scheduleId: n.scheduleId,
        read: Boolean(n.readAt),
        createdAt: n.createdAt.toISOString(),
      })),
      unread: alerts.filter((n) => !n.readAt).length,
    })
  } catch (err) {
    console.error('[GET /api/schedules/notifications] error:', err)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}

const readSchema = z.object({
  ids: z.array(z.string().max(40)).max(50).optional(), // خالی/غایب = همه
})

export async function POST(req: NextRequest) {
  const guard = guardResponse(req)
  if (guard) return guard
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const parsed = readSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const ids = parsed.data.ids
    const now = new Date()
    const result = await db.scheduleNotification.updateMany({
      where: {
        userId: user.id, // ⛔ فقط مال خود کاربر — حتی اگر id دیگری پاس شود
        readAt: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { readAt: now },
    })
    return NextResponse.json({ ok: true, marked: result.count })
  } catch (err) {
    console.error('[POST /api/schedules/notifications] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
