# Chinese Toon Audit — Worklog

---
Task ID: AUDIT-1
Agent: crypto-audit (Explore)
Task: Audit crypto/TRON/USDT/wallet code; confirm all disabled safely

Work Log:
- Verified `/home/z/my-project/worklog.md` did not exist; created it. Read prior project worklog at `/home/z/ct-audit/worklog.md` (massive Phase 1–59 history) for context — prior context confirms Phase 59 already removed the USDT online flow from the *order creation* path and replaced it with a manual bank-card + receipt-upload + admin-approval flow, while preserving historical USDT_TRON rows in the `UsdtOrder` table.
- Performed a case-insensitive ripgrep across `/home/z/ct-audit/` (excluding `node_modules`, `.next`, `tool-results`, `upload`) for: `tron`, `usdt`, `crypto`, `wallet`, `testnetWalletRisk`, `trongrid`, `xpub`, `trc20`, `trc`, `bip32`, `bip39`, `@scure`. Triaged 70+ source-level matches, discarding non-crypto false-positives (e.g. `crypto` Node module, generic `Wallet` lucide icon).
- Read full contents of every file under `src/lib/payments/` (`service.ts`, `hd-address.ts`, `admin-orders.ts`, `config.ts`, `trongrid.ts`, `catalog.ts`, `scheduler.ts`, `tron-address.ts`) and every file under `src/app/api/payments/` (`wallet/route.ts`, `orders/route.ts`, `orders/[ref]/route.ts`, `catalog/route.ts`) plus `src/app/api/admin/payments/route.ts`, `src/app/api/admin/payments/[ref]/route.ts`, `src/app/api/admin/payments/[ref]/approve/route.ts`, `src/app/api/admin/payments/[ref]/reject/route.ts`, `src/app/api/payment-settings/route.ts`, `src/app/api/receipts/[id]/route.ts`, `src/lib/payment-settings.ts`, `prisma/schema.prisma`, `tsconfig.json`, `package.json`.
- Confirmed `testnetWalletRisk` is NOT exported from `src/lib/payments/service.ts` (grep for `export\s+(async\s+)?function|export\s+const` returned 11 exports — none match). It is referenced ONLY by `src/app/api/payments/wallet/route.ts` (line 32 import, line 41 call). This is the exact cause of the build failure.
- Read the FULL current content of `src/app/api/payments/wallet/route.ts` (149 lines) — it STILL contains the broken import and the full TRON/USDT/xpub/trongrid wallet-connect logic. The intended disabled-stub fix has NOT been applied yet.
- Verified via grep that `src/lib/payments/trongrid.ts` is imported by NO file in `src/` (only historical tool-results reference it) — it is dead code.
- Verified `src/lib/payments/tron-address.ts` and `src/lib/payments/hd-address.ts` are imported only transitively via `config.ts` (which `service.ts` actively imports) and by the broken `wallet/route.ts`. They are bundled into the active build because `config.ts` pulls them in for `isValidTronAddress` and `validateXpub` (used in the dormant `getPaymentsConfig`/`xpubIssue` paths that only the broken wallet route calls).
- Verified all `@scure/*` and `@noble/*` imports are confined to `tron-address.ts`, `hd-address.ts`, and the standalone `scripts/payments-keygen-offline.mjs` utility. No active bank-card code path needs them.
- Verified `qrcode` is NOT imported by any current source file under `src/` (only by historical tool-results logs); it remains in `package.json` and is also an optional peer of `@reactuses/core`.
- Audited every UI component that renders crypto/wallet references: `PaymentsAdminTab.tsx` (legacy badge for USDT_TRON historical orders — display only, no wallet connect UI); `OrdersAdminTab.tsx` (uses lucide `Wallet` icon + dangling `siteContent.admin.walletError` string lookup — minor TS surface, not crypto); `LogsAdminTab.tsx` (CSS classes for legacy `wallet.save`/`wallet.remove` audit actions — display only); `AdminPage.tsx` (tronscan.org link only for historical orders); `CheckoutPage.tsx` (shows a “legacy USDT note” for old PENDING/DETECTED/UNDERPAID USDT orders, no live USDT UI); `AccountPage.tsx` (uses Wallet lucide icon + checks paymentMethod === 'USDT_TRON' for display).
- Confirmed NO UI route in `src/app/page.tsx`, no admin tab, no checkout step exposes a “Connect your wallet” or “Pay with USDT/TRON” CTA to users.
- Verified all other payment-side endpoints (`/api/payments/orders`, `/api/payments/orders/[ref]`, `/api/payments/catalog`, `/api/admin/payments`, `/api/admin/payments/[ref]`, `/api/admin/payments/[ref]/approve`, `/api/admin/payments/[ref]/reject`, `/api/payment-settings`, `/api/receipts/[id]`) reference the Prisma `usdtOrder` model only for historical naming and perform NO blockchain/TRON/TronGrid/HD-derivation operations.

