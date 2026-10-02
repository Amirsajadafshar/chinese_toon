'use client'

import { useEffect, useState } from 'react'
import { Menu, Moon, Sun, UserRound, X } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { useUser } from '@/lib/user-store'
import { AnnouncementBar } from './AnnouncementBar'
import { ToonMark } from './ToonBranch'

interface HeaderProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
}

export function Header({ activePage, onNavigate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // 👤 استور کاربر — اولین استفاده، واکشی یک‌باره از /api/auth/me را راه می‌اندازد
  const { user } = useUser()
  // 🌙 دارک مود — کلاس dark روی <html>؛ آیکون خورشید/ماه با variant dark
  // در CSS عوض می‌شود (بدون state)، پس قبل و بعد از hydration درست است
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('ct-theme', isDark ? 'dark' : 'light')
    } catch {
      /* حافظه در دسترس نیست */
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // جلوگیری از اسکرول وقتی منوی موبایل باز است
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const go = (page: PageKey) => {
    onNavigate(page)
    setMenuOpen(false)
  }

  // 👤 رفتن به حساب کاربری — از دسکتاپ و منوی موبایل
  const goAccount = () => {
    window.location.hash = '/account'
    setMenuOpen(false)
  }

  return (
    <>
      <header
        id="header"
        className={`fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-sage-light/30 transition-all duration-300 ${
          scrolled ? 'shadow-[0_4px_20px_rgba(91,81,69,0.06)]' : 'shadow-none'
        }`}
      >
        {/* 📣 نوار اعلان — بالای نوار منو، از فایل محتوا */}
        <AnnouncementBar onNavigate={go} />

        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* لوگو — نشان شاخهٔ درخت تُون + نام برند */}
          <button
            onClick={() => go('home')}
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="Chinese Toon — Home"
          >
            <span className="w-10 h-10 bg-white rounded-xl border border-sage-light/50 shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:rotate-3 transition-transform">
              <ToonMark className="w-7 h-7" />
            </span>
            <span className="text-left leading-none">
              <span className="block text-lg font-bold tracking-wide text-leaf-dark">
                CHINESE TOON
              </span>
              <span className="block text-[11px] font-semibold text-brown-light tracking-[0.3em] mt-0.5">
                香椿 · MANDARIN
              </span>
            </span>
          </button>

          {/* منوی دسکتاپ */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8" aria-label="Main navigation">
            {siteContent.navigation.map((item) => (
              <button
                key={item.key}
                onClick={() => go(item.key as PageKey)}
                className={`nav-link text-sm font-medium text-brown-light hover:text-brown-dark transition-colors cursor-pointer ${
                  activePage === item.key ? 'active-link' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* 👤 دکمهٔ حساب کاربری — کنار کلید شب/روز؛ با ورود کاربر، نام کوچکش کنار آیکون می‌آید */}
          <button
            onClick={goAccount}
            aria-label="Account"
            title={user ? `${user.firstName} ${user.lastName}` : 'Account'}
            className={`h-10 mr-1 flex items-center rounded-xl bg-white/70 border border-sage-light/40 text-brown hover:text-sage-dark hover:border-sage transition-all cursor-pointer flex-shrink-0 ${
              user ? 'gap-1.5 pl-2.5 pr-3' : 'w-10 justify-center'
            }`}
          >
            <UserRound className="w-5 h-5" aria-hidden="true" />
            {user && (
              <span className="hidden sm:inline text-xs font-semibold max-w-[88px] truncate">
                {user.firstName}
              </span>
            )}
          </button>

          {/* 🌙 کلید شب/روز — در دسکتاپ و موبایل */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle night mode"
            title="Toggle night mode"
            className="w-10 h-10 mr-1 flex items-center justify-center rounded-xl bg-white/70 border border-sage-light/40 text-brown hover:text-sage-dark hover:border-sage transition-all cursor-pointer flex-shrink-0"
          >
            <Sun className="hidden dark:block w-5 h-5" aria-hidden="true" />
            <Moon className="block dark:hidden w-5 h-5" aria-hidden="true" />
          </button>

          {/* 🚫 فاز ۶۲ — دکمهٔ «Join a Class» هدر به درخواست مالک حذف شد؛
              ورود به ثبت‌نام از کلاس‌ها/صفحهٔ حساب ادامه دارد */}

          {/* دکمه منوی موبایل */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center gap-2 cursor-pointer"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="w-6 h-6 text-brown" />
            ) : (
              <Menu className="w-6 h-6 text-brown" />
            )}
          </button>
        </div>
      </header>

      {/* اورلی منوی موبایل */}
      <div
        id="mobileOverlay"
        className={`fixed inset-0 bg-brown-dark/30 z-40 transition-opacity ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* منوی موبایل کشویی */}
      <div
        id="mobileMenu"
        className={`mobile-menu fixed top-0 right-0 w-80 max-w-[85vw] h-full bg-cream z-50 shadow-2xl ${
          menuOpen ? 'open' : ''
        }`}
        role="dialog"
        aria-label="Mobile menu"
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <span className="flex items-center gap-2">
              <ToonMark className="w-8 h-8" />
              <span className="text-left leading-none">
                <span className="block text-lg font-bold tracking-wide text-leaf-dark">CHINESE TOON</span>
                <span className="block text-[10px] font-semibold text-brown-light tracking-[0.3em] mt-0.5">香椿 · MANDARIN</span>
              </span>
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-sage-light/20 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-6 h-6 text-brown" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 mb-8" aria-label="Mobile navigation">
            {siteContent.navigation.map((item) => (
              <button
                key={item.key}
                onClick={() => go(item.key as PageKey)}
                className={`text-lg font-semibold text-left py-3 px-4 rounded-xl hover:bg-sage-light/10 transition-colors cursor-pointer ${
                  activePage === item.key ? 'text-sage-dark' : 'text-brown'
                }`}
              >
                {item.label}
              </button>
            ))}
            {/* 👤 حساب کاربری — ورود برای مهمان، پروفایل برای کاربر واردشده */}
            <button
              onClick={goAccount}
              className={`text-lg font-semibold text-left py-3 px-4 rounded-xl hover:bg-sage-light/10 transition-colors cursor-pointer flex items-center gap-2.5 ${
                activePage === 'account' ? 'text-sage-dark' : 'text-brown'
              }`}
            >
              <UserRound className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {user ? siteContent.account.profileTitle : siteContent.account.tabLogin}
              </span>
            </button>
          </nav>
          <div className="mt-auto flex gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle night mode"
              title="Toggle night mode"
              className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/70 border border-sage-light/40 text-brown hover:border-sage transition-colors cursor-pointer"
            >
              <Sun className="hidden dark:block w-5 h-5" aria-hidden="true" />
              <Moon className="block dark:hidden w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
