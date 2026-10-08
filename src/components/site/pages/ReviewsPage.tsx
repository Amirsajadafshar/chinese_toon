'use client'

import { ArrowRight, Sparkles, Star } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { CommunityReviews } from '../CommunityReviews'

const rp = siteContent.reviewsPage

// ---------------------------------------------------------------------
//  ⭐ صفحهٔ اختصاصی نظرات (#/reviews)
//  اینجا بازدیدکننده نظر می‌دهد (فرم) و نظرات تأییدشدهٔ کاربران (از دیتابیس
//  — CommunityReviews) نمایش داده می‌شود.
//  بخش «What Our Students Say» (نظرات ثابت فایل محتوا) با درخواست مالک
//  حذف شد — فقط نظرات واقعی دیتابیس نمایش داده می‌شود.
//  بخش نظرات قبلاً در صفحهٔ خانه بود و با درخواست مالک به این صفحهٔ
//  جدید منتقل شد.
// ---------------------------------------------------------------------

export function ReviewsPage() {
  // موقعیت فرم در لحظهٔ کلیک اندازه‌گیری می‌شود (بدون state اضافه)
  const scrollTo = (top: number) => window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })

  const scrollToForm = () => {
    const el = document.getElementById('write-review')
    const top = el ? el.getBoundingClientRect().top + window.scrollY - 160 : 0
    scrollTo(top)
  }

  // ⭐ «Read Reviews» — پرش به فهرست واقعی نظرات (بخش Community Reviews؛ فاز ۴۶)
  // قبلاً به بالای صفحه اسکرول می‌کرد — یعنی هیچ اتفاقی نمی‌افتاد؛ حالا به همان
  // بخشی می‌رود که نظرات واقعی دیتابیس نمایش داده می‌شوند.
  const scrollToReviews = () => {
    const el = document.getElementById('community-reviews')
    scrollTo(el ? el.getBoundingClientRect().top + window.scrollY - 140 : 0)
  }

  return (
    <div id="page-reviews">
      {/* ================= هیرو ================= */}
      <section className="pt-32 pb-14 md:pt-40 md:pb-16 relative overflow-hidden bg-cream">
        {/* 🌸 هالهٔ هلویی ملایم — هم‌خوان با تم نظرات */}
        <div
          aria-hidden="true"
          className="absolute -top-10 -left-24 w-80 h-80 bg-peach-light/40 rounded-full blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          className="absolute top-44 right-0 w-1/2 h-56 ct-dots-warm opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]"
        ></div>
        <div className="char-bg top-16 right-6 md:right-32" style={{ fontSize: '260px', opacity: 0.04 }} aria-hidden="true">
          评
        </div>
        <div className="char-bg bottom-0 left-4 md:left-16" style={{ fontSize: '160px', opacity: 0.03 }} aria-hidden="true">
          心
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="animate-ct-fadeInUp">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brown-dark leading-tight mb-6">
              {rp.titleTop} <span className="text-sage-dark">{rp.titleHighlight}</span>
            </h1>
            <p className="text-lg text-brown-light leading-relaxed mb-8 max-w-2xl mx-auto">
              {rp.subtitle}
            </p>

            {/* خلاصهٔ امتیاز + دکمه‌ها */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 bg-white rounded-full px-5 py-2.5 shadow-sm border border-sage-light/25">
                <div className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-butter text-butter" />
                  ))}
                </div>
                <span className="text-sm text-brown-light">{rp.ratingSummary}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={scrollToForm}
                  className="bg-sage text-brown-dark px-7 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer min-h-[44px]"
                >
                  {rp.writeButton}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollToReviews}
                  className="bg-white border-2 border-sage/40 text-brown-dark px-7 py-3 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:border-sage hover:bg-sage/5 transition-all cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {rp.readButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= فرم ثبت نظر + نظرات تأییدشدهٔ کاربران ================= */}
      <div id="write-review" className="scroll-mt-40">
        <CommunityReviews />
      </div>
    </div>
  )
}
