// ---------------------------------------------------------------------------
//  اسکریپت یک‌بارهٔ seed وبلاگ — سه مقالهٔ نمونه اضافه می‌کند (اگر خالی باشد)
//  اجرا: bun run prisma/seed-blog.ts
// ---------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const posts = [
  {
    title: 'New HSK 1 Survival Course Starts This Month',
    slug: 'new-hsk1-survival-course',
    tag: 'news',
    emoji: '🎉',
    color: 'sage',
    excerpt:
      'Our brand-new HSK 1 evening group opens this month — perfect for absolute beginners who want a gentle, structured start.',
    content: `We are excited to announce a brand-new HSK 1 Survival Course starting this month!

**What is it?**
A 10-week evening group class designed for absolute beginners. You will learn pinyin, tones, and your first 150 words — everything you need to survive real situations in China: greetings, numbers, ordering food, and asking for directions.

**Why this course works**
- Small groups (max 8 students) so everyone speaks in every lesson
- Animated mini-stories from Chinese Toon make each lesson memorable
- Weekly speaking practice with your teacher
- Free make-up recordings if you miss a session

**Schedule & price**
Classes run twice a week, 18:30–20:00. The trial lesson is completely free — come and see if Chinese is for you.

Seats are limited. Register from the "Join a Class" page and choose HSK 1 Beginner.`,
  },
  {
    title: 'Why 你好 Is Not the Whole Story: Real Chinese Greetings',
    slug: 'real-chinese-greetings',
    tag: 'culture',
    emoji: '🀄',
    color: 'butter',
    excerpt:
      'Ni hao is fine, but real life sounds different. Discover how Chinese people actually greet each other — from 吃了吗 to 嗨.',
    content: `Ask anyone to say something in Chinese and they will say 你好 (nǐ hǎo). It is correct — but in real life, Chinese greetings are richer and more interesting.

## 吃了吗？ — "Have you eaten?"

Historically, food was the center of life, so asking "have you eaten?" was a way of showing care. Today young people use it jokingly or warmly with friends and family.

## 嗨 and 哈喽 — the modern classics

Among friends, especially in cities, the English loanwords 嗨 (hāi) and 哈喽 (hā lóu) are extremely common. Casual, friendly, effortless.

## 最近怎么样？ — "How have you been lately?"

The natural way to check in with someone you already know. Notice the answer is usually short: 挺好的 ("pretty good").

## Try it yourself

Next time you practice, mix it up: greet a classmate with 最近怎么样？ and reply 忙，但是挺好的 ("busy, but pretty good"). Small phrases like these make your Chinese sound instantly more natural.

Want more real-life Chinese? Follow Chinese Toon for weekly mini-lessons.`,
  },
  {
    title: '5 Study Habits That Double Your Vocabulary Speed',
    slug: 'study-habits-vocabulary',
    tag: 'tips',
    emoji: '💡',
    color: 'peach',
    excerpt:
      'Spacing, tone pairing, story anchoring — five research-backed habits that help you remember twice as many Chinese words.',
    content: `Learning Chinese vocabulary can feel endless — 汉字 everywhere, tones slipping away. Here are five habits our teachers use that genuinely double how much you remember.

**1. Spaced repetition beats cramming**
Review a word after 1 day, 3 days, one week, then one month. Fifteen minutes daily beats two hours on Sunday.

**2. Pair every word with its tone picture**
Don't memorize mā — picture a mom (1st tone, flat and calm). Tones stick when they carry an image.

**3. Anchor words in stories**
Our animated lessons exist for this reason: 你好 is forgettable, but 你好 inside a funny story about a panda is not. Create a one-sentence mini-story for each new word.

**4. Speak before you are ready**
Say new words out loud immediately, even badly. Your mouth needs repetitions just like your memory does.

**5. Learn in pairs, not singles**
Chinese loves pairings: 学习， 喜欢， 谢谢. Learning two-character words as one rhythm trains natural pronunciation automatically.

Start with just one habit this week — spaced repetition is the highest-impact one. 小步快跑 (small steps, fast pace)!`,
  },
]

async function main() {
  const count = await db.post.count()
  if (count > 0) {
    console.log(`Posts table already has ${count} posts — skipping seed.`)
    return
  }
  for (const p of posts) {
    await db.post.create({ data: p })
  }
  console.log(`Seeded ${posts.length} sample posts.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
