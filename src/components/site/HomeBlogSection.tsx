'use client'

import { Newspaper, ArrowRight } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { usePosts, PostCard } from './blog-parts'
import { CurveDivider } from './CurveDivider'
import { Leaflet } from './ToonBranch'

// ---------------------------------------------------------------------
//  بخش «آخرین مقالات وبلاگ» در صفحهٔ خانه — ۳ مقالهٔ آخر
//  (کلیک روی هر کارت → صفحهٔ خود مقاله)
// ---------------------------------------------------------------------

interface HomeBlogSectionProps {
  onNavigate: (page: PageKey) => void
}

export function HomeBlogSection({ onNavigate }: HomeBlogSectionProps) {
  const { posts, loading } = usePosts()
  const t = siteContent.home.blogSection

  return (
    <section className="py-20 bg-sec-sage relative overflow-hidden">
      {/* 🌊 لبهٔ منحنی از بخش کلمهٔ روز + برگ‌های تزئینی */}
      <CurveDivider fill="var(--color-sec-butter)" />
      <svg aria-hidden="true" className="absolute top-24 right-[5%] w-12 opacity-50 rotate-12 hidden md:block animate-ct-floatSlow" viewBox="0 0 56 40">
        <g transform="translate(3 20)"><Leaflet w={48} mode="sage" /></g>
      </svg>
      <svg aria-hidden="true" className="absolute bottom-16 left-[4%] w-10 opacity-40 -rotate-12 hidden md:block" viewBox="0 0 56 40">
        <g transform="translate(3 20)"><Leaflet w={42} mode="outline" /></g>
      </svg>
      <div className="char-bg top-10 right-10" style={{ fontSize: '220px', opacity: 0.04 }}>
        文
      </div>
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-12 scroll-animate">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
            <Newspaper className="w-4 h-4" />
            {t.eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{t.title}</h2>
          <p className="text-brown-light max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-sage-light/20 overflow-hidden">
                <div className="h-36 bg-sage-light/20 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-sage-light/20 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-sage-light/20 rounded animate-pulse" />
                  <div className="h-3 w-full bg-sage-light/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-8">
            {posts.slice(0, 3).map((post, i) => (
              <PostCard key={post.id} post={post} index={i} compact />
            ))}
          </div>
        ) : null}

        <div className="text-center mt-12 scroll-animate">
          <button
            onClick={() => onNavigate('blog')}
            className="bg-white border border-sage-light/50 text-brown px-8 py-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 hover:border-sage hover:text-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.25)] transition-all cursor-pointer"
          >
            {t.visitButton}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
