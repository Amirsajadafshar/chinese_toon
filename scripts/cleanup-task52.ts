// ---------------------------------------------------------------------------
// 🧰 اسکریپت پاک‌سازی دادهٔ تست فاز ۵۲ (الگوی cleanup-task46)
// حذف: کاربر flow-test47 + سفارش CT-RH6CGEDR + رویدادهای پرداخت/Redemption/
// اعلان‌های آن + کد TEMP47. اجرا: bun scripts/cleanup-task52.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const ref = 'CT-RH6CGEDR'
  const email = 'flow-test47@example.com'

  const paymentEvents = await db.paymentEvent.deleteMany({ where: { orderRef: ref } })
  const redemptions = await db.discountRedemption.deleteMany({ where: { orderRef: ref } })
  const notifications = await db.scheduleNotification.deleteMany({ where: { orderRef: ref } })
  const order = await db.usdtOrder.deleteMany({ where: { ref } })
  const user = await db.user.deleteMany({ where: { email } })
  const tempDiscount = await db.discount.deleteMany({ where: { code: 'TEMP47' } })

  console.log(`cleanup: user=${user.count} order=${order.count} paymentEvents=${paymentEvents.count} redemptions=${redemptions.count} notifications=${notifications.count} tempDiscount=${tempDiscount.count}`)

  const [users, orders, discounts, backs] = await Promise.all([
    db.user.count(),
    db.usdtOrder.count(),
    db.discount.count(),
    db.backupLog.count(),
  ])
  console.log(`remaining: users=${users} orders=${orders} discounts=${discounts} backupLogs=${backs}`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