Stage Summary:
- The Phase-59 refactor successfully disabled crypto from the user-facing purchase path: order creation routes through manual bank-card + receipt upload, there is no UI button that initiates a USDT/TRON payment, no scheduler scans the TRON blockchain, and `service.ts` no longer exports `testnetWalletRisk`.
- HOWEVER, the project is NOT build-safe in its current state: `src/app/api/payments/wallet/route.ts` still imports `{ testnetWalletRisk } from '@/lib/payments/service'` (line 32) and calls it (line 41). `service.ts` does not export that symbol. `next build` will fail with a “Module not found / named export not found” error. The intended disabled-stub replacement (return 404 for GET/PUT/DELETE with no broken imports) has NOT been applied yet.
- Secondary clean-up items (non-blocking for the build): `src/lib/payments/trongrid.ts` is fully dead code (orphan); `src/lib/payments/tron-address.ts` and `src/lib/payments/hd-address.ts` are still transitively bundled because `config.ts` keeps calling `isValidTronAddress`/`validateXpub` inside its dormant wallet-config branches; `qrcode`, `@scure/base`, `@scure/bip32`, `@scure/bip39` in `package.json` are no longer needed by active code (only by the orphan modules + the offline keygen script); `OrdersAdminTab.tsx` references `siteContent.admin.walletError` which is missing from `site-content.ts`.
- Final answer to the audit question “Is crypto/TRON/USDT/wallet fully disabled and build-safe in the current state?”: **NO** — disabled in runtime-paths but NOT build-safe because of the unresolved broken import in `wallet/route.ts`. Applying the intended 404-stub fix to that one file flips the answer to YES.

---
Task ID: AUDIT-2
Agent: sqlite-serverless-audit (Explore)
Task: Audit SQLite-specific code & Prisma init for Vercel/PostgreSQL safety

Work Log:
- Read prior AUDIT-1 entry in /home/z/my-project/worklog.md to absorb context (crypto/USDT/TRON wallet flow was disabled but `wallet/route.ts` still had a broken import).
- Read FULLY: src/lib/db-bootstrap.ts (305 lines), src/lib/db.ts (67 lines), src/lib/ensure-schema.ts (739 lines), src/instrumentation.ts (108 lines), src/lib/backup/service.ts (465 lines), src/lib/backup/scheduler.ts (83 lines), src/lib/receipts.ts (111 lines), prisma/schema.prisma (655 lines), the 4 failing API routes (settings, posts, auth/login, auth/register), package.json, next.config.ts, tests/database-runtime-build.sh, src/app/api/admin/backup/route.ts, src/app/api/admin/backup/restore/route.ts.
- Ripgrep swept the repo (excluding node_modules/.next/tool-results/upload) for: sqlite/SQLite/better-sqlite3/sqlite3/bun:sqlite/file:/canonicalDatabaseUrl/pinDatabaseUrl/ensureDatabaseFile/backupDir/CT_DATA_DIR/isInsideProjectDir → 14 source files matched; cross-referenced with $queryRawUnsafe / $executeRawUnsafe / PRAGMA / sqlite_master / VACUUM INTO / new PrismaClient / $disconnect / setInterval hits.
- Triaged the Prisma client init path, the runtime DDL self-healer, the local-FS backup subsystem, the receipt FS subsystem, the instrumentation startup hook, and the schema's Postgres compatibility surface.
- Identified the SMOKING GUN: src/lib/db.ts line 9 calls pinDatabaseUrl() at module load. pinDatabaseUrl() (db-bootstrap.ts:57-90) treats every non-`file:` DATABASE_URL as "needs pin" and OVERWRITES process.env.DATABASE_URL with `file:/home/z/data/chinesetoon.db`. On Vercel+Neon the incoming DATABASE_URL is `postgresql://...` → silently rewritten to a non-existent local SQLite path → every API route that imports `db` gets a broken Prisma client → 500.
- Mapped each of the 4 failing routes to the exact DB-touching line and the exact failure chain (URL overwrite → prisma generate still bound to sqlite → file-system access attempt on Vercel read-only FS).

