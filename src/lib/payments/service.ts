// ---------------------------------------------------------------------------
// 💳 سرویس سفارش‌ها و پرداخت دستی کارت بانکی (فاز ۵۹)
//
// از این فاز، روشِ فعالِ پرداخت «انتقال دستی بانکی + آپلود رسید + تأیید ادمین»
// است. جریانِ آنلاینِ قبلی (USDT/TRON) از جریانِ خرید حذف شده؛ ردیف‌های قدیمی
// و اسنپ‌شات‌هایشان در همان جدول حفظ می‌شوند (paymentMethod = USDT_TRON).
//
// اصول سخت‌گیرانهٔ این سرویس:
//  ۱) قیمت/مبلغ هرگز از مرورگر پذیرفته نمی‌شود — فقط productId و «کدِ» تخفیف
//     می‌آید؛ مبلغ نهایی همیشه سمت سرور با موتور قیمت‌گذاری محاسبه و در
//     اسنپ‌شات سفارش ذخیره می‌شود. مشتری باید «دقیقاً» مبلغ نهایی را واریز کند.
//  ۲) تأیید پرداخت فقط توسط ادمین و فقط پس از دیدنِ رسید انجام می‌شود
//     (APPROVE) — هیچ مسیر خودکاری برای PAID وجود ندارد و تأییدِ تکراری با
//     گارد وضعیت‌محورِ updateMany غیرممکن است.
//  ۳) ضد ارسال تکراری: سفارشِ بازِ همان محصول در پنجرهٔ کوتاه دوباره ساخته
//     نمی‌شود؛ رسیدِ در انتظارِ بررسی هم دوباره پذیرفته نمی‌شود (۴۰۹ شفاف).
//  ۴) هیچ دسترسی عمومی برای تغییر وضعیت وجود ندارد؛ ادمین فقط تأیید/ردّ/لغو.
//  ۵) چرخهٔ حیاتِ جریان دستی:
//     PENDING → RECEIPT_SUBMITTED → PAID | REJECTED → (ارسال دوبارهٔ رسید) → RECEIPT_SUBMITTED
//     PENDING → CANCELLED (ادمین) — و PENDINGِ منقضی در نمایش EXPIRED است.
//     RECEIPT_SUBMITTED هرگز منقضی نمی‌شود؛ تصمیم با انسان است نه تایمر.
//  ۶) وضعیت‌های تاریخیِ USDT (DETECTED/UNDERPAID/EXPIRED) فقط برای ردیف‌های
//     قدیمی معتبرند و در جریان جدید ساخته نمی‌شوند.
// ---------------------------------------------------------------------------

import { randomBytes } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import {
  findProductAsync,
  usdToMicro,
  microToDisplay,
  type PaymentProduct,
} from './config'
import { calculatePrice } from '@/lib/pricing'
import { deriveOrderStatus } from '@/lib/order-status'
import { notifyUser, notifyOrderEvent } from '@/lib/notifications'
import { getBankCardSettings, isBankCardReady } from '@/lib/payment-settings'
import { saveReceiptFile, deleteReceiptFile, type ReceiptMime } from '@/lib/receipts'

// دیتابیس در db.ts همیشه کلاینت دارد (گارد داخلی با ری‌لود کلاینت قدیمی)؛
// از نظر تایپ ممکن است undefined بیاید — این alias تایپ را متمرکز حل می‌کند
const database = db as PrismaClient

// سفارشِ «باز» = هنوز تصمیم نهایی نگرفته. PENDING (وظیفهٔ پرداخت مشتری) و
// RECEIPT_SUBMITTED (در انتظار بررسی ادمین) هر دو سقف سفارشِ باز را اشغال
// می‌کنند؛ فقط PENDING منقضی می‌شود.
const ACTIVE_STATUSES = ['PENDING', 'DETECTED', 'RECEIPT_SUBMITTED'] as const

// ⏱️ پنجرهٔ ضد ارسالِ تکراری (idempotency): اگر همان کاربر همان محصول را در
// این بازه دوباره سفارش دهد (مثلاً دابل‌کلیک)، همان سفارشِ بازِ قبلی برمی‌گردد
// — نه یک سفارش تازه. تصمیمِ نهایی داخل تراکنش دیتابیس است؛ مرورگر هرگز
// قابل‌اعتماد نیست و دور زدنِ دکمهٔ UI هم محافظت نمی‌شکند.
const ORDER_IDEMPOTENCY_MS = 120_000

