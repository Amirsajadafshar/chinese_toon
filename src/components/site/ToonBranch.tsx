// ---------------------------------------------------------------------
//  🌿 نشان برند «Chinese Toon» — بازآفرینی وکتوری لوگوی شاخهٔ درخت تُون
//  برگ‌های مرکب (pinnate) با خطوط سبز، برگ‌های زنگاری (rust) سر شاخه،
//  خوشهٔ توت و گل‌های کوچک سفید — دقیقاً با رنگ‌های خود لوگو.
//  دو خروجی:
//    <ToonBranch />  شاخهٔ کامل (هیرو/فوتر/جلوه‌های بزرگ)
//    <ToonMark />    نشان فشردهٔ ۵ برگ (هدر/موبایل/جاهای کوچک)
//  برگ‌ها روی منحنی بزیه به‌صورت برنامه‌ریزی‌شده چیده می‌شوند تا حالت
//  ارگانیک لوگوی دست‌ساز حفظ شود؛ تاب‌خوردن ملایم با animate-ct-sway.
// ---------------------------------------------------------------------

// رنگ‌ها از این فایل هم توسط HeroScene (تصویرسازی تمام‌عرض هیرو) استفاده می‌شود
export const LEAF = '#64826A' // خطوط سبز لوگو
export const RUST = '#A8502F' // برگ‌های زنگاری سر شاخه
export const RUST_DARK = '#8C3F22'
export const CREAM = '#FFF7E8'
export const SAGE_FILL = '#C5DEC0'

export type LeafMode = 'outline' | 'sage' | 'rust'

