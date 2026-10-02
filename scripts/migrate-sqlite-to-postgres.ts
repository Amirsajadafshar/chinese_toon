// ---------------------------------------------------------------------------
// 🚚 migrate-sqlite-to-postgres — one-time data migration
//
// Reads all rows from the existing local SQLite database and writes them into
// the PostgreSQL (Neon) database configured via DATABASE_URL.
//
// SAFETY:
//   • Never deletes or overwrites PostgreSQL data — it ABORTS if the target
//     already contains users (use --force to bypass the guard, which still
//     only INSERTs with skipDuplicates, never UPDATEs/DELETEs).
//   • Preserves all IDs (cuid), timestamps, booleans, nullable fields, and
//     unique constraints.
//   • Foreign-key checks are suspended for the session (session_replication_role
//     = 'replica') so insertion order does not matter, then restored.
//   • Idempotent-ish: skipDuplicates => re-running after a partial failure
//     will not crash on already-inserted rows.
//
// USAGE (run locally with bun):
//   1. Make sure `DATABASE_URL` in .env points to your Neon PostgreSQL DB.
//   2. Make sure the schema has been applied to Neon:
//        bun run db:migrate:deploy
//   3. Run this script:
//        bun scripts/migrate-sqlite-to-postgres.ts /path/to/chinesetoon.db
//
//   If the source SQLite path is omitted, it tries:
//     $SOURCE_SQLITE_PATH, $CT_DATA_DIR/chinesetoon.db, ./db/custom.db
//
// ---------------------------------------------------------------------------

import { PrismaClient, Prisma, type PrismaClientOptions } from '@prisma/client'

// --- locate the source SQLite file -----------------------------------------
function resolveSourcePath(): string {
  const arg = process.argv[2]
  if (arg && arg.trim()) return arg.trim()
  const fromEnv = (process.env.SOURCE_SQLITE_PATH ?? '').trim()
  if (fromEnv) return fromEnv
  const ctDir = (process.env.CT_DATA_DIR ?? '').trim()
  if (ctDir) return `${ctDir}/chinesetoon.db`
  return './db/custom.db'
}

const SOURCE_PATH = resolveSourcePath()
const FORCE = process.argv.includes('--force')

// --- open source (SQLite, read-only) via bun:sqlite ------------------------
// bun:sqlite is only available when running under bun (which this script
// requires). It is NOT imported at the top level so that `next build` never
// tries to bundle it.
type SqliteDb = {
  query: (s: string) => { all: () => Record<string, unknown>[] }
  close: () => void
}
function openSqlite(path: string): SqliteDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('bun:sqlite') as { Database: new (p: string, o?: { readonly?: boolean }) => SqliteDb }
  return new mod.Database(path, { readonly: true })
}

// --- open target (PostgreSQL via Prisma) -----------------------------------
const target = new PrismaClient({
  log: ['error', 'warn'],
} as PrismaClientOptions)

// --- type-aware row transformer (uses Prisma DMMF metadata) ----------------
type FieldKind = 'scalar' | 'object' | 'enum'
interface DmmfField {
  name: string
  kind: FieldKind
  type: string
  isList?: boolean
  isRequired?: boolean
}
interface DmmfModel {
  name: string
  fields: DmmfField[]
}

const MODELS: DmmfModel[] = (Prisma.dmmf.datamodel.models as DmmfModel[])
  // Relations (kind=object) come AFTER their scalar FKs alphabetically in DMMF;
  // we exclude object-kind fields entirely since they aren't real columns.
  .filter((m) => !m.name.startsWith('_'))

function scalarFieldMap(model: DmmfModel): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of model.fields) {
    if (f.kind === 'scalar') m.set(f.name, f.type)
  }
  return m
}

/** camelCase accessor on the Prisma client: User -> db.user, UsdtOrder -> db.usdtOrder */
function clientAccessor(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

function transformRow(
  row: Record<string, unknown>,
  fieldTypes: Map<string, string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    // Skip columns that don't exist in the current (Postgres) schema —
    // handles schema drift between the old SQLite and the new schema.
    if (!fieldTypes.has(k)) continue
    const t = fieldTypes.get(k)!
    if (v === null || v === undefined) {
      out[k] = null
      continue
    }
    if (t === 'DateTime') {
      // SQLite stores DateTime as ISO 8601 TEXT. Prisma wants a Date.
      const d = v instanceof Date ? v : new Date(v as string)
      out[k] = Number.isNaN(d.getTime()) ? null : d
    } else if (t === 'Boolean') {
      // SQLite stores booleans as 0/1 INTEGER.
      out[k] = v === 1 || v === true || v === '1' || v === 'true'
    } else if (t === 'Int' || t === 'BigInt') {
      out[k] = typeof v === 'number' ? v : Number(v)
    } else if (t === 'Decimal' || t === 'Float') {
      out[k] = typeof v === 'number' ? v : Number(v)
    } else {
      // String, Json (stored as TEXT), enums (stored as TEXT)
      out[k] = v
    }
  }
  return out
}

