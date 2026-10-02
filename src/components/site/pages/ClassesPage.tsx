'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Monitor,
  Clock,
  Users,
  Mic,
  Target,
  User,
  ArrowRight,
  SearchX,
  CheckCircle2,
  Info,
  X,
  Printer,
  PlayCircle,
  ListOrdered,
  BookOpenCheck,
  UserCheck,
  Package,
  Ban,
  Tag,
  TicketPercent,
  Loader2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useCloseOnNavigate } from '../use-nav-close'
import { HskPromo } from '../HskPromo'
import { CurveDivider } from '../CurveDivider'
import { Leaflet } from '../ToonBranch'
import { LevelQuiz } from '../LevelQuiz'
import { selectClassForRegistration } from '../class-selection'
import { siteContent, PageKey } from '@/content/site-content'
import type { PublicClassItem } from '@/lib/classes/store'

const c = siteContent.classes

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  monitor: Monitor,
  clock: Clock,
  users: Users,
  mic: Mic,
  target: Target,
  user: User,
}

const colorMap = {
  sage: { bar: 'bg-sage', badge: 'bg-sage/20 text-sage-dark', border: 'border-sage-light/20', meta: 'text-sage-dark', chip: 'bg-sage-light/30' },
  butter: { bar: 'bg-butter', badge: 'bg-butter/30 text-brown', border: 'border-butter/20', meta: 'text-brown', chip: 'bg-butter/20' },
  peach: { bar: 'bg-peach', badge: 'bg-peach-light/40 text-brown', border: 'border-peach-light/20', meta: 'text-peach', chip: 'bg-peach-light/30' },
  cream: { bar: 'bg-cream', badge: 'bg-cream/60 text-brown border border-sage-light/30', border: 'border-sage-light/20', meta: 'text-brown', chip: 'bg-cream/60' },
  'sage-dark': { bar: 'bg-sage-dark', badge: 'bg-sage/20 text-sage-dark', border: 'border-sage-light/20', meta: 'text-sage-dark', chip: 'bg-sage-light/30' },
} as const

// شکل عمومی کلاس — همان ساختاری که GET /api/classes برمی‌گرداند
type ClassItem = PublicClassItem

// 🔄 رندر فوری با آیتم‌های فایل محتوا (رندر اولیه بدون انتظار شبکه) — سپس پاسخ
// GET /api/classes (منبع حقیقت مدیریت‌شده از پنل ادمین) جایگزین می‌شود. اگر
// API در دسترس نباشد، نسخهٔ فایل باقی می‌ماند تا صفحه هرگز خالی نشود.
function fileItemToPublic(item: (typeof c.items)[number]): ClassItem {
  return {
    slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    title: item.title,
    category: item.category,
    color: item.color,
    image: item.image ?? '',
    level: item.level,
    type: item.type,
    classType: item.type === 'Private' ? 'private' : 'group',
    status: 'active',
    featured: false,
    text: item.text,
    meta: item.meta,
    schedule: item.schedule,
    price: item.price,
    priceNote: item.priceNote,
    highlights: item.highlights,
    fullDescription: '',
    requirements: [],
    audience: [],
    curriculum: [],
    materials: [],
    notes: '',
    videoUrl: '',
    productId: null, // قیمت قطعی از API کاتالوگ می‌آید — نسخهٔ فایل هیچ قیمتی ادعا نمی‌کند
    amountUsd: null,
    amountDisplay: null,
  }
}

const FILE_ITEMS: ClassItem[] = c.items.map(fileItemToPublic)

// ---------------------------------------------------------------------------
// 🎟️ جعبهٔ کد تخفیف — فقط صفحهٔ عمومی (پیش‌نمایش ادمین بدون کد است)
// کد سمت سرور اعتبارسنجی می‌شود؛ اینجا فقط نمایشِ نتیجهٔ محاسبهٔ سرور.
// کدِ تأییدشده در sessionStorage ذخیره می‌شود تا چک‌اوت آن را به API سفارش بدهد؛
// سرور هنگام ساخت سفارش دوباره کامل اعتبارسنجی و محاسبه می‌کند.
// ---------------------------------------------------------------------------
export const DISCOUNT_CODE_STORAGE_KEY = 'ct_discount_code'

