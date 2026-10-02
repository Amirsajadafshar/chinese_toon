// ---------------------------------------------------------------------------
// 🧹 پاک‌سازی داده‌های آزمایشی فاز ۵۰ (تخفیف) — فقط ردیف‌های آزمایشی شناس‌دار
// اجرا: bunx tsx scripts/cleanup-phase50.ts
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const TEST_CODES = ['WELCOME10', 'RACE50', 'BIGFIX50', 'INACT50', 'EXPIRED50', 'FUTURE50', 'BROWSER50']
const TEST_EMAILS = ['disc-a50@example.com', 'disc-b50@example.com']

async function main() {
  // ۱) کاربران آزمایشی
  const users = await db.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true },
  })
  const userIds = users.map((u) => u.id)
  console.log('test users:', users.map((u) => u.email).join(', ') || '(none)')

  // ۲) سفارش‌های آزمایشی این کاربران
  const orders = await db.usdtOrder.findMany({
    where: { contactEmail: { in: TEST_EMAILS } },
    select: { id: true, ref: true },
  })
  console.log('test orders:', orders.map((o) => o.ref).join(', ') || '(none)')

  // ۳) رویدادهای پرداخت متصل به این سفارش‌ها
  const refs = orders.map((o) => o.ref)
  const ev = await db.paymentEvent.deleteMany({ where: { orderRef: { in: refs } } })
  console.log('payment events deleted:', ev.count)

  // ۴) ردمپشن‌های کدهای آزمایشی (سوابق استفاده — همه متعلق به سفارش‌های آزمایشی)
  const rd = await db.discountRedemption.deleteMany({ where: { discount: { code: { in: TEST_CODES } } } })
  console.log('redemptions deleted:', rd.count)

  // ۵) خود سفارش‌ها
  const od = await db.usdtOrder.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } })
  console.log('orders deleted:', od.count)

  // ۶) سشن‌های کاربران آزمایشی
  if (userIds.length > 0) {
    const ss = await db.userSession.deleteMany({ where: { userId: { in: userIds } } })
    console.log('sessions deleted:', ss.count)
  }

  // ۷) کاربران
  const ud = await db.user.deleteMany({ where: { id: { in: userIds } } })
  console.log('users deleted:', ud.count)

  // ۸) کدهای تخفیف آزمایشی
  const dc = await db.discount.deleteMany({ where: { code: { in: TEST_CODES } } })
  console.log('discounts deleted:', dc.count)

  // ۹) گزارش وضعیت نهایی
  const remaining = await db.discount.findMany({ select: { code: true, active: true } })
  console.log('remaining discounts:', remaining.map((d) => `${d.code}${d.active ? '' : '(inactive)'}`).join(', ') || '(none)')
  const orphan = await db.discountRedemption.count()
  console.log('remaining redemptions:', orphan)
  const pending = await db.usdtOrder.count({ where: { status: 'PENDING' } })
  console.log('remaining PENDING orders:', pending)
}

main()
  .catch((e) => {
    console.error('cleanup failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