// سقف سفارش باز برای هر IP — ضد آشغال‌کردن جدول
export const MAX_OPEN_ORDERS_PER_IP = 5
// 🛡️ سقف سفارش باز برای هر کاربر: حتی با چرخش IP، یک حساب نمی‌تواند
// بیش از این تعداد سفارش فعال داشته باشد (ضد سوءاستفادهٔ API)
export const MAX_OPEN_ORDERS_PER_USER = 5

// ⏳ مهلت پرداخت دستی — ۷ روز فرصت برای واریز و ارسال رسید؛ بعد از آن
// سفارشِ پرداخت‌نشده در نمایش EXPIRED است (RECEIPT_SUBMITTED هرگز منقضی نمی‌شود)
const MANUAL_ORDER_TTL_MS = 7 * 24 * 60 * 60 * 1000

export class PaymentNotConfiguredError extends Error {}
export class ProductNotFoundError extends Error {}
export class OrderLimitError extends Error {}
export class OrderBusyError extends Error {}

/** 🎟️ کد تخفیف بین پیش‌نمایش چک‌اوت و ساخت سفارش تمام/منقضی/غیرفعال شد
 *  → ۴۰۹ شفاف به مشتری (سفارش هرگز «بی‌صدا» با قیمت کامل ساخته نمی‌شود) */
export class DiscountExhaustedError extends Error {}

/** درخواستِ تکراریِ سفارشِ همان محصول — ref سفارشِ موجودِ باز برمی‌گردد */
export class DuplicateRecentOrderError extends Error {
  constructor(public readonly existingRef: string) {
    super('Duplicate recent order for the same product')
  }
}

// تشخیص تعارض نوشتن تراکنش پرستما (P2034) — SQLite نویسندهٔ واحد دارد؛
// دو تراکنش موازی که قبل از کامیتِ دیگری شروع شده باشند هنگام اولین WRITE
// با BUSY/SNAPSHOT رد می‌شوند → تلاش مجدد با دید تازه لازم است.
function isWriteConflict(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: unknown }).code === 'P2034'
  )
}

// ---------------------------------------------------------------------------
// رویدادها (لاگ ممیزی) — بدون هیچ راز و بدون دادهٔ شخصیِ غیرضروری
// ---------------------------------------------------------------------------

type EventKind =
  | 'CREATED' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  | 'DUPLICATE_SUPPRESSED'
  // 🧾 فاز ۵۹ — رویدادهای جریان رسیدِ دستی
  | 'RECEIPT_SUBMITTED' | 'RECEIPT_RESUBMITTED' | 'RECEIPT_APPROVED' | 'RECEIPT_REJECTED'
  // 🧊 رویدادهای قدیمیِ جریان USDT — فقط برای ردیف‌های تاریخی در گزارش‌ها
  | 'TX_SEEN' | 'DETECTED' | 'VERIFIED' | 'UNDERPAID' | 'UNMATCHED' | 'DUPLICATE_IGNORED' | 'API_ERROR' | 'PAGING_LIMIT' | 'LATE_PAYMENT'

async function logEvent(kind: EventKind, orderRef?: string, txHash?: string, detail?: Record<string, unknown>) {
  try {
    await database.paymentEvent.create({
      data: { kind, orderRef: orderRef ?? null, txHash: txHash ?? null, detail: detail ? JSON.stringify(detail) : '' },
    })
  } catch (e) {
    // لاگ هرگز جریان پرداخت را نمی‌شکند
    console.error('[payments] failed to write event', kind, e instanceof Error ? e.message : e)
  }
}

// ---------------------------------------------------------------------------
// شناسهٔ سفارش — CT-XXXXXXXX (بدون حروف گیج‌کننده)
// ---------------------------------------------------------------------------

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const REF_RE = /^CT-[A-HJ-KM-NP-TV-Z2-9]{8}$/ // دقیقاً همان الفبای بالا

function generateOrderRef(): string {
  const bytes = randomBytes(8)
  let s = ''
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[bytes[i] % REF_ALPHABET.length]
  return `CT-${s}`
}

export function isValidOrderRef(ref: string): boolean {
  return REF_RE.test(ref)
}

// ---------------------------------------------------------------------------
// ساخت سفارش
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  productId: string
  contactName?: string
  contactEmail?: string
  clientIp: string
  userId?: string // 👤 کاربرِ صاحب سفارش — ساخت سفارش فقط با حساب کاربری
  discountCode?: string | null // 🎟️ فقط «کد»؛ محاسبه همیشه سمت سرور
}

