// ---------------------------------------------------------------------------
// ❓ Seed یک‌بارهٔ FAQ — انتقال آیتم‌های فایل محتوا → جدول FaqItem (فاز ۴۶)
//
// این اسکریپت «مهاجرت دادهٔ» واقعی است نه دادهٔ قلابی: دقیقاً همان ۱۱ سؤالِ
// فعلی صفحهٔ Support با همان متن و همان دسته به دیتابیس منتقل می‌شود تا
// منبع حقیقت FAQ بدون تغییر رفتار عمومی سایت، به DB منتقل شود.
// idempotent است — فقط وقتی جدول «کاملاً خالی» باشد seed می‌کند؛ اگر ادمین
// قبلاً چیزی ساخته/ویرایش کرده باشد، هیچ ردیفی بازنویسی نمی‌شود.
// اجرا: bun scripts/seed-faq.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// منبع: site-content.ts → support.faq.items (۱۴۰۴/۰۶ — وضعیت فعلی سایت)
const ITEMS: Array<{ category: string; question: string; answer: string }> = [
  {
    category: 'general',
    question: 'What is Chinese Toon?',
    answer:
      'Chinese Toon is a Mandarin Chinese learning brand. We create engaging animated educational content on social media and offer practical, teacher-led classes for all levels — from complete beginner to advanced.',
  },
  {
    category: 'general',
    question: 'Do I need any prior experience to join?',
    answer:
      "Not at all! Our Beginner Chinese class starts from zero — no prior knowledge of Chinese is required. If you already know some Chinese, we'll help you find the right level with a quick placement chat.",
  },
  {
    category: 'general',
    question: 'What age groups do you teach?',
    answer:
      "Our classes are designed for teens and adults (13+). Younger learners are welcome in our private lessons with parent approval. If you're unsure, contact us and we'll recommend the best fit.",
  },
  {
    category: 'classes',
    question: 'How do I know which class level is right for me?',
    answer:
      "When you register, tell us about your current level and goals. We'll review your information and recommend the best class. If you're between levels, we can arrange a short free level assessment.",
  },
  {
    category: 'classes',
    question: 'What is HSK and do I need to take it?',
    answer:
      "HSK (Hanyu Shuiping Kaoshi) is the official Chinese proficiency exam. You don't need it to join our classes, but we offer dedicated HSK Preparation if you want an internationally recognized certificate for study or work.",
  },
  {
    category: 'classes',
    question: 'How big are the group classes?',
    answer:
      'We keep groups small — usually 4 to 8 students — so every learner gets plenty of speaking practice and personal attention from the teacher.',
  },
  {
    category: 'classes',
    question: 'Are classes online or in person?',
    answer:
      'All our current classes are held online via video call, so you can join from anywhere in the world. Recordings and materials are shared after each session.',
  },
  {
    category: 'payment',
    question: 'How much do classes cost?',
    answer:
      "Pricing depends on the class type (group or private) and length. Since schedules are being finalized, the best way to get the current price list is to register your interest or message us — we'll send you all the details.",
  },
  {
    category: 'payment',
    question: 'Can I try a class before paying?',
    answer:
      "Yes! We offer a free trial session for new students so you can experience our teaching style before committing. Just mention 'trial class' when you contact us.",
  },
  {
    category: 'payment',
    question: 'What is your refund policy?',
    answer:
      "If you're not satisfied after the first two sessions of a course, contact us and we'll refund the remaining sessions. Private lessons can be rescheduled free of charge up to 12 hours before the session.",
  },
  {
    category: 'technical',
    question: 'What do I need for online classes?',
    answer:
      "Just a stable internet connection, a device with a camera and microphone, and Zoom or Google Meet (free). We'll send you a joining link and any materials before each class.",
  },
  {
    category: 'technical',
    question: 'I submitted a form but haven\u2019t heard back. What should I do?',
    answer:
      "Please check your spam/junk folder first. If our reply isn't there, message us on Telegram or Instagram — social messages are usually answered faster.",
  },
]

async function main(): Promise<void> {
  const count = await db.faqItem.count()
  if (count > 0) {
    console.log(`FAQ table is not empty (${count} items) — seed skipped to protect admin data.`)
    return
  }
  let i = 0
  for (const item of ITEMS) {
    i += 1
    await db.faqItem.create({
      data: { ...item, sortOrder: i, published: true },
    })
  }
  console.log(`Seeded ${i} FAQ items from the content file into FaqItem.`)
}

main()
  .catch((e) => {
    console.error('seed-faq failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