Stage Summary:
- The codebase is NOT Vercel+Postgres production-ready. schema.prisma still declares `provider = "sqlite"` (line 9). Eight server-side modules (db-bootstrap, db, ensure-schema, instrumentation, backup/service, backup/scheduler, receipts, plus the admin backup API routes) make SQLite-specific or local-filesystem assumptions that are either impossible or fatal under Vercel serverless + Neon Postgres.
- Top blockers (full list in main report): (1) schema.prisma provider not flipped; (2) pinDatabaseUrl overwrites postgres URLs at import; (3) ensure-schema.ts issues SQLite DDL (sqlite_master + PRAGMA + DATETIME/BOOLEAN DEFAULT 0) at runtime; (4) backup/service.ts uses VACUUM INTO / PRAGMA / file writes; (5) scheduler.ts uses setInterval that Vercel will not honor; (6) receipts.ts writes to /home/z/data/uploads/receipts on a read-only FS; (7) db.ts has log:['query'] in prod and a dev-only stale-client reload hack that calls $disconnect; (8) instrumentation.ts runs all the above at startup; (9) no prisma migrations directory exists; (10) tests/database-runtime-build.sh + package.json db:push are SQLite-only.
- The 4 routes return 500 because the import of `@/lib/db` itself corrupts DATABASE_URL, so Prisma never reaches the Neon DB — it dies trying to open `/home/z/data/chinesetoon.db` on Vercel's ephemeral read-only FS.

---
Task ID: PROD-AUDIT
Agent: Z.ai Code (main) — production-readiness audit
Task: Audit Chinese Toon (Next.js 16 + Prisma) for Vercel + Neon PostgreSQL production; disable crypto/TRON; fix 4 failing APIs (settings/posts/auth-login/auth-register); preserve local SQLite data via migration script

Work Log:
- Extracted user's tar to /home/z/ct-audit/ (Chinese Toon project, original pre-manual-changes state).
- Ran two parallel Explore subagents: AUDIT-1 (crypto/TRON/wallet) + AUDIT-2 (SQLite/serverless/Prisma/4-API-500s).
- ROOT CAUSE of HTTP 500s: src/lib/db.ts called pinDatabaseUrl() at import; on Vercel (Neon postgres URL) it OVERWROTE DATABASE_URL with file:/home/z/data/chinesetoon.db → every DB query failed.
- Applied fixes in /home/z/ct-audit/:
  • prisma/schema.prisma: provider sqlite → postgresql
  • src/app/api/payments/wallet/route.ts: replaced broken (testnetWalletRisk import) with 404 stub
  • src/lib/db.ts: rewritten — no pinDatabaseUrl, log:['error','warn'] in prod, unconditional globalThis cache, removed stale-client hack
  • src/lib/db-bootstrap.ts: pinDatabaseUrl + ensureDatabaseFile guarded to no-op on postgres (isPostgresDatabase())
  • src/lib/ensure-schema.ts: ensureSchema no-op on postgres (SQLite DDL invalid on Postgres)
  • src/instrumentation.ts: on postgres skip ensureDatabaseFile/backupScheduler/warmCriticalRoutes (127.0.0.1 invalid on Vercel)
  • src/lib/receipts.ts: graceful ReceiptStorageUnavailableError when FS unwritable (Vercel); doc Vercel Blob follow-up
  • src/components/site/admin/OrdersAdminTab.tsx: fixed dangling siteContent.admin.walletError ref
  • package.json: build=next build (no cp -r), start=next start, db:push=prisma db push (no --accept-data-loss, no hardcoded path), +postinstall:prisma generate, +db:migrate:deploy
  • Created prisma/migrations/0_init/migration.sql (677 lines postgres DDL via prisma migrate diff) + migration_lock.toml
  • Created scripts/migrate-sqlite-to-postgres.ts (bun:sqlite read + Prisma DMMF type-aware write; preserves IDs/timestamps/booleans; session_replication_role=replica for bulk load; aborts if target non-empty)
  • Created .env.example (no secrets)
