import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  🧪 تسک ۸۲ — تلاش‌های آزمون تعیین سطح (سرنخ‌ها) — فقط ادمین
//  GET: ۲۰۰ تلاش آخر با ایمیل/باند/نمره — برای تب Quiz پنل ادمین
//  هیچ ایمیل خامی به کلاینت‌های غیرادمین نمی‌رسد (گارد در ابتدای تابع)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const attempts = await db.quizAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // 🛡️ سقف دفاعی
      select: {
        id: true,
        score: true,
        maxScore: true,
        band: true,
        email: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ attempts })
  } catch (err) {
    console.error('[GET /api/learn/quiz/attempts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
