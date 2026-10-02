// ---------------------------------------------------------------------------
// ❓ Seed FAQ — Task 2-b (Task 69): افزودن ۱۵ سؤال/پاسخ جدید به FaqItem
//
// این اسکریپت idempotent است:
//   • تطبیق با «متن نرمال‌شدهٔ سؤال» (trim + حروف کوچک + فشرده‌سازی فاصله‌ها).
//   • اگر سؤالِ نزدیکی (primary یا alias) از قبل وجود داشته باشد، همان ردیف
//     UPDATE می‌شود (متن دقیق جدید، پاسخ جدید، دستهٔ جدید، published=true)
//     و sortOrder قبلیِ آن ردیف حفظ می‌شود — نه دوباره‌سازی، نه ردیف تکراری.
//   • در غیر این صورت ردیف جدید با sortOrder تعیین‌شده ساخته می‌شود.
//   • شبه‌تکرارهای قدیمیِ ۱۲ سؤالِ اولیه که با سؤالات جدید هم‌پوشانی دارند،
//     به‌صورت «حذف نرم» بایگانی می‌شوند (deletedAt=now و published=false) —
//     ردیف نگه داشته می‌شود و هیچ چیزی physically حذف نمی‌شود.
//
// اجرا:
//   cd /home/z/my-project && DATABASE_URL=file:/home/z/data/chinesetoon.db bun scripts/seed-faq-task69.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

type FaqSeedItem = {
  category: 'general' | 'classes' | 'payment' | 'technical'
  question: string
  answer: string
  sortOrder: number
  /** واریانت‌های نرمال‌شدهٔ قدیمی که باید به همین آیتم نگاشت شوند (به‌جای ساخت ردیف تکراری) */
  matchAliases?: string[]
}

// 📌 شبه‌تکرارهای قدیمی: سؤالات موجودی که با سؤالِ جدیدِ مشخص‌شده هم‌معنا هستند
// و باید بایگانی نرم شوند تا دو سؤال هم‌معنا روی سایت دیده نشود.
const LEGACY_NEAR_DUPLICATES: Array<{ legacyQuestion: string; replacedBy: string }> = [
  {
    legacyQuestion: 'Do I need any prior experience to join?', // قدیمی #۲ — شبه‌تکرار سؤال جدید #۲
    replacedBy: 'Do I need to know Chinese before joining a class?',
  },
]

