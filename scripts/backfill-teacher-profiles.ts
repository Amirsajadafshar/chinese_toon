// ---------------------------------------------------------------------
//  🧩 اسکریپت یک‌بارهٔ backfill — پرکردن فیلدهای جدید رزومه/نمونهٔ تدریس
//  برای معلم‌هایی که قبلاً از پنل ادمین import شده‌اند (قبل از فاز ۳۸).
//  فقط ردیف‌هایی که همهٔ فیلدهای جدیدشان خالی است پر می‌شود —
//  هیچ محتوای سفارشیِ مالک بازنویسی نمی‌شود.
//  اجرا: bun run scripts/backfill-teacher-profiles.ts
// ---------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'
import { siteContent } from '../src/content/site-content'

const db = new PrismaClient()

async function main() {
  const defaults = siteContent.about.teachers.items
  let updated = 0
  for (const t of defaults) {
    const row = await db.teacher.findFirst({ where: { name: t.name } })
    if (!row) continue
    const isNewFieldsEmpty =
      !row.resume &&
      !row.certificates &&
      row.samples === '[]' &&
      row.experienceYears === 0 &&
      row.studentsTaught === 0
    if (!isNewFieldsEmpty) {
      console.log('skip (has content):', t.name)
      continue
    }
    await db.teacher.update({
      where: { id: row.id },
      data: {
        resume: t.resume,
        experienceYears: t.experienceYears,
        studentsTaught: t.studentsTaught,
        certificates: t.certificates,
        samples: JSON.stringify(t.samples),
      },
    })
    updated++
    console.log('backfilled:', t.name)
  }
  console.log(`done — ${updated} teacher(s) updated`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error('backfill failed:', err)
    await db.$disconnect()
    process.exit(1)
  })
