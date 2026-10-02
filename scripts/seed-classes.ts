// ---------------------------------------------------------------------------
// 🎓 Seed یک‌بارهٔ کلاس‌های موجود فایل محتوا → جدول CourseClass (فاز ۴۲)
//
// این اسکریپت «مهاجرت دادهٔ» واقعی است نه دادهٔ قلابی: دقیقاً همان ۶ کلاسِ
// فعلی سایت با همان productId و همان قیمت مرجع (amountUsd → packagePrice)
// به دیتابیس منتقل می‌شود تا منبع حقیقت بدون تغییر رفتار، به DB منتقل شود.
// idempotent است — فقط ردیف‌هایی را می‌سازد که با آن slug وجود ندارند؛
// ردیف‌های موجود را دست نمی‌زند (تغییرات ادمین هرگز بازنویسی نمی‌شود).
// اجرا: bun scripts/seed-classes.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface SeedClass {
  slug: string
  productId: string
  title: string
  shortDescription: string
  category: string
  color: string
  classType: 'group' | 'private' | 'both'
  level: string
  registerLevels: string[]
  pricePerSession: number
  packageSessions: number
  packagePrice: number
  priceNote: string
  sessionDurationMin: number | null
  maxStudents: number | null
  schedule: string
  meta: { icon: string; text: string }[]
  highlights: string[]
  image: string
  sortOrder: number
  featured: boolean
}

// ⬇⬇ داده‌ها عیناً از src/content/site-content.ts و payments.products کپی شده‌اند
const SEED: SeedClass[] = [
  {
    slug: 'beginner-chinese',
    productId: 'beginner-chinese-12',
    title: 'Beginner Chinese',
    shortDescription:
      'Start Mandarin from the basics and build a strong foundation in pronunciation, characters, and simple communication.',
    category: 'beginner',
    color: 'sage',
    classType: 'group',
    level: 'HSK 1',
    registerLevels: ['complete-beginner', 'beginner'],
    pricePerSession: 12,
    packageSessions: 12,
    packagePrice: 130,
    priceNote: '12-session package: $130',
    sessionDurationMin: 60,
    maxStudents: 8,
    schedule: 'Schedule: TBC',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '12 sessions · 60 min each' },
      { icon: 'users', text: 'Small group (4–8 students)' },
    ],
    highlights: [
      'Pinyin & the four tones from zero',
      '80+ essential words for daily life',
      'Reading 60+ common characters',
      'Simple self-introduction & small talk',
    ],
    image: '/images/classes/beginner.png',
    sortOrder: 1,
    featured: true,
  },
  {
    slug: 'elementary-chinese',
    productId: 'elementary-chinese-16',
    title: 'Elementary Chinese',
    shortDescription:
      'Improve vocabulary, grammar, listening, and everyday communication skills beyond the basics.',
    category: 'elementary',
    color: 'butter',
    classType: 'group',
    level: 'HSK 2–3',
    registerLevels: ['elementary'],
    pricePerSession: 14,
    packageSessions: 16,
    packagePrice: 200,
    priceNote: '16-session package: $200',
    sessionDurationMin: 60,
    maxStudents: 8,
    schedule: 'Schedule: TBC',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '16 sessions · 60 min each' },
      { icon: 'users', text: 'Small group (4–8 students)' },
    ],
    highlights: [
      'Everyday dialogues: shopping, travel, food',
      'Grammar patterns for daily conversation',
      'Listening practice with real materials',
      'Writing short messages & notes',
    ],
    image: '/images/classes/elementary.png',
    sortOrder: 2,
    featured: true,
  },
  {
    slug: 'conversational-chinese',
    productId: 'conversational-chinese-10',
    title: 'Conversational Chinese',
    shortDescription:
      'Develop speaking and listening skills through practical, real-life conversations and interactive practice.',
    category: 'conversation',
    color: 'peach',
    classType: 'both',
    level: 'Conversation',
    registerLevels: ['all'],
    pricePerSession: 15,
    packageSessions: 10,
    packagePrice: 135,
    priceNote: '10-session package: $135',
    sessionDurationMin: 45,
    maxStudents: 8,
    schedule: 'Schedule: TBC',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '10 sessions · 45 min each' },
      { icon: 'mic', text: 'Interactive & speaking-focused' },
    ],
    highlights: [
      'Real-life role plays & scenarios',
      'Common slang and natural expressions',
      'Improving fluency and confidence',
      'Pronunciation fine-tuning',
    ],
    image: '/images/classes/conversation.png',
    sortOrder: 3,
    featured: true,
  },
  {
    slug: 'intermediate-chinese',
    productId: 'intermediate-chinese-16',
    title: 'Intermediate Chinese',
    shortDescription:
      'Expand your vocabulary, master complex grammar, and communicate confidently on a wide range of topics.',
    category: 'intermediate',
    color: 'sage',
    classType: 'group',
    level: 'HSK 4',
    registerLevels: ['intermediate'],
    pricePerSession: 14,
    packageSessions: 16,
    packagePrice: 200,
    priceNote: '16-session package: $200',
    sessionDurationMin: 60,
    maxStudents: 8,
    schedule: 'Schedule: TBC',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '16 sessions · 60 min each' },
      { icon: 'users', text: 'Small group (4–8 students)' },
    ],
    highlights: [
      'Opinions, feelings & abstract topics',
      'Long-form listening comprehension',
      'Structured writing (emails, short essays)',
      'Chinese culture & idioms (chengyu)',
    ],
    image: '/images/classes/intermediate.png',
    sortOrder: 4,
    featured: false,
  },
  {
    slug: 'hsk-preparation',
    productId: 'hsk-preparation-8',
    title: 'HSK Preparation',
    shortDescription:
      'Targeted preparation for HSK exams with practice tests, strategies, and focused skill development.',
    category: 'intermediate',
    color: 'butter',
    classType: 'both',
    level: 'HSK Prep',
    registerLevels: ['all'],
    pricePerSession: 18,
    packageSessions: 8,
    packagePrice: 135,
    priceNote: '8-session package: $135',
    sessionDurationMin: 90,
    maxStudents: 8,
    schedule: 'Schedule: TBC',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '8 sessions · 90 min each' },
      { icon: 'target', text: 'Exam-focused training' },
    ],
    highlights: [
      'Full mock exams with timing',
      'High-frequency vocabulary review',
      'Test strategies for each section',
      'Personal feedback on weak areas',
    ],
    image: '/images/classes/hsk-prep.png',
    sortOrder: 5,
    featured: false,
  },
  {
    slug: 'private-lessons',
    productId: 'private-lessons-1',
    title: 'Private Lessons',
    shortDescription:
      'Personalized one-on-one instruction tailored to your level, goals, and schedule.',
    category: 'beginner elementary intermediate conversation',
    color: 'peach',
    classType: 'private',
    level: 'All Levels',
    registerLevels: ['all'],
    pricePerSession: 25,
    packageSessions: 1,
    packagePrice: 25,
    priceNote: 'Flexible packages — pay as you go',
    sessionDurationMin: null,
    maxStudents: 1,
    schedule: 'Flexible schedule',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: 'Flexible scheduling' },
      { icon: 'user', text: '1-on-1 personalized' },
    ],
    highlights: [
      'A plan built only for your goals',
      'Business, travel or exam focus',
      'Flexible timing across time zones',
      'Detailed progress reports',
    ],
    image: '/images/classes/private.png',
    sortOrder: 6,
    featured: false,
  },
]

