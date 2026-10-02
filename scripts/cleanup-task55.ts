// ---------------------------------------------------------------------------
// 🧹 پاک‌سازی داده‌های تست فاز ۵۵ (ممیزی Reviews+FAQ)
//  • TEMP55 Tester (testimonial) و TEMP55 archive test (FaqItem): ردیف‌های
//    تستی این فاز — حذف سخت (آرتیفکت تست، نه دادهٔ کاربر)
//  • FaqVoteهای تستی + صفرکردن شمارنده‌های helpfulYes/No: سبد رأی تمیز برای مالک
//  • ZZ Review Test: بایگانی نرم (حذف نرم) — از سایت عمومی پنهان ولی حفظ‌شده
//  Audit Log دست نمی‌خورد (append-only، سابقهٔ واقعی اقدامات ادمین)
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const t = await db.testimonial.deleteMany({
    where: { name: 'TEMP55 Tester', text: { contains: 'phase 55' } },
  })
  console.log('TEMP55 testimonial deleted:', t.count)

  const f = await db.faqItem.deleteMany({
    where: { question: { startsWith: 'TEMP55' } },
  })
  console.log('TEMP55 faq deleted:', f.count)

  const v = await db.faqVote.deleteMany({})
  console.log('test faq votes deleted:', v.count)

  const fc = await db.faqItem.updateMany({ data: { helpfulYes: 0, helpfulNo: 0 } })
  console.log('faq vote counters reset:', fc.count)

  const zz = await db.testimonial.updateMany({
    where: { name: 'ZZ Review Test', deletedAt: null },
    data: { deletedAt: new Date() },
  })
  console.log('ZZ Review Test archived (soft):', zz.count)

  const counts = {
    testimonials: await db.testimonial.count({ where: { deletedAt: null } }),
    archivedTestimonials: await db.testimonial.count({ where: { deletedAt: { not: null } } }),
    faqs: await db.faqItem.count({ where: { deletedAt: null } }),
    archivedFaqs: await db.faqItem.count({ where: { deletedAt: { not: null } } }),
    faqVotes: await db.faqVote.count(),
  }
  console.log('final counts:', JSON.stringify(counts))
}

main()
  .catch((e) => {
    console.error('cleanup failed:', e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