export interface PublicOrder {
  ref: string
  status: string
  productTitle: string
  productLabel: string
  amountUsd: string
  currency: string
  network: string
  address: string
  expiresAt: string
  createdAt: string
  paidAt: string | null
  txHash: string | null
  explorerBase?: string
  qrDataUrl?: string
  // 💰 ریزِ قیمت — از اسنپ‌شات سفارش؛ سفارش‌های قدیمی null دارند
  baseAmount?: string | null
  tierPercent?: number | null
  discountCode?: string | null
  discountAmount?: string | null
  // 🎟️ نوع/مقدار اصلی کد در لحظهٔ سفارش (پس از ویرایش/غیرفعال‌سازی
  // کد توسط ادمین، اسنپ‌شات تاریخی سفارش دست‌نخورده می‌ماند)
  discountType?: string | null
  discountValue?: string | null
  // 💳 فاز ۵۹ — روش پرداخت و وضعیت رسیدِ دستی
  paymentMethod?: string
  receiptStatus?: string | null
  receiptSubmittedAt?: string | null
  rejectionReason?: string | null
  /** نشانی امنِ دیدن رسید — فقط برای مالک/ادمین قابل‌واکشی است */
  receiptUrl?: string | null
  reviewedAt?: string | null
}

function publicOrder(o: {
  ref: string
  status: string
  productTitle: string
  expectedMicro: number
  currency: string
  network: string
  paymentAddress: string
  expiresAt: Date
  createdAt: Date
  paidAt: Date | null
  txHash: string | null
  baseAmount?: number | null
  tierPercent?: number | null
  discountCode?: string | null
  discountAmount?: number | null
  discountType?: string | null
  discountValue?: number | null
  paymentMethod?: string | null
  receiptId?: string | null
  receiptStatus?: string | null
  receiptSubmittedAt?: Date | null
  rejectionReason?: string | null
  reviewedAt?: Date | null
}, productLabel: string): PublicOrder {
  return {
    ref: o.ref,
    status: o.status,
    productTitle: o.productTitle,
    productLabel,
    amountUsd: microToDisplay(o.expectedMicro),
    currency: o.currency,
    network: o.network,
    address: o.paymentAddress,
    expiresAt: o.expiresAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    txHash: o.txHash,
    // اسنپ‌شات‌ها مستقیم نمایش داده می‌شوند (نه میکرو)
    baseAmount: o.baseAmount != null ? o.baseAmount.toFixed(2) : null,
    tierPercent: o.tierPercent ?? null,
    discountCode: o.discountCode ?? null,
    discountAmount: o.discountAmount != null ? o.discountAmount.toFixed(2) : null,
    discountType: o.discountType ?? null,
    discountValue: o.discountValue != null ? o.discountValue.toFixed(2) : null,
    paymentMethod: o.paymentMethod ?? 'USDT_TRON',
    receiptStatus: o.receiptStatus ?? null,
    receiptSubmittedAt: o.receiptSubmittedAt?.toISOString() ?? null,
    rejectionReason: o.rejectionReason ?? null,
    receiptUrl: o.receiptId ? `/api/receipts/${o.receiptId}` : null,
    reviewedAt: o.reviewedAt?.toISOString() ?? null,
  }
}

