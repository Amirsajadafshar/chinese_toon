// ---------------------------------------------------------------------------
// 💳 GET   /api/payments/orders/[ref] — وضعیت سفارش برای مالکش
//           (صفحهٔ پرداخت وضعیت را polling می‌کند؛ ۱۵ ثانیه‌ای کافی است)
//    PATCH /api/payments/orders/[ref] — فقط ادمین: لغو سفارش PENDING
//
// فاز ۵۹: هیچ بررسیِ زنجیره‌ای وجود ندارد — وضعیت فقط با اقدام انسانی تغییر
// می‌کند (آپلود رسید توسط مالک → تأیید/ردّ ادمین). هیچ مسیری برای تغییر دستی
// وضعیت به PAID وجود ندارد مگر تأیید ادمین روی رسیدِ ثبت‌شده.
//
// امنیت: گارد مالکیت (ضد IDOR) — سفارش‌های جدید همیشه به یک کاربر متعلق‌اند؛
// فقط صاحبِ سشن یا ادمین اجازهٔ دیدن دارد. پاسخ ۴۰۴ برای «موجود ولی متعلق به
// دیگران» = بدون نشتِ وجود سفارش.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { getUserFromRequest } from '@/lib/user-auth'
import { buildPublicStatus, adminCancelOrder, getOrderByRef } from '@/lib/payments/service'
import { ensurePaymentScheduler } from '@/lib/payments/scheduler'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  // ضد سوءاستفاده: ۱۲۰ بررسی وضعیت در دقیقه برای هر IP (حداقل ۱۰ برابر نیاز واقعی)
  const rl = rateLimit('pay-status', req, 120, 60, 60)
  if (!rl.ok) return tooManyRequests(rl)

  const { ref } = await ctx.params
  // حلقهٔ سبک انقضای سفارش‌های پرداخت‌نشده
  ensurePaymentScheduler()

  // 🔒 گارد مالکیت (ضد IDOR): سفارش‌های «مهمانِ قدیمی» (userId=null، جریان
  // USDTِ قبل از الزام حساب) برای سازگاریِ نمایش وضعیت عمومی می‌مانند — هیچ
  // PII/رسیدی در پاسخ عمومی نیست و ref یکتا با آنتروپی بالا ساخته می‌شود.
  const target = await getOrderByRef(ref)
  if (target?.userId) {
    const [viewer, admin] = await Promise.all([getUserFromRequest(req), Promise.resolve(isAuthorized(req))])
    if (!admin && viewer?.id !== target.userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
  }

  const order = await buildPublicStatus(ref)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ order })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ref } = await ctx.params

  let body: { action?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (body.action !== 'cancel') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })

  const ok = await adminCancelOrder(ref)
  if (!ok) return NextResponse.json({ error: 'Order not found or not cancellable (only PENDING orders can be cancelled)' }, { status: 409 })
  // 🧾 Audit Log: تغییر وضعیت سفارش (لغو) — مسیر حساس پرداخت
  logAdminAction({ actor: getAdminActor(req), action: 'order.cancel', targetType: 'order', targetId: ref })
  return NextResponse.json({ ok: true })
}
