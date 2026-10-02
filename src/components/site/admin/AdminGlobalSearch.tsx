'use client'

// ---------------------------------------------------------------------------
// 🔎 جست‌وجوی سراسری پنل ادمین (فاز ۵۲ — بند ۸)
//
// ورودی در هدر پنل؛ نتایج از GET /api/admin/search (کوئری سمت سرور/دیتابیس —
// هیچ‌وقت کل دیتابیس به مرورگر بارگذاری نمی‌شود). debounce ۳۵۰ms + حالت‌های
// Loading / Empty / Error. کلیک روی نتیجه = باز شدن تب مربوطه (صفحهٔ جزئیات
// موجود همان بخش) با پاس دادن عبارت جست‌وجو به فیلتر تب.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, GraduationCap, Loader2, Search, TicketPercent, User, Wallet, X } from 'lucide-react'

export type SearchTarget = 'users' | 'orders' | 'classes' | 'discounts' | 'payments'

interface SearchResults {
  q: string
  total: number
  results: {
    users: Array<{ id: string; name: string; email: string; country: string; createdAt: string }>
    orders: Array<{ ref: string; productTitle: string; contactEmail: string; amountUsd: string; status: string; createdAt: string }>
    classes: Array<{ id: string; title: string; slug: string; productId: string; status: string; packagePrice: number }>
    discounts: Array<{ id: string; code: string; type: string; value: number; active: boolean; archived: boolean; maxUses: number | null }>
    payments: Array<{ id: string; kind: string; orderRef: string | null; txHash: string | null; createdAt: string }>
  }
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl pl-9 pr-8 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

const ORDER_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  DETECTED: 'bg-butter text-brown',
  RECEIPT_SUBMITTED: 'bg-sage-light/40 text-sage-dark',
  PAID: 'bg-green-100 text-green-800',
  REJECTED: 'bg-peach-light/70 text-brown-dark',
  UNDERPAID: 'bg-orange-100 text-orange-800',
  EXPIRED: 'bg-red-100/70 text-red-700/90',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

export function AdminGlobalSearch({
  token,
  onOpen,
}: {
  token: string
  onOpen: (target: SearchTarget, query: string) => void
}) {
  const [value, setValue] = useState('')
  const [debounced, setDebounced] = useState('')
  const [data, setData] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // debounce ۳۵۰ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 350)
    return () => clearTimeout(t)
  }, [value])

  // الگوی رسمی ریکت: حالت‌گذاری هنگام تغییر کوئری در رندر (بدون setState داخل بدنهٔ effect) —
  // کوئری کوتاه‌تر از ۲ حرف = بدون نتیجه؛ کوئری معتبر = حالت Loading روشن
  const [prevDebounced, setPrevDebounced] = useState('')
  if (prevDebounced !== debounced) {
    setPrevDebounced(debounced)
    setData(null)
    setError('')
    setLoading(debounced.length >= 2)
  }

  // کوئری سمت سرور — فقط برای ورودی معتبر (≥۲ حرف)؛ setState فقط در کال‌بک‌ها
  useEffect(() => {
    if (debounced.length < 2) return
    let cancelled = false
    fetch(`/api/admin/search?q=${encodeURIComponent(debounced)}`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('search failed')
        const d = (await res.json()) as SearchResults
        if (!cancelled) {
          setData(d)
          setOpen(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Search failed — please try again.')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, token])

  // بستن با کلیک بیرون
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const openTarget = useCallback(
    (target: SearchTarget, query: string) => {
      setOpen(false)
      onOpen(target, query)
    },
    [onOpen]
  )

  const r = data?.results
  const showPanel = open && (loading || !!error || (data !== null && debounced.length >= 2))

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brown-light/70 pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search users, orders, classes, codes, transactions…"
        aria-label="Global admin search"
        className={inputCls}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('')
            setDebounced('')
            setData(null)
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream/80 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showPanel && (
        <div
          className="absolute z-40 mt-2 w-full bg-white border border-sage-light/40 rounded-2xl shadow-xl p-3 max-h-[420px] overflow-y-auto ct-scroll-area"
          role="listbox"
          aria-label="Search results"
        >
          {loading && (
            <p className="text-xs text-brown-light flex items-center gap-2 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </p>
          )}
          {!loading && error && (
            <p className="text-xs text-red-600 flex items-center gap-2 py-4 justify-center">
              <CircleAlert className="w-4 h-4" /> {error}
            </p>
          )}
          {!loading && !error && data && data.total === 0 && (
            <p className="text-xs text-brown-light py-4 text-center">No results for “{data.q}”.</p>
          )}
          {!loading && !error && r && data && data.total > 0 && (
            <div className="space-y-3">
              {r.orders.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-1">Orders</p>
                  {r.orders.map((o) => (
                    <button
                      key={o.ref}
                      type="button"
                      onClick={() => openTarget('orders', o.ref)}
                      className="w-full text-left flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-sage-light/20 transition-colors cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs font-mono font-bold text-brown-dark">{o.ref}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ORDER_STYLES[o.status] ?? ORDER_STYLES.CANCELLED}`}>
                        {o.status}
                      </span>
                      <span className="text-[11px] text-brown-light truncate flex-1 min-w-32">{o.productTitle} · {o.contactEmail}</span>
                      <span className="text-[11px] font-bold text-brown-dark tabular-nums">${o.amountUsd} USD</span>
                    </button>
                  ))}
                </section>
              )}
              {r.users.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-1">Users</p>
                  {r.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => openTarget('users', u.email)}
                      className="w-full text-left flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-sage-light/20 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs font-bold text-brown-dark truncate">{u.name}</span>
                      <span className="text-[11px] text-brown-light truncate flex-1 min-w-32">{u.email}</span>
                      <span className="text-[10px] text-brown-light/70">{u.country}</span>
                    </button>
                  ))}
                </section>
              )}
              {r.classes.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-1">Classes</p>
                  {r.classes.map((cl) => (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => openTarget('classes', cl.title)}
                      className="w-full text-left flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-sage-light/20 transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs font-bold text-brown-dark truncate">{cl.title}</span>
                      <span className="text-[10px] font-semibold text-brown-light">{cl.status}</span>
                      <span className="text-[11px] text-brown-light truncate flex-1 min-w-32">{cl.slug}</span>
                      <span className="text-[11px] font-bold text-brown-dark tabular-nums">${cl.packagePrice.toFixed(2)}</span>
                    </button>
                  ))}
                </section>
              )}
              {r.discounts.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-1">Discount codes</p>
                  {r.discounts.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => openTarget('discounts', d.code)}
                      className="w-full text-left flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-sage-light/20 transition-colors cursor-pointer"
                    >
                      <TicketPercent className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs font-mono font-bold text-brown-dark">{d.code}</span>
                      <span className="text-[11px] text-brown-light">
                        {d.type === 'fixed' ? `$${d.value.toFixed(2)} off` : `${d.value}% off`}
                      </span>
                      {d.archived && <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">Archived</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.active && !d.archived ? 'bg-sage text-brown-dark' : 'bg-neutral-200 text-neutral-600'}`}>
                        {d.archived ? 'Archived' : d.active ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  ))}
                </section>
              )}
              {r.payments.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-1">Payment events</p>
                  {r.payments.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openTarget('payments', p.orderRef ?? '')}
                      className="w-full text-left flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-sage-light/20 transition-colors cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" aria-hidden="true" />
                      <span className="text-[10px] font-bold bg-butter/50 text-brown px-2 py-0.5 rounded-full">{p.kind}</span>
                      <span className="text-[11px] font-mono text-brown truncate flex-1 min-w-40">{p.txHash ?? '—'}</span>
                      {p.orderRef && <span className="text-[11px] font-mono font-bold text-brown-dark">{p.orderRef}</span>}
                      <span className="text-[10px] text-brown-light/70">{fmt(p.createdAt)}</span>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
