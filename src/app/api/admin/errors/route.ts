// ---------------------------------------------------------------------------
// 🚨 GET /api/admin/errors — فهرست خطاهای سمت سرور (فاز ۵۳ — بند ۱۲)
// فقط ادمین؛ پیام‌ها از قبل سمت سرور «امن‌سازی» شده‌اند (بدون راز/stack)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = await rateLimit('admin-errors', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const url = new URL(req.url)
    const category = (url.searchParams.get('category') ?? '').trim().slice(0, 20)
    const page = Math.max(1, Math.min(50, Math.floor(Number(url.searchParams.get('page')) || 1)))
    const take = 50

    const where = category ? { category } : {}
    const [items, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      db.errorLog.count({ where }),
    ])
    return NextResponse.json({
      items: items.map((e) => ({
        id: e.id,
        category: e.category,
        message: e.message,
        context: e.context,
        statusCode: e.statusCode,
        refId: e.refId,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / take)),
    })
  } catch (e) {
    console.error('[GET /api/admin/errors] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load error log' }, { status: 500 })
  }
}