// ۱۵ سؤال الزامیِ تسک 2-b — متن سؤال‌ها دقیقاً طبق تسک؛ پاسخ‌ها واقعی و بدون ادعای غیرواقعی.
const ITEMS: FaqSeedItem[] = [
  {
    category: 'general',
    question: 'Is Chinese Toon suitable for complete beginners?',
    sortOrder: 20,
    answer:
      'Yes, absolutely. Many of our students start with zero knowledge of Chinese. Beginner classes start from the very beginning — pinyin, pronunciation, tones, and everyday phrases — and move forward step by step with a teacher guiding you live. If you already know some Chinese, tell us during registration and we will recommend the right level for you. Complete beginners are warmly welcome.',
  },
  {
    category: 'general',
    question: 'Do I need to know Chinese before joining a class?',
    sortOrder: 21,
    answer:
      'No. Our classes welcome learners from the very first step, and no previous knowledge of Chinese is required. The beginner level starts with pinyin, basic pronunciation, and simple everyday expressions, so you can follow along comfortably from lesson one. If you already have some background, mention it when you register and the teacher will suggest the class level that fits you best. All you need is motivation and a stable internet connection.',
  },
  {
    category: 'classes',
    question: 'Are the classes online or in person?',
    sortOrder: 22,
    // ⚠️ سؤال قدیمی #۷ («Are classes online or in person?») همان سؤال است —
    // با alias پیدا و همان ردیف آپدیت می‌شود؛ sortOrder قدیمی (۷) حفظ می‌شود.
    matchAliases: ['are classes online or in person?'],
    answer:
      'All Chinese Toon classes are currently held online as live, teacher-led sessions over video call, so you can join from anywhere in the world. The teacher teaches in real time, answers questions, and gives personal feedback during the lesson. After your registration is confirmed and your payment is approved, you receive the joining details for your sessions. You only need a device with a camera and microphone and a reasonably stable internet connection.',
  },
  {
    category: 'classes',
    question: 'How long is each class?',
    sortOrder: 23,
    answer:
      'Each session is planned as a complete lesson with enough time for new material, speaking practice, and questions. The exact length of a session is shown on each class page, and it is confirmed in your booking details after registration. Private lessons follow the same structure and can be arranged at times that suit you. If you have a scheduling constraint, mention it when registering and we will do our best to accommodate you.',
  },
  {
    category: 'classes',
    question: 'How many sessions are included in a package?',
    sortOrder: 24,
    answer:
      'Our packages commonly include 8, 10, 12, or 16 sessions, and single private lessons are also available if you prefer to book one at a time. The exact number of sessions for each class is shown on its class page before you register, so you always know what you are booking. When you register, your order shows the package you selected, and the number of sessions stays visible in your personal account.',
  },
  {
    category: 'classes',
    question: 'What Chinese levels do you offer?',
    sortOrder: 25,
    answer:
      'We offer levels from complete beginner to intermediate. Beginners start with pinyin, tones, and everyday phrases, then progress through vocabulary, grammar, listening, and conversation step by step. Intermediate classes focus on expanding vocabulary, fluency, and real communication skills. If you are not sure where you fit, tell us about your background when you register and we will recommend the right class, or arrange a short level assessment if needed.',
  },
  {
    category: 'classes',
    question: 'Do you prepare students for HSK?',
    sortOrder: 26,
    answer:
      'Yes. Alongside our general levels, we offer HSK-oriented preparation classes for students who want to work toward the official HSK exam, for example for study or work goals. These classes focus on the vocabulary, grammar, listening, and reading skills the exam requires, with practice in the format of the test. You do not need the HSK to join our regular classes — it is simply an option if you want a recognized certificate.',
  },
  {
    category: 'classes',
    question: 'Will I learn speaking and conversation?',
    sortOrder: 27,
    answer:
      'Yes. Speaking is a core part of every class. Because sessions are live and teacher-led, you practice pronunciation and conversation during the lesson itself, not just on paper. Groups are kept small so every student gets real speaking time, and the teacher corrects and guides you as you talk. From your first lessons you work with practical phrases you can actually use, and conversation becomes more natural as your level grows.',
  },
  {
    category: 'general',
    question: 'Are the classes taught by a real teacher?',
    sortOrder: 28,
    answer:
      'Yes. Every class is taught by a real Chinese teacher in a live session. This is what makes our classes different from apps and pre-recorded videos: a teacher explains the material, answers your questions on the spot, corrects your pronunciation, and adapts the pace to the group. Our animated content on social media is a fun supplement, but the classes themselves are always human-led.',
  },
  {
    category: 'payment',
    question: 'What happens after I register for a class?',
    sortOrder: 29,
    answer:
      'After you register, we review your registration and create your order. You will receive a unique customer code, like CT-XXXXXX, along with access to your personal account. On the payment page you can see the exact final amount for your order, including any discount that was applied. Once you complete the payment and your receipt is verified, your place in the class is confirmed and your payment status is visible in your account at any time.',
  },
  {
    category: 'payment',
    question: 'How do I pay for my class?',
    sortOrder: 30,
    answer:
      'Payment is made by manual bank card transfer. After you register, open the payment page for your order — it shows the exact final amount to pay, including any discount. Transfer that exact amount from your bank card, then upload a clear picture of your transfer receipt. There is no online payment gateway and no cryptocurrency option; a manual transfer keeps the process simple and secure, and our team verifies every payment personally.',
  },
  {
    category: 'payment',
    question: 'Can I pay by bank card transfer?',
    sortOrder: 31,
    answer:
      'Yes — bank card transfer is exactly how payments are made. It is a manual transfer: you send the exact amount shown on your payment page from your card, then upload the receipt for verification. We do not currently offer an online payment gateway or cryptocurrency options. Every transfer is checked manually by our team, which is why each payment is tied to your unique customer code and order.',
  },
  {
    category: 'payment',
    question: 'How do I submit my payment receipt?',
    sortOrder: 32,
    answer:
      'After making your bank card transfer, go to the payment page of your order and upload the receipt there. Accepted file types are JPG, JPEG, PNG, WEBP, and PDF, and the file must be 5MB or smaller. Please make sure the amount, date, and reference are readable in the picture. Once uploaded, your order moves to the receipt submitted stage and our team will verify it as soon as possible.',
  },
  {
    category: 'payment',
    question: 'What happens after I submit my receipt?',
    sortOrder: 33,
    answer:
      'Your order enters the verification stage: our team checks the receipt against your order manually. If everything matches, the payment is approved, your place in the class is confirmed, and you can see the approved status in your personal account at any time. If something does not match, the receipt is rejected with a clear reason shown to you — for example an unreadable image or a wrong amount — and you can simply upload a corrected receipt and submit it again.',
  },
  {
    category: 'general',
    question: 'Can I contact Chinese Toon if I have a question?',
    sortOrder: 34,
    answer:
      'Yes, of course. The easiest ways to reach us are the support form on this website and our Telegram at @chinesetoon — just send your question and we will get back to you as soon as we can. If your question is about an order, include your customer code (it looks like CT-XXXXXX) so we can find your details quickly. Registered students can also see their order and payment status anytime in their personal account.',
  },
]

