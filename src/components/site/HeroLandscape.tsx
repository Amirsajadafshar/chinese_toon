// ---------------------------------------------------------------------
//  🏞️ HeroLandscape — فاز ۷۱: بازترسیم صحنه بر اساس تصویر مرجع مالک
//  (آبرنگ پاستلی چینی: شاخهٔ برگ‌دار با دو فانوس قرمز، خورشید مرجانی
//   با ابرِ عبورکننده، کوه‌های مه‌آلود سیج با پاگودا، آلاچیق دواشکنه،
//   پل قوسی سنگی، قایق سامپان با فانوس، کاراکترهای 你好 / 学 / 中،
//   برگ‌های پاییزی در حال ریزش و خوشه‌های برگ محو در دو گوشه)
//
//  منطق حرکت = «فقط چیزهایی که در واقعیت حرکت می‌کنند»:
//   • فانوس‌ها: آونگِ واقعی حول سرِ بند + دُنبچه با تأخیر کوچک
//   • شاخه‌ها: تاب بسیار ظریف حول اتصال به لبهٔ کادر
//   • برگ‌های روی شاخه: لرزش نسیم در گروه‌های کوچک
//   • برگ‌های پاییزی: ریزش واقعی با چرخش و محو در دو سر مسیر
//   • آب: جریان dash هم‌مرتبه با دورهٔ dash (لوپ بی‌درز) + سوسو + چرخاب
//   • قایق: جان‌گرفتن روی موج + انعکاس لرزان
//   • مه: رانش آرام + نفس شفافیت  • ابر خورشید: عبور خیلی کند
//   • پرنده: سُرخوردن طولانی با محو دو سر  • هالهٔ خورشید: نفس
//  ثابت‌ها (چیزهایی که در واقعیت حرکت ندارند): کوه‌ها، پاگودا، آلاچیق،
//  پل، سنگ‌ها و کاراکترهای خوش‌نویسی.
//  همهٔ حرکات فقط transform/opacity؛ prefers-reduced-motion → صحنهٔ ثابت.
// ---------------------------------------------------------------------

const INK = '#6A6458' // جوهر کاراکترها و پرنده
const SKY_TOP = '#FCF9F0'
const SKY_BOT = '#F4EDDA'
const MOUNT_FAR = '#D8DECB'
const MOUNT_MID_A = '#B9C6A9'
const MOUNT_MID_B = '#A2B18F'
const PAGODA = '#77856D'
const WATER_A = '#E0E7D3'
const WATER_B = '#C2CFB5'
const STONE = '#C9C3B2'
const STONE_LINE = '#8F897A'
const ROOF = '#665D50'
const ROOF_HI = '#7E7566'
const WOOD = '#B0714E'
const WALL = '#E7DCC6'
const TREE_D = '#5E6F55'
const TREE_L = '#6E7F60'
const BRANCH = '#8A7A62'
const BRANCH_HI = '#A59075'
const LEAF_G = '#8CA37E'
const LEAF_G2 = '#9DB08C'
const LEAF_G3 = '#77906D'
const LEAF_R1 = '#C17A4E'
const LEAF_R2 = '#A85F3B'
const LEAF_R3 = '#D29066'
const LEAF_OL = '#969B68'
const LANTERN_BODY = '#D65540'
const LANTERN_EDGE = '#B24332'
const GOLD = '#D9A05B'
const FLOWER_C = '#E8C46B'
const HULL = '#6E5B44'
const CANOPY = '#D6C6A4'
const CANOPY_D = '#B9A883'

/* برگ کشیده و نوک‌تیز مرجع — مسیر محلی با اتصال از (0,0) */
const LEAF_D = 'M0 0 C 12 -11 34 -13 54 -4 C 36 7 13 8 0 0 Z'
const VEIN_D = 'M3 -1 C 20 -5 38 -6 50 -4'

function Leaf({ x, y, rot = 0, s = 1, fill = LEAF_G, vein = false, flip = false, opacity = 1 }: {
  x: number; y: number; rot?: number; s?: number; fill?: string; vein?: boolean; flip?: boolean; opacity?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} opacity={opacity}>
      <path d={LEAF_D} fill={fill} />
      {vein && <path d={VEIN_D} fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.35" />}
    </g>
  )
}

/* گل پنج‌پر سفید با مرکز طلایی — خوشه‌های کوچک روی شاخه */
function Flower({ x, y, s = 1, open = true }: { x: number; y: number; s?: number; open?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {open ? (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-5.2" rx="3.1" ry="4.6" fill="#FFFFFF" stroke="#D8D2C0" strokeWidth="0.5" transform={`rotate(${a})`} />
          ))}
          <circle r="2.4" fill={FLOWER_C} />
        </>
      ) : (
        <circle r="2.8" fill="#EFF3E4" stroke="#C9CDB6" strokeWidth="0.6" />
      )}
    </g>
  )
}