export async function createOrder(input: CreateOrderInput): Promise<PublicOrder> {
  // 💳 پرداخت دستی باید از پنل ادمین فعال و کارت تنظیم شده باشد — fail-closed
  const bank = await getBankCardSettings()
  if (!isBankCardReady(bank)) {
    console.error('[payments] create blocked — manual bank-card payment is not configured/enabled')
    throw new PaymentNotConfiguredError('Manual bank-card payment is not configured on this server')
  }

  // 🎓 مبلغ مرجع از جدول CourseClass — با موتور قیمت‌گذاری:
  //   base = pricePerSession × sessions، تخفیف خودکار بسته (پله‌ها) و کد تخفیف
  //   همه سمت سرور. مرورگر فقط productId و «کدِ» تخفیف را می‌فرستد.
  const product = await findProductAsync(input.productId)
  if (!product) throw new ProductNotFoundError(`Unknown product: ${input.productId}`)

  // ردیف کامل کلاس از DB — برای محاسبهٔ مقتدر (fallback فایل = بدون کد)
  const { findBookableClassRowByProductId } = await import('@/lib/classes/store')
  const clsRow = await findBookableClassRowByProductId(input.productId)
  let finalUsd = product.amountUsd
  let breakdown: Awaited<ReturnType<typeof calculatePrice>>['breakdown'] | null = null
  if (clsRow) {
    const calc = await calculatePrice(clsRow, { code: input.discountCode, email: input.contactEmail })
    breakdown = calc.breakdown
    if (breakdown.final > 0) finalUsd = breakdown.final
    if (calc.rejection && input.discountCode) {
      console.info(`[payments] discount code "${input.discountCode}" rejected (${calc.rejection}) — order continues without code discount`)
    }
  }

  // 💳 مبلغِ واریزِ مشتری = دقیقاً مبلغ نهایی — بدون هیچ افست/اسلات
  const baseMicro = usdToMicro(finalUsd)
  const contactName = (input.contactName || '').slice(0, 80)
  const contactEmail = (input.contactEmail || '').slice(0, 120)

  // حلقهٔ ضد-مسابقه: اگر درخواست موازی‌ای در حال نوشتن باشد، SQLite با P2034
  // رد می‌کند → با دید تازه دوباره تلاش می‌کنیم (idempotency داخل تراکنش است).
  let order: Awaited<ReturnType<typeof buildOrderTx>> | null = null
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await buildOrderTx(input, product, baseMicro, contactName, contactEmail, breakdown)
    } catch (e) {
      // 🎟️ کد بین پیش‌نمایش و این لحظه تمام/منقضی/غیرفعال شد:
      // سفارش «بی‌صدا» با قیمت کامل ساخته نمی‌شود — ۴۰۹ شفاف به مشتری.
      if (e instanceof DiscountExhaustedError) throw e
      // 🛡️ ضد ارسال تکراری — سفارشِ بازِ همان محصول در ۲ دقیقهٔ اخیر:
      // همان سفارش موجود برمی‌گردد (پاسخ idempotent؛ بدون ساخت رکورد تازه)
      if (e instanceof DuplicateRecentOrderError) {
        const existing = await getOrderByRef(e.existingRef)
        if (existing) {
          await logEvent('DUPLICATE_SUPPRESSED', existing.ref, undefined, {
            windowMs: ORDER_IDEMPOTENCY_MS,
            note: 'Duplicate order creation suppressed — existing open order returned',
          })
          return publicOrder(existing, product.label)
        }
        // سفارشِ موجود در همین فاصله حذف/بسته شده → ادامه به ساختِ عادی
        continue
      }
      if (isWriteConflict(e)) continue // تلاش مجدد با دید تازه
      throw e
    }
  }
  if (!order) throw new OrderBusyError('Could not allocate an order — please try again shortly')

  await logEvent('CREATED', order.ref, undefined, {
    product: product.id,
    amountUsd: microToDisplay(order.expectedMicro),
    paymentMethod: 'MANUAL_BANK_CARD',
    ...(breakdown ? { base: breakdown.base.toFixed(2), tierPercent: String(breakdown.tierPercent), code: breakdown.code ?? '-', discount: breakdown.codeDiscount.toFixed(2) } : {}),
  })

  // 🔔 اعلان ORDER_CREATED — فقط از رویداد واقعی backend
  if (input.userId) {
    notifyUser({
      userId: input.userId,
      category: 'order',
      kind: 'ORDER_CREATED',
      title: 'Order created',
      body: `Your order ${order.ref} for “${product.label}” (${microToDisplay(order.expectedMicro)} USD) has been created. Please transfer the exact amount to the bank card shown on the payment page, then upload your payment receipt so we can verify it.`,
      orderRef: order.ref,
    })
  }

  return publicOrder(order, product.label)
}

