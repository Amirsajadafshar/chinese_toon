'use client'

import { useEffect, useState } from 'react'
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
  User,
  Languages,
  ScrollText,
} from 'lucide-react'
import { InstagramIcon, TelegramIcon, WeChatIcon } from '../brand-icons'
import { TeacherProfileModal, type TeacherSample, type TeacherProfile } from '../TeacherProfileModal'
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

// 👩‍🏫 شکل یکسان‌شدهٔ معلم — هم از دیتابیس و هم از فایل محتوا
// رزومه + گواهینامه‌ها + نمونه‌های تدریس در مودال TeacherProfileModal نمایش داده می‌شوند
type TeacherItem = TeacherProfile & { bio: string; tag: string }

// پارس امن نمونه‌های تدریس از JSON دیتابیس — هر عنصر خراب به‌آرامی حذف می‌شود
const SAMPLE_KINDS = ['video', 'audio', 'text', 'dialog'] as const
function parseSamples(raw: unknown): TeacherSample[] {
  if (typeof raw !== 'string') return Array.isArray(raw) ? (raw as TeacherSample[]) : []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (s): s is TeacherSample =>
        s && typeof s === 'object' && typeof (s as TeacherSample).title === 'string' &&
        SAMPLE_KINDS.includes((s as TeacherSample).kind)
    )
  } catch {
    return []
  }
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  // 🗄️ معلم‌ها از دیتابیس (پنل ادمین → تب Teachers) — تا وقتی خالی باشد
  // تیم پیش‌فرض فایل محتوا نمایش داده می‌شود
  const [teachers, setTeachers] = useState<TeacherItem[] | null>(null)
  // 🪟 مودال «رزومه و نمونهٔ تدریس» — معلمِ انتخاب‌شده
  const [profileTeacher, setProfileTeacher] = useState<TeacherItem | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/teachers')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const list: TeacherItem[] = (data.teachers ?? []).map(
            (t: {
              name: string
              role: string
              bio: string
              tag: string
              langs: string
              image: string | null
              resume?: string
              experienceYears?: number
              studentsTaught?: number
              certificates?: string
              samples?: unknown
            }) => ({
              name: t.name,
              role: t.role,
              bio: t.bio,
              tag: t.tag,
              langs: t.langs
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              image: t.image,
              resume: t.resume ?? '',
              experienceYears: t.experienceYears ?? 0,
              studentsTaught: t.studentsTaught ?? 0,
              certificates: (t.certificates ?? '')
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
              samples: parseSamples(t.samples),
            })
          )
          setTeachers(list)
        })
        .catch(() => {
          if (!cancelled) setTeachers(null) // خطا → fallback فایل محتوا
        })
    }
    load()
    // با هر ورود به صفحهٔ About داده تازه شود تا تغییرات پنل فوراً دیده شود
    const onHash = () => {
      if (window.location.hash.startsWith('#/about')) load()
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const teacherList: TeacherItem[] =
    teachers && teachers.length > 0
      ? teachers
      : c.teachers.items.map((t) => ({
          name: t.name,
          role: t.role,
          bio: t.bio,
          tag: t.tag,
          langs: t.langs,
          image: t.image ?? null,
          resume: t.resume,
          experienceYears: t.experienceYears,
          studentsTaught: t.studentsTaught,
          certificates: t.certificates
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          samples: parseSamples(t.samples),
        }))
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

      {/* مؤسس */}
      <section className="py-20 bg-sec-peach relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش کره‌ای */}
        <CurveDivider fill="var(--color-sec-butter)" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-brown-dark">{c.founder.title}</h2>
          </div>
          <div className="max-w-2xl mx-auto bg-cream rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
            {/* واترمارک تزئینی کاراکتر چینی */}
            <span
              aria-hidden="true"
              className="char-bg pointer-events-none select-none absolute -top-6 -left-4"
              style={{ fontSize: '150px', opacity: 0.05 }}
            >
              师
            </span>
            <div className="w-28 h-28 bg-sage-light/30 rounded-full mx-auto mb-6 flex items-center justify-center relative ring-4 ring-white/70">
              <User className="w-12 h-12 text-sage-dark" />
            </div>
            <h3 className="text-xl font-bold text-brown-dark mb-1">{c.founder.name}</h3>
            <p className="text-sm text-sage-dark font-medium mb-4">{c.founder.role}</p>
            <p className="text-sm text-brown-light leading-relaxed mb-6">{c.founder.bio}</p>
            {/* 📧 ارتباط با مؤسس از طریق ایمیل */}
            <div className="max-w-sm mx-auto">
              <p className="text-xs text-brown-light mb-3">{c.founder.emailNote}</p>
              <a
                href={`mailto:${siteContent.contact.email}?subject=${encodeURIComponent('Message for the founder — Chinese Toon')}`}
                className="inline-flex items-center justify-center gap-2 bg-sage text-brown-dark px-7 py-3.5 rounded-full text-sm font-bold hover:bg-sage-dark hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer w-full sm:w-auto min-h-[44px]"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                {c.founder.emailCta}
              </a>
              <p className="text-xs text-brown-light mt-3">{siteContent.contact.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 👩‍🏫 تیم معلم‌ها */}
      <section className="py-20 bg-sec-leaf relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش هلویی + نقاط تزئینی */}
        <CurveDivider fill="var(--color-sec-peach)" />
        <div
          aria-hidden="true"
          className="absolute bottom-24 right-[3%] w-48 h-48 ct-dots opacity-45 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"
        ></div>
        <div
          aria-hidden="true"
          className="char-bg pointer-events-none select-none top-8 left-0"
          style={{ fontSize: '200px', opacity: 0.03 }}
        >
          团队
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{c.teachers.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{c.teachers.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teacherList.map((t, i) => (
              <article
                key={i}
                className="group bg-white rounded-3xl border border-sage-light/20 overflow-hidden card-hover card-wave text-center"
              >
                {/* پرترهٔ معلم — یا گرادیان برند با آیکون */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-sage-light/50 via-butter/40 to-peach-light/50">
                  {t.image ? (
                    <img
                      src={t.image}
                      alt={`${t.name} — ${t.role}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <User className="w-16 h-16 text-sage-dark/60" />
                    </span>
                  )}
                  {/* برچسب تخصص */}
                  <span className="absolute top-3 right-3 bg-white/85 backdrop-blur text-sage-dark text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {t.tag}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-base font-bold text-brown-dark mb-0.5">{t.name}</h3>
                  <p className="text-xs font-semibold text-sage-dark mb-3">{t.role}</p>
                  <p className="text-xs text-brown-light leading-relaxed mb-4">{t.bio}</p>
                  {/* زبان‌های تدریس */}
                  <div className="flex flex-wrap justify-center gap-1.5 pt-3 border-t border-sage-light/15">
                    {t.langs.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 bg-cream text-brown text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      >
                        <Languages className="w-3 h-3 text-sage-dark" />
                        {lang}
                      </span>
                    ))}
                  </div>
                  {/* 🆕 دکمهٔ باز کردن رزومه و نمونه‌های تدریس */}
                  <button
                    type="button"
                    onClick={() => setProfileTeacher(t)}
                    aria-label={`${c.teachers.cardCta} — ${t.name}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-cream text-brown-dark text-xs font-bold px-4 py-2.5 rounded-full border border-sage-light/40 hover:bg-sage hover:border-sage hover:shadow-[0_2px_10px_rgba(168,201,160,0.35)] transition-all cursor-pointer min-h-[38px]"
                  >
                    <ScrollText className="w-4 h-4 text-sage-dark" aria-hidden="true" />
                    {c.teachers.cardCta}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 📸 گالری «Life at Chinese Toon» — به درخواست مالک به‌طور کامل حذف شد */}

      {/* تماس */}
      <section className="py-20 bg-cream relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش سبز تیم + برگ تزئینی */}
        <CurveDivider fill="var(--color-sec-leaf)" />
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

      {/* 🪟 مودال «رزومه و نمونه‌های تدریس» استاد */}
      {profileTeacher && (
        <TeacherProfileModal
          teacher={profileTeacher}
          onClose={() => setProfileTeacher(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
