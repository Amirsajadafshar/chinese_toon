'use client'

// ---------------------------------------------------------------------------
// ❓ تب FAQ پنل ادمین — مدیریت کامل سؤالات متداول (فاز ۴۶)
//
// منبع حقیقت = جدول FaqItem از طریق /api/faq (GET/POST/PATCH/DELETE با
// x-admin-key — امنیت سمت سرور است، اینجا فقط UX).
// امکانات: جست‌وجو، افزودن، ویرایش، حذف با تأیید دومرحله‌ای، تغییر ترتیب
// (جابه‌جایی با همسایه)، انتشار/پیش‌نویس.
// پس از هر mutation موفق، onChanged صدا زده می‌شود تا والد دادهٔ تازه بخواند.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import {
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  ChevronUp,
  ChevronDown,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin.faq
// 🗄️ کلیدهای بایگانی/بازگردانی در سطح مشترک admin — بین تب‌ها یکسان
const arch = siteContent.admin

export interface AdminFaqItem {
  id: string
  category: string
  question: string
  answer: string
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

interface FaqAdminTabProps {
  items: AdminFaqItem[]
  /** 🗄️ بایگانی‌شده‌ها (حذف نرم) — با دکمهٔ بازگردانی */
  archived?: AdminFaqItem[]
  token: string
  onToast?: (m: string) => void
  onChanged?: () => void
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

const cardCls = 'bg-white rounded-2xl border border-sage-light/20 p-4 hover:border-sage/40 transition-colors'

// کلیدهای دسته از فیلترهای عمومی صفحهٔ Support + هر کلید دیگری که در DB هست
function categoryOptions(items: AdminFaqItem[]): { key: string; label: string }[] {
  const fixed = siteContent.support.faq.categories.filter((c) => c.key !== 'all')
  const extra = [...new Set(items.map((i) => i.category))]
    .filter((k) => !fixed.some((f) => f.key === k))
    .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))
  return [...fixed, ...extra]
}

function labelOf(options: { key: string; label: string }[], key: string): string {
  return options.find((o) => o.key === key)?.label ?? key
}