/** نرمال‌سازی متن سؤال برای تطبیق idempotent: trim + حروف کوچک + فشرده‌سازی فاصله */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main(): Promise<void> {
  let created = 0
  let updated = 0
  let archived = 0

  // ── گام ۱: بایگانی نرم شبه‌تکرارهای قدیمی (فقط ردیف‌های زنده؛ idempotent) ──
  for (const dup of LEGACY_NEAR_DUPLICATES) {
    const legacy = await db.faqItem.findFirst({
      where: { question: dup.legacyQuestion, deletedAt: null },
    })
    if (legacy) {
      await db.faqItem.update({
        where: { id: legacy.id },
        data: { deletedAt: new Date(), published: false },
      })
      archived += 1
      console.log(`🗄️  Archived legacy near-duplicate #${legacy.id} ("${legacy.question}") — replaced by "${dup.replacedBy}".`)
    } else {
      console.log(`🗄️  Legacy near-duplicate "${dup.legacyQuestion}" not found (already archived or renamed) — skipped.`)
    }
  }

  // ── گام ۲: upsert هر ۱۵ آیتم بر اساس متن نرمال‌شدهٔ سؤال ──
  const liveRows = await db.faqItem.findMany({ where: { deletedAt: null } })
  const byNormalizedQuestion = new Map<string, (typeof liveRows)[number]>()
  for (const row of liveRows) byNormalizedQuestion.set(normalize(row.question), row)

  for (const item of ITEMS) {
    // سنجش طول پاسخ (۴۰ تا ۱۱۰ کلمه) — فقط هشدار، نه خطا
    const words = item.answer.trim().split(/\s+/).length
    if (words < 40 || words > 110) {
      console.warn(`⚠️  Answer length out of 40–110 range (${words} words): "${item.question}"`)
    }

    const keys = [normalize(item.question), ...(item.matchAliases ?? []).map(normalize)]
    const existing = keys
      .map((k) => byNormalizedQuestion.get(k))
      .find((row) => row !== undefined)

    if (existing) {
      // آپدیت همان ردیف: متن دقیق جدید + پاسخ جدید + دسته + published — sortOrder قدیمی حفظ می‌شود
      await db.faqItem.update({
        where: { id: existing.id },
        data: {
          question: item.question,
          answer: item.answer,
          category: item.category,
          published: true,
        },
      })
      updated += 1
      byNormalizedQuestion.set(normalize(item.question), {
        ...existing,
        question: item.question,
      })
      console.log(`♻️  Updated existing row #${existing.id} (sortOrder ${existing.sortOrder}): "${existing.question}" → "${item.question}"`)
    } else {
      const row = await db.faqItem.create({
        data: {
          category: item.category,
          question: item.question,
          answer: item.answer,
          sortOrder: item.sortOrder,
          published: true,
        },
      })
      created += 1
      byNormalizedQuestion.set(normalize(item.question), row as (typeof liveRows)[number])
      console.log(`🆕 Created row #${row.id} (sortOrder ${item.sortOrder}, ${item.category}): "${item.question}"`)
    }
  }

  // ── گام ۳: گزارش نهایی + خودررسی تکراری نبودن سؤال‌های published ──
  const published = await db.faqItem.findMany({
    where: { deletedAt: null, published: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  console.log('\n──── Verification ────')
  console.log(`Published (live) FAQ count: ${published.length}`)
  const seen = new Map<string, number>()
  let duplicateCount = 0
  for (const row of published) {
    const key = normalize(row.question)
    if (seen.has(key)) {
      duplicateCount += 1
      console.warn(`⚠️  DUPLICATE published question (ids ${seen.get(key)} & ${row.id}): "${row.question}"`)
    } else {
      seen.set(key, row.id)
    }
    console.log(`  [${String(row.sortOrder).padStart(2, ' ')}] (${row.category}) ${row.question}`)
  }
  console.log(
    `\nSummary: created=${created}, updated=${updated}, archived=${archived}, publishedTotal=${published.length}, duplicateQuestions=${duplicateCount}`,
  )
  if (duplicateCount > 0) process.exitCode = 1
}

main()
  .catch((e) => {
    console.error('seed-faq-task69 failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