/** یک تلاش کامل ساخت سفارش داخل یک تراکنش دیتابیس — جریانِ پرداخت دستی */
async function buildOrderTx(
  input: CreateOrderInput,
  product: PaymentProduct,
  baseMicro: number,
  contactName: string,
  contactEmail: string,
  breakdown: Awaited<ReturnType<typeof calculatePrice>>['breakdown'] | null
) {
  const { userId } = input
  return database.$transaction(async (tx) => {
    // 🛡️ ضد ارسال تکراری (idempotency) — داخل همان تراکنش: اگر همین کاربر همان
    // محصول را لحظاتی پیش سفارش داده باشد و هنوز باز باشد، به‌جای رکورد تازه همان
    // سفارش برمی‌گرداند (دابل‌کلیک هرگز دو سفارش نمی‌سازد).
    if (userId) {
      const dup = await tx.usdtOrder.findFirst({
        where: {
          userId,
          productId: product.id,
          status: { in: [...ACTIVE_STATUSES] },
          createdAt: { gte: new Date(Date.now() - ORDER_IDEMPOTENCY_MS) },
        },
        orderBy: { createdAt: 'desc' },
        select: { ref: true },
      })
      if (dup) throw new DuplicateRecentOrderError(dup.ref)
    }

    // سقف سفارش باز برای هر IP
    const openCount = await tx.usdtOrder.count({
      where: { clientIp: input.clientIp, status: { in: [...ACTIVE_STATUSES] } },
    })
    if (openCount >= MAX_OPEN_ORDERS_PER_IP) throw new OrderLimitError('Too many open orders')

    // 🛡️ سقف مستقل برای هر کاربر (ضد چرخش IP برای دورزدن سقف IP)
    if (userId) {
      const openUserCount = await tx.usdtOrder.count({
        where: { userId, status: { in: [...ACTIVE_STATUSES] } },
      })
      if (openUserCount >= MAX_OPEN_ORDERS_PER_USER) throw new OrderLimitError('Too many open orders')
    }

    const ref = generateOrderRef()
    const expiresAt = new Date(Date.now() + MANUAL_ORDER_TTL_MS)
    const created = await tx.usdtOrder.create({
      data: {
        ref,
        userId: userId ?? null,
        productId: product.id,
        productTitle: product.label,
        contactName,
        contactEmail,
        expectedMicro: baseMicro, // 💳 واریز دقیقِ مبلغ نهایی — بدون افست
        currency: 'USD', // 💳 پرداخت بانکی — نمایش دلار
        network: 'BANK', // نشانهٔ «خارج از بلاکچین» — شبکهٔ قدیمی سفارش‌های USDT حفظ شده
        paymentMode: 'manual',
        paymentAddress: '', // 🧾 در پرداخت بانکی آدرسِ زنجیره‌ای وجود ندارد
        addressIndex: null,
        clientIp: input.clientIp,
        paymentMethod: 'MANUAL_BANK_CARD',
        status: 'PENDING',
        expiresAt,
        // 💰 اسنپ‌شات قیمت‌گذاری — سفارش تاریخی هرگز از پیکربندی آینده پیروی نمی‌کند
        // 🎟️ نوع/مقدار کد هم اسنپ‌شات می‌شود (دقت تاریخی بعد از ویرایش ادمین)
        ...(breakdown
          ? {
              pricePerSession: breakdown.pricePerSession,
              packageSessions: breakdown.sessions,
              baseAmount: breakdown.base,
              tierPercent: breakdown.tierPercent,
              discountCode: breakdown.code,
              discountAmount: breakdown.codeDiscount,
              discountType: breakdown.codeType,
              discountValue: breakdown.codeValue,
            }
          : {}),
      },
    })

    // 🎟️ ثبت استفادهٔ کد داخل «همان تراکنش» سفارش:
    //  • شمارش maxUses/perCustomer + درج Redemption اتمی است — سفارش بدون ثبت
    //    استفاده هرگز commit نمی‌شود و برعکس.
    //  • قواعد زمان‌محور/وضعیت‌محور (active/startsAt/endsAt) دوباره با «زمان سرور»
    //    چک می‌شوند — مرورگر و پیش‌نمایش قبلی هیچ اعتباری ندارند.
    if (breakdown?.discountId && breakdown.codeDiscount > 0 && breakdown.code) {
      const dRow = await tx.discount.findUnique({ where: { id: breakdown.discountId } })
      const now = new Date() // ⏰ زمان سرور — مرورگر هرگز اعتبار کد را تعیین نمی‌کند
      if (!dRow || !dRow.active) throw new DiscountExhaustedError(breakdown.code)
      if (dRow.startsAt && dRow.startsAt > now) throw new DiscountExhaustedError(breakdown.code)
      if (dRow.endsAt && dRow.endsAt < now) throw new DiscountExhaustedError(breakdown.code)
      const usedTotal = await tx.discountRedemption.count({ where: { discountId: dRow.id } })
      if (dRow.maxUses !== null && usedTotal >= dRow.maxUses) throw new DiscountExhaustedError(breakdown.code)
      const redemptionEmail = contactEmail.toLowerCase()
      if (redemptionEmail) {
        const usedBy = await tx.discountRedemption.count({
          where: { discountId: dRow.id, userEmail: redemptionEmail },
        })
        if (usedBy >= Math.max(1, dRow.perCustomer)) throw new DiscountExhaustedError(breakdown.code)
      }
      await tx.discountRedemption.create({
        data: {
          discountId: dRow.id,
          orderRef: ref,
          userEmail: redemptionEmail,
          amount: breakdown.codeDiscount,
        },
      })
    }

    return created
  })
}

