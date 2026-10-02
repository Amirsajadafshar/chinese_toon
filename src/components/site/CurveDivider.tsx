// ---------------------------------------------------------------------
//  🌊 CurveDivider — جداکنندهٔ ارگانیک بین بخش‌های صفحه‌ها
//  یک موج SVG باریک در بالای هر بخش که با «رنگ بخش قبلی» پر می‌شود تا
//  مرز دو بخش به‌جای خط صاف، لبهٔ منحنیِ نرم باشد. سبک است (دو path)،
//  pointer-events-none و aria-hidden — فقط دکوراسیون.
//  👇 fill را همیشه برابر رنگِ پس‌زمینهٔ «بخشِ قبلی» بدهید.
//  فاز ۲۲: لایهٔ دومِ محو زیر لبه، آرام تاب می‌خورد تا مرز «نفس بکشد»
//  (با prefers-reduced-motion بی‌حرکت می‌شود).
// ---------------------------------------------------------------------

export function CurveDivider({ fill = '#FFFFFF' }: { fill?: string }) {
  return (
    <svg
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="ct-divider absolute top-0 left-0 w-full h-9 md:h-12 pointer-events-none"
    >
      {/* موج پس‌زمینه — از لبه پهن‌تر و کمی پایین‌تر؛ آرام چپ‌وراست می‌رود */}
      <path
        className="ct-divider-echo"
        d="M-80 0 H1520 V12 C 1270 46, 1030 54, 780 43 C 550 33, 290 46, -80 21 Z"
        style={{ fill }}
        opacity="0.55"
      />
      {/* موج اصلی ثابت — لبهٔ ساختاری بخش */}
      <path
        d="M0 0 H1440 V9 C 1190 42, 950 50, 700 39 C 470 29, 210 42, 0 17 Z"
        style={{ fill }}
      />
    </svg>
  )
}
