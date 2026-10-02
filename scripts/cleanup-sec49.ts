// ---------------------------------------------------------------------------
// 🧹 پاک‌سازی ردیف‌های تست امنیتی فاز ۴۹ — کاربران sec-test49-a/b و متعلقاتشان
// سفارش‌ها اول حذف می‌شوند (onDelete:SetNull کاربر را orphan نمی‌گذارد)، بعد
// خود کاربران؛ بقیه (سشن/برنامه/هشدار/ممیزی) با Cascade خودکار حذف می‌شوند.
// اجرا: bun scripts/cleanup-sec49.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const EMAILS = ['sec-test49-a@example.com', 'sec-test49-b@example.com']

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: EMAILS } },
    select: { id: true, email: true },
  })
  console.log('test users found:', users.map((u) => u.email).join(', ') || 'none')
  if (users.length === 0) return

  const ids = users.map((u) => u.id)
  const orders = await db.usdtOrder.deleteMany({ where: { userId: { in: ids } } })
  console.log('orders deleted:', orders.count)

  const uDeleted = await db.user.deleteMany({ where: { id: { in: ids } } })
  console.log('users deleted:', uDeleted.count, '(sessions/schedules/notifications/audits cascade)')
}

main()
  .catch((e) => {
    console.error('cleanup failed:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