/* 🏮 فانوس قرمز مرجع — بدنهٔ گرد، رگه، کلاهک طلایی، دُنبچهٔ تاب‌خور */
function Lantern({ x, y, rope, scale = 1, dur = 7.5, delay = 0, tasselDur = 5.6 }: {
  x: number; y: number; rope: number; scale?: number; dur?: number; delay?: number; tasselDur?: number
}) {
  return (
    <g>
      {/* بند آویز */}
      <path d={`M${x} ${y} L${x} ${y + rope}`} stroke="#7A6A52" strokeWidth="1.8" opacity="0.8" />
      {/* آونگ اصلی — pivot = سر بند (مختصات سراسری) */}
      <g
        className="animate-ct-scene-lantern"
        style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
      >
        <g transform={`translate(${x} ${y + rope}) scale(${scale})`}>
          {/* کلاهک بالا */}
          <rect x="-8" y="-5" width="16" height="7" rx="2.2" fill={GOLD} stroke="#B98842" strokeWidth="0.8" />
          {/* بدنه */}
          <ellipse cx="0" cy="20" rx="21" ry="24" fill={LANTERN_BODY} stroke={LANTERN_EDGE} strokeWidth="1.6" />
          {/* رگه‌های عمودی */}
          <g fill="none" stroke={LANTERN_EDGE} strokeWidth="1" opacity="0.4">
            <path d="M0 -4 L0 44" />
            <path d="M-11 -1 C -15 12 -15 29 -11 41" />
            <path d="M11 -1 C 15 12 15 29 11 41" />
          </g>
          {/* بازتاب نور */}
          <ellipse cx="-7" cy="11" rx="5" ry="9" fill="#FFFFFF" opacity="0.25" />
          {/* کلاهک پایین */}
          <rect x="-6" y="42" width="12" height="5.5" rx="2" fill={GOLD} stroke="#B98842" strokeWidth="0.8" />
          {/* دُنبچه — خودش با تأخیر کوچک تاب می‌خورد (فیزیک واقعی) */}
          <g
            className="animate-ct-scene-lantern"
            style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y + rope + 47 * scale}px`, animationDuration: `${tasselDur}s`, animationDelay: `${delay - 0.6}s` }}
          >
            <path d="M0 47 L0 66" stroke={LANTERN_EDGE} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M-2.5 56 L-3.5 64 M2.5 56 L3.5 64" stroke={LANTERN_EDGE} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <circle cx="0" cy="69" r="2.8" fill={GOLD} />
          </g>
        </g>
      </g>
    </g>
  )
}

/* 🍃 برگ پاییزی در حال ریزش — سقوط واقعی با چرخش، محو در دو سر */
function FallingLeaf({ x, y, dur, delay, s = 1, fill = LEAF_R1, rot = 0 }: {
  x: number; y: number; dur: number; delay: number; s?: number; fill?: string; rot?: number
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="animate-ct-scene-petal" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
        <g transform={`rotate(${rot}) scale(${s})`}>
          <path d={LEAF_D} fill={fill} opacity="0.95" />
        </g>
      </g>
    </g>
  )
}

/* 🐦 پرندهٔ جوهری دوردست */
function Bird({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`} fill="none" stroke={INK} strokeLinecap="round">
      <path d="M0 6 Q 6 0 12 6 Q 18 0 24 6" strokeWidth="1.8" opacity="0.6" />
    </g>
  )
}

/* 🌀 چرخاب کوچک سطح آب — امضای مرجع */
function Swirl({ x, y, s = 1, opacity = 0.55 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" opacity={opacity}>
      <path d="M0 0 C 14 -3 24 4 21 13 C 18.5 20 9 20.5 6.5 14.5 C 5 10.5 9.5 7.5 12.5 10" />
    </g>
  )
}

/* 🌾 خوشهٔ علف کرانه — میکرو-حرکت نسیم */
function GrassTuft({ x, y, s = 1, dur = 6.5, delay = 0 }: { x: number; y: number; s?: number; dur?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g
        className="animate-ct-scene-grass"
        style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
        stroke="#93A984"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M0 0 Q -5 -12 -9 -16" />
        <path d="M0 0 Q 0 -14 2 -18" />
        <path d="M0 0 Q 6 -10 10 -14" />
      </g>
    </g>
  )
}

