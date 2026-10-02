// ---------------------------------------------------------------------------
// 💳 POST /api/payments/orders — ساخت سفارشِ خرید با پرداخت دستی کارت بانکی
//    (فاز ۵۹ — جریان آنلاین USDT/TRON از جریانِ خرید حذف شده است)
//
// امنیت:
//  • ساخت سفارش فقط با حساب کاربری (کوکی سشن)
//  • فقط productId و «کدِ» تخفیف از مرورگر می‌آید؛ قیمت/تخفیف/مبلغ نهایی
//    همیشه سمت سرور محاسبه و در اسنپ‌شات سفارش ذخیره می‌شود
//  • rate limit ساخت سفارش + سقف سفارش باز برای هر IP/کاربر (داخل سرویس)
//  • پرداخت دستی باید در پنل ادمین فعال و کارت تنظیم شده باشد — fail-closed
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, tooManyRequests, clientIp } from '@/lib/rate-limit'
import { getUserFromRequest } from '@/lib/user-auth'
import { createOrder, PaymentNotConfiguredError, ProductNotFoundError, OrderLimitError, OrderBusyError, DiscountExhaustedError } from '@/lib/payments/service'
import { ensurePaymentScheduler } from '@/lib/payments/scheduler'
import { guardResponse } from '@/lib/http-guard'
import { logAppError } from '@/lib/error-log'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 🔐 ساخت سفارش فقط با حساب کاربری (ثبت‌نام ≠ پرداخت؛ کاربر
  // ثبت‌نام‌شدهٔ بدون خرید همیشه یک کاربر معتبر است)
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to continue', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // 🛡️ هم‌مبدأ بودن + سقف حجم بدنه (mutation کوکی‌محور و پرداختی)
  const guard = guardResponse(req)
  if (guard) return guard

  // ۸ ساخت سفارش در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('pay-create', req, 8, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  // حلقهٔ سبک انقضای سفارش‌های پرداخت‌نشده (بدون هیچ اسکنِ زنجیره)
  ensurePaymentScheduler()

  let body: { productId?: unknown; discountCode?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const productId = typeof body.productId === 'string' ? body.productId.trim().slice(0, 64) : ''
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

  try {
    const order = await createOrder({
      productId,
      // 👤 مشخصات تماس از پروفایل تأییدشدهٔ کاربر می‌آید — نه از مرورگر
      contactName: `${user.firstName} ${user.lastName}`.trim(),
      contactEmail: user.email,
      userId: user.id,
      clientIp: clientIp(req),
      // 🎟️ فقط «کد» از مرورگر می‌آید — اعتبار و محاسبهٔ تخفیف سرور است
      discountCode: typeof body.discountCode === 'string' ? body.discountCode.trim().slice(0, 40) : null,
    })
    return NextResponse.json({ order }, { status: 201 })
  } catch (e) {
    if (e instanceof PaymentNotConfiguredError) {
      return NextResponse.json(
        { error: 'Manual bank-card payment is not available yet. Please contact support.', code: 'NOT_CONFIGURED' },
        { status: 503 }
      )
    }
    if (e instanceof ProductNotFoundError) {
      return NextResponse.json({ error: 'Unknown product', code: 'BAD_PRODUCT' }, { status: 400 })
    }
    if (e instanceof OrderLimitError) {
      return NextResponse.json({ error: 'Too many open orders. Please finish or wait for one to expire.', code: 'ORDER_LIMIT' }, { status: 429 })
    }
    if (e instanceof OrderBusyError) {
      return NextResponse.json({ error: 'Could not create the order right now, please try again shortly.', code: 'BUSY' }, { status: 409 })
    }
    if (e instanceof DiscountExhaustedError) {
      // 🎟️ کد بین پیش‌نمایش چک‌اوت و ساخت سفارش تمام/منقضی/غیرفعال شد.
      // سفارش بی‌صدا با قیمت کامل ساخته نمی‌شود؛ مشتری شفاف تصمیم می‌گیرد.
      return NextResponse.json(
        { error: 'This discount code is no longer available.', code: 'CODE_EXHAUSTED' },
        { status: 409 }
      )
    }
    console.error('[payments] createOrder failed:', e instanceof Error ? e.message : e)
    // 🚨 شکست ساخت سفارش — پیام امن، بدون دادهٔ پرداخت
    logAppError({
      category: 'ORDER',
      error: e,
      fallback: 'Order creation failed',
      context: { path: '/api/payments/orders', method: 'POST', note: `productId=${productId}` },
    })
    return NextResponse.json({ error: 'Could not create the order. Please try again.' }, { status: 500 })
  }
}
