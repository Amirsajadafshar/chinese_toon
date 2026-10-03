// ---------------------------------------------------------------------------
// ⛔ POST /api/admin/payments/[ref]/reject — ردّ رسید پرداخت دستی (فاز ۵۹)
//
// دلیلِ رد اجباری است (۳ تا ۵۰۰ نویسه) و با سفارش ذخیره می‌شود؛ مشتری دلیل را
// می‌بیند و می‌تواند روی «همان سفارش» رسید تازه بفرستد (بدون سفارشِ تازه).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { logAdminAction } from '@/lib/audit'
import { rejectManualPayment, isValidOrderRef, getOrderByRef } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guard = guardResponse(req)
  if (guard) return guard

  const rl = await rateLimit('admin-reject', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { ref } = await ctx.params
  if (!isValidOrderRef(ref)) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  let body: { reason?: unknown }
  try {
    body = (await req.json()) as { reason?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (reason.length < 3 || reason.length > 500) {
    return NextResponse.json(
      { error: 'A rejection reason (3–500 characters) is required', code: 'REASON_REQUIRED' },
      { status: 400 }
    )
  }

  const actor = getAdminActor(req)
  const result = await rejectManualPayment(ref, actor, reason)

  if (result !== 'ok') {
    const current = await getOrderByRef(ref)
    const st = current?.status ?? 'UNKNOWN'
    return NextResponse.json(
      { error: `Order is not rejectable right now (status: ${st}). Only orders with a submitted receipt can be rejected.` },
      { status: 409 }
    )
  }

  logAdminAction({
    actor,
    action: 'payment.reject',
    targetType: 'order',
    targetId: ref,
    meta: { from: 'RECEIPT_SUBMITTED', to: 'REJECTED', reason: reason.slice(0, 120) },
  })
  return NextResponse.json({ ok: true, status: 'REJECTED' })
}
