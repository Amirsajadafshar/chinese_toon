'use client'

// ---------------------------------------------------------------------------
// 👤 استور کلاینتِ احراز هویت مشتری (فاز ۳۰)
//
// الگوی رسمی پروژه: useSyncExternalStore + سینگلتون روی globalThis
// (مثل استور «کلاس انتخاب‌شده» در RegisterPage) — با HMR استور بین ریلودهای
// ماژول بازسازی نمی‌شود و state از دست نمی‌رود.
//
// منبع داده: GET /api/auth/me → { user, orders } — واکشی فقط با اولین
// استفادهٔ کلاینت (subscribe) انجام می‌شود؛ سرور همیشه snapshot خالی می‌دهد
// تا hydration mismatch نداشته باشیم.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react'
import { resilientJsonFetch } from '@/lib/client-fetch'

// خروجی امن کاربر — قرارداد مشترک با toSafeUser سمت سرور (src/lib/user-auth.ts)
export interface SafeUserLike {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  countryCode: string
  phone: string | null
  telegramUsername: string | null
  telegramId: string | null
  // 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر (از /api/auth/me می‌آید)
  uniqueCode?: string | null
  createdAt: string
  lastLoginAt: string | null
}

// سفارش در نمای کاربر — قرارداد مشترک با GET /api/auth/me
export interface OrderLike {
  ref: string
  productTitle: string
  productId: string
  classSlug?: string | null
  sessions?: number | null
  amountUsd: string
  // فاز ۵۹ — RECEIPT_SUBMITTED (رسید در انتظار بررسی) و REJECTED (ردّ ادمین)
  status: 'PENDING' | 'DETECTED' | 'PAID' | 'UNDERPAID' | 'EXPIRED' | 'CANCELLED' | 'RECEIPT_SUBMITTED' | 'REJECTED'
  rawStatus: string
  // 🎓 وضعیت ثبت‌نام جدا از پرداخت — مشتق سمت سرور از جلسات/ثبت‌نام
  enrollmentStatus?: 'REGISTERED' | 'ORDERED' | 'PAID' | 'PREFERENCES_SUBMITTED' | 'SCHEDULE_PROPOSED' | 'ENROLLED' | 'COMPLETED'
  nextSessionAt?: string | null
  discountCode?: string | null
  // 💳 فاز ۵۹ — روش پرداخت و وضعیت رسید دستی
  currency?: string
  paymentMethod?: string
  receiptStatus?: string | null
  receiptUrl?: string | null
  receiptSubmittedAt?: string | null
  reviewedAt?: string | null
  rejectionReason?: string | null
  txHash: string | null
  paidAt: string | null
  createdAt: string
  expiresAt: string
}

export interface UserState {
  loading: boolean
  user: SafeUserLike | null
  orders: OrderLike[] | null
}

interface MeResponse {
  user?: SafeUserLike | null
  orders?: unknown
  error?: string
}

// ---------------------------------------------------------------------------
// استور سینگلتون
// ---------------------------------------------------------------------------

class UserStore {
  private state: UserState = { loading: true, user: null, orders: null }
  private listeners = new Set<() => void>()
  private started = false

  getState = (): UserState => this.state

  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback)
    // اولین استفاده از استور → واکشی یک‌باره از سرور
    this.start()
    return () => {
      this.listeners.delete(callback)
    }
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  private set(next: UserState) {
    this.state = next
    this.emit()
  }

  private start() {
    if (this.started) return // حتی با چند مشترک، فقط یک واکشی
    this.started = true
    void this.refresh()
  }

  /** واکشی/به‌روزرسانی کاربر و سفارش‌ها — بعد از ثبت‌نام/ورود/پرداخت هم صدا زده می‌شود */
  refresh = async (): Promise<void> => {
    // 🌐 فاز ۶۲ — fetch تاب‌آور: خطای لحظه‌ای شبکه/502 دیگر کاربر واردشده را
    // بی‌صدا «مهمان» نمی‌کند؛ ابتدا خودش تلاش مجدد می‌کند، و اگر سرور واقعاً
    // در دسترس نبود، وضعیت قبلی حفظ می‌شود (پاک‌سازی نشست فقط با logout واقعی)
    const result = await resilientJsonFetch<MeResponse>('/api/auth/me', { cache: 'no-store' })
    if (result.ok && result.data && typeof result.data === 'object' && 'user' in result.data) {
      this.set({
        loading: false,
        user: result.data.user ?? null,
        orders: Array.isArray(result.data.orders) ? (result.data.orders as OrderLike[]) : [],
      })
      return
    }
    if (result.ok) {
      // پاسخ معتبر ولی غیرمنتظره — مهمان فرض می‌شود
      this.set({ loading: false, user: null, orders: [] })
      return
    }
    // unreachable/badjson: اگر قبلاً کاربر داشتیم، حفظش می‌کنیم؛
    // اگر اولین واکشی بود، مهمان (تا فرم‌ها همیشه در دسترس باشند)
    if (this.state.user) {
      this.set({ loading: false, user: this.state.user, orders: this.state.orders ?? [] })
    } else {
      this.set({ loading: false, user: null, orders: [] })
    }
  }

  /** خروج — حذف نشست سمت سرور و سپس خالی‌کردن استور */
  logout = async (): Promise<void> => {
    try {
      // روی unreachable هم تلاش مجدد می‌کند؛ در هر حال استور خالی می‌شود
      await resilientJsonFetch('/api/auth/logout', { method: 'POST' }, { attempts: 2 })
    } catch {
      // حتی با شکست شبکه، استور خالی می‌شود (کوکی با انقضای ۳۰ روزه می‌ماند ولی نادیده گرفته می‌شود)
    }
    await this.refresh()
  }
}

// 🧊 نگهداری روی globalThis تا HMR ماژول، استور را دوباره نسازد
const g = globalThis as unknown as { __ctUserStore?: UserStore }
const store: UserStore = g.__ctUserStore ?? new UserStore()
g.__ctUserStore = store

// سرور سنپ‌شات ثابت — همیشه «در حال لود» تا رندر SSR با اولین رندر کلاینت یکی باشد
const serverSnapshot: UserState = { loading: true, user: null, orders: null }

/** هوک اصلی — وضعیت جاری کاربر + سفارش‌هایش */
export function useUser(): UserState {
  return useSyncExternalStore(store.subscribe, store.getState, () => serverSnapshot)
}

/** به‌روزرسانی دستی استور (بعد از لاگین/ثبت‌نام/پرداخت) */
export function refreshUser(): Promise<void> {
  return store.refresh()
}

/** خروج از حساب */
export function logoutUser(): Promise<void> {
  return store.logout()
}
