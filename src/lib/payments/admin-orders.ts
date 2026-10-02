// ---------------------------------------------------------------------------
// 🧾 سازندهٔ ردیف‌های سفارشِ پنل ادمین — زنجیرهٔ کامل
//   User → Order → Course → Payment → Enrollment/Schedule
//
// همهٔ وضعیت‌ها «مشتق از دیتابیس»اند (deriveOrderStatus / deriveEnrollmentStatus)
// — هیچ برچسبی ذخیره‌شده یا ساختگی نیست. مبلغ‌های تاریخی فقط از اسنپ‌شاتِ خودِ
// سفارش خوانده می‌شوند: تغییر قیمت کلاس یا تخفیف در آینده، سفارش‌های قبلی را
// عوض نمی‌کند.
//
// ایمیل/نام مشتری از رکورد User (رابطهٔ userId) می‌آید؛ اسنپ‌شاتِ
// contactName/contactEmail سفارش فقط برای سفارش‌های مهمانِ قدیمی (بدون حساب)
// نمایش داده می‌شود — اطلاعات تکراری ذخیره/ساخته نمی‌شود.
// ---------------------------------------------------------------------------

import type { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { deriveOrderStatus, microToUsdString, type DerivedOrderStatus } from '@/lib/order-status'
import { deriveEnrollmentStatus, type EnrollmentStatus } from '@/lib/enrollment'

const database = db as PrismaClient

export interface AdminOrderRow {
  ref: string
  createdAt: string
  updatedAt: string
  // سفارش
  productTitle: string
  productId: string
  classSlug: string | null
  classLevel: string | null
  sessions: number | null // اسنپ‌شات packageSessions سفارش؛ قدیمی‌ها از کلاس
  // 💰 مبلغ‌ها — تاریخی و دست‌نخورده (اسنپ‌شات)
  amountUsd: string // مبلغ نهایی (میکرو → رشتهٔ دقیق)
  baseAmount: string | null
  tierPercent: number | null
  discountCode: string | null
  discountType: string | null
  discountValue: string | null
  discountAmount: string | null
  // 💳 پرداخت
  payment: {
    method: string // USDT · TRC20
    network: string
    mode: string // hd | shared
    address: string
    txHash: string | null
    txAmountUsd: string | null
    txFrom: string | null
    paidAt: string | null
  }
  // 🏷️ وضعیت‌ها
  rawStatus: string
  paymentStatus: DerivedOrderStatus // مشتق‌شده — PENDING منقضی = EXPIRED
  enrollmentStatus: EnrollmentStatus
  nextSessionAt: string | null
  scheduleCount: number
  // 👤 مشتری — از رکورد User؛ بدون حساب = مهمان با اسنپ‌شات سفارش
  customer: {
    hasAccount: boolean
    userId: string | null
    name: string
    email: string
    accountCreatedAt: string | null
  }
}

/** ورودی: ردیف‌های خام UsdtOrder (کل رکورد یا همان فیلدهای لازم) */
type OrderLike = Parameters<typeof buildAdminOrderRows>[0][number]

export async function buildAdminOrderRows(
  orders: Array<{
    ref: string
    userId: string | null
    productId: string
    productTitle: string
    contactName: string
    contactEmail: string
    expectedMicro: number
    status: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    txHash: string | null
    txAmountMicro: number | null
    txFrom: string | null
    paidAt: Date | null
    paymentMode: string
    paymentAddress: string
    network: string
    pricePerSession: number | null
    packageSessions: number | null
    baseAmount: number | null
    tierPercent: number | null
    discountCode: string | null
    discountAmount: number | null
    discountType: string | null
    discountValue: number | null
  }>,
  now = new Date()
): Promise<AdminOrderRow[]> {
  if (orders.length === 0) return []

  const refs = orders.map((o) => o.ref)
  const userIds = Array.from(new Set(orders.map((o) => o.userId).filter((v): v is string => !!v)))
  const productIds = Array.from(new Set(orders.map((o) => o.productId)))

  // 👤 حساب‌های کاربری صاحب سفارش‌ها (رمز و هر دادهٔ حساس select نمی‌شود)
  const users = userIds.length
    ? await database.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  // 🎓 کلاس‌های متناظر با productId سفارش‌ها
  const classes = await database.courseClass.findMany({
    where: { productId: { in: productIds } },
    select: { id: true, productId: true, slug: true, title: true, level: true, packageSessions: true, pricePerSession: true },
  })
  const classByProduct = new Map(classes.map((c) => [c.productId, c]))
  const classIds = Array.from(new Set(classes.map((c) => c.id)))

  // 🗓️ جلسات مرتبط — با orderRef یا با (userId + classId) زنجیره می‌شوند
  const schedules = userIds.length && classIds.length
    ? await database.classSchedule.findMany({
        where: {
          OR: [{ orderRef: { in: refs } }, { userId: { in: userIds }, classId: { in: classIds } }],
        },
        select: { id: true, orderRef: true, userId: true, classId: true, startAt: true, endAt: true, status: true },
        orderBy: { startAt: 'asc' },
      })
    : []

  // 📝 ثبت‌نام‌های همان ایمیل‌ها — برای مرحلهٔ «ترجیحات برنامه ارسال شد»
  const emails = Array.from(
    new Set(orders.map((o) => (o.contactEmail || '').trim().toLowerCase()).filter(Boolean))
  )
  const registrations = emails.length
    ? await database.registration.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true, preferredDays: true, preferredTimes: true, timezone: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
    : []
  const hasPrefsByEmail = new Map<string, boolean>()
  for (const r of registrations) {
    const key = r.email.trim().toLowerCase()
    const prefs =
      (r.preferredDays && r.preferredDays !== '[]') || (r.preferredTimes && r.preferredTimes !== '[]')
    if (prefs && !hasPrefsByEmail.has(key)) hasPrefsByEmail.set(key, true)
  }

  return orders.map((o) => {
    const derived = deriveOrderStatus(o, now)
    const cls = classByProduct.get(o.productId) ?? null
    const user = o.userId ? userMap.get(o.userId) ?? null : null

    const relevant = schedules.filter(
      (s) => s.orderRef === o.ref || (!!o.userId && s.userId === o.userId && !!cls && s.classId === cls.id)
    )
    const scheduleStatuses = Array.from(new Set(relevant.map((s) => s.status)))
    const hasPrefs = hasPrefsByEmail.get((o.contactEmail || '').trim().toLowerCase()) ?? false

    const enrollment = deriveEnrollmentStatus({
      paid: o.status === 'PAID',
      scheduleStatuses,
      hasPreferences: hasPrefs,
    })

    const upcoming = relevant
      .filter((s) => (s.status === 'PROPOSED' || s.status === 'CONFIRMED') && s.startAt.getTime() > now.getTime())
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0]

    const fallbackSessions = cls?.packageSessions ?? null
    const name = user ? `${user.firstName} ${user.lastName}`.trim() : o.contactName

    return {
      ref: o.ref,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      productTitle: o.productTitle,
      productId: o.productId,
      classSlug: cls?.slug ?? null,
      classLevel: cls?.level ?? null,
      sessions: o.packageSessions ?? fallbackSessions,
      amountUsd: microToUsdString(o.expectedMicro),
      baseAmount: o.baseAmount != null ? o.baseAmount.toFixed(2) : null,
      tierPercent: o.tierPercent ?? null,
      discountCode: o.discountCode ?? null,
      discountType: o.discountType ?? null,
      discountValue: o.discountValue != null ? o.discountValue.toFixed(2) : null,
      discountAmount: o.discountAmount != null ? o.discountAmount.toFixed(2) : null,
      payment: {
        method: 'USDT · TRC20',
        network: o.network,
        mode: o.paymentMode,
        address: o.paymentAddress,
        txHash: o.txHash,
        txAmountUsd: o.txAmountMicro != null ? microToUsdString(o.txAmountMicro) : null,
        txFrom: o.txFrom,
        paidAt: o.paidAt?.toISOString() ?? null,
      },
      rawStatus: o.status,
      paymentStatus: derived,
      enrollmentStatus: enrollment,
      nextSessionAt: upcoming?.startAt.toISOString() ?? null,
      scheduleCount: relevant.length,
      customer: {
        hasAccount: !!user,
        userId: user?.id ?? null,
        name: name || '—',
        email: user?.email ?? o.contactEmail ?? '—',
        accountCreatedAt: user?.createdAt.toISOString() ?? null,
      },
    }
  })
}

/** پارامتر وضعیت پرداختِ فیلتر لیست → شرط where دیتابیس (EXPIRED مشتقِ PENDINGِ منقضی است) */
export function paymentStatusWhere(status: string, now = new Date()): Prisma.UsdtOrderWhereInput | null {
  switch (status) {
    case 'PENDING':
      return { status: 'PENDING', expiresAt: { gt: now } }
    case 'EXPIRED':
      return { status: 'PENDING', expiresAt: { lt: now } }
    case 'DETECTED':
      return { status: 'DETECTED' }
    case 'PAID':
      return { status: 'PAID' }
    case 'UNDERPAID':
      return { status: 'UNDERPAID' }
    case 'CANCELLED':
      return { status: 'CANCELLED' }
    default:
      return null
  }
}
