import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { siteContent } from '@/content/site-content'

// ---------------------------------------------------------------------------
//  📥 درون‌ریزی پیش‌فرض‌های فایل محتوا به دیتابیس
//  kind = lessons | words | quiz | teachers | testimonials
//  مالک می‌خواهد همه‌چیزِ ثابتِ سایت را از پنل ببیند و عوض کند — این API
//  پیش‌فرض‌ها را (اگر تکراری نباشند) وارد دیتابیس می‌کند تا در تب‌های
//  Lessons/Words/Quiz/Teachers/Reviews قابل ویرایش و حذف باشند.
//  فقط مدیریت: POST با هدر x-admin-key
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { kind?: string }
    const kind =
      body.kind === 'quiz'
        ? 'quiz'
        : body.kind === 'lessons'
          ? 'lessons'
          : body.kind === 'teachers'
            ? 'teachers'
            : body.kind === 'testimonials'
              ? 'testimonials'
              : 'words'

    // kind === 'teachers' — درون‌ریزی تیم پیش‌فرض صفحهٔ About (تب Teachers)
    if (kind === 'teachers') {
      const defaults = siteContent.about.teachers.items as {
        name: string
        role: string
        bio: string
        tag: string
        langs: string[]
        image?: string
      }[]
      const existing = await db.teacher.findMany({ select: { name: true, role: true } })
      const key = (n: string, r: string) => `${n}::${r}`.toLowerCase()
      const seen = new Set(existing.map((e) => key(e.name, e.role)))
      const toInsert = defaults.filter((d) => !seen.has(key(d.name, d.role)))
      if (toInsert.length === 0) {
        return NextResponse.json({ ok: true, inserted: 0 })
      }
      const base = await db.teacher.count()
      await db.teacher.createMany({
        data: toInsert.map((d, i) => ({
          name: d.name,
          role: d.role,
          bio: d.bio,
          tag: d.tag,
          langs: d.langs.join(', '),
          image: d.image ?? null,
          sortOrder: base + i + 1,
          published: true,
        })),
      })
      return NextResponse.json({ ok: true, inserted: toInsert.length })
    }

    // kind === 'testimonials' — درون‌ریزی نظرات ثابت کاروسل خانه (تب Reviews؛ منتخب + تأییدشده)
    if (kind === 'testimonials') {
      const defaults = siteContent.testimonials.items as {
        name: string
        role: string
        rating: number
        text: string
      }[]
      const existing = await db.testimonial.findMany({ select: { name: true, text: true } })
      const key = (n: string, t: string) => `${n}::${t.slice(0, 40)}`.toLowerCase()
      const seen = new Set(existing.map((e) => key(e.name, e.text)))
      const toInsert = defaults.filter((d) => !seen.has(key(d.name, d.text)))
      if (toInsert.length === 0) {
        return NextResponse.json({ ok: true, inserted: 0 })
      }
      await db.testimonial.createMany({
        data: toInsert.map((d) => ({
          name: d.name,
          role: d.role,
          rating: d.rating,
          text: d.text,
          status: 'approved', // نظرات منتخب مالک — همین حالا در سایت دیده شوند
          featured: true,
        })),
      })
      return NextResponse.json({ ok: true, inserted: toInsert.length })
    }

    // kind === 'lessons' — درون‌ریزی ۹ درس پیش‌فرض فایل محتوا (کارت + واژه‌ها)
    if (kind === 'lessons') {
      const items = siteContent.learn.items as {
        lesson: string
        category: string
        color: string
        tag: string
        big: string
        small: string
        title: string
        text: string
        action: string
        isVideo?: boolean
      }[]
      const lessonsMap = siteContent.learn.lessons as unknown as Record<
        string,
        { title: string; subtitle: string; words: { chinese: string; pinyin: string; meaning: string; example?: string }[] }
      >
      const existing = await db.lesson.findMany({ select: { slug: true } })
      const seen = new Set(existing.map((e) => e.slug))
      const toInsert = items
        .filter((it) => it.lesson && lessonsMap[it.lesson] && !seen.has(it.lesson))
        .map((it, i) => ({
          slug: it.lesson,
          title: it.title,
          text: it.text,
          subtitle: lessonsMap[it.lesson].subtitle,
          big: it.big,
          small: it.small,
          tag: it.tag,
          category: it.category,
          color: it.color,
          action: it.action,
          isVideo: it.isVideo ?? false,
          words: JSON.stringify(lessonsMap[it.lesson].words),
          sortOrder: i + 1,
          published: true,
        }))
      if (toInsert.length === 0) {
        return NextResponse.json({ ok: true, inserted: 0 })
      }
      await db.lesson.createMany({ data: toInsert })
      return NextResponse.json({ ok: true, inserted: toInsert.length })
    }

    if (kind === 'words') {
      const defaults = siteContent.learn.flashcards.cards
      // بدون تکرار: واژه‌هایی که از قبل (با همان کاراکتر + معنی) در دیتابیس‌اند رد می‌شوند
      const existing = await db.learnCard.findMany({ select: { chinese: true, meaning: true } })
      const key = (c: string, m: string) => `${c}::${m}`
      const seen = new Set(existing.map((e) => key(e.chinese, e.meaning)))
      const toInsert = defaults.filter((d) => !seen.has(key(d.chinese, d.meaning)))
      if (toInsert.length === 0) {
        return NextResponse.json({ ok: true, inserted: 0 })
      }
      const base = await db.learnCard.count()
      await db.learnCard.createMany({
        data: toInsert.map((d, i) => ({
          chinese: d.chinese,
          pinyin: d.pinyin,
          meaning: d.meaning,
          example: d.example ?? null,
          sortOrder: base + i + 1,
          published: true,
        })),
      })
      return NextResponse.json({ ok: true, inserted: toInsert.length })
    }

    // kind === 'quiz'
    const defaults = siteContent.learn.quiz.questions
    const existing = await db.quizQuestion.findMany({ select: { question: true } })
    const seen = new Set(existing.map((e) => e.question.trim().toLowerCase()))
    const toInsert = defaults.filter((d) => !seen.has(d.q.trim().toLowerCase()))
    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 })
    }
    const base = await db.quizQuestion.count()
    await db.quizQuestion.createMany({
      data: toInsert.map((d, i) => ({
        question: d.q,
        options: JSON.stringify(d.options),
        sortOrder: base + i + 1,
        published: true,
      })),
    })
    return NextResponse.json({ ok: true, inserted: toInsert.length })
  } catch (err) {
    console.error('[POST /api/learn/seed] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
