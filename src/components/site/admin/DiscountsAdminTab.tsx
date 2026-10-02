'use client'

// ---------------------------------------------------------------------------
// 🎟️ تب Discounts پنل ادمین — کدهای تخفیف + پله‌های خودکار بسته (فاز ۴۷)
//
// همهٔ محاسبات سمت سرور است؛ اینجا فقط مدیریت پیکربندی است:
//  • کدها: /api/discounts (GET/POST) + /api/discounts/[id] (PATCH/DELETE)
//  • پله‌های بسته: /api/discounts/tiers (GET/PUT)
//  • فهرست کلاس‌ها برای scope: /api/admin/classes
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  TicketPercent,
  SearchX,
  Tag,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin.discounts
const LEVELS = siteContent.register.levels

interface DiscountItem {
  id: string
  code: string
  type: string
  value: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
  classIds: string
  classTypes: string
  levels: string
  minSessions: number
  maxUses: number | null
  perCustomer: number
  note: string
  usedCount: number
  usedAmount: number
  createdAt: string
}

export type { DiscountItem }

interface TierRow {
  min: string
  max: string // '' = بدون سقف
  percent: string
}

interface ClassLite {
  id: string
  title: string
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export function DiscountsAdminTab({
  items,
  token,
  onToast,
  onChanged,
}: {
  items: DiscountItem[]
  token: string
  onToast?: (m: string) => void
  onChanged?: () => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  // 🎟️ فاز ۵۰ (بند ۱۳) — فیلتر نوع + مرتب‌سازی
  const [typeFilter, setTypeFilter] = useState<'all' | 'percent' | 'fixed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'expiring'>('newest')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DiscountItem | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // 🗄️ فاز ۵۲ — بایگانی (حذف نرم)
  const [archived, setArchived] = useState<DiscountItem[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [topError, setTopError] = useState('')
  const [classOptions, setClassOptions] = useState<ClassLite[]>([])

  // پله‌های بسته
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [tiersBusy, setTiersBusy] = useState(false)

  // فرم
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState('')
  const [active, setActive] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [scopeClassIds, setScopeClassIds] = useState<string[]>([])
  const [scopeTypes, setScopeTypes] = useState<string[]>([])
  const [scopeLevels, setScopeLevels] = useState<string[]>([])
  const [minSessions, setMinSessions] = useState('1')
  const [maxUses, setMaxUses] = useState('')
  const [perCustomer, setPerCustomer] = useState('1')
  const [note, setNote] = useState('')

  useEffect(() => {
    // فهرست کلاس‌ها برای انتخاب scope
    fetch('/api/admin/classes', { headers: { 'x-admin-key': token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rows = d?.classes ?? []
        setClassOptions(rows.map((r: { id: string; title: string }) => ({ id: r.id, title: r.title })))
      })
      .catch(() => {})
    // پله‌های فعلی
    fetch('/api/discounts/tiers', { headers: { 'x-admin-key': token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = d?.tiers
        if (Array.isArray(t)) {
          setTiers(
            t.map((x: { min: number; max: number | null; percent: number }) => ({
              min: String(x.min),
              max: x.max === null ? '' : String(x.max),
              percent: String(x.percent),
            }))
          )
        }
      })
      .catch(() => {})
  }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = items.filter((d) => {
      const inSearch =
        q === '' || d.code.toLowerCase().includes(q) || d.note.toLowerCase().includes(q)
      const inStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? d.active : !d.active)
      const inType = typeFilter === 'all' || d.type === typeFilter
      return inSearch && inStatus && inType
    })
    const endTs = (d: DiscountItem) => (d.endsAt ? new Date(d.endsAt).getTime() : Number.POSITIVE_INFINITY)
    if (sortBy === 'newest') out.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
    if (sortBy === 'oldest') out.sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime())
    if (sortBy === 'expiring') out.sort((x, y) => endTs(x) - endTs(y))
    return out
  }, [items, query, statusFilter, typeFilter, sortBy])

  const openNew = () => {
    setEditing(null)
    setCode('')
    setType('percent')
    setValue('')
    setActive(true)
    setStartsAt('')
    setEndsAt('')
    setScopeClassIds([])
    setScopeTypes([])
    setScopeLevels([])
    setMinSessions('1')
    setMaxUses('')
    setPerCustomer('1')
    setNote('')
    setTopError('')
    setDialogOpen(true)
  }

  const openEdit = (d: DiscountItem) => {
    setEditing(d)
    setCode(d.code)
    setType(d.type === 'fixed' ? 'fixed' : 'percent')
    setValue(String(d.value))
    setActive(d.active)
    setStartsAt(toDatetimeLocal(d.startsAt))
    setEndsAt(toDatetimeLocal(d.endsAt))
    setScopeClassIds(parseJsonArray(d.classIds))
    setScopeTypes(parseJsonArray(d.classTypes))
    setScopeLevels(parseJsonArray(d.levels))
    setMinSessions(String(d.minSessions))
    setMaxUses(d.maxUses === null ? '' : String(d.maxUses))
    setPerCustomer(String(d.perCustomer))
    setNote(d.note)
    setTopError('')
    setDialogOpen(true)
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    setTopError('')
    try {
      const iso = (v: string): string | null => {
        if (!v) return null
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? null : d.toISOString()
      }
      const body = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value) || 0,
        active,
        startsAt: iso(startsAt),
        endsAt: iso(endsAt),
        classIds: scopeClassIds,
        classTypes: scopeTypes,
        levels: scopeLevels,
        minSessions: Math.max(1, Math.floor(Number(minSessions) || 1)),
        maxUses: maxUses.trim() === '' ? null : Math.max(1, Math.floor(Number(maxUses) || 1)),
        perCustomer: Math.max(1, Math.floor(Number(perCustomer) || 1)),
        note: note.trim(),
      }
      const res = await fetch(editing ? `/api/discounts/${editing.id}` : '/api/discounts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setTopError(res.status === 401 ? 'Session expired — please log in again.' : data.error || a.networkError)
        return
      }
      onToast?.(editing ? a.saveSuccess : a.createSuccess)
      setDialogOpen(false)
      onChanged?.()
    } catch {
      setTopError(a.networkError)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (d: DiscountItem) => {
    try {
      const res = await fetch(`/api/discounts/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ active: !d.active }),
      })
      if (!res.ok) {
        onToast?.(a.networkError)
        return
      }
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    }
  }

  const doDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id)
      window.setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 4000)
      return
    }
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
      if (!res.ok) {
        // 🎟️ فاز ۵۰ (بند ۱۱) — کدِ استفاده‌شده سخت‌حذف نمی‌شود؛ راهنمای شفاف:
        onToast?.(data?.code === 'CODE_IN_USE' ? a.deleteInUse : data?.error || a.networkError)
        setConfirmId(null)
        return
      }
      onToast?.(a.archivedToast)
      setConfirmId(null)
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    }
  }

  // 🗄️ فاز ۵۲ — بارگذاری بایگانی + بازگرداندن از حذف نرم
  const loadArchived = async () => {
    setArchivedLoading(true)
    try {
      const res = await fetch('/api/discounts?archived=1', { headers: { 'x-admin-key': token } })
      const data = (await res.json().catch(() => ({}))) as { discounts?: DiscountItem[] }
      setArchived(Array.isArray(data.discounts) ? data.discounts : [])
    } catch {
      setArchived([])
    } finally {
      setArchivedLoading(false)
    }
  }

  const doRestore = async (id: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ restore: true }),
      })
      if (res.ok) {
        onToast?.(a.archiveRestored)
        await loadArchived()
        onChanged?.()
      } else {
        onToast?.(a.networkError)
      }
    } catch {
      onToast?.(a.networkError)
    } finally {
      setRestoringId(null)
    }
  }

  const saveTiers = async () => {
    setTiersBusy(true)
    try {
      const clean = tiers
        .map((t) => ({
          min: Math.max(1, Math.floor(Number(t.min) || 0)),
          max: t.max.trim() === '' ? null : Math.floor(Number(t.max)),
          percent: Math.round((Number(t.percent) || 0) * 100) / 100,
        }))
        .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.percent))
      const res = await fetch('/api/discounts/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ tiers: clean }),
      })
      if (!res.ok) {
        onToast?.(a.networkError)
        return
      }
      onToast?.(a.tiersSaved)
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    } finally {
      setTiersBusy(false)
    }
  }

  const classTitleOf = (id: string) => classOptions.find((c) => c.id === id)?.title ?? id

  return (
    <div>
      {/* ---------- پله‌های تخفیف خودکار بسته ---------- */}
      <div className="rounded-2xl border border-sage/40 bg-sage-light/20 p-4 mb-5">
        <p className="text-sm font-bold text-brown-dark mb-1">{a.tiersTitle}</p>
        <p className="text-xs text-brown-light mb-3">{a.tiersHint}</p>
        <div className="space-y-2">
          {tiers.map((t, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-brown-light w-24">{a.tierMin}</span>
              <input
                type="number"
                min="1"
                value={t.min}
                onChange={(e) => setTiers((prev) => prev.map((x, i) => (i === idx ? { ...x, min: e.target.value } : x)))}
                className={`${inputCls} max-w-[90px]`}
                aria-label={`${a.tierMin} ${idx + 1}`}
              />
              <span className="text-[11px] text-brown-light w-24">{a.tierMax}</span>
              <input
                type="number"
                min="1"
                placeholder={a.tierMaxEmpty}
                value={t.max}
                onChange={(e) => setTiers((prev) => prev.map((x, i) => (i === idx ? { ...x, max: e.target.value } : x)))}
                className={`${inputCls} max-w-[90px]`}
                aria-label={`${a.tierMax} ${idx + 1}`}
              />
              <span className="text-[11px] text-brown-light w-20">{a.tierPercent}</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={t.percent}
                onChange={(e) => setTiers((prev) => prev.map((x, i) => (i === idx ? { ...x, percent: e.target.value } : x)))}
                className={`${inputCls} max-w-[90px]`}
                aria-label={`${a.tierPercent} ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => setTiers((prev) => prev.filter((_, i) => i !== idx))}
                className="text-xs text-brown-light hover:text-red-500 cursor-pointer px-2"
              >
                {a.removeTier}
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => setTiers((prev) => [...prev, { min: '', max: '', percent: '' }])}
            className="text-xs font-semibold text-sage-dark hover:text-brown-dark cursor-pointer"
          >
            {a.addTier}
          </button>
          <button
            type="button"
            onClick={saveTiers}
            disabled={tiersBusy}
            className="bg-sage text-brown-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 min-h-[36px] inline-flex items-center gap-1.5"
          >
            {tiersBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {a.tiersSave}
          </button>
        </div>
      </div>

      {/* ---------- کدهای تخفیف ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 flex-1 min-w-[240px]">
          {a.subtitle}
        </p>
        <button
          onClick={openNew}
          className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-all cursor-pointer flex-shrink-0"
        >
          {a.newButton}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={a.searchPlaceholder}
          aria-label={a.searchPlaceholder}
          className={`${inputCls} max-w-xs`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className={`${inputCls} max-w-[160px]`}
          aria-label="Status filter"
        >
          <option value="all">All statuses</option>
          <option value="active">{a.badgeActive}</option>
          <option value="inactive">{a.badgeInactive}</option>
        </select>
        {/* 🎟️ فاز ۵۰ — فیلتر نوع تخفیف */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'percent' | 'fixed')}
          className={`${inputCls} max-w-[190px]`}
          aria-label="Discount type filter"
        >
          <option value="all">{a.typeAll}</option>
          <option value="percent">{a.typePercent}</option>
          <option value="fixed">{a.typeFixed}</option>
        </select>
        {/* 🎟️ فاز ۵۰ — مرتب‌سازی (تاریخ ساخت / انقضا) */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'expiring')}
          className={`${inputCls} max-w-[190px]`}
          aria-label={a.sortLabel}
        >
          <option value="newest">{a.sortNewest}</option>
          <option value="oldest">{a.sortOldest}</option>
          <option value="expiring">{a.sortExpiring}</option>
        </select>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 ct-scroll-area">
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
            <TicketPercent className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
            <p className="text-sm text-brown-light">{a.empty}</p>
          </div>
        )}
        {filtered.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl border border-sage-light/20 p-4 hover:border-sage/40 transition-colors">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-sm font-mono font-bold text-brown-dark bg-cream px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" /> {d.code}
              </span>
              <span className="text-[10px] font-bold bg-sage-light/30 text-sage-dark px-2 py-0.5 rounded-full">
                {d.type === 'fixed' ? `$${d.value.toFixed(2)} off` : `${d.value}% off`}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  d.active ? 'bg-sage text-brown-dark' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {d.active ? a.badgeActive : a.badgeInactive}
              </span>
              <span className="ml-auto text-[11px] text-brown-light">
                {a.usedOf
                  .replace('{used}', String(d.usedCount))
                  .replace('{of}', d.maxUses !== null ? a.ofPart.replace('{max}', String(d.maxUses)) : '')}
                {d.usedCount > 0 && ` · $${d.usedAmount.toFixed(2)}`}
              </span>
            </div>
            <p className="text-xs text-brown-light">
              {a.appliesTo}:{' '}
              {(() => {
                const ids = parseJsonArray(d.classIds)
                const types = parseJsonArray(d.classTypes)
                const levels = parseJsonArray(d.levels)
                const parts: string[] = []
                parts.push(ids.length === 0 ? a.allClasses : ids.map(classTitleOf).join(', '))
                if (types.length > 0) parts.push(types.join('/'))
                if (levels.length > 0) parts.push(levels.map((l) => (l === 'all' ? 'All levels' : LEVELS.find((x) => x.key === l)?.label ?? l)).join('/'))
                if (d.minSessions > 1) parts.push(`min ${d.minSessions} sessions`)
                if (d.startsAt) parts.push(`${a.startsAtPrefix} ${new Date(d.startsAt).toLocaleDateString()}`)
                if (d.endsAt) parts.push(`until ${new Date(d.endsAt).toLocaleDateString()}`)
                if (d.perCustomer > 1) parts.push(a.perCustomerShort.replace('{n}', String(d.perCustomer)))
                return parts.join(' · ')
              })()}
              {d.note && <span className="ml-2 italic">— {d.note}</span>}
            </p>
            <p className="text-[11px] text-brown-light/80 mt-1">
              {a.createdPrefix} {new Date(d.createdAt).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-sage-light/15">
              <button
                type="button"
                onClick={() => toggleActive(d)}
                aria-pressed={d.active}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  d.active ? 'bg-butter/40 text-brown hover:bg-butter/60' : 'bg-sage text-brown-dark hover:bg-sage-dark'
                }`}
              >
                {d.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => openEdit(d)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                aria-label={`Edit — ${d.code}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              {confirmId === d.id ? (
                <button
                  type="button"
                  onClick={() => doDelete(d.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[32px]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {a.confirmYes}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => doDelete(d.id)}
                  aria-label={`${a.deleteConfirm} — ${d.code}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-sage-light/50">
            <SearchX className="w-9 h-9 mx-auto mb-2 text-brown-light/50" />
            <p className="text-sm text-brown-light">{a.searchPlaceholder}</p>
          </div>
        )}
      </div>

      {/* ---------- 🗄️ بایگانی (حذف نرم) — بند ۹ فاز ۵۲ ---------- */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-brown-dark inline-flex items-center gap-2">
            <Archive className="w-4 h-4 text-neutral-500" aria-hidden="true" />
            {a.archiveTitle}
            {archived.length > 0 && (
              <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full tabular-nums">
                {archived.length}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = !showArchived
              setShowArchived(next)
              if (next) void loadArchived()
            }}
            aria-expanded={showArchived}
            className="text-xs font-bold px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-brown hover:border-sage transition-colors cursor-pointer min-h-[36px]"
          >
            {showArchived ? a.archiveHide : a.archiveShow}
          </button>
        </div>
        <p className="text-xs text-brown-light mt-1">{a.archiveHint}</p>
        {showArchived && (
          <ul className="mt-3 space-y-2">
            {archivedLoading && (
              <li className="text-xs text-brown-light flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading…
              </li>
            )}
            {!archivedLoading && archived.length === 0 && (
              <li className="text-xs text-brown-light py-2">{a.archiveEmpty}</li>
            )}
            {!archivedLoading &&
              archived.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2.5"
                >
                  <span className="text-xs font-mono font-bold text-brown-dark">{d.code}</span>
                  <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">
                    {a.archivedBadge}
                  </span>
                  <span className="text-[11px] text-brown-light">
                    {a.usedOf.replace('{used}', String(d.usedCount)).replace('{of}', '')}
                  </span>
                  <span className="ml-auto text-[11px] text-brown-light/80">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => doRestore(d.id)}
                    disabled={restoringId === d.id}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-sage text-brown-dark hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 min-h-[32px]"
                  >
                    {restoringId === d.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    )}
                    {a.archiveRestore}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* ---------- دیالوگ ایجاد/ویرایش ---------- */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !busy && setDialogOpen(v)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? a.editDialogTitle : a.newDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {topError && (
              <p role="alert" className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                {topError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dc-code" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.codeLabel}
                </label>
                <input
                  id="dc-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={a.codePh}
                  maxLength={24}
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>
              <div>
                <label htmlFor="dc-type" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.typeLabel}
                </label>
                <select id="dc-type" value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')} className={inputCls}>
                  <option value="percent">{a.typePercent}</option>
                  <option value="fixed">{a.typeFixed}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="dc-value" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.valueLabel}
                </label>
                <input
                  id="dc-value"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'fixed' ? '20' : '15'}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="dc-minsessions" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.minSessionsLabel}
                </label>
                <input
                  id="dc-minsessions"
                  type="number"
                  min="1"
                  value={minSessions}
                  onChange={(e) => setMinSessions(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="dc-percustomer" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.perCustomerLabel}
                </label>
                <input
                  id="dc-percustomer"
                  type="number"
                  min="1"
                  value={perCustomer}
                  onChange={(e) => setPerCustomer(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dc-starts" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.startsAtLabel}
                </label>
                <input id="dc-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="dc-ends" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.endsAtLabel}
                </label>
                <input id="dc-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label htmlFor="dc-maxuses" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                {a.maxUsesLabel}
              </label>
              <input id="dc-maxuses" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={inputCls} />
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">{a.scopeClasses}</span>
              <div className="max-h-28 overflow-y-auto ct-scroll-area rounded-xl border border-sage-light/40 bg-white p-2 space-y-1">
                {classOptions.length === 0 && <p className="text-xs text-brown-light px-1">—</p>}
                {classOptions.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-brown px-1 py-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeClassIds.includes(c.id)}
                      onChange={(e) =>
                        setScopeClassIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                      }
                      className="accent-[#A8C9A0]"
                    />
                    {c.title}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">{a.classTypesLabel}</span>
                <div className="space-y-1">
                  {['group', 'private'].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-xs text-brown cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeTypes.includes(t)}
                        onChange={(e) =>
                          setScopeTypes((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                        }
                        className="accent-[#A8C9A0]"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">{a.levelsLabel}</span>
                <div className="max-h-24 overflow-y-auto ct-scroll-area space-y-1">
                  {LEVELS.map((l) => (
                    <label key={l.key} className="flex items-center gap-2 text-xs text-brown cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeLevels.includes(l.key)}
                        onChange={(e) =>
                          setScopeLevels((prev) => (e.target.checked ? [...prev, l.key] : prev.filter((x) => x !== l.key)))
                        }
                        className="accent-[#A8C9A0]"
                      />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="dc-note" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                {a.noteLabel}
              </label>
              <input id="dc-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={inputCls} />
            </div>
            <div className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-bold text-brown-dark">{a.activeLabel}</p>
                <p className="text-[11px] text-brown-light">{a.activeHint}</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} aria-label={a.activeLabel} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
                className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center gap-1.5"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {busy ? a.saving : a.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
