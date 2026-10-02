// ---------------------------------------------------------------------------
// 🧾 POST /api/receipts — آپلود رسید پرداخت دستی توسط مالکِ سفارش (فاز ۵۹)
//
// امنیت:
//  • احراز هویت اجباری — مهمان هرگز نمی‌تواند رسید بفرستد
//  • فقط مالکِ سفارش (سشن کوکی) — سفارش دیگران با ۴۰۴ پاسخ می‌شود (بدون نشت)
//  • نوع فایل از magic bytes تشخیص داده می‌شود؛ فقط JPEG/PNG/WEBP/PDF
//  • سقف ۵ مگابایت (Content-Length + file.size هر دو چک می‌شوند)
//  • ضد ارسال تکراری: سفارشِ در وضعیت RECEIPT_SUBMITTED با ۴۰۹ رد می‌شود —
//    هر سفارش در هر لحظه حداکثر یک رسیدِ در انتظارِ بررسی دارد
//  • ارسال دوباره فقط از وضعیت REJECTED — روی همان سفارش، بدون سفارشِ تازه
//  • rate limit ۱۰ ارسال در ۱۰ دقیقه
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { getUserFromRequest } from '@/lib/user-auth'
import { submitReceipt, buildPublicStatus, isValidOrderRef } from '@/lib/payments/service'
import {
  MAX_RECEIPT_BYTES,
  detectReceiptType,
  generateReceiptId,
  sanitizeDisplayName,
} from '@/lib/receipts'
import { logAppError } from '@/lib/error-log'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to upload your receipt', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // سقف حجم بدنه — قبل از خواندن formData (۵MB فایل + سربار multipart)
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength > MAX_RECEIPT_BYTES + 64 * 1024) {
    return NextResponse.json(
      { error: 'The receipt file is too large (max 5 MB)', code: 'FILE_TOO_LARGE' },
      { status: 413 }
    )
  }

  // ۱۰ ارسال رسید در ۱۰ دقیقه برای هر کاربر — ضد سوءاستفاده
  const rl = rateLimit('receipt-upload', req, 10, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const ref = typeof form.get('ref') === 'string' ? (form.get('ref') as string).trim() : ''
  if (!isValidOrderRef(ref)) {
    return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Receipt file is required', code: 'FILE_REQUIRED' }, { status: 400 })
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: 'The selected file is empty', code: 'FILE_EMPTY' }, { status: 400 })
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json(
      { error: 'The receipt file is too large (max 5 MB)', code: 'FILE_TOO_LARGE' },
      { status: 413 }
    )
  }

  // 🔬 نوع واقعی فایل از محتوا — ادعای مرورگر (file.type) هرگز قابل‌اعتماد نیست
  const bytes = Buffer.from(await file.arrayBuffer())
  const detected = detectReceiptType(bytes)
  if (!detected) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WEBP images or PDF documents are accepted', code: 'FILE_TYPE' },
      { status: 415 }
    )
  }

  try {
    const result = await submitReceipt({
      ref,
      viewerUserId: user.id,
      receiptId: generateReceiptId(),
      mime: detected.mime,
      size: bytes.length,
      fileName: sanitizeDisplayName(file.name),
      fileData: bytes,
    })

    if (!result.ok) {
      const map: Record<string, { message: string; code: string; status: number }> = {
        NOT_FOUND: { message: 'Order not found', code: 'NOT_FOUND', status: 404 },
        NOT_OWNER: { message: 'Order not found', code: 'NOT_FOUND', status: 404 },
        INVALID_STATE: {
          message: 'This order can no longer accept a receipt',
          code: 'INVALID_STATE',
          status: 409,
        },
        ALREADY_SUBMITTED: {
          message: 'A receipt for this order is already under review',
          code: 'ALREADY_SUBMITTED',
          status: 409,
        },
        CONFLICT: {
          message: 'The order state just changed — please refresh and try again',
          code: 'CONFLICT',
          status: 409,
        },
      }
      const m = map[result.reason] ?? map.INVALID_STATE
      return NextResponse.json({ error: m.message, code: m.code }, { status: m.status })
    }

    const order = await buildPublicStatus(ref)
    return NextResponse.json({ ok: true, resubmitted: result.resubmitted, order }, { status: 201 })
  } catch (e) {
    console.error('[receipts] upload failed:', e instanceof Error ? e.message : e)
    logAppError({
      category: 'PAYMENT',
      error: e,
      fallback: 'Receipt upload failed',
      context: { path: '/api/receipts', method: 'POST', note: `ref=${ref}` },
    })
    return NextResponse.json({ error: 'Could not upload the receipt. Please try again.' }, { status: 500 })
  }
}