// نگاشت قبلی گروهی/سطح — فقط برای راستی‌آزمایی پس از seed (هیچ منطق اجرایی جدیدی نیست)
const OLD_GROUP_MAP: Record<string, string> = {
  'complete-beginner': 'beginner-chinese-12',
  beginner: 'beginner-chinese-12',
  elementary: 'elementary-chinese-16',
  intermediate: 'intermediate-chinese-16',
}

async function main() {
  let created = 0
  for (const c of SEED) {
    const exists = await db.courseClass.findUnique({ where: { slug: c.slug } })
    if (exists) {
      console.log(`↩︎ skip (exists): ${c.slug}`)
      continue
    }
    const byProduct = await db.courseClass.findUnique({ where: { productId: c.productId } })
    if (byProduct) {
      console.log(`↩︎ skip (productId exists): ${c.productId}`)
      continue
    }
    await db.courseClass.create({
      data: {
        slug: c.slug,
        productId: c.productId,
        title: c.title,
        shortDescription: c.shortDescription,
        category: c.category,
        color: c.color,
        classType: c.classType,
        level: c.level,
        registerLevels: JSON.stringify(c.registerLevels),
        pricePerSession: c.pricePerSession,
        packageSessions: c.packageSessions,
        packagePrice: c.packagePrice,
        priceNote: c.priceNote,
        sessionDurationMin: c.sessionDurationMin,
        maxStudents: c.maxStudents,
        schedule: c.schedule,
        meta: JSON.stringify(c.meta),
        highlights: JSON.stringify(c.highlights),
        image: c.image,
        sortOrder: c.sortOrder,
        featured: c.featured,
        status: 'active',
      },
    })
    created++
    console.log(`✔ seeded: ${c.title} (${c.productId} = $${c.packagePrice})`)
  }

  // راستی‌آزمایی نگاشت قدیمی: گروهی + هر سطح باید همان محصول قبلی را بدهد
  const rows = await db.courseClass.findMany({ where: { status: 'active', classType: { in: ['group', 'both'] } } })
  const lvProduct = new Map<string, string>()
  for (const r of rows) {
    const levels = JSON.parse(r.registerLevels || '[]') as string[]
    for (const lv of levels) {
      if (lv !== 'all' && !lvProduct.has(lv)) lvProduct.set(lv, r.productId)
    }
  }
  for (const [lv, pid] of Object.entries(OLD_GROUP_MAP)) {
    const got = lvProduct.get(lv)
    if (got !== pid) {
      console.error(`✘ MAP MISMATCH for group+${lv}: expected ${pid}, got ${got}`)
      process.exitCode = 1
    }
  }
  console.log(`\nDone — created ${created}, total ${await db.courseClass.count()} classes`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
