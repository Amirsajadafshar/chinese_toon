// ---------------------------------------------------------------------------
// 🎟️ Discount Validate API — POST /api/discounts/validate (فاز ۴۷)
//
// عمومی (برای نمایش پیش‌نمایش قیمت در چک‌اوت/صفحهٔ کلاس):
//  ورودی: { productId, code?, sessionsOverride? }
//  خروجی: ریزِ کامل قیمت از سرور — base / tier / code / final
//  هیچ مبلغی از مرورگر پذیرفته نمی‌شود؛ کد همین‌جا اعتبارسنجی کامل می‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { calculatePrice } from '@/lib/pricing'
import { findBookableClassRowByProductId, getActiveProducts } from '@/lib/classes/store'

export const dynamic = 'force-dynamic'

const schema = z.object({
  productId: z.string().trim().min(1).max(64),
  code: z.string().trim().max(40).optional().or(z.literal('')),
  // کاربر ممکن است هنوز تعداد جلسه را قطعی نکرده باشد — پیش‌نمایش با تعداد دلخواه
  sessions: z.number().int().min(1).max(500).optional(),
})

export async function POST(req: NextRequest) {
  const rl = rateLimit('discount-validate', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { productId, code, sessions } = parsed.data

    // کلاس از DB — fallback فایل: محصولِ فایل بدون ردیف DB هم قیمت‌گذاری می‌شود
    let row = await findBookableClassRowByProductId(productId)
    if (!row) {
      const products = await getActiveProducts()
      const p = products.find((x) => x.id === productId)
      if (!p) {
        return NextResponse.json({ error: 'Unknown product', code: 'BAD_PRODUCT' }, { status: 404 })
      }
      // از محصولِ فایل فقط amountUsd در دسترس است — ریزِ کامل نمی‌سازیم
      return NextResponse.json({
        ok: true,
        pricing: {
          pricePerSession: p.amountUsd,
          sessions: 1,
          base: p.amountUsd,
          tierPercent: 0,
          tierDiscount: 0,
          final: p.amountUsd,
        },
        codeRejected: null,
        fallback: true,
      })
    }

    const cls = sessions && sessions !== row.packageSessions ? { ...row, packageSessions: sessions } : row
    const { breakdown, rejection } = await calculatePrice(cls, { code })
    return NextResponse.json({ ok: true, pricing: breakdown, codeRejected: rejection })
  } catch (err) {
    console.error('[POST /api/discounts/validate] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
