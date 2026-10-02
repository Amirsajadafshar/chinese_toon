'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-40 w-12 h-12 bg-sage text-brown-dark rounded-2xl shadow-[0_8px_24px_rgba(168,201,160,0.45)] flex items-center justify-center hover:bg-sage-dark hover:-translate-y-1 transition-all cursor-pointer ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{ transitionDuration: '300ms' }}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