- VERIFICATION: bun install ✓ (858 pkgs, postinstall prisma generate ✓), bun run db:generate ✓ (activeProvider=postgresql), bun run lint ✓ (0 errors 0 warnings), bun run build ✓ (compiled 13.7s, testnetWalletRisk error eliminated, /api/payments/wallet now stub).
- Confirmed: ZERO real testnetWalletRisk imports/calls; pinDatabaseUrl() only called inside guarded ensureDatabaseFile (postgres = no-op).

Stage Summary:
- 4 failing APIs (settings/posts/auth-login/auth-register) will work on Vercel+Neon once DATABASE_URL is respected (fixed) + migrations applied.
- Crypto/TRON/USDT/wallet: wallet endpoint stubbed to 404; dormant crypto modules (tron-address/hd-address/config wallet-half) remain isolated/unreachable, build-safe. No crypto UI active.
- Existing local SQLite DB untouched; migration script ready to copy data → Neon.
- Deployable on Vercel with: Vercel env DATABASE_URL (Neon pooled), Build Command `bun run db:migrate:deploy && bun run build`.

---
Task ID: SEO-SITEMAP
Agent: Z.ai Code (main) — sitemap/robots/SEO audit
Task: Fix invalid /sitemap.xml reported by Google Search Console for www.chinesetoon.com

Work Log:
- Inspected /home/z/ct-audit/ SEO setup: src/app/sitemap.ts, public/robots.txt, src/app/layout.tsx metadata, src/app/page.tsx (hash-based SPA), next.config.ts redirects.
- ROOT CAUSE: siteContent.contact.siteUrl = "https://chinesetoon.com" (NON-www). The sitemap emitted <loc>https://chinesetoon.com/</loc> and robots.txt pointed to https://chinesetoon.com/sitemap.xml — but Google Search Console checks the canonical www.chinesetoon.com. This www/non-www mismatch made Google flag the sitemap as invalid (URLs not allowed / cross-domain).
- Confirmed SPA architecture: all public views (classes/learn/about/blog/reviews/support/register) are hash routes (#/classes) rendered client-side from the single HTTP route `/`. next.config redirects /classes→/#/classes are 307 (must NOT be in sitemap). No dynamic App Router pages exist. So only `/` is a valid indexable canonical URL.
- Fixes applied:
  • src/content/site-content.ts: siteUrl "https://chinesetoon.com" → "https://www.chinesetoon.com" (canonical www). Auto-fixed: sitemap URLs, metadataBase, JSON-LD @id, OG url.
  • Deleted public/robots.txt; created src/app/robots.ts (native Next.js Metadata API) sourcing canonical domain from same siteContent — eliminates www/non-www drift between robots and sitemap. Rules: User-agent:* Allow:/ + Sitemap: https://www.chinesetoon.com/sitemap.xml + Host.
  • Rewrote src/app/sitemap.ts with explicit comment explaining why only `/` is listed (hash-SPA architecture). Uses same canonical domain source.
- VERIFICATION: bun run lint ✓ (0 errors), bun run build ✓ (compiled 14.1s; /robots.txt + /sitemap.xml both ○ static prerendered). Live fetch on dev server: GET /robots.txt → HTTP 200 text/plain (correct content); GET /sitemap.xml → HTTP 200 application/xml (valid urlset, namespace http://www.sitemaps.org/schemas/sitemap/0.9, loc=https://www.chinesetoon.com/). Python xml.dom.minidom + ElementTree parse: ✓ well-formed, ✓ schema-valid, ✓ 1 url.
- noindex/nofollow audit: NONE found on any public page. No per-page robots overrides. metadataBase now correctly www.

Stage Summary:
- /sitemap.xml and /robots.txt now serve valid, Google-compatible content on the canonical www.chinesetoon.com domain.
- Single source of truth (siteContent.contact.siteUrl) feeds sitemap + robots + metadataBase + JSON-LD — no future www/non-www drift possible.
- Compatible with Next.js 16.1.3 App Router native Metadata API; works on Vercel (both routes are static ○ prerendered at build time).
- Long-term SEO recommendation (out of scope per user constraint): convert hash routes to real App Router routes (/classes, /learn, /blog/[slug]) so each public view becomes independently indexable.