// ---------------------------------------------------------------------------
// خواندن وضعیت (عمومی — با گارد مالکیت در سطح route)
// ---------------------------------------------------------------------------

export async function getOrderByRef(ref: string) {
  if (!REF_RE.test(ref)) return null
  return database.usdtOrder.findUnique({ where: { ref } })
}

export async function buildPublicStatus(ref: string): Promise<PublicOrder | null> {
  const o = await getOrderByRef(ref)
  if (!o) return null
  // 📊 وضعیت نمایشی مشتقِ سمت سرور است — PENDINGِ منقضی = EXPIRED حتی اگر
  // سوئیپر هنوز رکورد را به‌روز نکرده باشد؛ مشتری هرگز صفحهٔ قابل‌پرداختِ
  // سفارشِ منقضی نمی‌بیند. RECEIPT_SUBMITTED هرگز منقضی نمایش داده نمی‌شود.
  const derived = deriveOrderStatus(o)
  // محصولِ کلاس ممکن است بعداً حذف/غیرفعال شده باشد — اسنپ‌شات سفارش (productTitle)
  // همیشه معتبر است و هرگز به منبع فعلی وابسته نیست (دقت تاریخی سفارش‌ها)
  const product = await findProductAsync(o.productId)
  return publicOrder({ ...o, status: derived }, product?.label ?? o.productTitle)
}

// ---------------------------------------------------------------------------
// 🧾 رسید پرداخت دستی — ارسال توسط مالکِ سفارش (فاز ۵۹)
// ---------------------------------------------------------------------------

export type SubmitReceiptResult =
  | { ok: true; resubmitted: boolean }
  | { ok: false; reason: 'NOT_FOUND' | 'NOT_OWNER' | 'INVALID_STATE' | 'ALREADY_SUBMITTED' | 'CONFLICT' }

export async function submitReceipt(input: {
  ref: string
  viewerUserId: string
  receiptId: string
  mime: ReceiptMime
  size: number
  fileName: string
  fileData: Buffer
}): Promise<SubmitReceiptResult> {
  const order = await getOrderByRef(input.ref)
  if (!order) return { ok: false, reason: 'NOT_FOUND' }
  // 🔒 فقط مالکِ سشن — پاسخِ «پیدا نشد» برای سفارشِ دیگران (بدون نشت وجودش)
  if (!order.userId || order.userId !== input.viewerUserId) return { ok: false, reason: 'NOT_FOUND' }

  const derived = deriveOrderStatus(order)
  const resubmitted = derived === 'REJECTED'
  if (derived === 'RECEIPT_SUBMITTED') {
    // 🛡️ ضد ارسال تکراری — رسیدِ در انتظار بررسی؛ دوباره پذیرفته نمی‌شود
    return { ok: false, reason: 'ALREADY_SUBMITTED' }
  }
  if (derived !== 'PENDING' && derived !== 'REJECTED') {
    return { ok: false, reason: 'INVALID_STATE' }
  }

  // فایل اول ذخیره می‌شود (شناسهٔ یکتا — بدون تداخل)؛ اگر گارد وضعیت شکست بخورد
  // فایل یتیم حذف می‌شود. گارد، هم‌زمانیِ دو ارسال موازی را می‌گیرد.
  await saveReceiptFile(input.receiptId, input.mime, input.fileData)
  const res = await database.usdtOrder
    .updateMany({
      where: {
        ref: input.ref,
        status: { in: ['PENDING', 'REJECTED'] },
        OR: [{ status: 'REJECTED' }, { expiresAt: { gt: new Date() } }],
      },
      data: {
        status: 'RECEIPT_SUBMITTED',
        receiptStatus: 'PENDING_REVIEW',
        receiptId: input.receiptId,
        receiptMime: input.mime,
        receiptSize: input.size,
        receiptFileName: input.fileName,
        receiptSubmittedAt: new Date(),
        rejectionReason: null, // ارسال دوباره = دلیل قبلی پاک می‌شود
        reviewedAt: null,
        reviewedBy: null,
        ...(resubmitted ? { receiptResubmits: { increment: 1 } } : {}),
      },
    })
    .then((r) => r.count)
    .catch(() => 0)

  if (res !== 1) {
    await deleteReceiptFile(input.receiptId)
    return { ok: false, reason: 'CONFLICT' }
  }

  // حذف فایل رسید قبلی (ارسال دوباره پس از رد) — بعد از موفقیتِ به‌روزرسانی
  if (order.receiptId && order.receiptId !== input.receiptId) {
    await deleteReceiptFile(order.receiptId)
  }

  await logEvent(resubmitted ? 'RECEIPT_RESUBMITTED' : 'RECEIPT_SUBMITTED', input.ref, undefined, {
    size: input.size,
    mime: input.mime,
    resubmits: (order.receiptResubmits ?? 0) + (resubmitted ? 1 : 0),
  })

  // 🔔 اعلان مشتری: رسید دریافت شد و در انتظار بررسی است (وضعیت هرگز «پرداخت‌شده» نیست)
  notifyOrderEvent(input.ref, {
    kind: 'RECEIPT_RECEIVED',
    category: 'payment',
    title: 'Receipt submitted',
    body: `Your payment receipt for order ${input.ref} has been submitted and is now waiting for verification. We'll notify you as soon as our team reviews it.`,
  })

  return { ok: true, resubmitted }
}

