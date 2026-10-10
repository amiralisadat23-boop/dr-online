export function Splash({ label = "در حال آماده‌سازی پرونده امن..." }: { label?: string }) {
  return (
    <div className="phone-shell min-h-dvh grid place-items-center bg-gradient-to-b from-teal-deep to-teal text-white">
      <div className="text-center px-8">
        <div className="mx-auto w-20 h-20 rounded-[28px] bg-white/15 grid place-items-center pulse-soft">
          <span className="text-3xl font-extrabold">DR</span>
        </div>
        <p className="mt-6 text-xl font-extrabold tracking-wide fade-in">دکترآنلاین</p>
        <p className="mt-2 text-sm text-white/80 fade-in delay-2">{label}</p>
        <div className="mt-8 mx-auto w-28 h-1 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-1/2 bg-white rounded-full loader-bar" />
        </div>
      </div>
    </div>
  );
}
