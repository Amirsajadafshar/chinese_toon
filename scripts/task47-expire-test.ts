// ---------------------------------------------------------------------------
// 🧰 اسکریپت عملیاتی فاز ۵۲ — عقب‌بردن مهلت پرداخت سفارشِ «تستیِ مشخص» برای
// تست واقعی مسیر انقضای سمت سرور (expireStaleOrders در sweep دوره‌ای).
// فقط سفارش‌هایی که ایمیل صاحبشان در آرگومان می‌آید و PENDINGاند لمس می‌شوند.
// اجرا: bun scripts/task47-expire-test.ts <email>
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase()
  if (!email) {
    console.error('usage: bun scripts/task47-expire-test.ts <email>')
    process.exit(1)
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    console.error(`user not found: ${email}`)
    process.exit(1)
  }
  const past = new Date(Date.now() - 60_000) // ۱ دقیقه پیش
  const res = await db.usdtOrder.updateMany({
    where: { userId: user.id, status: 'PENDING' },
    data: { expiresAt: past },
  })
  console.log(`backdated ${res.count} PENDING order(s) of ${email} to ${past.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