/* ==================================================================== */
export function HeroLandscape() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        <defs>
          <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_TOP} />
            <stop offset="70%" stopColor="#F8F2E2" />
            <stop offset="100%" stopColor={SKY_BOT} />
          </linearGradient>
          <radialGradient id="ct-sun" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#F6BE9F" />
            <stop offset="70%" stopColor="#EFA483" />
            <stop offset="100%" stopColor="#E78F6C" />
          </radialGradient>
          <linearGradient id="ct-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={WATER_A} />
            <stop offset="100%" stopColor={WATER_B} />
          </linearGradient>
          <linearGradient id="ct-mount-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MOUNT_MID_A} />
            <stop offset="100%" stopColor={MOUNT_MID_B} />
          </linearGradient>
          <filter id="ct-blur1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" /></filter>
          <filter id="ct-blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" /></filter>
          <filter id="ct-blur3" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.6" /></filter>
          <filter id="ct-blur4" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4.5" /></filter>
          <filter id="ct-blur8" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="ct-blur12" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>

        {/* ================= آسمان کرم ================= */}
        <rect x="0" y="0" width="1440" height="760" fill="url(#ct-sky)" />

        {/* ☀️ خورشید مرجانی — ساکن؛ فقط هاله نفس می‌کشد */}
        <g transform="translate(1010 300)">
          <circle r="104" fill="#F2A986" opacity="0.3" filter="url(#ct-blur12)" className="animate-ct-scene-glow" />
          <circle r="70" fill="url(#ct-sun)" />
          <circle r="70" fill="none" stroke="#E08A67" strokeWidth="1.2" strokeOpacity="0.5" />
        </g>

        {/* ☁️ ابرِ باریکِ عبورکننده از خورشید — رانش خیلی کند روی لبهٔ پایین خورشید */}
        <g transform="translate(985 336)">
          <g className="animate-ct-scene-mist" style={{ animationDuration: '46s', transformBox: 'view-box', transformOrigin: '985px 336px' }}>
            <g fill="#F8F2E2" fillOpacity="0.92">
              <ellipse cx="0" cy="0" rx="52" ry="10" />
              <ellipse cx="34" cy="-8" rx="30" ry="8" />
            </g>
          </g>
        </g>
        {/* ابر دوردستِ مسیر بلند — کل آسمان را آرام می‌پیماید (لوپ با محو دو سر) */}
        <g transform="translate(0 120)">
          <g className="animate-ct-scene-glide-x-b" style={{ animationDuration: '150s' }}>
            <g fill="#FFFFFF" fillOpacity="0.75">
              <ellipse cx="0" cy="0" rx="40" ry="11" />
              <ellipse cx="28" cy="-7" rx="26" ry="9" />
              <ellipse cx="56" cy="0" rx="34" ry="9" />
            </g>
          </g>
        </g>

        {/* 🐦 پرندهٔ جوهری — سُرخوردن بسیار کند در آسمان */}
        <g transform="translate(0 322)">
          <g className="animate-ct-scene-glide-x" style={{ animationDuration: '88s', animationDelay: '-30s' }}>
            <Bird s={1.15} />
          </g>
        </g>

        {/* ================= خوش‌نویسی تزیینی (ساکن — خوش‌نویسی در واقعیت حرکت نمی‌کند) ================= */}
        <g className="ct-hero-calligraphy">
          <g fill={INK} opacity="0.85" fontFamily="'Noto Serif SC','Songti SC','STSong','SimSun',serif" fontWeight="600">
            <text x="764" y="200" fontSize="40">你</text>
            <text x="764" y="254" fontSize="40">好</text>
            <text x="694" y="452" fontSize="44">学</text>
            <text x="1160" y="252" fontSize="42">中</text>
          </g>
          <path d="M1176 268 L1176 306" stroke={INK} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        </g>

        {/* ================= ⛰️ کوه‌های دوردست — محو و ساکن ================= */}
        <path
          d="M0 540 L0 470 C 90 430 170 452 260 436 C 330 424 380 452 450 456 C 520 460 560 500 640 508 C 700 514 740 496 800 496 C 850 496 900 470 950 462 C 1010 452 1060 448 1120 462 C 1200 480 1260 470 1330 452 C 1380 440 1420 448 1440 452 L1440 600 L0 600 Z"
          fill={MOUNT_FAR}
          opacity="0.8"
          filter="url(#ct-blur1)"
        />
        {/* ⛰️ کوه‌های میانی — کمی پررنگ‌تر؛ قلهٔ راست میزبان پاگودا */}
        <path
          d="M0 585 L0 520 C 70 490 140 470 210 470 C 290 470 340 500 410 510 C 480 520 540 545 620 550 C 690 554 740 540 800 536 C 860 532 900 508 950 496 C 1010 482 1070 480 1130 496 C 1200 514 1260 530 1330 528 C 1380 526 1420 534 1440 540 L1440 620 L0 620 Z"
          fill="url(#ct-mount-mid)"
          opacity="0.9"
        />
        {/* قلهٔ راست — تپهٔ پاگودا */}
        <path d="M980 560 C 1000 500 1040 462 1080 458 C 1120 462 1150 500 1165 555 C 1110 540 1030 540 980 560 Z" fill={MOUNT_MID_B} opacity="0.95" />
        {/* 🗼 پاگودا سه‌اشکنه — سیلوئت ساکن روی قله (ساخته‌ها حرکت نمی‌کنند) */}
        <g transform="translate(1080 452)" fill={PAGODA}>
          <rect x="-1.6" y="-58" width="3.2" height="10" rx="1.6" />
          <path d="M-13 -48 L13 -48 L10 -40 L-10 -40 Z" />
          <path d="M-19 -40 Q 0 -50 19 -40 Q 8 -36 0 -36 Q -8 -36 -19 -40 Z" />
          <rect x="-11" y="-36" width="22" height="8" />
          <path d="M-23 -28 Q 0 -37 23 -28 Q 10 -24 0 -24 Q -10 -24 -23 -28 Z" />
          <rect x="-14" y="-24" width="28" height="9" />
          <path d="M-27 -15 Q 0 -24 27 -15 Q 12 -11 0 -11 Q -12 -11 -27 -15 Z" />
          <rect x="-17" y="-11" width="34" height="12" />
        </g>

        {/* 🌫️ مه کوه‌ها — رانش آرام + نفس شفافیت */}
        <ellipse cx="700" cy="556" rx="800" ry="44" fill="#FFFFFF" opacity="0.75" filter="url(#ct-blur12)" className="animate-ct-scene-mist" />
        <ellipse cx="1150" cy="540" rx="380" ry="34" fill="#FFFFFF" opacity="0.6" filter="url(#ct-blur12)" className="animate-ct-scene-mist" style={{ animationDuration: '38s', animationDelay: '-14s' }} />

        {/* ================= 🌊 رودخانهٔ پهن ================= */}
        <path d="M0 610 C 240 592 480 596 720 602 C 980 608 1220 600 1440 588 L1440 760 L0 760 Z" fill="url(#ct-water)" />
        {/* 🌫️ مهِ برخورد کوه و آب */}
        <ellipse cx="420" cy="606" rx="520" ry="26" fill="#FFFFFF" opacity="0.55" filter="url(#ct-blur12)" className="animate-ct-scene-mist" style={{ animationDuration: '40s', animationDelay: '-20s' }} />

        {/* خطوط جریان — dashoffset مضرب دورهٔ dash ⇒ لوپ بی‌درز */}
        <g fill="none" strokeLinecap="round">
          <path d="M40 630 C 400 620 800 626 1400 616" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.5" strokeDasharray="70 110" className="animate-ct-scene-flow" />
          <path d="M30 654 C 420 644 860 652 1410 642" stroke="#FFFFFF" strokeWidth="1.9" opacity="0.36" strokeDasharray="70 110" className="animate-ct-scene-flow" style={{ animationDuration: '33s', animationDelay: '-9s' }} />
          <path d="M60 678 C 420 670 840 676 1400 666" stroke="#EDF3E3" strokeWidth="2.2" opacity="0.42" strokeDasharray="70 110" className="animate-ct-scene-flow" style={{ animationDuration: '29s', animationDelay: '-16s' }} />
        </g>
        {/* 🌀 چرخاب‌های مرجع — نزدیک پای پل و سینهٔ آب */}
        <Swirl x={610} y={668} s={1.1} />
        <Swirl x={700} y={646} s={0.8} opacity={0.45} />
        <Swirl x={1000} y={706} s={1.25} opacity={0.5} />
        <Swirl x={340} y={700} s={0.9} opacity={0.4} />
        {/* موج کوتاه کناره‌ها */}
        <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.6" opacity="0.5">
          <path d="M180 664 Q 196 660 212 664" />
          <path d="M1240 652 Q 1256 648 1272 652" />
          <path d="M470 690 Q 486 686 502 690" />
        </g>
        {/* ✨ سوسوی نور روی آب */}
        <g fill="#FFFFFF" filter="url(#ct-blur4)">
          <ellipse cx="600" cy="632" rx="60" ry="7" opacity="0.2" className="animate-ct-scene-shimmer" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }} />
          <ellipse cx="1150" cy="622" rx="70" ry="8" opacity="0.17" className="animate-ct-scene-shimmer" style={{ animationDelay: '-3s', transformBox: 'fill-box', transformOrigin: '50% 50%' }} />
          <ellipse cx="300" cy="668" rx="54" ry="6" opacity="0.18" className="animate-ct-scene-shimmer" style={{ animationDelay: '-6s', transformBox: 'fill-box', transformOrigin: '50% 50%' }} />
        </g>

        {/* ================= 🌉 پل قوسی سنگی — ساکن + انعکاس لرزان ================= */}
        <g>
          {/* انعکاس قوس روی آب — سوسوی بسیار ظریف */}
          <path d="M578 630 C 604 668 756 668 782 630" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.14" filter="url(#ct-blur2)" className="animate-ct-scene-shimmer" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }} />
          {/* بدنهٔ قوس — نوار سنگی میان دو کمان */}
          <path d="M556 612 C 592 552 768 552 804 612 L 780 612 C 754 572 606 572 580 612 Z" fill={STONE} stroke={STONE_LINE} strokeWidth="1.4" strokeOpacity="0.7" />
          {/* جان‌پناه — ریل + پایه‌ها */}
          <path d="M566 596 C 602 542 758 542 794 596" fill="none" stroke={STONE_LINE} strokeWidth="3" strokeOpacity="0.85" strokeLinecap="round" />
          <g stroke={STONE_LINE} strokeWidth="2.4" strokeOpacity="0.8" strokeLinecap="round">
            <path d="M578 600 L578 588" />
            <path d="M614 578 L614 566" />
            <path d="M650 568 L650 556" />
            <path d="M686 566 L686 554" />
            <path d="M722 568 L722 556" />
            <path d="M758 578 L758 566" />
            <path d="M790 598 L790 586" />
          </g>
          {/* سایهٔ دهانهٔ قوس */}
          <path d="M584 610 C 610 574 750 574 776 610" fill="none" stroke="#7E7868" strokeWidth="2" strokeOpacity="0.5" />
          {/* پایه‌های سنگی دو سر */}
          <path d="M548 612 L568 612 L566 630 L550 630 Z" fill={STONE} stroke={STONE_LINE} strokeWidth="1.2" strokeOpacity="0.6" />
          <path d="M792 612 L812 612 L810 630 L794 630 Z" fill={STONE} stroke={STONE_LINE} strokeWidth="1.2" strokeOpacity="0.6" />
        </g>

        {/* ================= 🏯 آلاچیق دواشکنه با درختان — ساکن =================
            پایین-چپِ کادر و زیر خطِ متن (translate) تا با تیتر/دکمه‌ها تداخل نکند. */}
        <g transform="translate(-84 58)">
          {/* درختان تیرهٔ پشتی */}
          <g>
            <circle cx="158" cy="512" r="24" fill={TREE_D} />
            <circle cx="188" cy="494" r="28" fill="#4E5F49" />
            <circle cx="222" cy="512" r="20" fill={TREE_D} />
            <path d="M186 522 L186 556" stroke="#5C5040" strokeWidth="3" />
            <circle cx="428" cy="506" r="24" fill={TREE_L} />
            <circle cx="456" cy="524" r="19" fill={TREE_D} />
            <path d="M436 528 L436 560" stroke="#5C5040" strokeWidth="3" />
          </g>
          {/* صخرهٔ پایه */}
          <path d="M170 640 C 176 606 210 588 252 586 C 300 584 340 596 356 616 C 366 628 368 636 368 644 L 172 644 Z" fill="#B3A78F" stroke="#8F8471" strokeWidth="1.4" strokeOpacity="0.6" />
          <path d="M330 642 C 336 620 356 608 380 608 C 402 608 418 620 424 636 L 424 644 L 330 644 Z" fill="#C1B69E" stroke="#8F8471" strokeWidth="1.2" strokeOpacity="0.5" />
          {/* سکو */}
          <rect x="196" y="580" width="170" height="10" rx="2" fill="#A89C84" />
          {/* ستون‌ها + دیوار */}
          <rect x="206" y="520" width="150" height="60" fill={WALL} />
          <g stroke={WOOD} strokeWidth="5" strokeLinecap="round">
            <path d="M212 580 L212 522" />
            <path d="M244 580 L244 522" />
            <path d="M318 580 L318 522" />
            <path d="M350 580 L350 522" />
          </g>
          {/* در و پنجره */}
          <rect x="268" y="540" width="26" height="40" rx="2" fill="#6B6152" />
          <rect x="228" y="536" width="14" height="16" rx="2" fill="#6B6152" opacity="0.75" />
          <rect x="322" y="536" width="14" height="16" rx="2" fill="#6B6152" opacity="0.75" />
          {/* بام پایین با لبه‌های برگشته */}
          <path d="M186 526 C 190 508 206 500 232 498 L 330 498 C 356 500 372 508 376 526 C 340 512 281 512 281 512 C 281 512 222 512 186 526 Z" fill={ROOF} />
          <path d="M186 526 C 222 512 281 512 281 512 C 281 512 340 512 376 526" fill="none" stroke="#4E463C" strokeWidth="2" strokeOpacity="0.7" />
          <path d="M196 508 C 232 500 330 500 366 508" stroke={ROOF_HI} strokeWidth="2" fill="none" strokeOpacity="0.8" />
          {/* بام بالا */}
          <path d="M228 472 C 232 458 244 452 262 450 L 300 450 C 318 452 330 458 334 472 C 306 462 281 462 281 462 C 281 462 256 462 228 472 Z" fill={ROOF} />
          <path d="M274 448 L288 448 L286 442 L276 442 Z" fill={ROOF} />
          <path d="M234 464 C 258 457 304 457 328 464" stroke={ROOF_HI} strokeWidth="1.8" fill="none" strokeOpacity="0.8" />
          {/* 🌫️ wisp مه پای آلاچیق */}
          <ellipse cx="290" cy="646" rx="150" ry="16" fill="#FFFFFF" opacity="0.5" filter="url(#ct-blur8)" className="animate-ct-scene-mist" style={{ animationDuration: '34s', animationDelay: '-8s' }} />
        </g>

        {/* ================= ⛵ قایق سامپان با فانوس — جان‌گرفتن روی موج ================= */}
        <g transform="translate(830 648)">
          <g className="animate-ct-scene-bob">
            {/* انعکاس — معکوس و محو، با سوسو */}
            <g transform="translate(0 46) scale(1 -1)" opacity="0.16" filter="url(#ct-blur2)">
              <path d="M0 16 C 25 28 115 28 145 14 C 120 22 25 24 0 16 Z" fill={HULL} />
              <circle cx="138" cy="-4" r="5" fill={LANTERN_BODY} />
            </g>
            {/* بدنه */}
            <path d="M0 16 C 25 28 115 28 145 14 C 120 22 25 24 0 16 Z" fill={HULL} stroke="#4F4132" strokeWidth="1.4" />
            <path d="M4 17 C 30 26 112 26 140 15" stroke="#8A7458" strokeWidth="1.2" fill="none" opacity="0.7" />
            {/* سایه‌بان حصیری */}
            <path d="M36 8 Q 62 -8 88 8 L 82 13 Q 62 1 42 13 Z" fill={CANOPY} stroke={CANOPY_D} strokeWidth="1.2" />
            <path d="M52 4 L 50 10 M 68 2 L 67 9" stroke={CANOPY_D} strokeWidth="1" />
            {/* قایق‌ران + پارو */}
            <circle cx="24" cy="4" r="3.6" fill="#4F4132" />
            <path d="M24 8 C 22 12 20 14 18 15" stroke="#4F4132" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M18 12 L 6 20" stroke="#5C4C39" strokeWidth="1.6" strokeLinecap="round" />
            {/* دکل سرِ قایق + فانوس قرمز کوچک */}
            <path d="M136 12 L 142 -14" stroke="#5C4C39" strokeWidth="2" strokeLinecap="round" />
            <path d="M142 -14 L 150 -8" stroke="#5C4C39" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="151" cy="-3" r="6" fill={LANTERN_BODY} stroke={LANTERN_EDGE} strokeWidth="1" />
            <circle cx="151" cy="-3" r="10" fill="#F3D98B" opacity="0.3" filter="url(#ct-blur8)" className="animate-ct-scene-glow" style={{ animationDuration: '7s' }} />
            {/* ردّ موج پشت قایق */}
            <path d="M-8 22 Q 6 26 20 24 M -14 26 Q 4 31 24 28" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />
          </g>
        </g>

        {/* 🍂 برگ‌های نشسته بر آب — رانش بسیار آرام با جریان */}
        <g className="animate-ct-scene-mist" style={{ animationDuration: '26s', transformBox: 'view-box', transformOrigin: '480px 648px' }}>
          <Leaf x={468} y={646} rot={12} s={0.62} fill={LEAF_R3} />
        </g>
        <g className="animate-ct-scene-mist" style={{ animationDuration: '32s', animationDelay: '-12s', transformBox: 'view-box', transformOrigin: '1046px 684px' }}>
          <Leaf x={1034} y={682} rot={-14} s={0.58} fill={LEAF_R2} />
        </g>

        {/* ================= 🍂 برگ‌های پاییزی در حال ریزش ================= */}
        <FallingLeaf x={340} y={130} dur={26} delay={-4} s={0.8} fill={LEAF_R1} rot={18} />
        <FallingLeaf x={520} y={160} dur={22} delay={-14} s={0.66} fill={LEAF_R3} rot={-24} />
        <FallingLeaf x={760} y={120} dur={29} delay={-8} s={0.74} fill={LEAF_R2} rot={40} />
        <FallingLeaf x={905} y={170} dur={24} delay={-19} s={0.6} fill={LEAF_R1} rot={-10} />
        <FallingLeaf x={1090} y={140} dur={27} delay={-2} s={0.72} fill={LEAF_OL} rot={28} />
        <FallingLeaf x={1245} y={180} dur={21} delay={-11} s={0.62} fill={LEAF_R3} rot={-32} />
        <FallingLeaf x={640} y={190} dur={30} delay={-24} s={0.55} fill={LEAF_R2} rot={8} />

        {/* ================= 🌸 شاخهٔ بزرگ بالا-چپ با دو فانوس قرمز =================
            تنه از لبهٔ بالا وارد می‌شود، در میانه پهن است و نوکش به سمت مرکز
            خم می‌شود — فانوس‌ها از ناحیهٔ نوک آویزان‌اند (دور از ستون متن). */}
        <g
          className="animate-ct-scene-branch ct-hero-branch"
          style={{ transformBox: 'view-box', transformOrigin: '0px 16px', animationDuration: '13s' }}
        >
          {/* تنه — از گوشه با قوسِ ملایم تا نوکِ خمیده */}
          <path d="M-40 14 C 160 30 360 60 540 116 C 578 128 606 146 622 170" stroke={BRANCH} strokeWidth="12" strokeLinecap="round" />
          <path d="M-40 12 C 160 28 352 56 528 108 C 564 120 590 136 606 158" stroke={BRANCH_HI} strokeWidth="4.5" strokeLinecap="round" opacity="0.75" />
          {/* زیرشاخه‌ها */}
          <path d="M240 38 C 268 44 292 54 308 64" stroke={BRANCH} strokeWidth="5" strokeLinecap="round" />
          <path d="M420 84 C 444 90 464 100 478 110" stroke={BRANCH} strokeWidth="4.5" strokeLinecap="round" />
          {/* تگک نوک برای فانوس دوم */}
          <path d="M622 170 C 642 164 660 156 676 148" stroke={BRANCH} strokeWidth="4" strokeLinecap="round" />

          {/* 🍃 برگ‌ها در گروه‌های لرزانِ نسیم — هر گروه حول محل اتصال */}
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '70px 24px', animationDuration: '6.2s' }}>
            <Leaf x={70} y={24} rot={-52} s={0.95} fill={LEAF_G} vein />
            <Leaf x={94} y={26} rot={-125} s={0.8} fill={LEAF_G2} flip />
            <Leaf x={52} y={22} rot={135} s={0.7} fill={LEAF_R3} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '150px 32px', animationDuration: '7s', animationDelay: '-2s' }}>
            <Leaf x={150} y={32} rot={-42} s={1.05} fill={LEAF_G3} vein />
            <Leaf x={180} y={38} rot={20} s={0.85} fill={LEAF_OL} />
            <Leaf x={132} y={30} rot={142} s={0.7} fill={LEAF_R3} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '250px 42px', animationDuration: '6.6s', animationDelay: '-3s' }}>
            <Leaf x={250} y={42} rot={-48} s={1.1} fill={LEAF_G} vein />
            <Leaf x={284} y={52} rot={-74} s={0.9} fill={LEAF_R1} />
            <Leaf x={262} y={44} rot={116} s={0.8} fill={LEAF_G2} flip />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '340px 58px', animationDuration: '7.4s', animationDelay: '-1s' }}>
            <Leaf x={340} y={58} rot={-40} s={1.15} fill={LEAF_R1} vein />
            <Leaf x={374} y={68} rot={-68} s={0.95} fill={LEAF_G3} />
            <Leaf x={352} y={60} rot={126} s={0.85} fill={LEAF_OL} flip />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '308px 64px', animationDuration: '6.4s', animationDelay: '-4s' }}>
            <Leaf x={308} y={64} rot={-30} s={0.9} fill={LEAF_G2} vein />
            <Leaf x={324} y={72} rot={-58} s={0.75} fill={LEAF_R3} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '478px 110px', animationDuration: '7.2s', animationDelay: '-2.6s' }}>
            <Leaf x={478} y={110} rot={-52} s={1.05} fill={LEAF_G2} vein />
            <Leaf x={506} y={120} rot={-80} s={0.85} fill={LEAF_R3} />
            <Leaf x={486} y={112} rot={132} s={0.75} fill={LEAF_R2} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '560px 126px', animationDuration: '6.8s', animationDelay: '-1.6s' }}>
            <Leaf x={560} y={126} rot={-46} s={1} fill={LEAF_G} vein />
            <Leaf x={588} y={138} rot={-70} s={0.82} fill={LEAF_R1} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '622px 170px', animationDuration: '5.9s', animationDelay: '-3.2s' }}>
            <Leaf x={622} y={170} rot={-24} s={0.9} fill={LEAF_G} vein />
            <Leaf x={646} y={182} rot={-52} s={0.75} fill={LEAF_OL} />
          </g>

          {/* 🤍 خوشه‌های گل سفید — نوک شاخه و زیرشاخه */}
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '604px 158px', animationDuration: '5.8s' }}>
            <Flower x={604} y={156} s={1.1} />
            <Flower x={622} y={168} s={0.85} />
            <Flower x={590} y={170} s={0.7} open={false} />
            <Flower x={634} y={150} s={0.68} open={false} />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '308px 64px', animationDuration: '6.9s', animationDelay: '-3.4s' }}>
            <Flower x={306} y={62} s={0.9} />
            <Flower x={320} y={72} s={0.65} open={false} />
          </g>

          {/* 🏮 دو فانوس قرمز آویزان از ناحیهٔ نوک — آونگ واقعی + دُنبچهٔ با تأخیر */}
          <Lantern x={634} y={172} rope={40} scale={1} dur={8.2} tasselDur={5.9} />
          <Lantern x={688} y={148} rope={26} scale={0.85} dur={9.6} delay={-3.4} tasselDur={6.4} />
        </g>

        {/* ================= 🌿 شاخهٔ راست (بدون فانوس — مطابق مرجع) ================= */}
        <g
          className="animate-ct-scene-branch ct-hero-branch"
          style={{ transformBox: 'view-box', transformOrigin: '1480px 218px', animationDuration: '14s', animationDelay: '-6s' }}
        >
          <path d="M1478 212 C 1408 230 1338 262 1276 318" stroke={BRANCH} strokeWidth="9" strokeLinecap="round" />
          <path d="M1478 210 C 1416 226 1352 254 1292 306" stroke={BRANCH_HI} strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '1398px 240px', animationDuration: '6.8s', animationDelay: '-1.4s' }}>
            <Leaf x={1398} y={240} rot={206} s={1.05} fill={LEAF_G} vein flip />
            <Leaf x={1380} y={248} rot={148} s={0.85} fill={LEAF_R1} flip />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '1316px 288px', animationDuration: '7.3s', animationDelay: '-3.8s' }}>
            <Leaf x={1316} y={288} rot={196} s={1.1} fill={LEAF_G3} vein flip />
            <Leaf x={1298} y={298} rot={152} s={0.9} fill={LEAF_OL} flip />
            <Leaf x={1334} y={278} rot={232} s={0.8} fill={LEAF_R3} flip />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '1280px 318px', animationDuration: '6.3s', animationDelay: '-2.2s' }}>
            <Leaf x={1280} y={318} rot={188} s={0.95} fill={LEAF_G2} vein flip />
            <Leaf x={1262} y={330} rot={146} s={0.78} fill={LEAF_R2} flip />
          </g>
          <g className="animate-ct-scene-grass" style={{ transformBox: 'view-box', transformOrigin: '1294px 306px', animationDuration: '6s', animationDelay: '-4.6s' }}>
            <Flower x={1294} y={304} s={0.85} />
            <Flower x={1280} y={314} s={0.65} open={false} />
          </g>
        </g>

        {/* ================= 🍃 خوشه‌های برگ محو گوشه‌ها (عمق میدان — ثابت) ================= */}
        <g filter="url(#ct-blur3)">
          <Leaf x={-16} y={742} rot={-38} s={2.3} fill="#6F8563" vein />
          <Leaf x={8} y={700} rot={-70} s={2} fill="#7C9270" />
          <Leaf x={-6} y={664} rot={-100} s={1.7} fill="#5E7355" />
          <Leaf x={44} y={726} rot={-24} s={1.8} fill={LEAF_R2} />
        </g>
        <g filter="url(#ct-blur3)">
          <Leaf x={1456} y={742} rot={218} s={2.3} fill="#6F8563" vein flip />
          <Leaf x={1432} y={700} rot={250} s={2} fill="#7C9270" flip />
          <Leaf x={1448} y={662} rot={280} s={1.7} fill="#5E7355" flip />
          <Leaf x={1396} y={726} rot={204} s={1.8} fill={LEAF_R1} flip />
        </g>
        <g filter="url(#ct-blur2)">
          <Leaf x={1452} y={470} rot={196} s={1.5} fill="#7C9270" vein flip />
          <Leaf x={1436} y={500} rot={162} s={1.25} fill={LEAF_R1} flip />
          <Leaf x={1448} y={532} rot={214} s={1.35} fill="#5E7355" flip />
        </g>

        {/* علف‌های ظریف لبهٔ پایین */}
        <GrassTuft x={620} y={752} s={0.9} dur={6.8} delay={-2} />
        <GrassTuft x={1010} y={748} s={0.85} dur={7.2} delay={-4} />
        <GrassTuft x={180} y={754} s={0.8} dur={6.4} delay={-1} />
      </svg>
    </div>
  )
}
