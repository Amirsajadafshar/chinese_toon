// ---------------------------------------------------------------------------
// 🎓 GET /api/classes/[slug] — یک کلاس عمومی برای لینک پایدار ‎#/classes/<slug>
// فقط وضعیت‌های active/full پاسخ می‌دهند؛ بقیه (inactive/draft/archived) 404.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { getPublicClassBySlug } from '@/lib/classes/store'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'

export const dynamic = 'force-dynamic'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = await rateLimit('classes-one', req, 60, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)

  const { slug } = await params
  const clean = (slug || '').toLowerCase()
  if (!SLUG_RE.test(clean)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const item = await getPublicClassBySlug(clean)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(
      { class: item },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[classes] public detail failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
