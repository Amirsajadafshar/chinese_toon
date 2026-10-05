'use client'

// ---------------------------------------------------------------------------
// 🖥️ Screens — پل بین route فایل‌های سروری و کامپوننت‌های کلاینتی صفحات.
// هر Screen از کانتکست SiteChrome مقادیر navigateTo/showToast را می‌گیرد و
// صفحهٔ واقعی را با همان props قدیمی رندر می‌کند؛ بنابراین صفحات بدون تغییر
// امضا کار می‌کنند. متادیتای هر روت در فایل route (server component) می‌ماند.
// ---------------------------------------------------------------------------

import { useSearchParams } from 'next/navigation'
import { HomePage } from './pages/HomePage'
import { ClassesPage } from './pages/ClassesPage'
import { LearnPage } from './pages/LearnPage'
import { LessonDetailPage } from './pages/LessonDetailPage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SupportPage } from './pages/SupportPage'
import { RegisterPage } from './pages/RegisterPage'
import { AccountPage } from './pages/AccountPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { AdminPage } from './pages/AdminPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PageKey } from '@/content/site-content'
import { useSite } from './site-shell'

function useNav() {
  const { navigateTo, go, replace, showToast } = useSite()
  return { navigateTo, go, replace, showToast }
}

export function HomeScreen() {
  const { navigateTo } = useNav()
  return <HomePage onNavigate={navigateTo} />
}

export function ClassesScreen({ initialSlug = '' }: { initialSlug?: string }) {
  const { navigateTo } = useNav()
  return <ClassesPage onNavigate={navigateTo} initialSlug={initialSlug} />
}

export function LearnScreen() {
  return <LearnPage />
}

export function LessonScreen({ slug }: { slug: string }) {
  const { navigateTo } = useNav()
  return <LessonDetailPage slug={slug} onNavigate={navigateTo} />
}

export function BlogScreen({ slug = '' }: { slug?: string }) {
  return <BlogPage slug={slug} />
}

export function AboutScreen() {
  const { navigateTo } = useNav()
  return <AboutPage onNavigate={navigateTo} />
}

export function ReviewsScreen() {
  return <ReviewsPage />
}

export function SupportScreen() {
  const { showToast } = useNav()
  return <SupportPage onToast={showToast} />
}

export function RegisterScreen() {
  const { showToast } = useNav()
  return <RegisterPage onToast={showToast} />
}

export function AccountScreen() {
  const { navigateTo, showToast, go } = useNav()
  return <AccountPage onNavigate={navigateTo} onToast={showToast} go={go} />
}

export function PasswordResetScreen() {
  return <PasswordResetPage />
}

export function AdminScreen() {
  const { showToast } = useNav()
  return <AdminPage onToast={showToast} />
}

export function CheckoutScreen({ orderRef }: { orderRef: string }) {
  const { navigateTo, go, replace } = useNav()
  // /pay/new → حالت ساخت سفارش (ref خالی)؛ شناسهٔ محصول از query خوانده می‌شود
  const params = useSearchParams()
  const productId = params.get('product') || undefined
  const ref = orderRef === 'new' ? '' : orderRef
  return (
    <CheckoutPage
      key={ref || 'new'}
      orderRef={ref}
      initialProductId={productId}
      onNavigate={navigateTo}
      go={go}
      replace={replace}
    />
  )
}
