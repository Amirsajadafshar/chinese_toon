// ---------------------------------------------------------------------------
// 💳 GET/PUT /api/payment-settings — تنظیمات پرداخت دستی کارت بانکی (فاز ۵۹)
//
// GET:
//  • ادمین (x-admin-key) → تنظیمات کامل + زمان آخرین به‌روزرسانی
//  • عمومی → فقط وقتی «فعال و آماده» است اطلاعات کارت برمی‌گردد؛ در غیر این
//    صورت { enabled:false } — صفحهٔ پرداخت مشتری از همین فیلد استفاده می‌کند
//    (شمارهٔ کارتِ مقصد برای واریز ماهیتاً باید در دسترس مشتری باشد)
//
// PUT (فقط ادمین):
//  • sanitize کامل هر فیلد + audit log + بی‌اعتبارسازیِ کش
//  • شمارهٔ کارت هرگز هارد‌کد نمی‌شود — همه‌چیز از DB می‌آید
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { logAdminAction } from '@/lib/audit'
import {
  getBankCardSettings,
  saveBankCardSettings,
  isBankCardReady,
  type BankCardSettings,
} from '@/lib/payment-settings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await isAuthorized(req)
  const s = await getBankCardSettings()
  if (admin) {
    return NextResponse.json({ settings: { ...s, ready: isBankCardReady(s) } })
  }
  // نمای عمومی — فقط وقتی فعال و آماده، اطلاعات کارت دیده می‌شود
  const digits = (s.cardNumber || '').replace(/ /g, '')
  const ready = isBankCardReady(s)
  return NextResponse.json({
    settings: {
      enabled: ready,
      cardNumber: ready ? s.cardNumber : '',
      cardHolder: ready ? s.cardHolder : '',
      bankName: ready ? s.bankName : '',
      instructions: ready ? s.instructions : '',
      hasCard: digits.length >= 12, // برای نمایش وضعیت در پنل بدون افشای شماره
    },
  })
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // هم‌مبدأ بودن + سقف حجم بدنه
  const guard = guardResponse(req)
  if (guard) return guard

  // ۳۰ ذخیره در ۱۰ دقیقه — ضد سوءاستفاده
  const rl = await rateLimit('payment-settings', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input: BankCardSettings = {
    enabled: body.enabled === true,
    cardNumber: typeof body.cardNumber === 'string' ? body.cardNumber : '',
    cardHolder: typeof body.cardHolder === 'string' ? body.cardHolder : '',
    bankName: typeof body.bankName === 'string' ? body.bankName : '',
    instructions: typeof body.instructions === 'string' ? body.instructions : '',
  }

  // اعداد فقط رقم/فاصله + حداقل ۱۲ رقم در صورت پر بودن
  const digits = input.cardNumber.replace(/[^\d]/g, '')
  if (input.cardNumber.trim() !== '' && (digits.length < 12 || digits.length > 23 || !/^\d+$/.test(digits))) {
    return NextResponse.json(
      { error: 'Card number must contain 12–23 digits', code: 'BAD_CARD_NUMBER' },
      { status: 400 }
    )
  }
  if (input.enabled && digits.length < 12) {
    return NextResponse.json(
      { error: 'Enter a valid card number before enabling manual card payment', code: 'CARD_REQUIRED' },
      { status: 400 }
    )
  }

  try {
    const saved = await saveBankCardSettings(input)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'payment.settings',
      targetType: 'payment_settings',
      targetId: 'bankCardPayment',
      meta: {
        enabled: saved.enabled,
        cardDigits: (saved.cardNumber || '').replace(/ /g, '').length,
        hasHolder: saved.cardHolder !== '',
        hasBank: saved.bankName !== '',
        hasInstructions: saved.instructions !== '',
      },
    })
    return NextResponse.json({ ok: true, settings: { ...saved, ready: isBankCardReady(saved) } })
  } catch (e) {
    console.error('[payment-settings] save failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not save payment settings' }, { status: 500 })
  }
}