async function main(): Promise<void> {
  console.log('━'.repeat(72))
  console.log('🚚 SQLite → PostgreSQL migration')
  console.log(`   source: ${SOURCE_PATH}`)
  console.log(`   target: ${process.env.DATABASE_URL ? 'DATABASE_URL (set)' : 'DATABASE_URL (NOT SET!)'}`)
  console.log('━'.repeat(72))

  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set. Point it at your Neon PostgreSQL DB in .env, then re-run.')
    process.exit(2)
  }

  let sqlite: SqliteDb
  try {
    sqlite = openSqlite(SOURCE_PATH)
  } catch (e) {
    console.error(`\n❌ Could not open source SQLite file at ${SOURCE_PATH}:`, e instanceof Error ? e.message : e)
    console.error('   Pass the path as the first argument: bun scripts/migrate-sqlite-to-postgres.ts /path/to.db')
    process.exit(2)
  }

  // --- safety: refuse to clobber a populated target -----------------------
  if (!FORCE) {
    try {
      const existing = await target.user.count()
      if (existing > 0) {
        console.error(
          `\n❌ Target PostgreSQL DB already has ${existing} users. Refusing to migrate to avoid duplicate/overlapping data.`
        )
        console.error('   If you are sure, re-run with --force (inserts use skipDuplicates, never overwrites).')
        await target.$disconnect()
        sqlite.close()
        process.exit(3)
      }
    } catch (e) {
      console.error('\n❌ Could not query target DB (is the schema applied? run `bun run db:migrate:deploy` first):', e instanceof Error ? e.message : e)
      await target.$disconnect()
      sqlite.close()
      process.exit(4)
    }
  }

  // --- suspend FK checks for this session (Postgres bulk-load pattern) -----
  try {
    await target.$executeRawUnsafe(`SET session_replication_role = 'replica'`)
  } catch (e) {
    console.warn('⚠️ Could not set session_replication_role=replica (continuing without it):', e instanceof Error ? e.message : e)
  }

  let totalRows = 0
  let totalTables = 0
  const errors: string[] = []

  for (const model of MODELS) {
    const table = model.name
    const accessor = clientAccessor(table)
    const delegate = (target as unknown as Record<string, { createMany: (a: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }> }>)[accessor]
    if (!delegate || typeof delegate.createMany !== 'function') {
      errors.push(`${table}: no Prisma delegate found (skipped)`)
      continue
    }

    let rows: Record<string, unknown>[] = []
    try {
      rows = sqlite.query(`SELECT * FROM "${table}"`).all()
    } catch {
      // Table doesn't exist in the source SQLite — skip silently.
      continue
    }
    if (rows.length === 0) {
      console.log(`  ${table.padEnd(22)} 0 rows (empty in source)`)
      continue
    }

    const fieldTypes = scalarFieldMap(model)
    const mapped = rows.map((r) => transformRow(r, fieldTypes))

    try {
      const result = await delegate.createMany({ data: mapped, skipDuplicates: true })
      totalRows += result.count
      totalTables += 1
      console.log(`  ${table.padEnd(22)} ${String(result.count).padStart(6)} rows migrated (of ${rows.length} in source)`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${table}: ${msg}`)
      console.error(`  ${table.padEnd(22)} ❌ FAILED — ${msg.slice(0, 120)}`)
    }
  }

  // --- restore FK checks ----------------------------------------------------
  try {
    await target.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
  } catch {
    /* session ends anyway */
  }

  console.log('━'.repeat(72))
  console.log(`✅ Migrated ${totalRows} rows across ${totalTables} tables.`)
  if (errors.length > 0) {
    console.error(`\n⚠️ ${errors.length} table(s) had errors:`)
    for (const e of errors) console.error(`   • ${e}`)
  }
  console.log('\nNext: verify in the Neon SQL editor that key tables (User, Post, CourseClass, Registration) have rows.')

  await target.$disconnect()
  sqlite.close()
}

main().catch((e) => {
  console.error('Fatal migration error:', e instanceof Error ? e.message : e)
  process.exit(1)
})
