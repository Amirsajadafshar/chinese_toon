'use client'

// ---------------------------------------------------------------------------
// 🧾 تب Logs & Export پنل ادمین (فاز ۵۳ — بندهای ۱۱، ۱۲، ۱۴)
//
//  • Data Export: خروجی CSV سمت سرور (users/orders/payments/classes/schedules/
//    discounts/enrollments) — فایل از backend ساخته و دانلود می‌شود؛
//    ⛔ هیچ رمز/هش/توکن/کلیدی در خروجی نیست
//  • Admin Activity: Audit Log append-only (actor/action/target/time/meta)
//  • Server Errors: خطاهای مهم backend با دسته/پیام امن/وضعیت/شناسهٔ رکورد
// امنیت: همهٔ APIها سشن ادمین + rate limit دارند.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin

interface AuditItem {
  id: string
  actor: string
  action: string
  targetType: string
  targetId: string
  meta: string
  createdAt: string
}

interface ErrorItem {
  id: string
  category: string
  message: string
  context: string
  statusCode: number | null
  refId: string | null
  createdAt: string
}

const EXPORT_TYPES: { type: string; label: string }[] = [
  { type: 'users', label: 'Users' },
  { type: 'orders', label: 'Orders' },
  { type: 'payments', label: 'Payments (events)' },
  { type: 'classes', label: 'Courses' },
  { type: 'enrollments', label: 'Enrollments' },
  { type: 'schedules', label: 'Scheduling' },
  { type: 'discounts', label: 'Discount Codes' },
]

const CATEGORY_STYLES: Record<string, string> = {
  PAYMENT: 'bg-butter text-brown',
  ORDER: 'bg-sage-light/50 text-sage-dark',
  AUTH: 'bg-peach-light/60 text-brown',
  BACKUP: 'bg-sage-light/50 text-sage-dark',
  RESTORE: 'bg-red-100 text-red-700',
  SERVER: 'bg-red-100 text-red-700',
  API: 'bg-neutral-200 text-neutral-600',
  DATABASE: 'bg-neutral-200 text-neutral-600',
  VALIDATION: 'bg-neutral-200 text-neutral-600',
}

const ACTION_STYLES: Record<string, string> = {
  'backup.restore': 'bg-red-100 text-red-700',
  'class.delete': 'bg-red-100 text-red-700',
  'discount.archive': 'bg-neutral-200 text-neutral-600',
  'credentials.update': 'bg-peach-light/60 text-brown',
  'wallet.save': 'bg-sage-light/50 text-sage-dark',
  'wallet.remove': 'bg-peach-light/60 text-brown',
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

function prettyMeta(meta: string): string {
  if (!meta || meta === '{}') return ''
  try {
    return Object.entries(JSON.parse(meta))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' · ')
  } catch {
    return meta
  }
}