function DiscountCodeBox({ productId }: { productId: string }) {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; amount: number; final: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // اگر کدِ معتبری از قبل ذخیره شده، وضعیتش تازه شود
    try {
      const saved = sessionStorage.getItem(DISCOUNT_CODE_STORAGE_KEY)
      if (saved) setCode(saved)
    } catch {
      /* بدون sessionStorage */
    }
  }, [])

  const apply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, code: trimmed }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        pricing?: { codeDiscount: number; final: number; code: string | null }
        codeRejected?: string | null
      }
      if (!res.ok || !data.pricing) {
        setError(c.discount?.invalidCode ?? 'This code is not valid.')
        return
      }
      if (data.codeRejected || !data.pricing.code || data.pricing.codeDiscount <= 0) {
        setApplied(null)
        try {
          sessionStorage.removeItem(DISCOUNT_CODE_STORAGE_KEY)
        } catch {
          /* */
        }
        // 🎟️ فاز ۵۸ — پیام شفاف بر اساس دلیل رد سمت سرور
        const rejectedMap = siteContent.payments.ui.codeRejected as Record<string, string> | undefined
        setError(
          ((data.codeRejected && rejectedMap?.[data.codeRejected]) || c.discount?.invalidCode) ??
            'This code is not valid.'
        )
        return
      }
      setApplied({ code: data.pricing.code, amount: data.pricing.codeDiscount, final: data.pricing.final })
      try {
        sessionStorage.setItem(DISCOUNT_CODE_STORAGE_KEY, data.pricing.code)
      } catch {
        /* */
      }
    } catch {
      setError(c.discount?.invalidCode ?? 'This code is not valid.')
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    setApplied(null)
    setCode('')
    setError('')
    try {
      sessionStorage.removeItem(DISCOUNT_CODE_STORAGE_KEY)
    } catch {
      /* */
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-sage/40 bg-sage-light/10 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-sage-dark mb-2 flex items-center gap-1.5">
        <TicketPercent className="w-3.5 h-3.5" aria-hidden="true" /> {c.discount?.haveCode ?? 'Discount code'}
      </p>
      {applied ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-brown-dark bg-butter/40 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
            <Tag className="w-3 h-3" aria-hidden="true" /> {applied.code}
          </span>
          <span className="text-xs font-semibold text-sage-dark">− ${applied.amount.toFixed(2)} · total ${applied.final.toFixed(2)}</span>
          <button type="button" onClick={remove} className="text-[11px] font-semibold text-brown-light hover:text-red-500 cursor-pointer">
            {c.discount?.remove ?? 'Remove'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={c.discount?.placeholder ?? 'CHINESE10'}
            aria-label={c.discount?.haveCode ?? 'Discount code'}
            maxLength={24}
            className="flex-1 min-w-0 bg-white border border-sage-light/40 rounded-xl px-3 py-2 text-sm font-mono tracking-wider text-brown-dark uppercase placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors"
          />
          <button
            type="button"
            onClick={apply}
            disabled={busy || !code.trim()}
            className="shrink-0 bg-sage text-brown-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 min-h-[38px] inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {c.discount?.apply ?? 'Apply'}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[11px] font-semibold text-peach bg-peach-light/30 rounded-lg px-3 py-1.5 mt-2">
          {error}
        </p>
      )}
    </div>
  )
}

interface ClassesPageProps {
  onNavigate: (page: PageKey) => void
  /** ‎#/classes/<slug> — دیالوگ جزئیات این کلاس به‌صورت خودکار باز می‌شود */
  initialSlug?: string
}

