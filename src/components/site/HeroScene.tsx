// ---------------------------------------------------------------------
//  🌄 HeroScene — تصویرسازی تمام‌عرض هیرو (به‌جای تصویر جداگانهٔ سمت راست)
//  یک صحنهٔ باغیِ پانوراما که کل هیرو را می‌پوشاند و متن و دکمه‌ها
//  به‌صورت طبیعی داخل آن می‌نشینند:
//    آسمان گرادیانی → خورشید کره‌ای → ابرهای راننده → پرنده‌ها →
//    برگ‌های شناور → رشته‌تپه‌های سبز → درخت تُون (香椿) با تابلوی برند →
//    چیپ‌های واژه و حباب گفتگو روی تاج درخت.
//  تمام اجزا pointer-events-none و aria-hidden هستند؛ فقط دکوراسیون‌اند.
//  پالت دست‌نخورده: sage/cream/butter/peach/brown + سبز/زنگاریِ خود لوگو.
// ---------------------------------------------------------------------

import { Frond, Leaflet, Berries, Blossom, LEAF, RUST, RUST_DARK, CREAM, SAGE_FILL } from './ToonBranch'
import type { LeafMode } from './ToonBranch'

const SAGE_DARK = '#8DB585'
const BROWN_LIGHT = '#7A6F62'
const LEAF_DARK = '#4E6A55'

/* ---------------- ☁️ ابر — سه بیضی نرم با خط پایین ---------------- */
function Cloud({ className = '', dur = 26, delay = 0 }: { className?: string; dur?: number; delay?: number }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{ animation: `ct-drift ${dur}s ease-in-out infinite`, animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 120 46" className="w-full h-auto" fill="none" aria-hidden="true">
        <g fill="#FFFFFF" fillOpacity="0.9">
          <ellipse cx="34" cy="30" rx="26" ry="12" />
          <ellipse cx="62" cy="21" rx="23" ry="14" />
          <ellipse cx="89" cy="30" rx="24" ry="11" />
        </g>
        <path d="M14 38 H106" stroke={SAGE_FILL} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  )
}

/* ---------------- 🐦 پرنده — دو قوس کوچک ---------------- */
function Birds({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 18" className={`absolute pointer-events-none ${className}`} fill="none" aria-hidden="true">
      <path d="M3 12 Q 9 5 15 12 Q 21 5 27 12" stroke={BROWN_LIGHT} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <path d="M33 7 Q 38 2 43 7 Q 48 2 51.5 6.5" stroke={BROWN_LIGHT} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

/* ---------------- 🍃 برگ شناور — با ct-float و چرخش ثابت ---------------- */
function DriftLeaf({
  className = '',
  w,
  mode = 'sage',
  dur = 6,
  delay = 0,
  rot = 0,
}: {
  className?: string
  w: number
  mode?: LeafMode
  dur?: number
  delay?: number
  rot?: number
}) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{ animation: `ct-float ${dur}s ease-in-out infinite`, animationDelay: `${delay}s` }}
    >
      <svg
        width={w * 1.2}
        height={w * 1.12}
        viewBox={`${-w * 0.1} ${-w * 0.56} ${w * 1.2} ${w * 1.12}`}
        style={{ transform: `rotate(${rot}deg)` }}
        fill="none"
        aria-hidden="true"
      >
        <Leaflet w={w} mode={mode} />
      </svg>
    </div>
  )
}

