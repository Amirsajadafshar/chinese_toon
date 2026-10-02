// 🧹 پاک‌سازی کامل داده‌های تست تسک ۵۱ — همهٔ رکوردهای e2e-*/test.local
// ترتیب حذف به‌خاطر کلیدهای خارجی: event/redeemption/schedule → order → user → registration
// سلامت: WELCOME20 و کدهای تخفیف دست‌نخورده می‌مانند (فقط استفاده‌های تستی حذف می‌شوند)
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const before = {
    orders: await db.usdtOrder.count(),
    users: await db.user.count(),
    events: await db.paymentEvent.count(),
    redemptions: await db.discountRedemption.count(),
    schedules: await db.classSchedule.count(),
    registrations: await db.registration.count(),
  }
  console.log('before:', JSON.stringify(before))

  // ① سفارش‌های تست — بر اساس ایمیل تماس و کاربر
  const testOrders = await db.usdtOrder.findMany({
    where: { contactEmail: { contains: '@test.local' } },
    select: { ref: true, userId: true },
  })
  const refs = testOrders.map((o) => o.ref)
  const testUserIds = Array.from(new Set(testOrders.map((o) => o.userId).filter((v): v is string => !!v)))
  console.log(`test orders: ${refs.length}, test users: ${testUserIds.length}`)

  // ② رویدادهای پرداختِ تست (بر اساس ref سفارش یا txHash ساختگی تست)
  const delEvents = await db.paymentEvent.deleteMany({
    where: { OR: [{ orderRef: { in: refs } }, { txHash: { contains: 'e2e-test-tx-hash' } }] },
  })
  console.log('paymentEvents deleted:', delEvents.count)

  // ③ استفاده‌های کد تخفیفِ سفارش‌های تست
  const delRed = await db.discountRedemption.deleteMany({ where: { orderRef: { in: refs } } })
  console.log('redemptions deleted:', delRed.count)

  // ④ جلسات برنامهٔ تست (پیوند سفارش یا کاربر تست)
  const delSched = await db.classSchedule.deleteMany({
    where: { OR: [{ orderRef: { in: refs } }, { userId: { in: testUserIds } }] },
  })
  console.log('schedules deleted:', delSched.count)

  // ⑤ خود سفارش‌ها
  const delOrders = await db.usdtOrder.deleteMany({ where: { ref: { in: refs } } })
  console.log('orders deleted:', delOrders.count)

  // ⑥ کاربران تست (سشن‌ها cascade می‌شوند)
  const delUsers = await db.user.deleteMany({ where: { email: { contains: '@test.local' } } })
  console.log('users deleted:', delUsers.count)

  // ⑦ فرم‌های ثبت‌نام تستی
  const delRegs = await db.registration.deleteMany({ where: { email: { contains: '@test.local' } } })
  console.log('registrations deleted:', delRegs.count)

  // ⑧ ترمیم سفارش قدیمی که اسکریپت ضد-replay موقتاً txHash ساختگی رویش گذاشت
  const fixed = await db.usdtOrder.updateMany({ where: { txHash: 'e2e-test-tx-hash-dup' }, data: { txHash: null } })
  console.log('legacy orders restored (txHash=null):', fixed.count)

  const after = {
    orders: await db.usdtOrder.count(),
    users: await db.user.count(),
    events: await db.paymentEvent.count(),
    redemptions: await db.discountRedemption.count(),
    schedules: await db.classSchedule.count(),
    registrations: await db.registration.count(),
  }
  console.log('after:', JSON.stringify(after))

  // 🔍 سلامت نهایی — کدهای تخفیف باید دست‌نخورده باشند
  const welcome = await db.discount.findUnique({ where: { code: 'WELCOME20' } })
  console.log('WELCOME20:', welcome ? `active=${welcome.active} value=${welcome.value}${welcome.type === 'percent' ? '%':''}` : 'MISSING!')
  const leftovers = await db.usdtOrder.count({ where: { contactEmail: { contains: '@test.local' } } })
  const pending = await db.usdtOrder.count({ where: { status: 'PENDING' } })
  console.log('leftover test orders:', leftovers, '| remaining PENDING (real, none expected):', pending)
}

main()
  .catch((e) => {
    console.error('cleanup failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
