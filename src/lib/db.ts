// ---------------------------------------------------------------------------
// 🗄️ Prisma client singleton — Vercel/Neon-PostgreSQL safe.
//
// IMPORTANT (production-readiness audit):
// The previous version called `pinDatabaseUrl()` from `@/lib/db-bootstrap` at
// module load. That function OVERWROTE a Neon `postgresql://` DATABASE_URL
// with `file:/home/z/data/chinesetoon.db` on every serverless cold-start —
// which was the ROOT CAUSE of the HTTP 500s on `/api/settings`,
// `/api/posts`, `/api/auth/login` and `/api/auth/register` in production.
//
// This version:
//   • does NOT touch `process.env.DATABASE_URL` (Neon URL is respected as-is)
//   • keeps a single PrismaClient on `globalThis` for warm-invoke reuse
//     (caching is now UNCONDITIONAL — previously it was skipped in
//     `NODE_ENV=production`, forcing a new client on every warm invoke)
//   • logs queries only in development (production uses `['error','warn']`)
//   • removed the dev-only stale-client reload hack (HMR workaround that
//     called `$disconnect()` and busted the require cache — risky on serverless)
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // Verbose query logging is dev-only; in production it floods Vercel logs
    // and slows every request.
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
  })
}

// Reuse the warm client across invokes (serverless warm starts). When the
// instance is recycled (cold start) a fresh client is created.
const db =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = createPrismaClient())

export { db }
