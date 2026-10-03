'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Mail, Send } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { useCloseOnNavigate } from './use-nav-close'
import { ToonMark } from './ToonBranch'
import { InstagramIcon, TelegramIcon, WeChatIcon } from './brand-icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FooterProps {
  onNavigate: (page: PageKey) => void
  onToast?: (message: string) => void
}

export function Footer({ onNavigate, onToast }: FooterProps) {
  const [legalDialog, setLegalDialog] = useState<'privacy' | 'terms' | null>(null)
  const [nlEmail, setNlEmail] = useState('')
  const [nlSending, setNlSending] = useState(false)
  const [nlDone, setNlDone] = useState(false)

  // با ناوبری به صفحهٔ دیگر، پنجرهٔ Privacy/Terms بسته شود
  useCloseOnNavigate(useCallback(() => setLegalDialog(null), []))

  const subscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlEmail || nlSending) return
    setNlSending(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nlEmail }),
      })
      if (!res.ok) throw new Error()
      setNlDone(true)
      setNlEmail('')
      onToast?.(siteContent.newsletter.successMessage)
      setTimeout(() => setNlDone(false), 4000)
    } catch {
      onToast?.(siteContent.newsletter.errorMessage)
    } finally {
      setNlSending(false)
    }
  }

  const socialBtn =
    'w-10 h-10 bg-cream/10 rounded-xl flex items-center justify-center hover:bg-sage/30 transition-colors cursor-pointer'

  return (
    <footer className="bg-[#3D352E] text-[#FFF7E8]/80 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* معرفی برند */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 bg-cream/10 rounded-xl flex items-center justify-center">
                <ToonMark className="w-7 h-7" />
              </span>
              <span className="leading-none">
                <span className="block text-lg font-bold tracking-wide text-[#FFF7E8]">CHINESE TOON</span>
                <span className="block text-[10px] font-semibold text-[#FFF7E8]/60 tracking-[0.3em] mt-1">香椿 · MANDARIN</span>
              </span>
            </div>
            <p className="text-sm text-[#FFF7E8]/60 leading-relaxed mb-6 max-w-sm">
              {siteContent.brand.description}
            </p>
            <div className="flex gap-3">
              <a
                href={siteContent.contact.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={socialBtn}
                aria-label="Instagram"
              >
                <InstagramIcon size={20} className="text-[#FFF7E8]/70" />
              </a>
              <a
                href={siteContent.contact.socials.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className={socialBtn}
                aria-label="Telegram"
              >
                <TelegramIcon size={20} className="text-[#FFF7E8]/70" />
              </a>
              <a
                href={siteContent.contact.socials.wechat}
                target="_blank"
                rel="noopener noreferrer"
                className={socialBtn}
                aria-label="WeChat"
              >
                <WeChatIcon size={20} className="text-[#FFF7E8]/70" />
              </a>
              <a href={`mailto:${siteContent.contact.email}`} className={socialBtn} aria-label="Email">
                <Mail className="w-5 h-5 text-[#FFF7E8]/70" />
              </a>
            </div>
            {/* خبرنامه */}
            <div className="mt-8 max-w-sm">
              <h4 className="text-sm font-semibold text-[#FFF7E8] mb-1">{siteContent.newsletter.title}</h4>
              <p className="text-xs text-cream/50 mb-3">{siteContent.newsletter.subtitle}</p>
              <form onSubmit={subscribeNewsletter} className="flex gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  {siteContent.newsletter.placeholder}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  placeholder={siteContent.newsletter.placeholder}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-cream/10 border border-cream/15 text-sm text-[#FFF7E8] placeholder:text-cream/40 focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/25 transition-all"
                />
                <button
                  type="submit"
                  disabled={nlSending || nlDone}
                  className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                    nlDone
                      ? 'bg-sage text-brown-dark'
                      : 'bg-sage text-brown-dark hover:bg-sage-dark'
                  }`}
                  aria-label={siteContent.newsletter.button}
                >
                  <Send className={`w-4 h-4 ${nlDone ? 'rotate-12' : ''}`} />
                </button>
              </form>
            </div>
          </div>

          {/* منو */}
          <div>
            <h4 className="text-sm font-semibold text-[#FFF7E8] mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              {siteContent.navigation.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.key === 'home' ? '/' : `/${item.key}`}
                    className="text-sm text-[#FFF7E8]/60 hover:text-sage-light transition-colors cursor-pointer"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* لینک‌های قانونی */}
          <div>
            <h4 className="text-sm font-semibold text-[#FFF7E8] mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => setLegalDialog('privacy')}
                  className="text-sm text-[#FFF7E8]/60 hover:text-sage-light transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setLegalDialog('terms')}
                  className="text-sm text-[#FFF7E8]/60 hover:text-sage-light transition-colors cursor-pointer text-left"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              {/* 🔒 لینک ادمین از فوتر حذف شد — ورود فقط با آدرس مستقیم #/admin */}
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream/40">{siteContent.brand.copyright}</p>
          <p className="text-sm text-cream/50 italic">{siteContent.brand.tagline}</p>
        </div>
      </div>

      {/* دیالوگ Privacy / Terms */}
      <Dialog open={legalDialog !== null} onOpenChange={(open) => !open && setLegalDialog(null)}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
          {legalDialog === 'privacy' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-brown-dark">Privacy Policy</DialogTitle>
                <DialogDescription className="text-brown-light">
                  How we collect and protect your information.
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-brown-light leading-relaxed space-y-3">
                <p>
                  When you register for a class or contact us, we collect the information you
                  provide (name, email, phone, learning goals) solely to respond to you and
                  organize your classes.
                </p>
                <p>We never sell or share your personal data with third parties.</p>
                <p>
                  You can ask us to delete your data at any time by emailing{' '}
                  <span className="text-sage-dark font-medium">{siteContent.contact.email}</span>.
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-brown-dark">Terms &amp; Conditions</DialogTitle>
                <DialogDescription className="text-brown-light">
                  The ground rules for using Chinese Toon.
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-brown-light leading-relaxed space-y-3">
                <p>
                  Registrations are confirmed after our team contacts you. Class schedules and
                  prices are shared at that point.
                </p>
                <p>
                  Missed group sessions can be reviewed with shared materials; private lessons
                  can be rescheduled up to 12 hours in advance.
                </p>
                <p>
                  Questions? Contact us at{' '}
                  <span className="text-sage-dark font-medium">{siteContent.contact.email}</span>.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </footer>
  )
}
