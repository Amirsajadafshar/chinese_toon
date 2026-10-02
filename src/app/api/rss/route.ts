import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// 📰 فید RSS مقالات وبلاگ — /api/rss
//    خواننده‌های فید (Feedly، Feedbin و…) می‌توانند مقاله‌های جدید را دنبال کنند.
//    لینک هر مقاله به نمای hash-route سایت اشاره می‌کند (#/blog/slug).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic' // همیشه فهرست تازه از دیتابیس

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const items = posts
      .map((p) => {
        const link = `${origin}/#/blog/${encodeURIComponent(p.slug)}`
        return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(p.id)}</guid>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.tag)}</category>
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chinese Toon Blog</title>
    <link>${esc(origin)}/#/blog</link>
    <atom:link href="${esc(origin)}/api/rss" rel="self" type="application/rss+xml" />
    <description>News, Chinese culture stories and practical study tips from Chinese Toon teachers.</description>
    <language>en</language>
    <generator>Chinese Toon</generator>
${items}
  </channel>
</rss>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (err) {
    console.error('[GET /api/rss] error:', err)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Chinese Toon Blog</title><description>Feed temporarily unavailable.</description></channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } }
    )
  }
}
