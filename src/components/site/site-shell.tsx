'use client'

// ---------------------------------------------------------------------------
// 🧭 پوستهٔ مشترک همهٔ روت‌ها — Header/Toast/BackToTop/Footer + کانتکست ناوبری.
//
// ⚙️ فاز SEO — سایت از SPA هش‌محور (#/classes) به روت‌های واقعی App Router
// (/classes) تبدیل شد تا هر نما آدرس مستقل و قابل ایندکس گوگل داشته باشد.
// این فایل جایگزین چرخهٔ page.tsx قدیمی است:
//   • activePage از pathname خوانده می‌شود (نه window.location.hash)
//   • navigateTo/go با router.push کار می‌کنند
//   • لینک‌های قدیمی ‎/#/xxx با LegacyHashRedirect یک‌بار به روت واقعی
//     ریدایرکت می‌شوند (رفتار 307 قبلی next.config جایگزین شده است)
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { Toast } from './Toast'
import { BackToTop } from './BackToTop'
import { useReveal } from './useReveal'
import { setAppRouter } from '@/lib/nav'
import { PageKey } from '@/content/site-content'

interface SiteContextValue {
  /** نمای فعال برای هایلایت منو (مشتق از pathname) */
  activePage: PageKey
  /** ناوبری به یکی از نمای‌های اصلی سایت — هم‌امضای onNavigate قدیمی صفحات */
  navigateTo: (page: PageKey) => void
  /** ناوبری به هر مسیر واقعی (مثلاً /blog/slug یا /pay/new?product=x) */
  go: (path: string) => void
  /** جایگزینی مسیر بدون افزودن به history (مثل replaceHash قدیمی) */
  replace: (path: string) => void
  /** پیام شناور — هم‌امضای onToast قدیمی صفحات */
  showToast: (message: string) => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

/** دسترسی صفحات به ناوبری/توست — جایگزین props های onNavigate/onToast */
export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used inside <SiteChrome>')
  return ctx
}

/** نگاشت pathname → نمای منو (هم‌ارز pageFromHash قدیمی) */
function pageFromPathname(pathname: string): PageKey {
  const raw = pathname.replace(/^\/+/, '').split(/[/?]/)[0]
  // درس تکی (/lesson/x) → منوی Learn؛ پرداخت (/pay/x) → هایلایت نرم روی ثبت‌نام؛
  // بازیابی رمز → حساب (هماهنگ با رفتار قبلی SPA)
  if (raw === 'lesson') return 'learn'
  if (raw === 'pay') return 'register'
  if (raw === 'forgot-password' || raw === 'reset-password') return 'account'
  const known: PageKey[] = [
    'home',
    'classes',
    'learn',
    'about',
    'blog',
    'reviews',
    'support',
    'register',
    'account',
    'admin',
  ]
  return (known as string[]).includes(raw) ? (raw as PageKey) : 'home'
}

/**
 * 🔁 لینک‌های اشتراک‌گذاشته‌شدهٔ قدیمی (‎/#/classes، ‎/#/blog/slug، ...) —
 * هش سمت سرور ارسال نمی‌شود، پس ریدایرکت باید سمت کلاینت انجام شود.
 * هم در لود اولیه و هم با hashchange کار می‌کند (تا هیچ لینک هش‌محور
 * جامانده‌ای بی‌نتیجه نماند).
 */
function useLegacyHashRedirect() {
  const router = useRouter()
  useEffect(() => {
    const redirect = () => {
      const raw = window.location.hash.replace(/^#\/?/, '')
      if (!raw) return
      const [path, query] = raw.split('?')
      const params = new URLSearchParams(query || '')
      // دیپ‌لینک خیلی قدیمی ‎/#/learn?lesson=x → صفحهٔ اختصاصی درس
      const lesson = params.get('lesson')
      if (path === 'learn' && lesson) {
        router.replace(`/lesson/${encodeURIComponent(lesson)}`)
        return
      }
      if (path === 'home') {
        router.replace('/')
        return
      }
      router.replace(`/${raw}`)
    }
    redirect()
    window.addEventListener('hashchange', redirect)
    return () => window.removeEventListener('hashchange', redirect)
  }, [router])
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // 🧩 توابع خارج از کامپوننت (goToPost، goToLesson، …) هم از router استفاده کنند
  useEffect(() => {
    setAppRouter((path, replace) => (replace ? router.replace(path) : router.push(path)))
    return () => setAppRouter(null)
  }, [router])

  const activePage = useMemo(() => pageFromPathname(pathname || '/'), [pathname])

  // انیمیشن‌های اسکرول با هر تغییر مسیر دوباره فعال شوند
  useReveal(pathname)

  useLegacyHashRedirect()

  const [toastMessage, setToastMessage] = useState('')
  const [toastShow, setToastShow] = useState(false)

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setToastShow(true)
    setTimeout(() => setToastShow(false), 4000)
  }, [])

  const go = useCallback(
    (path: string) => {
      router.push(path.startsWith('/') ? path : `/${path}`)
    },
    [router]
  )

  const replace = useCallback(
    (path: string) => {
      router.replace(path.startsWith('/') ? path : `/${path}`)
    },
    [router]
  )

  const navigateTo = useCallback(
    (page: PageKey) => {
      if (pageFromPathname(window.location.pathname) === page) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      go(page === 'home' ? '/' : `/${page}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [go]
  )

  const value = useMemo(
    () => ({ activePage, navigateTo, go, replace, showToast }),
    [activePage, navigateTo, go, replace, showToast]
  )

  return (
    <SiteContext.Provider value={value}>
      <div className="ct-body min-h-screen flex flex-col">
        <Header activePage={activePage} />
        <Toast message={toastMessage} show={toastShow} />
        <BackToTop />
        <main className="flex-1">{children}</main>
        <Footer onNavigate={navigateTo} onToast={showToast} />
      </div>
    </SiteContext.Provider>
  )
}
