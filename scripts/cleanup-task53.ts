// ---------------------------------------------------------------------------
// 🧰 پاک‌سازی دادهٔ تست فاز ۵۳ — کاربران/سفارش‌ها/اعلان‌های ساخت تست این راند
// اجرا: bun scripts/cleanup-task53.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const emails = ['fresh53@example.com', 'idor-probe@example.com']
  const refs = ['CT-JSKQKCDH', 'CT-PWS4FD9S']

  // رویدادهای پرداخت + redemption + اعلان‌های سفارش‌های تستی
  const paymentEvents = await db.paymentEvent.deleteMany({ where: { orderRef: { in: refs } } })
  const redemptions = await db.discountRedemption.deleteMany({ where: { orderRef: { in: refs } } })
  const orderNotifs = await db.scheduleNotification.deleteMany({ where: { orderRef: { in: refs } } })
  const orders = await db.usdtOrder.deleteMany({ where: { ref: { in: refs } } })

  // جلسات تستی این راند (هر دو CANCELLED شده بودند) + اعلان‌های مرتبط
  const schedules = await db.classSchedule.deleteMany({
    where: { user: { email: { in: emails } }, status: { in: ['CANCELLED', 'PROPOSED'] } },
  })

  // کاربران تستی — cascade: sessions/notifications/resetTokens
  const users = await db.user.deleteMany({ where: { email: { in: emails } } })
  const userNotifs = await db.scheduleNotification.deleteMany({ where: { user: { email: { in: emails } } } }).catch(() => ({ count: 0 }))

  console.log(`cleanup53: users=${users.count} orders=${orders.count} paymentEvents=${paymentEvents.count} redemptions=${redemptions.count} orderNotifs=${orderNotifs.count} schedules=${schedules.count} userNotifs=${userNotifs.count}`)

  const [uc, oc, dc, bc] = await Promise.all([db.user.count(), db.usdtOrder.count(), db.discount.count(), db.backupLog.count()])
  console.log(`remaining: users=${uc} orders=${oc} discounts=${dc} backupLogs=${bc}`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
