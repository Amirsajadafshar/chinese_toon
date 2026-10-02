// ---------------------------------------------------------------------------
// 💰 مهاجرت یک‌بارهٔ قیمت (فاز ۴۷) — هم‌راستاکردن packagePrice با تعریف جدید
//
// تعریف جدید: packagePrice = pricePerSession × packageSessions (پایهٔ بسته؛
// بدون تخفیف — تخفیف‌ها هنگام سفارش سمت سرور اعمال می‌شوند).
// قبل از این فاز ادمین packagePrice را دستی وارد می‌کرد (مثلاً ۱۳۰ برای
// ۱۲×۱۲=۱۴۴) — این اسکریپت همهٔ ردیف‌ها را با تعریف جدید هم‌راستا می‌کند.
// اسنپ‌شات سفارش‌های تاریخی (expectedMicro در UsdtOrder) دست‌نخورده می‌ماند.
// idempotent: اجرای دوباره همان نتیجه را می‌دهد (محاسبهٔ مجدد از فیلدهای مبنا).
// اجرا: bun scripts/recompute-package-prices.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main(): Promise<void> {
  const rows = await db.courseClass.findMany({
    select: { id: true, title: true, pricePerSession: true, packageSessions: true, packagePrice: true },
  })
  let changed = 0
  for (const r of rows) {
    const base = Math.round((Number(r.pricePerSession) || 0) * Math.max(1, Math.floor(Number(r.packageSessions) || 1)) * 100) / 100
    if (Math.abs(base - r.packagePrice) > 0.004) {
      await db.courseClass.update({ where: { id: r.id }, data: { packagePrice: base } })
      console.log(`UPDATED "${r.title}": $${r.packagePrice.toFixed(2)} → $${base.toFixed(2)} (${r.packageSessions} × $${r.pricePerSession.toFixed(2)})`)
      changed += 1
    } else {
      console.log(`OK      "${r.title}": $${r.packagePrice.toFixed(2)}`)
    }
  }
  console.log(`Done — ${changed} row(s) updated, ${rows.length - changed} already correct. Historical orders keep their snapshots.`)
}

main()
  .catch((e) => {
    console.error('recompute failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