// یک برگچهٔ نیزه‌ای — بادامکی کشیده با رگبرگ وسط (مثل برگ‌های لوگو)
export function Leaflet({ w, mode = 'outline' }: { w: number; mode?: LeafMode }) {
  const h = w * 0.34
  const fill = mode === 'outline' ? CREAM : mode === 'sage' ? SAGE_FILL : RUST
  const stroke = mode === 'rust' ? RUST_DARK : LEAF
  return (
    <g>
      <path
        d={`M0 0 Q ${w * 0.3} ${-h} ${w} 0 Q ${w * 0.3} ${h} 0 0 Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={Math.max(1.4, w * 0.075)}
        strokeLinejoin="round"
      />
      {mode !== 'rust' && (
        <path
          d={`M${w * 0.1} 0 L ${w * 0.82} 0`}
          stroke={stroke}
          strokeWidth={Math.max(1, w * 0.038)}
          strokeLinecap="round"
          opacity={0.6}
        />
      )}
    </g>
  )
}

interface FrondSpec {
  x: number // پایهٔ فروند روی ساقه
  y: number
  rot: number // زاویهٔ امتداد (۰=راست، ۲۷۰=بالا)
  len: number // طول فروند
  mode: LeafMode
  dur?: number // مدت تاب‌خوردن
  delay?: number
  leafN?: number // تعداد جفت‌برگ
}

// یک برگ مرکب: راشیس منحنی + برگچه‌های یک‌درمیان دو طرف + برگ نوک
export function Frond({ x, y, rot, len, mode, dur = 6, delay = 0, leafN = 5 }: FrondSpec) {
  const cx = len * 0.48
  const cy = -len * 0.16
  const ex = len
  const ey = -len * 0.02
  const leaflets: { px: number; py: number; ang: number; scale: number }[] = []
  for (let i = 0; i < leafN; i++) {
    const t = 0.16 + (0.72 * i) / Math.max(1, leafN - 1)
    const px = 2 * (1 - t) * t * cx + t * t * ex
    const py = 2 * (1 - t) * t * cy + t * t * ey
    const dx = 2 * (1 - t) * cx + 2 * t * (ex - cx)
    const dy = 2 * (1 - t) * cy + 2 * t * (ey - cy)
    const tang = (Math.atan2(dy, dx) * 180) / Math.PI
    const side = i % 2 === 0 ? -1 : 1
    const scale = 1 - (i / leafN) * 0.42
    leaflets.push({ px, py, ang: tang + side * 54, scale })
    leaflets.push({ px: px + dx * 0.055, py: py + dy * 0.055, ang: tang - side * 54, scale: scale * 0.9 })
  }
  const tipAng = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g
        className="animate-ct-sway"
        style={{ transformBox: 'view-box', transformOrigin: '0px 0px', animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
      >
        <path
          d={`M0 0 Q ${cx} ${cy} ${ex} ${ey}`}
          fill="none"
          stroke={mode === 'rust' ? RUST : LEAF}
          strokeWidth={Math.max(2, len * 0.034)}
          strokeLinecap="round"
        />
        {leaflets.map((p, i) => (
          <g key={i} transform={`translate(${p.px.toFixed(1)} ${p.py.toFixed(1)}) rotate(${p.ang.toFixed(1)}) scale(${p.scale.toFixed(2)})`}>
            <Leaflet w={len * 0.3} mode={mode} />
          </g>
        ))}
        <g transform={`translate(${ex} ${ey}) rotate(${tipAng.toFixed(1)})`}>
          <Leaflet w={len * 0.2} mode={mode} />
        </g>
      </g>
    </g>
  )
}

// خوشهٔ توت کوچک — سه گلبرگ گرد با ساقه
export function Berries({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0 Q 9 -7 20 -9" fill="none" stroke={LEAF} strokeWidth={2} strokeLinecap="round" />
      <circle cx={22} cy={-10} r={3.2} fill={CREAM} stroke={LEAF} strokeWidth={1.8} />
      <circle cx={15} cy={-13} r={2.9} fill={CREAM} stroke={LEAF} strokeWidth={1.8} />
      <circle cx={26} cy={-3} r={2.7} fill={CREAM} stroke={LEAF} strokeWidth={1.8} />
    </g>
  )
}

// گل کوچک پنج‌پر سفید با مرکز زنگاری (مثل گل‌های لوگو)
export function Blossom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {petals.map((a) => (
        <ellipse key={a} transform={`rotate(${a})`} cx={5} cy={0} rx={3.2} ry={2.1} fill="#FFFFFF" stroke={LEAF} strokeWidth={1.5} />
      ))}
      <circle r={1.7} fill={RUST} />
    </g>
  )
}

// 🌿 شاخهٔ کامل — نقاشی اصلی لوگو
export function ToonBranch({ className = '', animated = true }: { className?: string; animated?: boolean }) {
  const fronds: FrondSpec[] = [
    { x: 98, y: 204, rot: 172, len: 84, mode: 'outline', dur: 6.4, delay: 0.2 },
    { x: 104, y: 184, rot: 200, len: 94, mode: 'outline', dur: 5.8, delay: 0 },
    { x: 110, y: 160, rot: 230, len: 88, mode: 'sage', dur: 6.8, delay: 0.5 },
    { x: 122, y: 134, rot: 262, len: 92, mode: 'outline', dur: 6.1, delay: 0.9 },
    { x: 136, y: 110, rot: 296, len: 84, mode: 'outline', dur: 5.6, delay: 0.4 },
    { x: 150, y: 88, rot: 320, len: 64, mode: 'rust', dur: 6.6, delay: 0.7 },
    { x: 162, y: 70, rot: 344, len: 52, mode: 'rust', dur: 5.9, delay: 1.1 },
  ]
  return (
    <svg viewBox="0 0 240 268" className={className} role="img" aria-label="Chinese Toon — a toon tree branch with pinnate leaves, berries and tiny white blossoms">
      {/* ساقهٔ اصلی — از پایین-چپ به بالا-راست */}
      <path
        d="M78 258 C 90 208, 100 156, 126 108 C 144 78, 166 56, 190 40"
        fill="none"
        stroke={LEAF}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      {fronds.map((f, i) => (
        <Frond key={i} {...f} leafN={f.len > 80 ? 5 : 4} />
      ))}
      {/* برگ نوک ساقه */}
      <g transform="translate(190 40) rotate(24)">
        <g
          className={animated ? 'animate-ct-sway' : undefined}
          style={animated ? { transformBox: 'view-box', transformOrigin: '0px 0px', animationDuration: '6.2s', animationDelay: '0.3s' } : undefined}
        >
          <Leaflet w={26} mode="outline" />
        </g>
      </g>
      {/* خوشه‌های توت و گل‌های سفید — سمت راست مثل لوگو */}
      <Berries x={148} y={128} rot={-14} />
      <Berries x={167} y={103} rot={10} />
      <Blossom x={178} y={92} />
      <Blossom x={199} y={115} s={0.85} />
      <Blossom x={186} y={140} s={0.7} />
    </svg>
  )
}

// 🌱 نشان فشردهٔ ۵ برگ — هدر، منوی موبایل و جاهای کوچک
export function ToonMark({ className = '' }: { className?: string }) {
  const leaves: { x: number; y: number; r: number; w: number; mode: LeafMode }[] = [
    { x: 18, y: 48, r: -162, w: 17, mode: 'outline' },
    { x: 24, y: 40, r: -132, w: 19, mode: 'sage' },
    { x: 30, y: 33, r: -102, w: 18, mode: 'outline' },
    { x: 37, y: 26, r: -72, w: 16, mode: 'rust' },
    { x: 44, y: 20, r: -44, w: 14, mode: 'rust' },
    { x: 50, y: 14, r: -20, w: 12, mode: 'outline' },
  ]
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Chinese Toon logo mark">
      <path d="M12 58 C 20 46, 30 34, 50 14" fill="none" stroke={LEAF} strokeWidth={3.2} strokeLinecap="round" />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
          <Leaflet w={l.w} mode={l.mode} />
        </g>
      ))}
    </svg>
  )
}
