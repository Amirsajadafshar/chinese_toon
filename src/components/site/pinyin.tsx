'use client'

// ---------------------------------------------------------------------
//  🔤 ابزار مشترک رنگ‌بندی تُن‌های پین‌یین (استاندارد آموزش زبان چینی)
//  تُن از علائم دیاکریتیک روی حروف صدادار تشخیص داده می‌شود:
//  ˉ تُن ۱ (هموار) — ˊ تُن ۲ (بالارونده) — ˇ تُن ۳ (نزولی‌بالارونده) —
//  ˋ تُن ۴ (نزولی) — بدون علامت = تُن خنثی
//  رنگ‌ها هماهنگ با پالت برند در globals.css تعریف شده‌اند (ct-tone-*)
// ---------------------------------------------------------------------

const TONE_1 = 'āēīōūǖĀĒĪŌŪǕ'
const TONE_2 = 'áéíóúǘÁÉÍÓÚǗ'
const TONE_3 = 'ǎěǐǒǔǚǍĚǏǑǓǙ'
const TONE_4 = 'àèìòùǜÀÈÌÒÙǛ'

export function toneOf(syllable: string): number {
  for (const ch of syllable) {
    if (TONE_1.includes(ch)) return 1
    if (TONE_2.includes(ch)) return 2
    if (TONE_3.includes(ch)) return 3
    if (TONE_4.includes(ch)) return 4
  }
  return 0 // تُن خنثی
}

// کلاس رنگ هر تُن (در globals.css)
const toneClass: Record<number, string> = {
  1: 'ct-tone-1',
  2: 'ct-tone-2',
  3: 'ct-tone-3',
  4: 'ct-tone-4',
  0: 'ct-tone-0',
}

// شمارهٔ تُن کنار هجا (در فلش‌کارت‌ها)
export function toneMark(tone: number): string {
  return ['·', 'ˉ', 'ˊ', 'ˇ', 'ˋ'][tone] ?? '·'
}

// رندر پین‌یین با رنگ هر هجا بر اساس تُن آن
export function PinyinText({ pinyin, className = '' }: { pinyin: string; className?: string }) {
  return (
    <span className={className}>
      {pinyin.split(/(\s+)/).map((part, i) => {
        // فاصله‌ها بدون رنگ
        if (/^\s+$/.test(part)) return <span key={i}>{' '}</span>
        return (
          <span key={i} className={toneClass[toneOf(part)]}>
            {part}
          </span>
        )
      })}
    </span>
  )
}