// ---------------------------------------------------------------------------
// ✅ تأیید/ردّ ادمین — تنها مسیرِ ساختنِ PAID در جریانِ دستی (فاز ۵۹)
// ---------------------------------------------------------------------------

export type ReviewResult = 'ok' | 'not-reviewable'

/**
 * تأیید پرداخت — فقط از RECEIPT_SUBMITTED و فقط با گارد وضعیت‌محور؛
 * تأیید دوم همیشه شکست می‌خورد (ضد تأیید تصادفیِ دوباره).
 */
export async function approveManualPayment(ref: string, actor: string): Promise<ReviewResult> {
  const res = await database.usdtOrder
    .updateMany({
      where: { ref, status: 'RECEIPT_SUBMITTED' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        receiptStatus: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: actor.slice(0, 60),
        rejectionReason: null,
      },
    })
    .then((r) => r.count)
    .catch(() => 0)
  if (res !== 1) return 'not-reviewable'

  await logEvent('RECEIPT_APPROVED', ref, undefined, { by: actor })
  // 🔔 اعلان مشتری — تأیید نهایی توسط انسان
  notifyOrderEvent(ref, {
    kind: 'PAYMENT_CONFIRMED',
    category: 'payment',
    title: 'Payment approved 🎉',
    body: `Your payment for order ${ref} has been approved. Our team will contact you to schedule your class sessions — track your enrollment status in your account.`,
  })
  return 'ok'
}

/** ردّ رسید — دلیلِ رد اجباری است و به مشتری نشان داده می‌شود */
export async function rejectManualPayment(ref: string, actor: string, reason: string): Promise<ReviewResult> {
  const cleanReason = reason.trim().slice(0, 500)
  if (!cleanReason) return 'not-reviewable'
  const res = await database.usdtOrder
    .updateMany({
      where: { ref, status: 'RECEIPT_SUBMITTED' },
      data: {
        status: 'REJECTED',
        receiptStatus: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: actor.slice(0, 60),
        rejectionReason: cleanReason,
      },
    })
    .then((r) => r.count)
    .catch(() => 0)
  if (res !== 1) return 'not-reviewable'

  await logEvent('RECEIPT_REJECTED', ref, undefined, { by: actor, reason: cleanReason.slice(0, 300) })
  // 🔔 اعلان مشتری — ردّ با دلیل شفاف + امکان ارسال دوبارهٔ رسید روی همان سفارش
  notifyOrderEvent(ref, {
    kind: 'PAYMENT_REJECTED',
    category: 'payment',
    title: 'Payment rejected',
    body: `Your payment for order ${ref} was rejected. Reason: ${cleanReason} — you can upload a new receipt for the same order from the payment page.`,
  })
  return 'ok'
}

