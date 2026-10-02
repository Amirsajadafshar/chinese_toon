// ---------------------------------------------------------------------------
// 🎯 GET /api/payments/catalog — ماتریس قیمت «نوع کلاس + سطح» (عمومی)
//
// منبع قیمت: سکشن payments فایل محتوا — همان منبعی که ساخت سفارش سمت سرور
// مبلغ را از آن تعیین می‌کند. کلاینت فقط نمایش می‌کند؛ هیچ قیمتی از مرورگر
// پذیرفته نمی‌شود (سفارش فقط productId می‌گیرد و مبلغ را سرور حساب می‌کند).
// ترکیب‌های موجود نبود: available=false — هیچ قیمت قلابی/حدسی نمایش داده
// نمی‌شود و چک‌اوت برای آن‌ها مسدود می‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentCatalog, auditOncePerClassesVersion } from '@/lib/payments/catalog'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // هم‌مبدأ (مشاهده‌ای) + سقف نرخ سبک — دادهٔ عمومی و ارزان است ولی اسپم ممنوع
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = rateLimit('pay-catalog', req, 60, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  // ممیزی ناهمسانی قیمت — پس از هر تغییر کلاس‌ها یک‌بار در هر پروسه اجرا می‌شود
  await auditOncePerClassesVersion()

  const catalog = await buildPaymentCatalog()
  return NextResponse.json(catalog, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
