// ---------------------------------------------------------------------------
// ✅ POST /api/admin/payments/[ref]/approve — تأیید پرداخت دستی (فاز ۵۹)
//
// فقط از وضعیت RECEIPT_SUBMITTED — گارد وضعیت‌محور یعنی تأییدِ دومِ همان
// سفارش همیشه شکست می‌خورد (ضد تأیید تصادفیِ دوباره). Audit Log + رویداد
// ممیزی + اعلان مشتری در سرویس ثبت می‌شوند.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { logAdminAction } from '@/lib/audit'
import { approveManualPayment, isValidOrderRef, getOrderByRef } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guard = guardResponse(req)
  if (guard) return guard

  const rl = rateLimit('admin-approve', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { ref } = await ctx.params
  if (!isValidOrderRef(ref)) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const actor = getAdminActor(req)
  const result = await approveManualPayment(ref, actor)

  if (result !== 'ok') {
    // وضعیتِ فعلی برای پیام شفافِ ادمین
    const current = await getOrderByRef(ref)
    const st = current?.status ?? 'UNKNOWN'
    return NextResponse.json(
      { error: `Order is not reviewable right now (status: ${st}). Only orders with a submitted receipt can be approved.` },
      { status: 409 }
    )
  }

  logAdminAction({
    actor,
    action: 'payment.approve',
    targetType: 'order',
    targetId: ref,
    meta: { from: 'RECEIPT_SUBMITTED', to: 'PAID' },
  })
  return NextResponse.json({ ok: true, status: 'PAID' })
}
