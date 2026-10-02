'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'
import { Toast } from '@/components/site/Toast'
import { HomePage } from '@/components/site/pages/HomePage'
import { ClassesPage } from '@/components/site/pages/ClassesPage'
import { LearnPage } from '@/components/site/pages/LearnPage'
import { AboutPage } from '@/components/site/pages/AboutPage'
import { SupportPage } from '@/components/site/pages/SupportPage'
import { RegisterPage } from '@/components/site/pages/RegisterPage'
import { BlogPage } from '@/components/site/pages/BlogPage'
import { ReviewsPage } from '@/components/site/pages/ReviewsPage'
import { useReveal } from '@/components/site/useReveal'
import { PageKey } from '@/content/site-content'
import { AdminPage } from '@/components/site/pages/AdminPage'
import { LessonDetailPage } from '@/components/site/pages/LessonDetailPage'
import { CheckoutPage } from '@/components/site/pages/CheckoutPage'
import { AccountPage } from '@/components/site/pages/AccountPage'
import { PasswordResetPage } from '@/components/site/pages/PasswordResetPage'
import { BackToTop } from '@/components/site/BackToTop'

const VALID_PAGES: PageKey[] = [
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

// عنوان تب مرورگر برای هر صفحه (SEO و تجربهٔ کاربر)
const PAGE_TITLES: Record<PageKey, string> = {
  home: 'Chinese Toon — Learn Mandarin Chinese',
  classes: 'Classes — Chinese Toon',
  learn: 'Learn — Chinese Toon',
  about: 'About — Chinese Toon',
  blog: 'Blog — Chinese Toon',
  reviews: 'Reviews — Chinese Toon',
  support: 'Support & FAQ — Chinese Toon',
  register: 'Register — Chinese Toon',
  account: 'Account — Chinese Toon',
  admin: 'Admin — Chinese Toon',
}

function pageFromHash(): PageKey {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  // مسیر مقالهٔ تکی وبلاگ: #/blog/slug → نمای blog
  if (raw.startsWith('blog/')) return 'blog'
  // مسیر درس تکی: #/lesson/slug → هایلایت منوی Learn؛ نمای درس جدا رندر می‌شود
  if (raw.startsWith('lesson/')) return 'learn'
  // 🎓 مسیر کلاس تکی: #/classes/<slug> → نمای classes (دیالوگ جزئیات باز می‌شود)
  if (raw.startsWith('classes/')) return 'classes'
  // 🪙 مسیر پرداخت: #/pay/<ref> → هیچی از منو هایلایت نمی‌شود
  if (raw.startsWith('pay/')) return 'register' // هایلایت نرم روی ثبت‌نام؛ نمای اختصاصی پایین رندر می‌شود
  // 🔐 بازیابی رمز: هایلایت نرم روی حساب؛ نمای اختصاصی پایین رندر می‌شود (فاز ۴۰)
  if (raw === 'forgot-password' || raw === 'reset-password') return 'account'
  return (VALID_PAGES as string[]).includes(raw) ? (raw as PageKey) : 'home'
}

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getServerPage(): PageKey {
  return 'home'
}

// اسنپ‌شات خام hash برای محاسبهٔ reactive عنوان تب
function getHashSnapshot(): string {
  return window.location.hash
}

function getServerHash(): string {
  return ''
}

// 🏷️ عنوان تب برای هر نما (شامل مقالهٔ وبلاگ) — به‌صورت <title> داخل درخت
// رندر می‌شود تا React 19 مالکیتش را بر عهده بگیرد؛ قبلاً document.title در
// effect ست می‌شد و بعد از hydration، متادیتای layout آن را بازنویسی می‌کرد
// (عنوان اختصاصی روی لود مستقیم لینک‌ها از دست می‌رفت).
function titleForHash(hash: string): string {
  const raw = hash.replace(/^#\/?/, '').split('?')[0]
  if (raw.startsWith('blog/')) {
    const slug = decodeURIComponent(raw.slice(5)) || ''
    const pretty = slug
      .split('-')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ')
    return pretty ? `${pretty} — Chinese Toon` : PAGE_TITLES.blog
  }
  // درس تکی
  if (raw.startsWith('lesson/')) return 'Lesson — Chinese Toon'
  // 🎓 کلاس تکی — عنوان از slug قابل نمایش نیست؛ عنوان عمومی کلاس‌ها
  if (raw.startsWith('classes/')) return 'Class — Chinese Toon'
  // 🪙 پرداخت
  if (raw.startsWith('pay/')) return 'Payment — Chinese Toon'
  // 🔐 بازیابی رمز (فاز ۴۰)
  if (raw === 'forgot-password') return 'Reset Password — Chinese Toon'
  if (raw === 'reset-password') return 'New Password — Chinese Toon'
  const page = (VALID_PAGES as string[]).includes(raw) ? (raw as PageKey) : 'home'
  return PAGE_TITLES[page]
}

export default function Home() {
  // صفحهٔ فعال از hash خوانده می‌شود (#/home، #/support، ...)
  const activePage = useSyncExternalStore(subscribeToHash, pageFromHash, getServerPage)

  // hash خام برای عنوان reactive تب (بدون mismatch در hydration — سرور «home» برمی‌گرداند)
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerHash)

  // 📚 نمای درس تکی — اگر hash با lesson/ شروع شود، به‌جای صفحهٔ Learn رندر می‌شود
  const lessonSlug = (() => {
    const raw = hash.replace(/^#\/?/, '').split('?')[0]
    return raw.startsWith('lesson/') ? decodeURIComponent(raw.slice(7)) : ''
  })()
  // 🎓 نمای کلاس تکی — ‎#/classes/<slug> → ClassesPage با دیالوگ بازِ همان کلاس (فاز ۴۲)
  const classSlug = (() => {
    const raw = hash.replace(/^#\/?/, '').split('?')[0]
    const slug = raw.startsWith('classes/') ? decodeURIComponent(raw.slice(8)).split('/')[0] : ''
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : ''
  })()
  // 🪙 نمای پرداخت — ‎#/pay/<ref> یا ‎#/pay/new?product=<id>
  const payView = (() => {
    const raw = hash.replace(/^#\/?/, '')
    if (!raw.startsWith('pay/')) return null
    const [path, query] = raw.slice(4).split('?')
    const ref = decodeURIComponent(path || '')
    const productId = new URLSearchParams(query || '').get('product') || undefined
    // «new» یعنی حالت ساخت سفارش — ref خالی می‌ماند تا CheckoutPage سفارش بسازد
    return { ref: ref === 'new' ? '' : ref, productId }
  })()
  // 🔐 نمای بازیابی رمز — ‎#/forgot-password یا ‎#/reset-password?token=… (فاز ۴۰)
  const resetView = (() => {
    const raw = hash.replace(/^#\/?/, '')
    const [path, query] = raw.split('?')
    if (path === 'forgot-password') return { mode: 'forgot' as const, token: '' }
    if (path === 'reset-password') {
      const token = new URLSearchParams(query || '').get('token')?.trim() || ''
      return { mode: 'reset' as const, token }
    }
    return null
  })()
  const documentTitle = titleForHash(hash)

  // انیمیشن‌های اسکرول با هر تغییر صفحه دوباره فعال شوند
  useReveal(activePage)

  const [toastMessage, setToastMessage] = useState('')
  const [toastShow, setToastShow] = useState(false)

  const navigateTo = useCallback((page: PageKey) => {
    if (pageFromHash() === page) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.location.hash = `/${page}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setToastShow(true)
    setTimeout(() => setToastShow(false), 4000)
  }, [])

  return (
    <>
      {/* 🏷️ React 19 این <title> را به head منتقل می‌کند و با هر ناوبری به‌روزرسانی‌اش می‌کند */}
      <title>{documentTitle}</title>
      <div className="ct-body min-h-screen flex flex-col">
        <Header activePage={activePage} onNavigate={navigateTo} />

        <Toast message={toastMessage} show={toastShow} />

        <BackToTop />

        <main className="flex-1">
          {/* 🎬 هر صفحه یک wrapper با انیمیشن ورود دارد — هنگام تغییر display
              از none به block، انیمیشن ct-page-in دوباره اجرا می‌شود
              (صفحات mounted می‌مانند تا state از دست نرود) */}
          <div className="ct-page-view" style={{ display: activePage === 'home' ? 'block' : 'none' }}>
            <HomePage onNavigate={navigateTo} />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'classes' ? 'block' : 'none' }}>
            <ClassesPage onNavigate={navigateTo} initialSlug={classSlug} />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'learn' && !lessonSlug ? 'block' : 'none' }}>
            <LearnPage />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'about' ? 'block' : 'none' }}>
            <AboutPage onNavigate={navigateTo} />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'blog' ? 'block' : 'none' }}>
            <BlogPage />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'reviews' ? 'block' : 'none' }}>
            <ReviewsPage />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'support' ? 'block' : 'none' }}>
            <SupportPage onToast={showToast} />
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'register' && !payView ? 'block' : 'none' }}>
            <RegisterPage onToast={showToast} />
          </div>
          {/* 👤 حساب کاربری — ثبت‌نام/ورود/پروفایل مشتری (فاز ۳۰) */}
          <div className="ct-page-view" style={{ display: activePage === 'account' && !resetView ? 'block' : 'none' }}>
            <AccountPage onNavigate={navigateTo} onToast={showToast} />
          </div>
          {/* 🔐 بازیابی رمز عبور — ‎#/forgot-password و ‎#/reset-password?token=… (فاز ۴۰) */}
          <div className="ct-page-view" style={{ display: resetView ? 'block' : 'none' }}>
            {resetView && <PasswordResetPage mode={resetView.mode} token={resetView.token} />}
          </div>
          <div className="ct-page-view" style={{ display: activePage === 'admin' ? 'block' : 'none' }}>
            <AdminPage onToast={showToast} />
          </div>
          {/* 📚 صفحهٔ اختصاصی درس — ‎#/lesson/<slug> */}
          <div className="ct-page-view" style={{ display: lessonSlug ? 'block' : 'none' }}>
            <LessonDetailPage slug={lessonSlug} onNavigate={navigateTo} />
          </div>
          {/* 🪙 صفحهٔ پرداخت USDT — ‎#/pay/<ref> */}
          <div className="ct-page-view" style={{ display: payView ? 'block' : 'none' }}>
            {payView && (
              <CheckoutPage
                key={payView.ref || 'new'}
                orderRef={payView.ref}
                initialProductId={payView.productId}
                onNavigate={navigateTo}
              />
            )}
          </div>
        </main>

        <Footer onNavigate={navigateTo} onToast={showToast} />
      </div>
    </>
  )
}
