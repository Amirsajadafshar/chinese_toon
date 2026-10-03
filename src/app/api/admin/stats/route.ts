import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  آمار کلی داشبورد مدیریت — فقط مدیریت
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [messages, registrations, subscribers, posts, testimonials, learnCards, quizQuestions] =
      await Promise.all([
        db.supportMessage.findMany({ select: { status: true } }),
        // 📊 فاز ۶۰ — شمارش با «همان فیلترِ فهرستِ قابل‌مشاهده» (بایگانی‌شده‌ها
        // حذف می‌شوند) تا عدد تب و جدول همیشه یکی باشد — بند ۱۵-۱۹ تسک
        db.registration.findMany({ where: { deletedAt: null }, select: { status: true } }),
        db.newsletterSubscriber.count(),
        db.post.findMany({ select: { published: true, views: true } }),
        db.testimonial.findMany({ where: { deletedAt: null }, select: { status: true } }),
        db.learnCard.count(),
        db.quizQuestion.count(),
      ])

    return NextResponse.json({
      messages: {
        total: messages.length,
        new: messages.filter((m) => m.status === 'new').length,
        inProgress: messages.filter((m) => m.status === 'in-progress').length,
        resolved: messages.filter((m) => m.status === 'resolved').length,
      },
      registrations: {
        total: registrations.length,
        new: registrations.filter((r) => r.status === 'new').length,
        contacted: registrations.filter((r) => r.status === 'contacted').length,
        enrolled: registrations.filter((r) => r.status === 'enrolled').length,
      },
      subscribers: { total: subscribers },
      posts: {
        total: posts.length,
        published: posts.filter((p) => p.published).length,
        totalViews: posts.reduce((sum, p) => sum + p.views, 0),
      },
      reviews: {
        total: testimonials.length,
        pending: testimonials.filter((t) => t.status === 'pending').length,
        approved: testimonials.filter((t) => t.status === 'approved').length,
      },
      learn: { cards: learnCards, quiz: quizQuestions },
    })
  } catch (err) {
    console.error('[GET /api/admin/stats] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