export function LogsAdminTab({ token, onToast }: { token: string; onToast?: (m: string) => void }) {
  const [tab, setTab] = useState<'audit' | 'errors'>('audit')
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditPages, setAuditPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditAction, setAuditAction] = useState('')
  const [auditLoading, setAuditLoading] = useState(true)

  const [errorItems, setErrorItems] = useState<ErrorItem[]>([])
  const [errorPage, setErrorPage] = useState(1)
  const [errorPages, setErrorPages] = useState(1)
  const [errorTotal, setErrorTotal] = useState(0)
  const [errorCategory, setErrorCategory] = useState('')
  const [errorLoading, setErrorLoading] = useState(false)

  const [exporting, setExporting] = useState('')

  const loadAudit = useCallback(
    async (page: number) => {
      setAuditLoading(true)
      try {
        const q = auditAction ? `&action=${encodeURIComponent(auditAction)}` : ''
        const res = await fetch(`/api/admin/audit?page=${page}${q}`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
        if (res.status === 401) {
          onToast?.('Session expired — sign in again.')
          return
        }
        if (!res.ok) return
        const d = (await res.json()) as { items: AuditItem[]; total: number; pages: number }
        setAuditItems(d.items ?? [])
        setAuditTotal(d.total ?? 0)
        setAuditPages(d.pages ?? 1)
      } catch {
        onToast?.('Could not load the activity log.')
      } finally {
        setAuditLoading(false)
      }
    },
    [token, auditAction, onToast]
  )

  const loadErrors = useCallback(
    async (page: number) => {
      setErrorLoading(true)
      try {
        const q = errorCategory ? `&category=${encodeURIComponent(errorCategory)}` : ''
        const res = await fetch(`/api/admin/errors?page=${page}${q}`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
        if (!res.ok) return
        const d = (await res.json()) as { items: ErrorItem[]; total: number; pages: number }
        setErrorItems(d.items ?? [])
        setErrorTotal(d.total ?? 0)
        setErrorPages(d.pages ?? 1)
      } catch {
        onToast?.('Could not load the error log.')
      } finally {
        setErrorLoading(false)
      }
    },
    [token, errorCategory, onToast]
  )

  useEffect(() => {
    if (tab === 'audit') void loadAudit(auditPage)
  }, [tab, loadAudit, auditPage])

  useEffect(() => {
    if (tab === 'errors') void loadErrors(errorPage)
  }, [tab, loadErrors, errorPage])

  const downloadExport = async (type: string) => {
    setExporting(type)
    try {
      const res = await fetch(`/api/admin/export?type=${type}`, { headers: { 'x-admin-key': token } })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        onToast?.(d.error ?? 'Export failed.')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const m = /filename="([^"]+)"/.exec(cd)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = m?.[1] ?? `export-${type}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      onToast?.(`Export ${type} downloaded ✓`)
    } catch {
      onToast?.('Export failed — network error.')
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="animate-ct-fadeInUp">
      {/* ---------- 📤 خروجی CSV سمت سرور ---------- */}
      <section className="bg-white rounded-2xl border border-sage-light/20 p-5 mb-6" aria-label="Data export">
        <p className="text-sm font-bold text-brown-dark flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-sage-dark" /> Data Export (CSV)
        </p>
        <p className="text-xs text-brown-light mt-1 mb-4">
          Generated live on the server from the real database — never from data loaded in your browser. Passwords,
          password hashes, session tokens, private keys, wallet seeds and xprv are never included.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => downloadExport(t.type)}
              disabled={exporting !== ''}
              className="text-xs font-bold px-4 py-2.5 rounded-xl border border-sage-light/40 bg-white text-brown hover:border-sage hover:bg-sage-light/20 transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 min-h-[40px]"
            >
              {exporting === t.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- سوییچ Audit / Errors ---------- */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-xl border border-sage-light/40 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('audit')}
            aria-pressed={tab === 'audit'}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${tab === 'audit' ? 'bg-sage text-brown-dark' : 'text-brown hover:bg-cream'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Activity
          </button>
          <button
            type="button"
            onClick={() => setTab('errors')}
            aria-pressed={tab === 'errors'}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${tab === 'errors' ? 'bg-sage text-brown-dark' : 'text-brown hover:bg-cream'}`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Server Errors
          </button>
        </div>
        {tab === 'audit' ? (
          <input
            value={auditAction}
            onChange={(e) => {
              setAuditAction(e.target.value)
              setAuditPage(1)
            }}
            placeholder="Filter by action (e.g. discount.create)…"
            aria-label="Filter audit log by action"
            className="bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 max-w-xs"
          />
        ) : (
          <input
            value={errorCategory}
            onChange={(e) => {
              setErrorCategory(e.target.value.toUpperCase())
              setErrorPage(1)
            }}
            placeholder="Filter by category (e.g. PAYMENT)…"
            aria-label="Filter error log by category"
            className="bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 max-w-xs"
          />
        )}
      </div>

      {tab === 'audit' ? (
        <section className="bg-white rounded-2xl border border-sage-light/20 p-5" aria-label="Admin activity log">
          <p className="text-xs text-brown-light mb-3 flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5" /> Append-only history of important admin actions — records are never
            edited or deleted. <span className="tabular-nums">({auditTotal})</span>
          </p>
          {auditLoading && auditItems.length === 0 ? (
            <p className="text-xs text-brown-light py-6 text-center">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> Loading…
            </p>
          ) : auditItems.length === 0 ? (
            <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-4">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1 ct-scroll-area">
              {auditItems.map((it) => (
                <li key={it.id} className="bg-cream/50 border border-sage-light/20 rounded-xl px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_STYLES[it.action] ?? 'bg-sage-light/40 text-sage-dark'}`}>
                      {it.action}
                    </span>
                    <span className="text-xs font-bold text-brown-dark">{it.actor}</span>
                    <span className="text-[11px] text-brown-light">→ {it.targetType}</span>
                    {it.targetId && <span className="text-[11px] font-mono text-brown truncate max-w-52">{it.targetId}</span>}
                    <span className="ml-auto text-[10px] text-brown-light/80 tabular-nums">{fmt(it.createdAt)}</span>
                  </div>
                  {prettyMeta(it.meta) && <p className="text-[10px] text-brown-light/90 mt-1.5 break-all">{prettyMeta(it.meta)}</p>}
                </li>
              ))}
            </ul>
          )}
          <Pager page={auditPage} pages={auditPages} onPage={setAuditPage} />
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-sage-light/20 p-5" aria-label="Server error log">
          <p className="text-xs text-brown-light mb-3">
            Important backend failures (API, database, payment verification, backups, auth…). Messages are sanitized
            server-side — they never contain passwords, tokens, keys or raw stack traces.{' '}
            <span className="tabular-nums">({errorTotal})</span>
          </p>
          {errorLoading && errorItems.length === 0 ? (
            <p className="text-xs text-brown-light py-6 text-center">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> Loading…
            </p>
          ) : errorItems.length === 0 ? (
            <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-4">
              No errors recorded — the system is healthy. 🎉
            </p>
          ) : (
            <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1 ct-scroll-area">
              {errorItems.map((e) => {
                let ctx = ''
                try {
                  ctx = Object.entries(JSON.parse(e.context || '{}'))
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(' · ')
                } catch {
                  ctx = e.context
                }
                return (
                  <li key={e.id} className="bg-cream/50 border border-sage-light/20 rounded-xl px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[e.category] ?? 'bg-neutral-200 text-neutral-600'}`}>
                        {e.category}
                      </span>
                      {e.statusCode != null && (
                        <span className="text-[10px] font-bold text-brown-light">HTTP {e.statusCode}</span>
                      )}
                      {e.refId && <span className="text-[11px] font-mono text-brown">{e.refId}</span>}
                      <span className="ml-auto text-[10px] text-brown-light/80 tabular-nums">{fmt(e.createdAt)}</span>
                    </div>
                    <p className="text-xs text-brown-dark mt-1.5 break-words">{e.message}</p>
                    {ctx && <p className="text-[10px] text-brown-light/90 mt-1 break-all">{ctx}</p>}
                  </li>
                )
              })}
            </ul>
          )}
          <Pager page={errorPage} pages={errorPages} onPage={setErrorPage} />
        </section>
      )}
    </div>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 mt-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
        className="p-2 rounded-lg border border-sage-light/40 text-brown disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:border-sage"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-brown-light tabular-nums">
        {page} / {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
        className="p-2 rounded-lg border border-sage-light/40 text-brown disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:border-sage"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
