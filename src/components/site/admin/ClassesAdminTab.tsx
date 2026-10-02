'use client'

// ---------------------------------------------------------------------------
// 🎓 تب Classes پنل ادمین — مدیریت کامل کلاس‌ها (فاز ۴۲)
//
// این کامپوننت مستقل است و همهٔ کارها را با API سرور انجام می‌دهد:
//   GET/POST   /api/admin/classes        فهرست + ایجاد
//   GET/PUT/PATCH/DELETE /api/admin/classes/[id]
//   POST       /api/admin/classes/[id]/duplicate
// امنیت سمت سرور است (x-admin-key) — اینجا فقط UX است.
// پیش‌نمایش (Preview) از همان کامپوننت بدنهٔ دیالوگ عمومی (ClassDetailContent)
// استفاده می‌کند تا ادمین دقیقاً همان نمای عمومی را ببیند.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
  GraduationCap,
  Star,
  Ban,
  ExternalLink,
  Wand2,
  SearchX,
  ImagePlus,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { siteContent } from '@/content/site-content'
import { SUPPORTED_TIMEZONES, timezoneLabel } from '@/lib/timezones'
import { ClassDetailContent, type PublicClassItem } from '@/components/site/pages/ClassesPage'

const a = siteContent.admin.classes
const REGISTER_LEVELS = siteContent.register.levels // {key,label}[]
const CATEGORY_KEYS = siteContent.classes.filters.filter((f) => f.key !== 'all')
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// شکل ردیف DB (همان که API ادمین می‌دهد — تاریخ‌ها رشتهٔ ISO)
interface AdminClassRow {
  id: string
  slug: string
  productId: string
  title: string
  shortDescription: string
  fullDescription: string
  category: string
  status: string
  featured: boolean
  color: string
  classType: string
  level: string
  registerLevels: string // JSON
  currency: string
  pricePerSession: number
  packageSessions: number
  packagePrice: number
  priceNote: string
  sessionDurationMin: number | null
  format: string
  maxStudents: number | null
  minStudents: number | null
  schedule: string
  startDate: string | null
  endDate: string | null
  timezone: string
  meta: string // JSON
  highlights: string // JSON
  requirements: string
  audience: string
  curriculum: string
  materials: string
  notes: string
  image: string
  videoUrl: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const STATUSES = ['active', 'inactive', 'draft', 'full', 'archived'] as const
type StatusKey = (typeof STATUSES)[number]

function statusLabel(s: string): string {
  switch (s) {
    case 'active':
      return a.statusActive
    case 'inactive':
      return a.statusInactive
    case 'draft':
      return a.statusDraft
    case 'full':
      return a.statusFull
    case 'archived':
      return a.statusArchived
    default:
      return s
  }
}

function statusBadgeCls(s: string): string {
  switch (s) {
    case 'active':
      return 'bg-sage/20 text-sage-dark'
    case 'full':
      return 'bg-butter/40 text-brown'
    case 'draft':
      return 'bg-white border border-dashed border-sage/50 text-sage-dark'
    case 'inactive':
      return 'bg-neutral-200 text-neutral-600'
    default:
      return 'bg-peach/30 text-brown'
  }
}

function typeLabel(t: string): string {
  if (t === 'private') return a.typePrivate
  if (t === 'both') return a.typeBoth
  return a.typeGroup
}

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function parseJsonMeta(s: string): { icon: string; text: string }[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// حالت فرم — رشتهٔ خام برای همهٔ ورودی‌ها (تبدیل عدد/تاریخ فقط هنگام ذخیره)
// ---------------------------------------------------------------------------

interface FormState {
  title: string
  slug: string
  productId: string
  shortDescription: string
  fullDescription: string
  category: string[]
  color: string
  status: StatusKey
  featured: boolean
  classType: 'group' | 'private' | 'both'
  level: string
  registerLevels: string[]
  pricePerSession: string
  packageSessions: string
  packagePrice: string
  priceNote: string
  sessionDurationMin: string
  format: string
  maxStudents: string
  minStudents: string
  schedule: string
  startDate: string
  endDate: string
  timezone: string
  meta: { icon: string; text: string }[]
  highlights: string
  requirements: string
  audience: string
  curriculum: string
  materials: string
  notes: string
  image: string
  videoUrl: string
  sortOrder: string
}

function emptyForm(): FormState {
  return {
    title: '',
    slug: '',
    productId: '',
    shortDescription: '',
    fullDescription: '',
    category: ['beginner'],
    color: 'sage',
    status: 'draft',
    featured: false,
    classType: 'group',
    level: '',
    registerLevels: ['beginner'],
    pricePerSession: '',
    packageSessions: '1',
    packagePrice: '',
    priceNote: '',
    sessionDurationMin: '',
    format: 'online',
    maxStudents: '',
    minStudents: '',
    schedule: 'Schedule: TBC',
    startDate: '',
    endDate: '',
    timezone: '',
    meta: [
      { icon: 'monitor', text: 'Online' },
      { icon: 'clock', text: '' },
    ],
    highlights: '',
    requirements: '',
    audience: '',
    curriculum: '',
    materials: '',
    notes: '',
    image: '',
    videoUrl: '',
    sortOrder: '100',
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function rowToForm(r: AdminClassRow): FormState {
  const f = emptyForm()
  f.title = r.title
  f.slug = r.slug
  f.productId = r.productId
  f.shortDescription = r.shortDescription
  f.fullDescription = r.fullDescription
  f.category = r.category.split(/\s+/).filter(Boolean)
  f.color = r.color
  f.status = (STATUSES as readonly string[]).includes(r.status) ? (r.status as StatusKey) : 'draft'
  f.featured = r.featured
  f.classType = (r.classType === 'private' || r.classType === 'both' ? r.classType : 'group') as FormState['classType']
  f.level = r.level
  f.registerLevels = parseJsonArray(r.registerLevels)
  f.pricePerSession = String(r.pricePerSession ?? 0)
  f.packageSessions = String(r.packageSessions ?? 1)
  f.packagePrice = String(r.packagePrice ?? 0)
  f.priceNote = r.priceNote
  f.sessionDurationMin = r.sessionDurationMin ? String(r.sessionDurationMin) : ''
  f.format = r.format || 'online'
  f.maxStudents = r.maxStudents ? String(r.maxStudents) : ''
  f.minStudents = r.minStudents ? String(r.minStudents) : ''
  f.schedule = r.schedule
  f.startDate = r.startDate ? r.startDate.slice(0, 10) : ''
  f.endDate = r.endDate ? r.endDate.slice(0, 10) : ''
  f.timezone = r.timezone
  f.meta = parseJsonMeta(r.meta)
  f.highlights = parseJsonArray(r.highlights).join('\n')
  f.requirements = parseJsonArray(r.requirements).join('\n')
  f.audience = parseJsonArray(r.audience).join('\n')
  f.curriculum = parseJsonArray(r.curriculum).join('\n')
  f.materials = parseJsonArray(r.materials).join('\n')
  f.notes = r.notes
  f.image = r.image
  f.videoUrl = r.videoUrl
  f.sortOrder = String(r.sortOrder ?? 100)
  return f
}

function formToPayload(f: FormState): Record<string, unknown> {
  const iso = (v: string): string | null => {
    if (!v) return null
    const d = new Date(`${v}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const numOrNull = (v: string): number | null => {
    const n = Number(v)
    return v.trim() !== '' && Number.isFinite(n) ? Math.floor(n) : null
  }
  const lines = (v: string): string[] =>
    v
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  return {
    title: f.title.trim(),
    slug: f.slug.trim().toLowerCase(),
    productId: f.productId.trim().toLowerCase(),
    shortDescription: f.shortDescription.trim(),
    fullDescription: f.fullDescription.trim(),
    category: f.category.join(' '),
    status: f.status,
    featured: f.featured,
    color: f.color,
    classType: f.classType,
    level: f.level.trim(),
    registerLevels: f.registerLevels,
    // ⚠️ مقدار داخلی DB همان قرارداد تاریخی می‌ماند؛ نمایش همیشه «USD» است
    currency: 'USDT',
    pricePerSession: Number(f.pricePerSession) || 0,
    packageSessions: Math.max(1, Math.floor(Number(f.packageSessions) || 1)),
    packagePrice: Math.round((Number(f.pricePerSession) || 0) * Math.max(1, Math.floor(Number(f.packageSessions) || 1)) * 100) / 100, // ⚠️ صرفاً نمایشی — سرور خودش محاسبه می‌کند
    priceNote: f.priceNote.trim(),
    sessionDurationMin: numOrNull(f.sessionDurationMin),
    format: f.format,
    maxStudents: numOrNull(f.maxStudents),
    minStudents: numOrNull(f.minStudents),
    schedule: f.schedule.trim(),
    startDate: iso(f.startDate),
    endDate: iso(f.endDate),
    timezone: f.timezone.trim(),
    meta: f.meta.filter((m) => m.text.trim() !== ''),
    highlights: lines(f.highlights),
    requirements: lines(f.requirements),
    audience: lines(f.audience),
    curriculum: lines(f.curriculum),
    materials: lines(f.materials),
    notes: f.notes.trim(),
    image: f.image.trim(),
    videoUrl: f.videoUrl.trim(),
    sortOrder: Math.max(0, Math.floor(Number(f.sortOrder) || 0)),
  }
}

// پیش‌نمایش زنده: فرم → همان شکل عمومی که صفحهٔ سایت می‌کشد
function formToPublicItem(f: FormState): PublicClassItem {
  const perSession = Number(f.pricePerSession) || 0
  const sessions = Math.max(1, Math.floor(Number(f.packageSessions) || 1))
  const base = Math.round(perSession * sessions * 100) / 100
  const hasPrice = f.status === 'active' && base > 0
  return {
    slug: f.slug,
    title: f.title || 'Untitled class',
    category: f.category.join(' '),
    color: f.color,
    image: f.image,
    level: f.level || '—',
    type: typeLabel(f.classType),
    classType: f.classType,
    status: f.status,
    featured: f.featured,
    text: f.shortDescription,
    meta: f.meta.filter((m) => m.text.trim() !== ''),
    schedule: f.schedule,
    price: `$${perSession % 1 === 0 ? perSession.toFixed(0) : perSession.toFixed(2)} ${a.perSession}`,
    priceNote: f.priceNote,
    highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
    fullDescription: f.fullDescription,
    requirements: f.requirements.split('\n').map((s) => s.trim()).filter(Boolean),
    audience: f.audience.split('\n').map((s) => s.trim()).filter(Boolean),
    curriculum: f.curriculum.split('\n').map((s) => s.trim()).filter(Boolean),
    materials: f.materials.split('\n').map((s) => s.trim()).filter(Boolean),
    notes: f.notes,
    videoUrl: f.videoUrl,
    productId: hasPrice ? f.productId : null,
    amountUsd: hasPrice ? base : null,
    amountDisplay: hasPrice ? base.toFixed(2) : null,
    // پیش‌نمایشِ فرم: پلهٔ تخفیف سمت سرور محاسبه می‌شود — اینجا فقط پایه نشان داده می‌شود
    pricing: hasPrice ? { pricePerSession: perSession, sessions, base, tierPercent: 0, tierDiscount: 0, final: base } : null,
  }
}

/** ردیف ادمین → نمای عمومی کامل — همان چیزی که مشتری می‌بیند (رفع باگ دکمهٔ چشم، فاز ۴۷:
 *  قبلاً FormState خام به ClassDetailContent داده می‌شد و کارت پیش‌نمایش crash می‌کرد) */
function adminRowToPublicItem(r: AdminClassRow): PublicClassItem {
  const perSession = Number(r.pricePerSession) || 0
  const sessions = Math.max(1, Math.floor(Number(r.packageSessions) || 1))
  const base = Math.round(perSession * sessions * 100) / 100
  const bookable = r.status === 'active' && base > 0
  return {
    slug: r.slug,
    title: r.title,
    category: r.category,
    color: r.color,
    image: r.image,
    level: r.level,
    type: typeLabel(r.classType),
    classType: (r.classType === 'private' || r.classType === 'both' ? r.classType : 'group') as PublicClassItem['classType'],
    status: r.status as PublicClassItem['status'],
    featured: r.featured,
    text: r.shortDescription,
    meta: parseJsonMeta(r.meta),
    schedule: r.schedule,
    price: `$${perSession % 1 === 0 ? perSession.toFixed(0) : perSession.toFixed(2)} ${a.perSession}`,
    priceNote: r.priceNote,
    highlights: parseJsonArray(r.highlights),
    fullDescription: r.fullDescription,
    requirements: parseJsonArray(r.requirements),
    audience: parseJsonArray(r.audience),
    curriculum: parseJsonArray(r.curriculum),
    materials: parseJsonArray(r.materials),
    notes: r.notes,
    videoUrl: r.videoUrl,
    productId: bookable ? r.productId : null,
    amountUsd: bookable ? base : null,
    amountDisplay: bookable ? base.toFixed(2) : null,
    pricing: bookable ? { pricePerSession: perSession, sessions, base, tierPercent: 0, tierDiscount: 0, final: base } : null,
  }
}

// ---------------------------------------------------------------------------
// ریز-کامپوننت‌های فرم
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-brown-dark mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="block text-[11px] font-semibold text-red-600 mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-brown-light mt-1">{hint}</span>
      ) : null}
    </label>
  )
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-bold text-sage-dark uppercase tracking-wide col-span-full">
      <span className="w-6 h-0.5 bg-sage/40 rounded-full" aria-hidden="true" />
      {children}
    </h4>
  )
}

// ---------------------------------------------------------------------------
// دیالوگ فرم ایجاد/ویرایش
// ---------------------------------------------------------------------------

function ClassEditorDialog({
  token,
  seed,
  editId,
  isNew,
  open,
  onOpenChange,
  onSaved,
  onToast,
}: {
  token: string
  seed: FormState
  // 🐞 فاز ۵۸ — id واقعی رکورد در حالت ویرایش؛ قبلاً seed.id استفاده می‌شد که
  // در FormState اصلاً وجود نداشت → PUT /api/admin/classes/undefined → 404
  editId?: string | null
  isNew: boolean
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: (row: AdminClassRow, created: boolean) => void
  onToast?: (m: string) => void
}) {
  const [form, setForm] = useState<FormState>(seed)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [topError, setTopError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const slugTouched = useRef(isNew ? false : true)
  // 🐞 فاز ۵۸ — productId هم مثل slug از عنوان ساخته می‌شود (تا ادمین دستی تغییرش نداده).
  // ریشهٔ باگ «ایجاد کلاس کار نمی‌کند»: productId خالی می‌ماند، اعتبارسنجی ساکت بلوکه
  // می‌کرد و خطا پایین فرم (خارج از دید) بود — ادمین هیچ اتفاقی نمی‌دید.
  const productIdTouched = useRef(isNew ? false : true)

  // با باز شدن دیالوگ، فرم از seed تازه‌سازی می‌شود
  useEffect(() => {
    if (open) {
      setForm(seed)
      setFields({})
      setTopError('')
      slugTouched.current = !isNew
      productIdTouched.current = !isNew
    }
  }, [open, seed, isNew])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // ⭐ مبلغ پایهٔ بسته — همیشه خودکار: قیمت هر جلسه × تعداد جلسات (فاز ۴۷)
  const computedBase = Math.round(
    (Number(form.pricePerSession) || 0) * Math.max(1, Math.floor(Number(form.packageSessions) || 1)) * 100
  ) / 100

  // 🖼️ آپلود تصویر کلاس از رایانه — همان مسیر مشترک /api/admin/upload (فاز ۴۴)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f || uploading) return
      setUploading(true)
      setUploadErr('')
      try {
        const fd = new FormData()
        fd.append('file', f)
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'x-admin-key': token },
          body: fd,
        })
        const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
        if (!res.ok || !data?.url) {
          setUploadErr(data?.message || a.fImageUploadError)
          return
        }
        set('image', data.url)
        onToast?.(a.fImageUploadedToast)
      } catch {
        setUploadErr(a.fImageUploadError)
      } finally {
        setUploading(false)
        if (fileRef.current) fileRef.current.value = '' // انتخاب دوبارهٔ همان فایل ممکن شود
      }
    },
    [uploading, token, set, onToast]
  )

  // slug خودکار از عنوان تا وقتی ادمین دستی تغییرش نداده
  const onTitleChange = useCallback(
    (v: string) => {
      setForm((prev) => ({
        ...prev,
        title: v,
        slug: slugTouched.current ? prev.slug : slugify(v),
        // 🐞 فاز ۵۸ — productId هم خودکار از عنوان (همان الگوی slug)
        productId: productIdTouched.current ? prev.productId : slugify(v),
      }))
    },
    []
  )

  const save = useCallback(async () => {
    // اعتبارسنجی سریع سمت کلاینت — داور نهایی سرور است
    const errs: Record<string, string> = {}
    if (form.title.trim().length < 2) errs.title = 'Title is required (2–120 chars)'
    if (!SLUG_RE.test(form.slug.trim())) errs.slug = 'Lowercase letters, numbers and hyphens only'
    if (!SLUG_RE.test(form.productId.trim()) || form.productId.trim().length < 2)
      errs.productId = 'Lowercase letters, numbers and hyphens only'
    if (!form.level.trim()) errs.level = 'Level badge is required'
    if (form.registerLevels.length === 0) errs.registerLevels = 'Pick at least one level'
    if (form.category.length === 0) errs.category = 'Pick at least one category'
    const pkg = Number(form.pricePerSession)
    if (!(pkg > 0)) errs.pricePerSession = 'Price per session must be greater than 0'
    else if (pkg > 2000) errs.pricePerSession = 'Maximum 2000 USD'
    if (!(Math.floor(Number(form.packageSessions) || 0) >= 1)) errs.packageSessions = 'At least 1 session'
    setFields(errs)
    if (Object.keys(errs).length > 0) {
      // 🐞 فاز ۵۸ — هرگز ساکت شکست نخور: خلاصهٔ خطا بالا + اسکرول نرم به اولین فیلدِ خطادار
      setTopError('Please fix the highlighted field(s) below — the form cannot be saved yet.')
      requestAnimationFrame(() => {
        const dlg = document.querySelector('[role=dialog]')
        const firstErr = dlg?.querySelector('span.text-red-600')
        firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
    setTopError('')

    setBusy(true)
    try {
      const res = await fetch(isNew ? '/api/admin/classes' : `/api/admin/classes/${editId ?? seed.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(formToPayload(form)),
      })
      const data = (await res.json().catch(() => ({}))) as {
        class?: AdminClassRow
        error?: string
        fields?: Record<string, string>
      }
      if (!res.ok) {
        if (data.fields) setFields(data.fields)
        setTopError(
          res.status === 401
            ? 'Session expired — please log in again.'
            : res.status === 409
              ? (data.fields?.slug || data.fields?.productId || 'A class with this slug or product ID already exists.')
              : a.saveError
        )
        return
      }
      if (data.class) {
        onSaved(data.class, isNew)
        onToast?.(isNew ? a.createSuccess : a.saveSuccess)
        onOpenChange(false)
      }
    } catch {
      setTopError(a.networkError)
    } finally {
      setBusy(false)
    }
  }, [form, isNew, editId, seed.id, token, onSaved, onOpenChange, onToast])

  const previewItem = useMemo(() => formToPublicItem(form), [form])

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="bg-cream border-sage-light/30 rounded-3xl max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-sage-light/20 px-6 py-4 flex items-center justify-between gap-3">
          <DialogHeader className="min-w-0">
            <DialogTitle className="text-lg font-bold text-brown-dark text-left truncate">
              {isNew ? a.formTitleNew : a.formTitleEdit}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-sage-light/50 text-brown px-3.5 py-2 rounded-full text-xs font-semibold hover:border-sage transition-colors cursor-pointer min-h-[44px]"
              title={a.preview}
            >
              <Eye className="w-3.5 h-3.5" />
              {a.preview}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-sage text-brown-dark px-4 py-2 rounded-full text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {busy ? (isNew ? a.creating : a.saving) : isNew ? a.create : a.save}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          {topError && (
            <div className="mb-4 bg-peach/25 border border-peach text-brown-dark text-xs font-semibold rounded-xl px-4 py-3">
              {topError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ۱ · Basic */}
            <SectionTitle>{a.sectionBasic}</SectionTitle>
            <Field label={a.fTitle} error={fields.title}>
              <input className={inputCls} value={form.title} onChange={(e) => onTitleChange(e.target.value)} placeholder={a.fTitlePh} />
            </Field>
            <Field label={a.fShortDesc} error={fields.shortDescription}>
              <textarea className={`${inputCls} min-h-[84px] resize-y`} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder={a.fShortDescPh} />
            </Field>
            <Field label={a.fFullDesc} error={fields.fullDescription}>
              <textarea className={`${inputCls} min-h-[84px] resize-y`} value={form.fullDescription} onChange={(e) => set('fullDescription', e.target.value)} placeholder={a.fFullDescPh} />
            </Field>
            <div className="md:col-span-1">
              <Field label={a.fCategory} hint={a.fCategoryHint} error={fields.category}>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORY_KEYS.map((f) => {
                    const active = form.category.includes(f.key)
                    return (
                      <button
                        type="button"
                        key={f.key}
                        onClick={() =>
                          set(
                            'category',
                            active ? form.category.filter((x) => x !== f.key) : [...form.category, f.key]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          active ? 'bg-sage text-brown-dark' : 'bg-white border border-sage-light/40 text-brown'
                        }`}
                        aria-pressed={active}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <Field label={a.fColor} error={fields.color}>
                <div className="flex gap-2 pt-1">
                  {(['sage', 'butter', 'peach', 'cream'] as const).map((cl) => (
                    <button
                      type="button"
                      key={cl}
                      onClick={() => set('color', cl)}
                      aria-label={cl}
                      aria-pressed={form.color === cl}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                        form.color === cl ? 'border-brown-dark scale-110' : 'border-transparent'
                      } ${cl === 'sage' ? 'bg-sage' : cl === 'butter' ? 'bg-butter' : cl === 'peach' ? 'bg-peach' : 'bg-cream border-sage-light'}`}
                    />
                  ))}
                </div>
              </Field>
              <div className="pb-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-brown-dark cursor-pointer">
                  <Switch checked={form.featured} onCheckedChange={(v) => set('featured', v)} aria-label={a.fFeatured} />
                  <Star className="w-3.5 h-3.5 text-butter" aria-hidden="true" />
                  {a.fFeatured}
                </label>
              </div>
            </div>

            {/* ۲ · Type & Level */}
            <SectionTitle>{a.sectionTypeLevel}</SectionTitle>
            <Field label={a.fClassType} hint={a.fClassTypeHint} error={fields.classType}>
              <div className="flex gap-2 pt-1">
                {(['group', 'private', 'both'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => set('classType', t)}
                    aria-pressed={form.classType === t}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer min-h-[44px] ${
                      form.classType === t ? 'bg-sage text-brown-dark' : 'bg-white border border-sage-light/40 text-brown'
                    }`}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={a.fLevel} error={fields.level}>
              <input className={inputCls} value={form.level} onChange={(e) => set('level', e.target.value)} placeholder={a.fLevelPh} />
            </Field>
            <div className="md:col-span-2">
              <Field label={a.fRegisterLevels} hint={a.fRegisterLevelsHint} error={fields.registerLevels}>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      set('registerLevels', form.registerLevels.includes('all') ? form.registerLevels.filter((x) => x !== 'all') : [...form.registerLevels, 'all'])
                    }
                    aria-pressed={form.registerLevels.includes('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      form.registerLevels.includes('all') ? 'bg-sage text-brown-dark' : 'bg-white border border-sage-light/40 text-brown'
                    }`}
                  >
                    {a.fLevelAll}
                  </button>
                  {REGISTER_LEVELS.map((lv) => {
                    const active = form.registerLevels.includes(lv.key)
                    return (
                      <button
                        type="button"
                        key={lv.key}
                        onClick={() =>
                          set('registerLevels', active ? form.registerLevels.filter((x) => x !== lv.key) : [...form.registerLevels, lv.key])
                        }
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          active ? 'bg-sage text-brown-dark' : 'bg-white border border-sage-light/40 text-brown'
                        }`}
                      >
                        {lv.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>

            {/* ۳ · Pricing */}
            <SectionTitle>{a.sectionPricing}</SectionTitle>
            <Field label={a.fCurrency} error={fields.currency}>
              <input className={`${inputCls} bg-sage-light/20`} value="USD (bank card)" disabled readOnly />
            </Field>
            <Field label={a.fPricePerSession} error={fields.pricePerSession}>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.pricePerSession} onChange={(e) => set('pricePerSession', e.target.value)} />
            </Field>
            <Field label={a.fPackageSessions} error={fields.packageSessions}>
              <input className={inputCls} type="number" min="1" step="1" value={form.packageSessions} onChange={(e) => set('packageSessions', e.target.value)} />
            </Field>
            {/* ⭐ مبلغ پایهٔ بسته — خودکار محاسبه می‌شود؛ ادمین هیچ عددی دستی وارد نمی‌کند (فاز ۴۷)
                (تخفیف خودکار بسته بر اساس تعداد جلسه، هنگام سفارش سمت سرور اعمال می‌شود) */}
            <div className="md:col-span-2">
              <div className="rounded-xl border border-sage/40 bg-sage-light/20 px-4 py-3" aria-live="polite">
                <p className="text-[11px] uppercase tracking-wider text-brown-light">{a.fPackagePriceAuto}</p>
                <p className="text-lg font-bold text-sage-dark">
                  {computedBase > 0 ? `$${computedBase.toFixed(2)}` : '—'}
                  <span className="text-xs font-semibold text-brown-light"> USD</span>
                </p>
                <p className="text-[11px] text-brown-light mt-0.5">
                  {computedBase > 0
                    ? `${Math.floor(Number(form.packageSessions) || 0)} × $${(Number(form.pricePerSession) || 0).toFixed(2)} = $${computedBase.toFixed(2)}`
                    : a.fPackagePriceAutoHint}
                </p>
              </div>
            </div>
            <div className="md:col-span-2">
              <Field label={a.fPriceNote} error={fields.priceNote}>
                <input className={inputCls} value={form.priceNote} onChange={(e) => set('priceNote', e.target.value)} placeholder={a.fPriceNotePh} />
              </Field>
            </div>

            {/* ۴ · Schedule */}
            <SectionTitle>{a.sectionSchedule}</SectionTitle>
            <Field label={a.fSchedule} error={fields.schedule}>
              <input className={inputCls} value={form.schedule} onChange={(e) => set('schedule', e.target.value)} placeholder={a.fSchedulePh} />
            </Field>
            <Field label={a.fTimezone} error={fields.timezone}>
              {/* 🌍 انتخابگر منطقهٔ زمانی IANA — هیچ متن آزادی ذخیره نمی‌شود (فاز ۴۷) */}
              <select className={inputCls} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                <option value="">—</option>
                {SUPPORTED_TIMEZONES.map((t) => (
                  <option key={t.tz} value={t.tz}>
                    {timezoneLabel(t.tz)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={a.fStartDate} error={fields.startDate}>
              <input className={inputCls} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field label={a.fEndDate} error={fields.endDate}>
              <input className={inputCls} type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </Field>
            <Field label={a.fSessionDuration} error={fields.sessionDurationMin}>
              <input className={inputCls} type="number" min="5" step="5" value={form.sessionDurationMin} onChange={(e) => set('sessionDurationMin', e.target.value)} />
            </Field>
            <Field label={a.fFormat} error={fields.format}>
              <select className={inputCls} value={form.format} onChange={(e) => set('format', e.target.value)}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label={a.fMaxStudents} error={fields.maxStudents}>
              <input className={inputCls} type="number" min="1" step="1" value={form.maxStudents} onChange={(e) => set('maxStudents', e.target.value)} />
            </Field>
            <Field label={a.fMinStudents} error={fields.minStudents}>
              <input className={inputCls} type="number" min="1" step="1" value={form.minStudents} onChange={(e) => set('minStudents', e.target.value)} />
            </Field>

            {/* ۵ · Content */}
            <SectionTitle>{a.sectionContent}</SectionTitle>
            <Field label={a.fHighlights} error={fields.highlights}>
              <textarea className={`${inputCls} min-h-[96px] resize-y`} value={form.highlights} onChange={(e) => set('highlights', e.target.value)} placeholder={a.fHighlightsPh} />
            </Field>
            <Field label={a.fCurriculum} error={fields.curriculum}>
              <textarea className={`${inputCls} min-h-[96px] resize-y`} value={form.curriculum} onChange={(e) => set('curriculum', e.target.value)} placeholder={a.fCurriculumPh} />
            </Field>
            <Field label={a.fRequirements} error={fields.requirements}>
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder={a.fRequirementsPh} />
            </Field>
            <Field label={a.fAudience} error={fields.audience}>
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.audience} onChange={(e) => set('audience', e.target.value)} placeholder={a.fAudiencePh} />
            </Field>
            <Field label={a.fMaterials} error={fields.materials}>
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder={a.fMaterialsPh} />
            </Field>
            <Field label={a.fNotes} error={fields.notes}>
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={a.fNotesPh} />
            </Field>
            <div className="md:col-span-2">
              <Field label={a.fMeta} error={fields.meta}>
                <div className="space-y-2">
                  {form.meta.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        className={`${inputCls} max-w-[130px]`}
                        value={m.icon}
                        onChange={(e) =>
                          set('meta', form.meta.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))
                        }
                        aria-label={`icon ${i + 1}`}
                      >
                        <option value="monitor">Monitor</option>
                        <option value="clock">Clock</option>
                        <option value="users">Users</option>
                        <option value="mic">Mic</option>
                        <option value="target">Target</option>
                        <option value="user">User</option>
                      </select>
                      <input
                        className={inputCls}
                        value={m.text}
                        onChange={(e) => set('meta', form.meta.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                        placeholder="e.g. 12 sessions · 60 min each"
                        aria-label={`text ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => set('meta', form.meta.filter((_, j) => j !== i))}
                        className="px-3 text-brown-light hover:text-red-600 cursor-pointer"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.meta.length < 6 && (
                    <button
                      type="button"
                      onClick={() => set('meta', [...form.meta, { icon: 'clock', text: '' }])}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-dark hover:text-brown-dark cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {a.fMetaAdd}
                    </button>
                  )}
                </div>
              </Field>
            </div>

            {/* ۶ · Media */}
            <SectionTitle>{a.sectionMedia}</SectionTitle>
            <Field label={a.fImage} hint={a.fImageHint} error={fields.image}>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* پیش‌نمایش زنده — همان تصویری که کارت/جزئیات نشان می‌دهد */}
                  <span
                    className="w-20 h-12 rounded-xl overflow-hidden border border-sage-light/40 bg-gradient-to-br from-sage-light/50 to-butter/40 flex items-center justify-center text-lg flex-shrink-0"
                    aria-hidden="true"
                  >
                    {form.image.trim() ? (
                      <img
                        src={form.image.trim()}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      '🖼️'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 bg-sage-light/30 text-brown px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-sage-light/50 transition-colors cursor-pointer disabled:opacity-60 min-h-[36px]"
                  >
                    {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 text-sage-dark" />}
                    {uploading ? a.fImageUploading : a.fImageUpload}
                  </button>
                  {form.image.trim() && (
                    <button
                      type="button"
                      onClick={() => set('image', '')}
                      className="inline-flex items-center gap-1 text-brown-light hover:text-red-500 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] px-2"
                    >
                      <X className="w-3.5 h-3.5" /> {a.fImageRemove}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={pickFile}
                    className="sr-only"
                    aria-label={a.fImageUpload}
                  />
                </div>
                <input className={inputCls} value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="/images/classes/beginner.png" />
                {uploadErr && (
                  <p className="text-[11px] text-red-500" role="alert">
                    {uploadErr}
                  </p>
                )}
              </div>
            </Field>
            <Field label={a.fVideoUrl} error={fields.videoUrl}>
              <input className={inputCls} value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…" />
            </Field>

            {/* ۷ · SEO / URL */}
            <SectionTitle>{a.sectionUrl}</SectionTitle>
            <Field label={a.fSlug} hint={a.fSlugHint} error={fields.slug}>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => {
                    slugTouched.current = true
                    set('slug', e.target.value.toLowerCase())
                  }}
                  placeholder="beginner-mandarin-chinese"
                />
                <button
                  type="button"
                  onClick={() => {
                    slugTouched.current = true
                    set('slug', slugify(form.title))
                  }}
                  className="shrink-0 inline-flex items-center gap-1 bg-white border border-sage-light/50 text-brown px-3 rounded-xl text-xs font-semibold hover:border-sage cursor-pointer min-h-[44px]"
                  title="Generate from title"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Field>
            <Field label={a.fProductId} hint={a.fProductIdHint} error={fields.productId}>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={form.productId}
                  onChange={(e) => {
                    productIdTouched.current = true
                    set('productId', e.target.value.toLowerCase())
                  }}
                  placeholder="beginner-chinese-12"
                />
                <button
                  type="button"
                  onClick={() => {
                    productIdTouched.current = true
                    set('productId', slugify(form.title))
                  }}
                  className="shrink-0 inline-flex items-center gap-1 bg-white border border-sage-light/50 text-brown px-3 rounded-xl text-xs font-semibold hover:border-sage cursor-pointer min-h-[44px]"
                  title="Generate from title"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Field>
            <Field label={a.fSortOrder} hint={a.orderHint} error={fields.sortOrder}>
              <input className={inputCls} type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </Field>

            {/* ۸ · Publish */}
            <SectionTitle>{a.sectionPublish}</SectionTitle>
            <Field label={a.fStatus} hint={a.fStatusHint} error={fields.status}>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as StatusKey)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* دکمهٔ ذخیرهٔ پایینی — جلوگیری از دابل‌سابمیت با busy */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-full text-sm font-semibold hover:border-sage transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-sage text-brown-dark px-6 py-2.5 rounded-full text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {busy ? (isNew ? a.creating : a.saving) : isNew ? a.create : a.save}
            </button>
          </div>
        </div>

        {/* پیش‌نمایش همان نمای عمومی — کامپوننت مشترک با صفحهٔ کلاس‌ها */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="bg-cream border-sage-light/30 rounded-3xl max-w-lg max-h-[88vh] overflow-y-auto p-0">
            <div className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sage-dark">
              {a.previewTitle}
              {(form.status === 'draft' || form.status === 'inactive' || form.status === 'archived') && (
                <span className="block normal-case tracking-normal text-brown-light mt-1">{a.previewDraftNote}</span>
              )}
            </div>
            <ClassDetailContent item={previewItem} onRegister={() => {}} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// دیالوگ حذف با تأیید صریح — حذف تصادفی با یک کلیک هرگز ممکن نیست
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  row,
  open,
  onOpenChange,
  onDeleted,
  token,
  onToast,
}: {
  row: AdminClassRow | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onDeleted: () => void
  token: string
  onToast?: (m: string) => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setConfirmText('')
      setError('')
    }
  }, [open])

  if (!row) return null

  const doDelete = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/classes/${row.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': token },
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string }
      if (res.ok && data.ok) {
        onDeleted()
        onToast?.(a.deleted)
        onOpenChange(false)
      } else if (res.status === 409) {
        setError(data.message || a.deleteBlockedTitle)
      } else {
        setError(res.status === 401 ? 'Session expired — please log in again.' : a.networkError)
      }
    } catch {
      setError(a.networkError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="bg-cream border-peach/40 rounded-3xl max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-brown-dark text-left flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
            {a.deleteConfirmTitle}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-brown leading-relaxed mt-2">
          {a.deleteConfirmText.replace('{title}', row.title)}
        </p>
        <div className="mt-4 bg-white rounded-2xl p-3 border border-sage-light/30 text-sm">
          <p className="font-bold text-brown-dark">{row.title}</p>
          <p className="text-xs text-brown-light mt-0.5">
            slug: {row.slug} · {row.productId} · ${row.packagePrice.toFixed(2)}
          </p>
        </div>
        {error && (
          <div className="mt-3 bg-peach/25 border border-peach text-brown-dark text-xs font-semibold rounded-xl px-3 py-2.5">
            {error}
          </div>
        )}
        <label className="block mt-4">
          <span className="block text-xs font-semibold text-brown-dark mb-1.5">{a.deleteConfirmLabel}</span>
          <input className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoComplete="off" />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-full text-sm font-semibold hover:border-sage cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doDelete}
            disabled={busy || confirmText !== 'DELETE'}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {a.delete}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// خودِ تب
// ---------------------------------------------------------------------------

export function ClassesAdminTab({ token, onToast }: { token: string; onToast?: (m: string) => void }) {
  const [rows, setRows] = useState<AdminClassRow[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // جست‌وجو با debounce
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [level, setLevel] = useState('any')
  const [availability, setAvailability] = useState('all')
  const [sort, setSort] = useState('sortOrder')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSeed, setEditorSeed] = useState<FormState>(emptyForm())
  const [editorRowId, setEditorRowId] = useState<string | null>(null)
  const [deleteRow, setDeleteRow] = useState<AdminClassRow | null>(null)
  const [previewRow, setPreviewRow] = useState<AdminClassRow | null>(null)
  const [busyRowId, setBusyRowId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (debounced) params.set('q', debounced)
      if (status !== 'all') params.set('status', status)
      if (type !== 'all') params.set('type', type)
      if (level !== 'any') params.set('level', level)
      if (availability !== 'all') params.set('availability', availability)
      params.set('sort', sort)
      params.set('dir', dir)
      const res = await fetch(`/api/admin/classes?${params.toString()}`, {
        headers: { 'x-admin-key': token },
      })
      if (res.status === 401) {
        setError(true)
        setRows([])
        return
      }
      const data = (await res.json()) as { classes?: AdminClassRow[]; total?: number; counts?: Record<string, number> }
      setRows(data.classes ?? [])
      setTotal(data.total ?? 0)
      setCounts(data.counts ?? {})
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token, debounced, status, type, level, availability, sort, dir])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = useCallback(() => {
    setEditorRowId(null)
    setEditorSeed(emptyForm())
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback(
    async (row: AdminClassRow) => {
      setBusyRowId(row.id)
      try {
        const res = await fetch(`/api/admin/classes/${row.id}`, { headers: { 'x-admin-key': token } })
        const data = (await res.json().catch(() => ({}))) as { class?: AdminClassRow }
        setEditorRowId(row.id)
        setEditorSeed(data.class ? rowToForm(data.class) : rowToForm(row))
        setEditorOpen(true)
      } catch {
        setEditorRowId(row.id)
        setEditorSeed(rowToForm(row))
        setEditorOpen(true)
      } finally {
        setBusyRowId('')
      }
    },
    [token]
  )

  const duplicate = useCallback(
    async (row: AdminClassRow) => {
      setBusyRowId(row.id)
      try {
        const res = await fetch(`/api/admin/classes/${row.id}/duplicate`, {
          method: 'POST',
          headers: { 'x-admin-key': token },
        })
        const data = (await res.json().catch(() => ({}))) as { class?: AdminClassRow }
        if (res.ok) {
          onToast?.(a.duplicateSuccess)
          load()
        } else if (res.status === 401) {
          onToast?.('Session expired — please log in again.')
        } else {
          onToast?.(a.networkError)
        }
        void data
      } catch {
        onToast?.(a.networkError)
      } finally {
        setBusyRowId('')
      }
    },
    [token, load, onToast]
  )

  const changeStatus = useCallback(
    async (row: AdminClassRow, next: StatusKey) => {
      setBusyRowId(row.id)
      try {
        const res = await fetch(`/api/admin/classes/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
          body: JSON.stringify({ status: next }),
        })
        if (res.ok) {
          onToast?.(a.statusChanged)
          load()
        } else if (res.status === 401) {
          onToast?.('Session expired — please log in again.')
        } else {
          onToast?.(a.networkError)
        }
      } catch {
        onToast?.(a.networkError)
      } finally {
        setBusyRowId('')
      }
    },
    [token, load, onToast]
  )

  const onSaved = useCallback(
    (_row: AdminClassRow, _created: boolean) => {
      load()
    },
    [load]
  )

  // 👁️ پیش‌نمایش — با ریزِ قیمتِ واقعیِ سرور (همان که مشتری می‌بیند؛ فاز ۴۷)
  const [previewPricing, setPreviewPricing] = useState<PublicClassItem['pricing']>(null)
  useEffect(() => {
    if (!previewRow?.productId) {
      setPreviewPricing(null)
      return
    }
    let alive = true
    fetch('/api/discounts/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: previewRow.productId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.pricing) {
          setPreviewPricing({
            pricePerSession: d.pricing.pricePerSession,
            sessions: d.pricing.sessions,
            base: d.pricing.base,
            tierPercent: d.pricing.tierPercent,
            tierDiscount: d.pricing.tierDiscount,
            final: d.pricing.final,
          })
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [previewRow])

  const previewItem = useMemo(() => {
    if (!previewRow) return null
    const base = adminRowToPublicItem(previewRow)
    return previewPricing ? { ...base, pricing: previewPricing } : base
  }, [previewRow, previewPricing])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-brown-light max-w-xl">{a.subtitle}</p>
          <p className="text-[11px] font-semibold text-sage-dark mt-1">{a.listTotal.replace('{total}', String(total))}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 bg-white border border-sage-light/50 text-brown px-4 py-2.5 rounded-full text-xs font-semibold hover:border-sage transition-colors cursor-pointer min-h-[44px]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-sage text-brown-dark px-5 py-2.5 rounded-full text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {a.newClass}
          </button>
        </div>
      </div>

      {/* فیلترها */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <label className="col-span-2 md:col-span-3 lg:col-span-2 block">
          <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={a.searchPlaceholder} aria-label={a.searchPlaceholder} />
        </label>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label={a.filterStatus}>
          <option value="all">{a.filterStatus}: all</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)} aria-label={a.filterType}>
          <option value="all">{a.filterType}: all</option>
          <option value="group">{a.typeGroup}</option>
          <option value="private">{a.typePrivate}</option>
          <option value="both">{a.typeBoth}</option>
        </select>
        <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} aria-label={a.filterLevel}>
          <option value="any">{a.filterLevel}: all</option>
          <option value="all">“all levels”</option>
          {REGISTER_LEVELS.map((lv) => (
            <option key={lv.key} value={lv.key}>
              {lv.label}
            </option>
          ))}
        </select>
        <select className={inputCls} value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label={a.filterAvailability}>
          <option value="all">{a.availabilityAll}</option>
          <option value="bookable">{a.availabilityBookable}</option>
          <option value="not-bookable">{a.availabilityNotBookable}</option>
        </select>
        <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value)} aria-label={a.sortBy}>
          <option value="sortOrder">{a.sortOrder}</option>
          <option value="title">{a.sortName}</option>
          <option value="price">{a.sortPrice}</option>
          <option value="createdAt">{a.sortCreated}</option>
          <option value="updatedAt">{a.sortUpdated}</option>
          <option value="status">{a.sortStatus}</option>
        </select>
        <select className={inputCls} value={dir} onChange={(e) => setDir(e.target.value === 'desc' ? 'desc' : 'asc')} aria-label="Direction">
          <option value="asc">{a.dirAsc}</option>
          <option value="desc">{a.dirDesc}</option>
        </select>
      </div>

      {/* فهرست */}
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-brown-light text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : error && rows.length === 0 ? (
        <div className="text-center py-16 text-brown-light">
          <Ban className="w-10 h-10 mx-auto mb-3 text-peach" />
          <p className="text-sm">{a.loadingError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-brown-light">
          <SearchX className="w-10 h-10 mx-auto mb-3 text-sage-dark" />
          <p className="font-bold text-brown-dark">{a.emptyTitle}</p>
          <p className="text-sm mt-1 mb-5">{a.emptyText}</p>
          <button onClick={openCreate} className="bg-sage text-brown-dark px-5 py-2.5 rounded-full text-sm font-bold hover:bg-sage-dark cursor-pointer inline-flex items-center gap-2 min-h-[44px]">
            <Plus className="w-4 h-4" /> {a.newClass}
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1 ct-scroll">
          {rows.map((row) => {
            const busy = busyRowId === row.id
            return (
              <div key={row.id} className="bg-white rounded-2xl border border-sage-light/20 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-brown-dark text-sm">{row.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeCls(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                    {row.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-butter/50 text-brown">
                        <Star className="w-2.5 h-2.5" /> {a.featuredBadge}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === 'active' && row.packagePrice > 0 ? 'bg-sage-light/40 text-sage-dark' : 'bg-neutral-200 text-neutral-500'}`}>
                      {row.status === 'active' && row.packagePrice > 0 ? a.bookableYes : a.bookableNo}
                    </span>
                  </div>
                  <p className="text-[11px] text-brown-light truncate">
                    <GraduationCap className="w-3 h-3 inline mr-1 -mt-0.5" aria-hidden="true" />
                    {row.slug} · {row.productId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 lg:w-auto">
                  <span className="text-xs text-brown-light min-w-[90px]">
                    {a.colType}: <b className="text-brown">{typeLabel(row.classType)}</b>
                  </span>
                  <span className="text-xs text-brown-light min-w-[80px]">
                    {a.colLevel}: <b className="text-brown">{row.level}</b>
                  </span>
                  <span className="text-xs text-brown-light min-w-[90px]">
                    {a.colPrice}: <b className="text-sage-dark">${row.packagePrice.toFixed(2)}</b>
                  </span>
                  <span className="text-[11px] text-brown-light/80 hidden xl:inline">
                    {new Date(row.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* فعال/غیرفعال سریع */}
                    <button
                      onClick={() => changeStatus(row, row.status === 'active' ? 'inactive' : 'active')}
                      disabled={busy}
                      className={`px-3 py-2 rounded-full text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 min-h-[44px] ${
                        row.status === 'active' ? 'bg-neutral-100 text-brown hover:bg-neutral-200' : 'bg-sage/20 text-sage-dark hover:bg-sage/30'
                      }`}
                      title={row.status === 'active' ? a.deactivate : a.activate}
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : row.status === 'active' ? a.deactivate : a.activate}
                    </button>
                    <button onClick={() => setPreviewRow(row)} disabled={busy} className="p-2.5 rounded-full text-brown hover:bg-sage-light/30 cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title={a.preview} aria-label={`${a.preview} — ${row.title}`}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(row)} disabled={busy} className="p-2.5 rounded-full text-brown hover:bg-sage-light/30 cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title={a.edit} aria-label={`${a.edit} — ${row.title}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => duplicate(row)} disabled={busy} className="p-2.5 rounded-full text-brown hover:bg-sage-light/30 cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title={a.duplicate} aria-label={`${a.duplicate} — ${row.title}`}>
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteRow(row)} disabled={busy} className="p-2.5 rounded-full text-brown hover:bg-red-50 hover:text-red-600 cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title={a.delete} aria-label={`${a.delete} — ${row.title}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* دیالوگ ایجاد/ویرایش */}
      <ClassEditorDialog
        token={token}
        seed={editorSeed}
        editId={editorRowId}
        isNew={editorRowId === null}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={onSaved}
        onToast={onToast}
      />

      {/* دیالوگ حذف با تأیید */}
      <DeleteConfirmDialog token={token} row={deleteRow} open={!!deleteRow} onOpenChange={(v) => !v && setDeleteRow(null)} onDeleted={load} onToast={onToast} />

      {/* پیش‌نمایش عمومی — همان کامپوننت صفحهٔ کلاس‌ها */}
      <Dialog open={!!previewRow} onOpenChange={(v) => !v && setPreviewRow(null)}>
        <DialogContent className="bg-cream border-sage-light/30 rounded-3xl max-w-lg max-h-[88vh] overflow-y-auto p-0">
          {previewItem && (
            <>
              <div className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sage-dark flex items-center justify-between gap-3">
                <span>{a.previewTitle}</span>
                <button
                  onClick={() => {
                    window.location.hash = `/classes/${previewItem.slug}`
                    setPreviewRow(null)
                  }}
                  className="inline-flex items-center gap-1 text-brown hover:text-sage-dark normal-case tracking-normal cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {a.previewOpenPublic}
                </button>
              </div>
              <ClassDetailContent item={previewItem} onRegister={() => {}} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