// ---------------------------------------------------------------------------
// انقضای سفارش‌های قدیمیِ پرداخت‌نشده — فقط PENDING؛ RECEIPT_SUBMITTED هرگز
// ---------------------------------------------------------------------------

/**
 * فیلتر شبکه — سفارش‌های «شبکهٔ دیگر» هرگز لمس نمی‌شوند. مقدار قدیمی «TRON»
 * هم‌ارز mainnet است؛ «BANK» فقط سفارش‌های پرداخت دستی را می‌گیرد.
 */
function networkFilter(network: string): { in: string[] } {
  if (network === 'BANK') return { in: ['BANK'] }
  return { in: network === 'mainnet' ? ['mainnet', 'TRON'] : [network] }
}

export async function expireStaleOrders(network: string = 'BANK'): Promise<number> {
  const stale = await database.usdtOrder.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() }, network: networkFilter(network) },
    select: { ref: true, userId: true },
  })
  let n = 0
  for (const o of stale) {
    // گارد وضعیت‌محور: فقط PENDING منقضی می‌شود؛ PAID/RECEIPT_SUBMITTED هم‌زمان دست‌نخورده می‌مانند
    const res = await database.usdtOrder
      .updateMany({ where: { ref: o.ref, status: 'PENDING' }, data: { status: 'EXPIRED' } })
      .then((r) => r.count)
      .catch(() => 0)
    if (res === 1) {
      n++
      await logEvent('EXPIRED', o.ref)
      // 🎟️ آزادسازی سهمیهٔ کد تخفیف: سفارشِ منقضی هرگز پرداخت نشده،
      // پس استفاده‌اش نباید در maxUses/perCustomer حساب شود.
      await database.discountRedemption.deleteMany({ where: { orderRef: o.ref } }).catch(() => 0)
      // 🔔 اعلان ORDER_EXPIRED — انقضای سمت سرور است، نه تصمیم مرورگر
      if (o.userId) {
        notifyUser({
          userId: o.userId,
          category: 'order',
          kind: 'ORDER_EXPIRED',
          title: 'Order expired',
          body: `Your order ${o.ref} expired because the payment deadline passed. You can safely create a new order anytime — no payment was deducted.`,
          orderRef: o.ref,
        })
      }
    }
  }
  return n
}

// ---------------------------------------------------------------------------
// عملیات ادمین
// ---------------------------------------------------------------------------

export async function adminCancelOrder(ref: string): Promise<boolean> {
  const res = await database.usdtOrder
    .updateMany({ where: { ref, status: 'PENDING' }, data: { status: 'CANCELLED' } })
    .then((r) => r.count)
    .catch(() => 0)
  if (res === 1) {
    await logEvent('CANCELLED', ref, undefined, { by: 'admin' })
    // لغو فقط از PENDING ممکن است (هرگز پرداخت‌نشده) → سهمیهٔ کد آزاد شود
    await database.discountRedemption.deleteMany({ where: { orderRef: ref } }).catch(() => 0)
    // 🔔 اعلان ORDER_CANCELLED — لغو توسط ادمین
    void notifyOrderEvent(ref, {
      kind: 'ORDER_CANCELLED',
      category: 'order',
      title: 'Order cancelled',
      body: `Your order ${ref} was cancelled by our team. If you didn't expect this or need help re-ordering, please contact support.`,
    })
  }
  return res === 1
}

/** شمارنده‌های تب Payments پنل ادمین — همه از دیتابیس، نه متن تزئینی */
export async function getAdminPaymentCounts(): Promise<{
  pendingReview: number
  approved: number
  rejected: number
  unpaid: number
  cancelled: number
}> {
  const now = new Date()
  const [pendingReview, approved, rejected, unpaidOpen, unpaidExpired, cancelled] = await Promise.all([
    database.usdtOrder.count({ where: { status: 'RECEIPT_SUBMITTED' } }),
    database.usdtOrder.count({ where: { status: 'PAID' } }),
    database.usdtOrder.count({ where: { status: 'REJECTED' } }),
    database.usdtOrder.count({ where: { status: 'PENDING', expiresAt: { gt: now } } }),
    database.usdtOrder.count({ where: { status: 'PENDING', expiresAt: { lte: now } } }),
    database.usdtOrder.count({ where: { status: 'CANCELLED' } }),
  ])
  return {
    pendingReview,
    approved,
    rejected,
    unpaid: unpaidOpen + unpaidExpired,
    cancelled,
  }
}
