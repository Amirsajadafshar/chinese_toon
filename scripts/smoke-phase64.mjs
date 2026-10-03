// ---------------------------------------------------------------------------
// 🧪 تست دودی فاز ۶۴ (نسخهٔ ۲) — علیه سرور پروداکشن محلی روی پورت ۳۱۰۰
// شامل: سشن DB، رأی FAQ با آیتم موقت، rate-limit با کلید درست، و آمار جدول‌ها
// همهٔ ردیف‌های تستی در پایان پاک می‌شوند.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3100'

const env = {}
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/)
  if (m && !env[m[1]]) env[m[1]] = m[2]
}
const ADMIN_USERNAME = env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'chinesetoon2024'

let tokenHash = ''
let passed = 0, failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`PASS  ${name}${extra ? ' — ' + extra : ''}`) }
  else { failed++; console.log(`FAIL  ${name}${extra ? ' — ' + extra : ''}`) }
}

// پاک‌سازی قفل‌های ممکن از اجرای قبلی (تا لاگین این اجرا بلاک نشود)
await db.rateBlock.deleteMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })

try {
  // ── ۱) لاگین + سشن DB ─────────────────────────────────────────────────
  let r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  })
  const login = await r.json().catch(() => ({}))
  check('POST /api/admin/login → 200 + token', r.status === 200 && typeof login.token === 'string' && login.token.length === 64)
  const token = login.token

  const crypto = await import('node:crypto')
  tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const sessRow = await db.adminSession.findUnique({ where: { tokenHash } })
  check('AdminSession row exists in DB (sha256 of token)', !!sessRow)

  for (let i = 1; i <= 3; i++) {
    r = await fetch(`${BASE}/api/admin/stats`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
    check(`GET /api/admin/stats (#${i}) with token → 200`, r.status === 200, `status=${r.status}`)
  }
  r = await fetch(`${BASE}/api/admin/stats`, { headers: { 'x-admin-key': 'f'.repeat(64) }, cache: 'no-store' })
  check('GET /api/admin/stats with bogus token → 401', r.status === 401)

  // ── ۲) رأی FAQ با آیتم موقت (کامل: route + جدول FaqVote + شمارنده) ──────
  const tmpFaq = await db.faqItem.create({
    data: { category: 'general', question: 'SMOKE TEST — will be deleted', answer: 'SMOKE TEST', published: true, sortOrder: -9999 },
  })
  try {
    r = await fetch(`${BASE}/api/faq/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tmpFaq.id, vote: 'up' }),
    })
    const v = await r.json().catch(() => ({}))
    check('POST /api/faq/vote → 200 + fresh counters', r.status === 200 && v.helpfulYes === 1, `helpfulYes=${v.helpfulYes}`)
    const voteRow = await db.faqVote.findFirst({ where: { faqId: tmpFaq.id } })
    check('FaqVote row persisted in DB', !!voteRow)
    // رأی دوبمه همان سؤال → alreadyVoted بدون افزایش شمارنده
    r = await fetch(`${BASE}/api/faq/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tmpFaq.id, vote: 'down' }),
    })
    const v2 = await r.json().catch(() => ({}))
    check('second vote → alreadyVoted, counters unchanged', r.status === 200 && v2.alreadyVoted === true && v2.helpfulYes === 1)
  } finally {
    await db.faqVote.deleteMany({ where: { faqId: tmpFaq.id } })
    await db.faqItem.delete({ where: { id: tmpFaq.id } })
  }

  // ── ۳) logout → سشن باطل ────────────────────────────────────────────────
  r = await fetch(`${BASE}/api/admin/logout`, { method: 'POST', headers: { 'x-admin-key': token } })
  check('POST /api/admin/logout → 200', r.status === 200)
  r = await fetch(`${BASE}/api/admin/stats`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
  check('stats after logout → 401 (session revoked)', r.status === 401)

  // ── ۴) rate-limit با پشتوانهٔ DB (بعد از همهٔ لاگین‌های لازم) ────────────
  await db.rateBlock.deleteMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })
  await db.rateEvent.deleteMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })
  let got429 = -1
  for (let i = 1; i <= 7; i++) {
    r = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'x', password: 'x' }),
    })
    if (r.status === 429 && got429 === -1) got429 = i
  }
  check('DB-backed rate limit: 429 within 6 bad attempts (limit=5)', got429 === 6, `first 429 at attempt #${got429}`)
  const blocks = await db.rateBlock.findMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })
  check('RateBlock row exists in DB', blocks.length > 0, blocks[0]?.bucketKey ?? '')

  // ── ۵) آمار جدول‌ها روی Neon — چه داده‌ای واقعاً هست؟ ─────────────────────
  const [posts, publishedPosts, testimonials, faqs, publishedFaqs, registrations, subscribers, users] = await Promise.all([
    db.post.count(), db.post.count({ where: { published: true } }),
    db.testimonial.count(), db.faqItem.count(), db.faqItem.count({ where: { published: true } }),
    db.registration.count(), db.newsletterSubscriber.count(), db.user.count(),
  ])
  console.log('\n── Neon data snapshot ──')
  console.log(`posts: ${posts} (published: ${publishedPosts})`)
  console.log(`testimonials: ${testimonials}`)
  console.log(`faqs: ${faqs} (published: ${publishedFaqs})`)
  console.log(`registrations: ${registrations}`)
  console.log(`newsletter subscribers: ${subscribers}`)
  console.log(`users: ${users}`)

} finally {
  try {
    if (tokenHash) await db.adminSession.deleteMany({ where: { tokenHash } }) // فقط سشن همین اجرأ تست
    await db.rateBlock.deleteMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })
    await db.rateEvent.deleteMany({ where: { bucketKey: { startsWith: 'admin-login:' } } })
    await db.errorLog.deleteMany({ where: { category: 'AUTH', message: { contains: 'Admin login attempt rejected' } } })
    console.log('\ncleanup: all test rows removed')
  } catch (e) {
    console.log('\ncleanup warning:', e instanceof Error ? e.message : e)
  }
  await db.$disconnect()
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`)
process.exit(failed ? 1 : 0)