/* ---------------- 🌳 درخت تُون — قهرمان صحنه ---------------- */
// تنهٔ منحنیِ باریک‌شونده + سه شاخه که هر کدام دقیقاً «داخل» خوشهٔ برگ
// تمام می‌شوند (شاخه‌ها تا مرکز تاج برگ می‌روند تا برگ‌ها هرگز جدا از
// درخت دیده نشوند) + تاج پرپشت از دایره‌های سیج + برگ‌های مرکب برند
// که از دل تاج بیرون می‌زنند + توت، گل سفید و تابلوی آویز «香椿».
function ToonTree({ className = '' }: { className?: string }) {
  // خوشهٔ برگ: چند دایرهٔ روی‌هم + برگ‌های مرکب که پایه‌شان داخل خوشه است
  const Cluster = ({ x, y, r, fronds }: { x: number; y: number; r: number; fronds: { rot: number; len: number; mode?: LeafMode }[] }) => (
    <g>
      {fronds.map((f, i) => (
        <Frond key={i} x={x} y={y} rot={f.rot} len={f.len} mode={f.mode ?? 'outline'} dur={6 + (i % 3)} delay={i * 0.5} />
      ))}
      <circle cx={x} cy={y} r={r} fill={SAGE_FILL} stroke={LEAF} strokeWidth="2.4" />
    </g>
  )

  return (
    <svg viewBox="0 0 520 620" className={className} fill="none" aria-hidden="true">
      {/* سایهٔ نرم زیر درخت */}
      <ellipse cx="290" cy="606" rx="130" ry="14" fill={LEAF} opacity="0.08" />

      {/* 🪧 تابلوی آویز «香椿» — با دو بند از تنه */}
      <g>
        <path d="M292 470 Q 268 478 246 486" stroke={BROWN_LIGHT} strokeWidth="2.4" fill="none" />
        <path d="M292 520 Q 272 528 252 534" stroke={BROWN_LIGHT} strokeWidth="2.4" fill="none" />
        <g className="animate-ct-wiggle" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
          <rect x="186" y="486" width="130" height="52" rx="12" fill={CREAM} stroke={LEAF} strokeWidth="2.6" />
          <rect x="193" y="493" width="116" height="38" rx="8" stroke={LEAF} strokeWidth="1.3" opacity="0.4" />
          <text x="251" y="522" textAnchor="middle" fontSize="27" fontWeight="700" letterSpacing="5" fill={LEAF_DARK}>
            香椿
          </text>
          <circle cx="194" cy="494" r="2.6" fill={RUST} />
          <circle cx="308" cy="494" r="2.6" fill={RUST} />
        </g>
      </g>

      {/* تنه — منحنی نرم و باریک‌شونده با ریشهٔ پهن */}
      <path
        d="M258 610 Q 272 596 296 594 Q 288 540 286 488 Q 284 428 286 372 Q 287 318 280 252 Q 276 216 274 186"
        stroke={LEAF_DARK} strokeWidth="11" strokeLinecap="round"
      />
      <path d="M274 186 Q 273 172 277 158" stroke={LEAF} strokeWidth="7" strokeLinecap="round" />
      {/* بافت خفیف تنه */}
      <path d="M287 560 Q 284 500 285 440 M283 380 Q 281 330 278 280" stroke={LEAF} strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />

      {/* شاخه‌ها — هر شاخه تا «مرکز» خوشهٔ برگ پیش می‌رود */}
      <path d="M285 430 C 256 400, 226 370, 197 344" stroke={LEAF} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M286 398 C 314 356, 340 324, 364 298" stroke={LEAF} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M282 344 C 268 326, 254 312, 239 298" stroke={LEAF} strokeWidth="4.5" strokeLinecap="round" />

      {/* تاج و خوشه‌ها — تابِ خیلی ملایم حول سرِ تنه */}
      <g className="animate-ct-sway" style={{ transformBox: 'view-box', transformOrigin: '272px 250px', animationDuration: '8.5s' }}>
        {/* تاج اصلی — پرپشت از دایره‌های روی‌هم */}
        <g stroke={LEAF} strokeWidth="2.4">
          <circle cx="270" cy="188" r="52" fill={SAGE_FILL} />
          <circle cx="224" cy="206" r="37" fill={SAGE_FILL} />
          <circle cx="316" cy="206" r="38" fill={SAGE_FILL} />
          <circle cx="252" cy="160" r="34" fill={SAGE_FILL} />
          <circle cx="292" cy="157" r="33" fill={SAGE_FILL} />
          <circle cx="202" cy="232" r="24" fill={SAGE_FILL} />
          <circle cx="338" cy="234" r="23" fill={SAGE_FILL} />
          {/* هایلایت‌های روشن روی تاج */}
          <circle cx="258" cy="168" r="20" fill="#DCEED8" stroke="none" opacity="0.8" />
          <circle cx="300" cy="182" r="15" fill="#DCEED8" stroke="none" opacity="0.7" />
        </g>

        {/* برگ‌های مرکب برند — پایه‌ها داخل تاج، رو به بیرون */}
        <Frond x={252} y={178} rot={235} len={92} mode="outline" dur={6.8} delay={0.2} />
        <Frond x={284} y={172} rot={292} len={98} mode="outline" dur={7.4} delay={0.6} />
        <Frond x={266} y={160} rot={265} len={88} mode="sage" dur={6.4} delay={0.9} />
        <Frond x={238} y={196} rot={208} len={78} mode="sage" dur={7.0} delay={0.4} />
        <Frond x={300} y={192} rot={330} len={80} mode="rust" dur={6.6} delay={1.1} />
        <Frond x={318} y={214} rot={12} len={72} mode="outline" dur={7.2} delay={0.8} />

        {/* خوشهٔ شاخهٔ چپ */}
        <Cluster x={197} y={344} r={26} fronds={[{ rot: 196, len: 62 }, { rot: 232, len: 54, mode: 'sage' }]} />
        {/* خوشهٔ شاخهٔ راست */}
        <Cluster x={364} y={298} r={27} fronds={[{ rot: 14, len: 64 }, { rot: 46, len: 56, mode: 'sage' }]} />
        {/* خوشهٔ کوچک میانی */}
        <Cluster x={239} y={298} r={20} fronds={[{ rot: 246, len: 48, mode: 'rust' }]} />

        {/* توت و گل‌های سفید — لبهٔ تاج */}
        <Berries x={330} y={158} rot={-14} />
        <Berries x={212} y={178} rot={16} />
        <Berries x={352} y={272} rot={30} />
        <Blossom x={296} y={142} s={0.95} />
        <Blossom x={236} y={150} s={0.8} />
        <Blossom x={326} y={216} s={0.75} />
        <Blossom x={206} y={262} s={0.65} />
      </g>

      {/* بوته‌های پای درخت */}
      <g>
        <g transform="translate(120 588)">
          <circle cx="-20" cy="-2" r="18" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <circle cx="2" cy="-8" r="24" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <circle cx="24" cy="0" r="17" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <circle cx="6" cy="-24" r="3" fill={RUST} />
        </g>
        <g transform="translate(448 598) scale(0.8)">
          <circle cx="-20" cy="-2" r="18" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <circle cx="2" cy="-8" r="24" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <circle cx="24" cy="0" r="17" fill={SAGE_FILL} stroke={LEAF} strokeWidth="2" />
          <Blossom x={-4} y={-34} s={0.7} />
        </g>
      </g>

      {/* علف‌های کوچک پای تنه */}
      {[
        { x: 160, y: 610, s: 1 },
        { x: 356, y: 612, s: 0.9 },
        { x: 412, y: 604, s: 0.8 },
        { x: 96, y: 602, s: 0.8 },
      ].map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`} stroke={SAGE_DARK} strokeWidth="2.4" strokeLinecap="round">
          <path d="M0 0 Q -5 -13 -9 -17" />
          <path d="M0 0 Q 0 -15 2 -19" />
          <path d="M0 0 Q 6 -11 10 -15" />
        </g>
      ))}
    </svg>
  )
}

/* ================= 🌄 صحنهٔ کامل هیرو ================= */
export function HeroScene() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* ☀️ خورشید کره‌ای — در آسمانِ بالا-راست، بالای چیپ واژه */}
      <div className="absolute right-[11%] top-[140px] w-20 h-20 md:w-24 md:h-24">
        <div className="absolute inset-[-16px] rounded-full bg-butter/40 blur-lg animate-ct-floatSlow" />
        <div className="absolute inset-0 rounded-full bg-butter border-4 border-butter-light shadow-[0_0_0_10px_rgba(243,217,139,0.28)]" />
      </div>

      {/* ☁️ ابرها — با رانش آرام، زیر خط هدر نه پشت آن */}
      <Cloud className="left-[20%] top-[150px] w-32 md:w-40" dur={30} />
      <Cloud className="right-[24%] top-[214px] w-24 md:w-32 hidden sm:block" dur={24} delay={3} />
      <Cloud className="right-[16%] top-[118px] w-36 md:w-48 hidden md:block" dur={34} delay={1.5} />

      {/* 🐦 پرنده‌ها */}
      <Birds className="left-[23%] top-[150px] w-14 opacity-70" />
      <Birds className="left-[47%] top-[150px] w-9 opacity-50 hidden md:block" />

      {/* 🍃 برگ‌های شناور — خارج از محدودهٔ متن */}
      <DriftLeaf className="left-[42%] top-[120px]" w={26} mode="sage" dur={5.5} rot={-18} />
      <DriftLeaf className="right-[30%] top-[150px] hidden sm:block" w={20} mode="rust" dur={6.5} delay={1} rot={14} />
      <DriftLeaf className="left-[57%] top-[330px] hidden sm:block" w={30} mode="outline" dur={7} delay={0.5} rot={30} />
      <DriftLeaf className="right-[10%] top-[430px] hidden lg:block" w={22} mode="sage" dur={5} delay={1.6} rot={-30} />
      <DriftLeaf className="left-[33%] top-[468px] hidden lg:block" w={24} mode="rust" dur={6} delay={2.2} rot={8} />

      {/* 学 پس‌زمینه — فقط دسکتاپ، خیلی محو */}
      <div className="char-bg top-[26%] left-[34%] hidden md:block" style={{ fontSize: '240px', opacity: 0.05 }}>
        学
      </div>

      {/* ⛰️ رشته‌تپه‌ها — تمام‌عرض، کشیده‌شونده */}
      <svg
        viewBox="0 0 1440 230"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[130px] sm:h-[160px] md:h-[200px] lg:h-[230px] animate-ct-fadeInUp delay-300"
        fill="none"
      >
        {/* تپهٔ دور */}
        <path
          d="M0 118 C 240 58, 430 68, 720 108 C 1000 148, 1220 66, 1440 92 L1440 230 L0 230 Z"
          fill={SAGE_FILL}
          opacity="0.55"
        />
        {/* تپهٔ میانی */}
        <path
          d="M0 162 C 200 120, 480 176, 760 150 C 1040 124, 1240 168, 1440 140 L1440 230 L0 230 Z"
          fill={SAGE_FILL}
        />
        {/* زمین پیش‌زمینه */}
        <path
          d="M0 196 C 260 164, 520 206, 820 186 C 1100 168, 1300 202, 1440 186 L1440 230 L0 230 Z"
          fill="#A8C9A0"
        />
        {/* دالان کرم‌رنگ ملایم روی زمین */}
        <path
          d="M40 228 C 320 204, 560 214, 880 198 C 1080 188, 1250 198, 1420 192"
          stroke={CREAM}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* نقطه‌های گل و علف روی تپه */}
        <circle cx="270" cy="204" r="3.2" fill="#FFFFFF" opacity="0.8" />
        <circle cx="700" cy="194" r="2.6" fill="#FFFFFF" opacity="0.7" />
        <circle cx="1060" cy="198" r="3" fill={CREAM} opacity="0.9" />
        <circle cx="520" cy="210" r="2.4" fill={SAGE_DARK} opacity="0.7" />
        <circle cx="1230" cy="210" r="2.6" fill={SAGE_DARK} opacity="0.6" />
      </svg>

      {/* 🌳 درخت تُون + چیپ‌های واژه + حباب گفتگو — لنگر در سمت راست، روی تپه */}
      <div className="absolute bottom-[36px] sm:bottom-[44px] md:bottom-[62px] -right-[64px] sm:-right-[24px] md:right-0 lg:right-8 xl:right-16 w-[300px] sm:w-[350px] md:w-[390px] lg:w-[440px] xl:w-[490px] animate-ct-fadeInUp delay-200">
        <ToonTree className="w-full h-auto" />

        {/* 💬 حباب گفتگو — تاج درخت حرف می‌زند (absolute! چون .speech-bubble موقعیت را بازنویسی می‌کند) */}
        <div className="speech-bubble animate-ct-wiggle absolute! top-[-2%] -left-[8%] lg:-left-[5%] hidden sm:block">
          <p className="text-sm font-medium text-brown whitespace-nowrap">
            你好！Let&apos;s learn! 🎉
          </p>
        </div>

        {/* 🏷️ چیپ واژهٔ 香 — روی تاج، بالا-راست */}
        <div className="absolute top-[13%] right-[6%] bg-butter rounded-2xl px-3.5 py-2 shadow-md animate-ct-float hidden sm:block">
          <span className="text-lg font-bold text-brown-dark">香</span>
          <span className="text-xs text-brown-light block">xiāng · fragrant</span>
        </div>
        {/* 🏷️ چیپ واژهٔ 椿 — لبهٔ چپ تاج */}
        <div
          className="absolute top-[40%] -left-[4%] lg:-left-[1%] bg-white/95 backdrop-blur rounded-2xl px-3.5 py-2 shadow-md animate-ct-float hidden sm:block md:hidden lg:block"
          style={{ animationDelay: '1s' }}
        >
          <span className="text-lg font-bold text-sage-dark">椿</span>
          <span className="text-xs text-brown-light block">chūn · toon tree</span>
        </div>
      </div>
    </div>
  )
}