export function FaqAdminTab({ items, archived, token, onToast, onChanged }: FaqAdminTabProps) {
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminFaqItem | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [topError, setTopError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  // فرم
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('general')
  const [sortOrder, setSortOrder] = useState(0)
  const [published, setPublished] = useState(true)

  const options = useMemo(() => categoryOptions(items), [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }, [items, query])

  const openNew = () => {
    setEditing(null)
    setQuestion('')
    setAnswer('')
    setCategory('general')
    setSortOrder(items.length + 1)
    setPublished(true)
    setFields({})
    setTopError('')
    setDialogOpen(true)
  }

  const openEdit = (f: AdminFaqItem) => {
    setEditing(f)
    setQuestion(f.question)
    setAnswer(f.answer)
    setCategory(f.category)
    setSortOrder(f.sortOrder)
    setPublished(f.published)
    setFields({})
    setTopError('')
    setDialogOpen(true)
  }

  const save = async () => {
    if (busy) return
    // اعتبارسنجی سریع سمت کلاینت — داور نهایی سرور است
    const errs: Record<string, string> = {}
    if (question.trim().length < 3) errs.question = 'Question is required (3–300 chars)'
    if (answer.trim().length < 3) errs.answer = 'Answer is required (3–2000 chars)'
    if (!/^[a-z0-9-]{2,40}$/.test(category.trim())) errs.category = 'Pick a category'
    setFields(errs)
    setTopError('')
    if (Object.keys(errs).length > 0) return

    setBusy(true)
    try {
      const res = await fetch('/api/faq', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(
          editing
            ? { id: editing.id, question, answer, category, sortOrder, published }
            : { question, answer, category, sortOrder, published }
        ),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        details?: { fieldErrors?: Record<string, string[]> }
      }
      if (!res.ok) {
        if (res.status === 401) setTopError('Session expired — please log in again.')
        else if (data.details?.fieldErrors) {
          const fe = data.details.fieldErrors
          setFields(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v.join(' ')])))
          setTopError('Please fix the highlighted fields.')
        } else setTopError(a.networkError)
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

  // حذف دومرحله‌ای — کلیک اول تأیید می‌خواهد، ۴ ثانیه بعد حالت تأیید ریست می‌شود
  const requestDelete = (id: string) => {
    if (confirmId === id) return true // قبلاً تأیید شده
    setConfirmId(id)
    window.setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 4000)
    return false
  }

  const doDelete = async (id: string) => {
    if (actionBusy) return
    if (!requestDelete(id)) return
    setActionBusy(id)
    try {
      const res = await fetch('/api/faq', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        onToast?.(a.networkError)
        return
      }
      onToast?.(a.deleteConfirm.replace('Delete this question? This cannot be undone.', 'Deleted ✓'))
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    } finally {
      setConfirmId(null)
      setActionBusy(null)
    }
  }

  const togglePublished = async (f: AdminFaqItem) => {
    if (actionBusy) return
    setActionBusy(f.id)
    try {
      const res = await fetch('/api/faq', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id: f.id, published: !f.published }),
      })
      if (!res.ok) {
        onToast?.(a.networkError)
        return
      }
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    } finally {
      setActionBusy(null)
    }
  }

  // 🗄️ بازگردانی از بایگانی (حذف نرم فاز ۵۵)
  const restore = async (id: string) => {
    if (actionBusy) return
    setActionBusy(id)
    try {
      const res = await fetch('/api/faq', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id, restore: true }),
      })
      if (!res.ok) {
        onToast?.(a.networkError)
        return
      }
      onToast?.(arch.restoreSuccess)
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    } finally {
      setActionBusy(null)
    }
  }

  // تغییر ترتیب با جابه‌جایی sortOrder دو همسایه در همان فهرست مرتب
  const move = async (idx: number, dir: -1 | 1) => {
    if (actionBusy) return
    const target = filtered[idx]
    const neighbor = filtered[idx + dir]
    if (!target || !neighbor) return
    setActionBusy(target.id)
    try {
      const patch = (id: string, sortOrder: number) =>
        fetch('/api/faq', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
          body: JSON.stringify({ id, sortOrder }),
        })
      const [r1, r2] = await Promise.all([
        patch(target.id, neighbor.sortOrder),
        patch(neighbor.id, target.sortOrder),
      ])
      if (!r1.ok || !r2.ok) {
        onToast?.(a.networkError)
        return
      }
      onChanged?.()
    } catch {
      onToast?.(a.networkError)
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div>
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

      {/* جست‌وجو */}
      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={a.searchPlaceholder}
          aria-label={a.searchPlaceholder}
          className={inputCls}
        />
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 ct-scroll-area">
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
            <p className="text-sm text-brown-light">{a.empty}</p>
          </div>
        )}
        {filtered.map((f, idx) => (
          <div key={f.id} className={cardCls}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-brown-light bg-cream px-1.5 py-0.5 rounded">
                #{f.sortOrder}
              </span>
              <span className="text-[10px] font-bold bg-sage-light/30 text-sage-dark px-2 py-0.5 rounded-full">
                {labelOf(options, f.category)}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  f.published ? 'bg-sage text-brown-dark' : 'bg-butter text-brown'
                }`}
              >
                {f.published ? a.badgePublished : a.badgeDraft}
              </span>
              <span className="ml-auto flex items-center gap-1">
                {/* تغییر ترتیب */}
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || actionBusy === f.id}
                  title={a.moveUp}
                  aria-label={`${a.moveUp} — ${f.question}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === filtered.length - 1 || actionBusy === f.id}
                  title={a.moveDown}
                  aria-label={`${a.moveDown} — ${f.question}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {/* انتشار سریع */}
                <button
                  type="button"
                  onClick={() => togglePublished(f)}
                  disabled={actionBusy === f.id}
                  aria-pressed={f.published}
                  title={f.published ? a.badgePublished : a.badgeDraft}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
                    f.published
                      ? 'text-sage-dark bg-sage-light/20 hover:bg-sage-light/40'
                      : 'text-brown-light/60 hover:text-brown hover:bg-butter/20'
                  }`}
                >
                  {actionBusy === f.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <HelpCircle className="w-4 h-4" />
                  )}
                </button>
                {/* ویرایش */}
                <button
                  type="button"
                  onClick={() => openEdit(f)}
                  title={siteContent.admin.editPost}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                  aria-label={`${siteContent.admin.editPost} — ${f.question}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {/* حذف دومرحله‌ای */}
                {confirmId === f.id ? (
                  <button
                    type="button"
                    onClick={() => doDelete(f.id)}
                    disabled={actionBusy === f.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 min-h-[32px]"
                  >
                    {actionBusy === f.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {a.confirmYes}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => requestDelete(f.id)}
                    title={a.deleteConfirm}
                    aria-label={`${a.deleteConfirm} — ${f.question}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </span>
            </div>
            <p className="text-sm font-semibold text-brown-dark">{f.question}</p>
            <p className="text-xs text-brown-light mt-1 line-clamp-2">{f.answer}</p>
            {/* ℹ️ فاز ۵۸ — شمارنده‌های رأی Like/Dislike به درخواست مالک حذف شدند */}
          </div>
        ))}
        {items.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-sage-light/50">
            <SearchX className="w-9 h-9 mx-auto mb-2 text-brown-light/50" />
            <p className="text-sm text-brown-light">{a.searchPlaceholder}</p>
          </div>
        )}
      </div>

      {/* ---------- 🗄️ بایگانی (حذف نرم) — بازگردانی بدون پاک‌شدن همیشگی ---------- */}
      {archived && archived.length > 0 && (
        <details className="mt-5 bg-cream/60 rounded-2xl border border-sage-light/20">
          <summary className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-brown cursor-pointer select-none">
            <Archive className="w-4 h-4" aria-hidden="true" />
            {arch.archiveTitle} · <span className="tabular-nums">{archived.length}</span>
          </summary>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-[11px] text-brown-light">{arch.archiveHint}</p>
            {archived.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-sage-light/20 px-3.5 py-2.5 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brown-dark truncate">{f.question}</p>
                  <p className="text-[10px] text-brown-light mt-0.5">
                    {labelOf(options, f.category)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restore(f.id)}
                  disabled={actionBusy === f.id}
                  className="inline-flex items-center gap-1.5 bg-sage text-brown-dark px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 min-h-[32px] flex-shrink-0"
                >
                  {actionBusy === f.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {arch.restoreButton}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

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
            <div>
              <label htmlFor="faq-question" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                {a.questionLabel}
              </label>
              <input
                id="faq-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={a.questionPh}
                maxLength={300}
                className={inputCls}
              />
              {fields.question && <p className="text-[11px] text-red-600 mt-1">{fields.question}</p>}
            </div>
            <div>
              <label htmlFor="faq-answer" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                {a.answerLabel}
              </label>
              <textarea
                id="faq-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={a.answerPh}
                maxLength={2000}
                rows={5}
                className={`${inputCls} resize-none`}
              />
              {fields.answer && <p className="text-[11px] text-red-600 mt-1">{fields.answer}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="faq-category" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.categoryLabel}
                </label>
                <select
                  id="faq-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fields.category && <p className="text-[11px] text-red-600 mt-1">{fields.category}</p>}
              </div>
              <div>
                <label htmlFor="faq-order" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
                  {a.orderLabel}
                </label>
                <input
                  id="faq-order"
                  type="number"
                  min={0}
                  max={10000}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className={inputCls}
                />
                <p className="text-[11px] text-brown-light mt-1">{a.orderHint}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-bold text-brown-dark">{a.publishedLabel}</p>
                <p className="text-[11px] text-brown-light">{a.publishedHint}</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} aria-label={a.publishedLabel} />
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
