// ---------------------------------------------------------------------------
// 🧹 پاک‌سازی داده‌های آزمایشی تسک ۴۶ (وارسی مجدد Discount Codes) — فقط ردیف‌های آزمایشی
// اجرا: bunx tsx scripts/cleanup-task46.ts
// نکته: WELCOME20 (نمونهٔ خودِ مشخصات تسک) عمداً نگه داشته می‌شود تا مالک بتواند
//       جریان مشتری را فوراً خودش امتحان کند — صفر استفاده، فعال، بدون سقف.
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const TEST_CODES = ['TEST46']
const TEST_EMAILS = ['ct46@example.com']

async function main() {
  // ۱) کاربر آزمایشی
  const users = await db.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true },
  })
  const userIds = users.map((u) => u.id)
  console.log('test users:', users.map((u) => u.email).join(', ') || '(none)')

  // ۲) سفارش‌های آزمایشی (بر اساس ایمیل تماس + کدهای آزمایشی)
  const orders = await db.usdtOrder.findMany({
    where: { OR: [{ contactEmail: { in: TEST_EMAILS } }, { discountCode: { in: TEST_CODES } }] },
    select: { id: true, ref: true },
  })
  console.log('test orders:', orders.map((o) => o.ref).join(', ') || '(none)')

  // ۳) رویدادهای پرداخت متصل
  const refs = orders.map((o) => o.ref)
  const ev = await db.paymentEvent.deleteMany({ where: { orderRef: { in: refs } } })
  console.log('payment events deleted:', ev.count)

  // ۴) ردمپشن‌های کدهای آزمایشی
  const rd = await db.discountRedemption.deleteMany({ where: { discount: { code: { in: TEST_CODES } } } })
  console.log('redemptions deleted:', rd.count)

  // ۵) سفارش‌ها
  const od = await db.usdtOrder.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } })
  console.log('orders deleted:', od.count)

  // ۶) سشن‌ها
  if (userIds.length > 0) {
    const ss = await db.userSession.deleteMany({ where: { userId: { in: userIds } } })
    console.log('sessions deleted:', ss.count)
  }

  // ۷) کاربر آزمایشی
  const ud = await db.user.deleteMany({ where: { id: { in: userIds } } })
  console.log('users deleted:', ud.count)

  // ۸) کد آزمایشی TEST46 (بعد از پاک‌کردن ردمپشن‌ها حذف‌پذیر است)
  const dc = await db.discount.deleteMany({ where: { code: { in: TEST_CODES } } })
  console.log('test codes deleted:', dc.count)

  // ۹) سلامت نهایی
  const [codesLeft, redemptionsLeft, pendingLeft] = await Promise.all([
    db.discount.findMany({ select: { code: true, active: true, value: true, type: true } }),
    db.discountRedemption.count(),
    db.usdtOrder.count({ where: { status: 'PENDING' } }),
  ])
  console.log('codes left:', codesLeft.map((c) => `${c.code}(${c.type}=${c.value}${c.active ? '' : ',inactive'})`).join(', ') || '(none)')
  console.log('redemptions left (total):', redemptionsLeft)
  console.log('pending orders left:', pendingLeft)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
