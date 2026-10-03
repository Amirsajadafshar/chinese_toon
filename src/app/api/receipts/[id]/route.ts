// ---------------------------------------------------------------------------
// 🧾 GET /api/receipts/[id] — دیدن فایل رسید (فاز ۵۹)
//
// امنیت:
//  • فقط دو گروه: ادمین (همهٔ رسیدها) یا مالکِ سفارش از روی سشن کوکی
//  • id غیرقابل‌حدس است (۴۸ hex) و قبل از هر مسیرسازی اعتبارسنجی می‌شود —
//    هیچ possibility برای path traversal وجود ندارد
//  • فایل در uploads/receipts/ بیرون از وب‌روت است — هیچ URL عمومی ندارد
//  • پاسخ Cache-Control: private, no-store — رسید معلومات مالی است
//  • ۴۰۴ برای «موجود ولی متعلق به دیگری» = بدون نشتِ وجود فایل
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/admin-auth'
import { getUserFromRequest } from '@/lib/user-auth'
import { db } from '@/lib/db'
import { readReceiptFile, isReceiptId, RECEIPT_EXT_BY_MIME, type ReceiptMime } from '@/lib/receipts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isReceiptId(id)) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  const order = await db.usdtOrder.findFirst({
    where: { receiptId: id },
    select: { userId: true, ref: true, receiptMime: true },
  })
  if (!order) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  // 🔒 ادمین یا مالکِ سشن — بقیهٔ جهان ۴۰۴ می‌بینند
  const admin = await isAuthorized(req)
  if (!admin) {
    const viewer = await getUserFromRequest(req)
    if (!viewer || !order.userId || viewer.id !== order.userId) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }
  }

  const mime = (order.receiptMime ?? '') as ReceiptMime
  if (!RECEIPT_EXT_BY_MIME[mime]) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  const data = await readReceiptFile(id, mime)
  if (!data) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  const ext = RECEIPT_EXT_BY_MIME[mime]
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(data.length),
      'Content-Disposition': `inline; filename="receipt-${order.ref}.${ext}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