// ---------------------------------------------------------------------------
// 🧩 بدنهٔ دیالوگ جزئیات — بین صفحهٔ عمومی و «Preview» پنل ادمین مشترک است
// (یک پیاده‌سازی واحد تا پیش‌نمایش ادمین واقعاً همان نمای عمومی باشد)
// ---------------------------------------------------------------------------
export function ClassDetailContent({
  item,
  onRegister,
  showDiscountCode = false,
}: {
  item: ClassItem
  onRegister: (title: string) => void
  /** 🎟️ فقط صفحهٔ عمومی — پیش‌نمایش ادمین بدون جعبهٔ کد */
  showDiscountCode?: boolean
}) {
  const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
  const isFull = item.status === 'full'

  return (
    <div className="relative">
      <div className={`h-3 rounded-t-3xl ${color.bar}`}></div>
      {/* 🖼️ تصویر کلاس در پنجرهٔ جزئیات */}
      {item.image && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <span
            className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/25 to-transparent"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="p-7">
        <div className="flex items-start justify-between gap-3 mb-4 pr-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`${color.badge} text-xs font-semibold px-3 py-1 rounded-full`}>
                {item.level}
              </span>
              <span className="text-xs text-brown-light">{item.type}</span>
              {isFull && (
                <span className="inline-flex items-center gap-1 bg-peach text-brown-dark text-xs font-bold px-3 py-1 rounded-full">
                  <Ban className="w-3 h-3" aria-hidden="true" />
                  Class full
                </span>
              )}
              {item.status === 'draft' && (
                <span className="inline-flex items-center gap-1 bg-white border border-dashed border-sage text-sage-dark text-xs font-bold px-3 py-1 rounded-full">
                  Draft preview
                </span>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-brown-dark text-left">
              {item.title}
            </DialogTitle>
          </div>
        </div>

        <p className="text-sm text-brown-light leading-relaxed mb-5">{item.text}</p>

        {/* توضیح کامل — فقط وقتی ادمین پُر کرده باشد */}
        {item.fullDescription && (
          <p className="text-sm text-brown leading-relaxed mb-5 whitespace-pre-line">{item.fullDescription}</p>
        )}

        {/* ویدیوی معرفی — فقط وقتی پیکربندی شده */}
        {item.videoUrl && (
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-sage-dark hover:text-brown-dark transition-colors"
          >
            <PlayCircle className="w-4 h-4" aria-hidden="true" />
            Watch the intro video
          </a>
        )}

        {/* قیمت — با ارائهٔ شفاف تخفیف خودکار بسته (فاز ۴۷) */}
        <div className="flex flex-wrap items-start gap-3 mb-6 bg-white rounded-2xl p-4 border border-sage-light/20">
          <div className="flex-1 min-w-[140px]">
            <p className="text-[11px] uppercase tracking-wider text-brown-light mb-0.5">
              {c.priceLabel}
            </p>
            {item.pricing && item.pricing.base > 0 ? (
              <div>
                {item.pricing.tierPercent > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm text-brown-light line-through" aria-label="original price">
                        ${item.pricing.base.toFixed(2)}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-peach text-brown-dark text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" aria-hidden="true" />
                        {item.pricing.tierPercent}% OFF
                      </span>
                    </div>
                    <p className="text-xl font-bold text-sage-dark">
                      ${item.pricing.final.toFixed(2)}
                      <span className="text-xs font-semibold text-brown-light"> USD</span>
                    </p>
                    <p className="text-[11px] font-semibold text-sage-dark mt-1">
                      {c.discount?.saveLabel?.replace('{amount}', `$${item.pricing.tierDiscount.toFixed(2)}`) ?? `You save $${item.pricing.tierDiscount.toFixed(2)}`}
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-bold text-sage-dark">
                    ${item.pricing.final.toFixed(2)}
                    <span className="text-xs font-semibold text-brown-light"> USD</span>
                  </p>
                )}
                <p className="text-[11px] font-semibold text-sage-dark mt-1">
                  {c.discount?.packageOf?.replace('{sessions}', String(item.pricing.sessions)).replace('{perSession}', item.pricing.pricePerSession.toFixed(2)) ?? `${item.pricing.sessions} sessions × $${item.pricing.pricePerSession.toFixed(2)}`}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xl font-bold text-sage-dark">{item.price}</p>
                <p className="text-xs text-brown-light mt-0.5">{item.priceNote}</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-brown">
            {item.meta.map((m, j) => {
              const Icon = iconMap[m.icon] ?? Monitor
              return (
                <span key={j} className="inline-flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${color.meta}`} /> {m.text}
                </span>
              )
            })}
            {item.schedule && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${color.meta}`} /> {item.schedule}
              </span>
            )}
          </div>
          {showDiscountCode && item.productId && item.status !== 'full' && (
            <div className="w-full">
              <DiscountCodeBox productId={item.productId} />
            </div>
          )}
        </div>

        {/* سرفصل‌ها */}
        {item.highlights.length > 0 && (
          <>
            <p className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sage-light/40 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage-dark" />
              </span>
              {c.whatYouLearn}
            </p>
            <ul className="space-y-2.5 mb-6">
              {item.highlights.map((h, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-brown animate-ct-fadeInUp" style={{ animationDelay: `${j * 70}ms` }}>
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${color.meta}`} />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* سرفصل کامل دوره — فقط وقتی ادمین پُر کرده باشد */}
        {item.curriculum.length > 0 && (
          <>
            <p className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sage-light/40 flex items-center justify-center">
                <ListOrdered className="w-3.5 h-3.5 text-sage-dark" />
              </span>
              Curriculum
            </p>
            <ol className="space-y-2 mb-6">
              {item.curriculum.map((h, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-brown">
                  <span className={`w-5 h-5 rounded-full ${color.chip} text-brown-dark text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                    {j + 1}
                  </span>
                  {h}
                </li>
              ))}
            </ol>
          </>
        )}

        {/* پیش‌نیازها */}
        {item.requirements.length > 0 && (
          <>
            <p className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sage-light/40 flex items-center justify-center">
                <BookOpenCheck className="w-3.5 h-3.5 text-sage-dark" />
              </span>
              Requirements
            </p>
            <ul className="space-y-2 mb-6">
              {item.requirements.map((h, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-brown">
                  <span className={`w-1.5 h-1.5 rounded-full ${color.bar} shrink-0 mt-1.5`} aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* مناسب چه کسانی */}
        {item.audience.length > 0 && (
          <>
            <p className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sage-light/40 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-sage-dark" />
              </span>
              Who this class is for
            </p>
            <ul className="space-y-2 mb-6">
              {item.audience.map((h, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-brown">
                  <span className={`w-1.5 h-1.5 rounded-full ${color.bar} shrink-0 mt-1.5`} aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* منابع/ابزار */}
        {item.materials.length > 0 && (
          <>
            <p className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sage-light/40 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-sage-dark" />
              </span>
              Materials included
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {item.materials.map((h, j) => (
                <span key={j} className={`text-xs px-3 py-1.5 rounded-full text-brown ${color.chip}`}>
                  {h}
                </span>
              ))}
            </div>
          </>
        )}

        {/* یادداشت اضافی ادمین */}
        {item.notes && (
          <div className="bg-butter/15 rounded-2xl p-4 mb-5 text-xs text-brown flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-brown" />
            {item.notes}
          </div>
        )}

        {/* یادداشت کلاس آزمایشی + دکمه‌ها */}
        <div className="bg-butter/15 rounded-2xl p-4 mb-5 text-xs text-brown flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-brown" />
          {c.detailsNote}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onRegister(item.title)}
            className="flex-1 min-w-[160px] bg-sage text-brown-dark py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center justify-center gap-2 btn-lift"
          >
            {isFull ? 'Join the waitlist' : 'Register'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {/* 🚫 دکمهٔ «Pay with USDT» از این پنجره حذف شد (درخواست مالک) —
            مسیر خرید: Register → ثبت‌نام → صفحهٔ پرداخت خودکار باز می‌شود */}
      </div>
    </div>
  )
}

export function ClassesPage({ onNavigate, initialSlug }: ClassesPageProps) {
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState<ClassItem[]>(FILE_ITEMS)
  // 🔁 دیالوگ بر اساس slug مشتق می‌شود — با جایگزینی دادهٔ سرور، قیمت محاسبه‌شده
  // و تخفیفِ واقعی خودکار در دیالوگِ باز به‌روز می‌شود (فاز ۴۷)
  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [fetchedDetail, setFetchedDetail] = useState<ClassItem | null>(null)
  const detail = useMemo<ClassItem | null>(() => {
    if (!detailSlug) return null
    return items.find((i) => i.slug === detailSlug) ?? fetchedDetail
  }, [detailSlug, items, fetchedDetail])
  const setDetail = useCallback((item: ClassItem | null) => {
    setDetailSlug(item ? item.slug : null)
    setFetchedDetail(item)
  }, [])

  // 🎓 فاز ۴۲ — فهرست واقعی از منبع حقیقت (پنل ادمین → جدول CourseClass).
  // رندر اولیه با نسخهٔ فایل است تا صفحه فوراً دیده شود؛ سپس دادهٔ سرور جایگزین
  // می‌شود (تغییر نام/قیمت/محتوا از پنل بدون ری‌استارت این‌جا اعمال می‌شود).
  useEffect(() => {
    let alive = true
    fetch('/api/classes', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { classes?: ClassItem[] }) => {
        if (!alive) return
        if (Array.isArray(data.classes) && data.classes.length > 0) {
          setItems(data.classes)
        }
      })
      .catch(() => {
        // شبکه/سرور در دسترس نیست — نسخهٔ فایل باقی می‌ماند (fallback)
      })
    return () => {
      alive = false
    }
  }, [])

  // 🔗 ‎#/classes/<slug> — باز شدن خودکار دیالوگ جزئیات. الگوی مجاز React:
  // تنظیم state مشروط در فاز رندر (وقتی prop جدیدی آمد) + fetch تک‌کلاس در
  // effect برای slugهایی که هنوز در فهرست محلی نیستند.
  const [autoOpenedSlug, setAutoOpenedSlug] = useState('')
  if (initialSlug && autoOpenedSlug !== initialSlug) {
    const found = items.find((i) => i.slug === initialSlug)
    if (found) {
      setAutoOpenedSlug(initialSlug)
      setDetail(found)
    }
  }
  useEffect(() => {
    if (!initialSlug || autoOpenedSlug === initialSlug) return
    // در فهرست محلی نبود — از API تک‌کلاس بپرس (کلاس تازه ممکن است هنوز در
    // نسخهٔ کش‌شدهٔ فهرست نباشد)
    let alive = true
    fetch(`/api/classes/${encodeURIComponent(initialSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { class?: ClassItem }) => {
        if (alive && data.class) {
          setAutoOpenedSlug(initialSlug)
          setDetail(data.class)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [initialSlug, autoOpenedSlug])

  // 🔁 وقتی فهرست با دادهٔ سرور جایگزین می‌شود، دیالوگِ باز هم تازه شود —
  // تا قیمت محاسبه‌شده/تخفیفِ واقعی (به‌جای نسخهٔ فایل) در دیالوگ دیده شود (فاز ۴۷)
  // (مشتق‌شده در useMemo بالا — بدون setState در effect)

  // با ناوبری به صفحهٔ دیگر، پنجرهٔ جزئیات بسته شود
  useCloseOnNavigate(useCallback(() => setDetail(null), []))

  const visible = items.filter(
    (item) => filter === 'all' || item.category.split(' ').includes(filter)
  )

  const handleRegister = useCallback(
    (title: string) => {
      selectClassForRegistration(title)
      setDetail(null)
      onNavigate('register')
    },
    [onNavigate]
  )

  return (
    <div id="page-classes">
      <section className="pt-32 pb-12 md:pt-40 relative overflow-hidden bg-cream">
        {/* 🌸 تزئینات ملایم هیرو — کاراکتر محو، هالهٔ کره‌ای، برگ و نقطه‌ها */}
        <div
          aria-hidden="true"
          className="absolute -top-10 -left-16 w-72 h-72 bg-butter/25 rounded-full blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          className="absolute top-28 right-0 w-1/2 h-64 ct-dots opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]"
        ></div>
        <div className="char-bg top-14 right-[4%]" style={{ fontSize: '210px', opacity: 0.05 }}>
          学
        </div>
        <svg
          aria-hidden="true"
          className="absolute bottom-8 left-[6%] w-11 opacity-60 animate-ct-floatSlow hidden md:block"
          viewBox="0 0 56 40"
        >
          <g transform="translate(3 20)"><Leaflet w={46} mode="sage" /></g>
        </svg>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {c.eyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{c.title}</h1>
            <p className="text-brown-light max-w-2xl mx-auto">{c.subtitle}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-6" role="tablist" aria-label="Class filters">
            {c.filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                role="tab"
                aria-selected={filter === f.key}
                className={`filter-btn px-5 py-2 rounded-full text-sm font-medium bg-sage-light/30 text-brown transition-all cursor-pointer ${
                  filter === f.key ? 'active' : ''
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* 🖨️ نسخهٔ چاپی/PDF برنامهٔ کلاس‌ها (فاز ۲۲) — در چاپ خودش مخفی می‌شود */}
          <div className="flex justify-center mb-12 no-print">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-white border border-sage/40 text-brown px-5 py-2.5 rounded-full text-sm font-medium hover:border-sage hover:bg-sage/10 transition-all cursor-pointer min-h-[44px]"
              title="Print or save the class schedule as PDF"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {c.printButton}
            </button>
          </div>
        </div>
      </section>

      {/* 🎯 سکشن تبلیغاتی آمادگی HSK با شمارش معکوس زنده (از فایل محتوا) */}
      <div className="max-w-7xl mx-auto px-6">
        <HskPromo onNavigate={onNavigate} />
      </div>

      <section className="pb-24 bg-sec-sage relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از هیروی کرم + کاراکتر محو 语 و نقاط تزئینی */}
        <CurveDivider fill="var(--color-cream)" />
        <div className="char-bg top-16 left-[3%]" style={{ fontSize: '200px', opacity: 0.05 }}>
          语
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-32 right-[4%] w-48 h-48 ct-dots opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"
        ></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          {/* 🖨️ سربرگ مخصوص نسخهٔ چاپی — فقط در print دیده می‌شود */}
          <div className="hidden print:block mb-6 pb-3 border-b border-neutral-300">
            <p className="text-xl font-bold">Chinese Toon · Class Schedule</p>
            <p className="text-xs text-neutral-500 mt-1">Printed {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })} — chinesetoon.com</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visible.map((item, i) => {
              const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
              return (
                <div
                  key={item.slug || i}
                  className={`class-card bg-white rounded-3xl overflow-hidden card-hover card-wave border ${color.border} animate-ct-fadeInUp`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`h-3 ${color.bar}`}></div>
                  {/* 🖼️ کاور تصویری کلاس (اگر ادمین تصویر ست کرده باشد) */}
                  {item.image && (
                    <div className="relative h-40 overflow-hidden group/cover">
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      {/* لایهٔ سایهٔ نرم پایین کاور برای خوانایی بَج‌ها */}
                      <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`${color.badge} text-xs font-semibold px-3 py-1 rounded-full`}>
                        {item.level}
                      </span>
                      <span className="text-xs text-brown-light">{item.type}</span>
                    </div>
                    <h3 className="text-xl font-bold text-brown-dark mb-2">{item.title}</h3>
                    <p className="text-sm text-brown-light mb-6">{item.text}</p>
                    <div className="space-y-3 mb-6">
                      {item.meta.map((m, j) => {
                        const Icon = iconMap[m.icon] ?? Monitor
                        return (
                          <div key={j} className="flex items-center gap-2 text-sm">
                            <Icon className={`w-4 h-4 ${color.meta}`} />
                            <span className="text-brown">{m.text}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className={`flex items-center justify-between pt-4 border-t ${color.border}`}>
                      <span className="text-sm text-brown-light">{item.schedule}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetail(item)}
                          className="bg-white border border-sage-light/50 text-brown px-4 py-2 rounded-full text-sm font-semibold hover:border-sage hover:text-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          aria-label={`${c.detailsButton} — ${item.title}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                          {c.detailsButton}
                        </button>
                        <button
                          onClick={() => handleRegister(item.title)}
                          className="bg-sage text-brown-dark px-5 py-2 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer"
                        >
                          Register
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {visible.length === 0 && (
            <div className="text-center py-16 text-brown-light">
              <SearchX className="w-10 h-10 mx-auto mb-3 text-sage-dark" />
              <p>No classes found for this filter.</p>
            </div>
          )}

          {/* 🧩 آزمون تعیین سطح سریع — از تب Learn به این‌جا منتقل شد (تسک ۴۷):
              «مطمئن نیستی کدام کلاس مناسب توست؟» → همین‌جا قبل از جعبهٔ راهنما */}
          <LevelQuiz key="classes-level-quiz" onNavigate={onNavigate} />

          <div className="text-center mt-16 bg-white rounded-3xl p-10 shadow-sm border border-sage-light/20">
            <h3 className="text-xl font-bold text-brown-dark mb-3">{c.helpBox.title}</h3>
            <p className="text-sm text-brown-light mb-6">{c.helpBox.text}</p>
            <button
              onClick={() => onNavigate('register')}
              className="bg-sage text-brown-dark px-8 py-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer"
            >
              {c.helpBox.button} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* پنجرهٔ جزئیات کلاس — بدنهٔ مشترک با Preview ادمین */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="bg-cream border-sage-light/30 rounded-3xl max-w-lg max-h-[85vh] overflow-y-auto p-0">
          {detail && <ClassDetailContent item={detail} onRegister={handleRegister} showDiscountCode />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
