'use client'

import {
  Briefcase,
  Heart,
  MapPin,
  ListChecks,
  MessageCircle,
  Presentation,
  TrendingUp,
  Smile,
  Sparkles,
  Mail,
} from 'lucide-react'
import { InstagramIcon, TelegramIcon, WeChatIcon } from '../brand-icons'
import { CurveDivider } from '../CurveDivider'
import { Leaflet } from '../ToonBranch'
import { siteContent, PageKey } from '@/content/site-content'

const c = siteContent.about

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: Briefcase,
  heart: Heart,
  'map-pin': MapPin,
  'list-checks': ListChecks,
  'message-circle': MessageCircle,
  presentation: Presentation,
  'trending-up': TrendingUp,
  smile: Smile,
  sparkles: Sparkles,
}

const colorMap = {
  sage: { iconBg: 'bg-sage-light/30', text: 'text-sage-dark', border: 'border-sage-light/20' },
  butter: { iconBg: 'bg-butter/25', text: 'text-brown', border: 'border-butter/20' },
  peach: { iconBg: 'bg-peach-light/30', text: 'text-peach', border: 'border-peach-light/20' },
} as const

interface AboutPageProps {
  onNavigate: (page: PageKey) => void
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div id="page-about">
      {/* معرفی */}
      <section className="pt-32 pb-20 md:pt-40 relative overflow-hidden bg-cream">
        {/* 🌸 تزئینات ملایم — کاراکتر محو + هالهٔ کره‌ای + برگ */}
        <div
          aria-hidden="true"
          className="absolute -top-8 -right-20 w-80 h-80 bg-butter/20 rounded-full blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          className="absolute top-40 left-0 w-1/2 h-64 ct-dots opacity-40 [mask-image:linear-gradient(to_right,black,transparent)]"
        ></div>
        <div className="char-bg top-20 right-0" style={{ fontSize: '260px', opacity: 0.04 }}>
          教
        </div>
        <svg
          aria-hidden="true"
          className="absolute bottom-10 right-[8%] w-12 opacity-60 animate-ct-floatSlow hidden md:block"
          viewBox="0 0 56 40"
        >
          <g transform="translate(3 20)"><Leaflet w={48} mode="rust" /></g>
        </svg>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {c.eyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-6">
              {c.titleTop} <span className="text-sage-dark">{c.titleHighlight}</span>
              {c.titleBottom}
            </h1>
            <p className="text-lg text-brown-light leading-relaxed mb-6">{c.intro1}</p>
            <p className="text-brown-light leading-relaxed mb-8">{c.intro2}</p>
          </div>
        </div>
      </section>

      {/* فلسفه + چرا چینی */}
      <section className="py-20 bg-sec-sage relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از هیروی کرم + نقاط تزئینی */}
        <CurveDivider fill="var(--color-cream)" />
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-[4%] w-44 h-44 ct-dots opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"
        ></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-6">{c.philosophy.title}</h2>
              <p className="text-brown-light leading-relaxed mb-6">{c.philosophy.p1}</p>
              <p className="text-brown-light leading-relaxed mb-6">{c.philosophy.p2}</p>
              <div className="bg-cream rounded-2xl p-6 mt-8">
                <p className="text-base font-semibold text-brown-dark mb-2">
                  {c.philosophy.animationBox.title}
                </p>
                <p className="text-sm text-brown-light leading-relaxed">
                  {c.philosophy.animationBox.text}
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-6">{c.whyChinese.title}</h2>
              <p className="text-brown-light leading-relaxed mb-6">{c.whyChinese.p1}</p>
              <div className="space-y-4">
                {c.whyChinese.items.map((item, i) => {
                  const Icon = iconMap[item.icon] ?? Sparkles
                  const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${color.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-[18px] h-[18px] ${color.text}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brown-dark">{item.title}</p>
                        <p className="text-sm text-brown-light">{item.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* رویکرد آموزشی */}
      <section className="py-20 bg-sec-butter relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش سبز + قوس نقطه‌چین */}
        <CurveDivider fill="var(--color-sec-sage)" />
        <svg
          aria-hidden="true"
          className="absolute top-1/4 right-[6%] w-44 opacity-50 hidden lg:block"
          viewBox="0 0 160 80"
          fill="none"
        >
          <path
            d="M6 70 C 40 10, 110 6, 154 40"
            stroke="#A8C9A0"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 11"
          />
        </svg>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-4">{c.approach.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{c.approach.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {c.approach.items.map((item, i) => {
              const Icon = iconMap[item.icon] ?? Sparkles
              const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
              return (
                <div key={i} className={`bg-white rounded-2xl p-7 border ${color.border} card-hover card-wave`}>
                  <div className={`w-12 h-12 ${color.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${color.text}`} />
                  </div>
                  <h3 className="text-base font-semibold text-brown-dark mb-2">{item.title}</h3>
                  <p className="text-sm text-brown-light">{item.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 👩‍🏫 بخش تیم معلم‌ها — به درخواست مالک حذف شد */}

      {/* 📸 گالری «Life at Chinese Toon» — به درخواست مالک به‌طور کامل حذف شد */}

      {/* تماس */}
      <section className="py-20 bg-cream relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش کره‌ای + برگ تزئینی */}
        <CurveDivider fill="var(--color-sec-butter)" />
        <svg
          aria-hidden="true"
          className="absolute bottom-16 left-[5%] w-11 opacity-50 animate-ct-floatSlow hidden md:block"
          viewBox="0 0 56 40"
        >
          <g transform="translate(3 20)"><Leaflet w={46} mode="sage" /></g>
        </svg>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-brown-dark mb-4">{c.getInTouch.title}</h2>
            <p className="text-brown-light mb-8">{c.getInTouch.subtitle}</p>
            <div className="space-y-4">
              <a
                href={`mailto:${siteContent.contact.email}`}
                className="flex items-center justify-center gap-3 bg-white rounded-2xl px-6 py-4 border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 text-sage-dark" />
                <span className="text-sm font-medium text-brown">{siteContent.contact.email}</span>
              </a>
              <div className="flex justify-center gap-4">
                <a
                  href={siteContent.contact.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
                >
                  <InstagramIcon size={18} className="text-brown" />
                  <span className="text-sm text-brown">Instagram</span>
                </a>
                <a
                  href={siteContent.contact.socials.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
                >
                  <TelegramIcon size={18} className="text-brown" />
                  <span className="text-sm text-brown">Telegram</span>
                </a>
                <a
                  href={siteContent.contact.socials.wechat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
                >
                  <WeChatIcon size={18} className="text-brown" />
                  <span className="text-sm text-brown">WeChat</span>
                </a>
              </div>
              {/* دکمه پشتیبانی */}
              <button
                onClick={() => onNavigate('support')}
                className="mt-4 text-sm font-semibold text-sage-dark hover:text-brown-dark transition-colors cursor-pointer"
              >
                Need support? Visit our Support Center →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
