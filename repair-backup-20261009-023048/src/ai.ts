import type { PatientProfile, Vital } from "./types";

function latest(vitals: Vital[], type: Vital["type"]) {
  return vitals.filter((v) => v.type === type).sort((a, b) => b.at - a.at)[0];
}

export function assessVital(v: Vital): { level: "ok" | "warn" | "danger"; label: string } {
  if (v.type === "sugar") {
    if (v.value < 70) return { level: "danger", label: "قند پایین" };
    if (v.value >= 180) return { level: "warn", label: "قند بالا" };
    return { level: "ok", label: "قند مناسب" };
  }
  if (v.type === "bp") {
    if (v.value >= 180 || (v.value2 ?? 0) >= 120) return { level: "danger", label: "فشار بحرانی" };
    if (v.value >= 140 || (v.value2 ?? 0) >= 90) return { level: "warn", label: "فشار بالا" };
    return { level: "ok", label: "فشار مناسب" };
  }
  if (v.type === "hr") {
    if (v.value < 50 || v.value > 120) return { level: "danger", label: "ضربان غیرعادی" };
    if (v.value > 100) return { level: "warn", label: "ضربان تند" };
    return { level: "ok", label: "ضربان مناسب" };
  }
  if (v.type === "o2") {
    if (v.value < 92) return { level: "danger", label: "اکسیژن پایین" };
    if (v.value < 95) return { level: "warn", label: "اکسیژن مرزی" };
    return { level: "ok", label: "اکسیژن مناسب" };
  }
  if (v.type === "temp") {
    if (v.value >= 39) return { level: "danger", label: "تب بالا" };
    if (v.value >= 37.8) return { level: "warn", label: "تب" };
    return { level: "ok", label: "دما مناسب" };
  }
  return { level: "ok", label: "ثبت شد" };
}

export function alertFromVital(patientUserId: string, v: Vital) {
  const a = assessVital(v);
  if (a.level === "ok") return null;
  return {
    id: crypto.randomUUID(),
    patientUserId,
    title: a.label,
    body: `مقدار ثبت‌شده: ${v.value}${v.value2 ? "/" + v.value2 : ""}`,
    level: a.level === "danger" ? ("danger" as const) : ("warn" as const),
    at: Date.now(),
    read: false,
  };
}

export function assistantReply(
  text: string,
  profile: PatientProfile | undefined,
  vitals: Vital[],
  role: "patient" | "caregiver" | "doctor",
) {
  const q = text.trim();
  const sugar = latest(vitals, "sugar");
  const bp = latest(vitals, "bp");
  const hr = latest(vitals, "hr");
  const o2 = latest(vitals, "o2");

  const snapshot = [
    sugar ? `قند ${sugar.value}` : null,
    bp ? `فشار ${bp.value}/${bp.value2}` : null,
    hr ? `ضربان ${hr.value}` : null,
    o2 ? `اکسیژن ${o2.value}٪` : null,
  ]
    .filter(Boolean)
    .join("، ");

  const conditions = profile?.conditions?.join("، ") || "ثبت نشده";
  const who =
    role === "doctor" ? "خلاصه بالینی کمکی" : role === "caregiver" ? "راهنمای مراقب" : "همراه سلامت";

  let body = "";
  if (/قند|شکر|دیابت/.test(q)) {
    body =
      sugar && sugar.value >= 180
        ? "آخرین قند نسبتاً بالاست. آب بنوشد، فعالیت سنگین نکند و اگر علائم تشنگی شدید، تاری دید یا خواب‌آلودگی هست با پزشک تماس بگیرید. داروی دیابت را سر خود قطع نکنید."
        : sugar && sugar.value < 70
          ? "قند پایین است. اگر هوشیار است کمی آبمیوه‌ی شیرین یا حبه قند بدهید و ۱۵ دقیقه بعد دوباره اندازه بگیرید. اگر گیج یا بیهوش شد اورژانس ۱۱۵."
          : "برای کنترل قند: وعده‌های منظم، پیاده‌روی روزانه، و ثبت ناشتا و ۲ ساعت بعد غذا خیلی کمک می‌کند.";
  } else if (/فشار|سرگیجه|سردرد/.test(q)) {
    body =
      bp && (bp.value >= 140 || (bp.value2 ?? 0) >= 90)
        ? "فشار کمی بالاست. نمک را کم کنید، دارو را منظم بدهید و در صورت درد سینه یا تنگی نفس فوری به مرکز درمانی بروید."
        : "فشار خون با خواب کافی، کاهش نمک و پیاده‌روی آرام بهتر می‌ماند. عدد را صبح و شب ثبت کنید.";
  } else if (/دارو|قرص/.test(q)) {
    body =
      "داروها را سر ساعت مشخص بدهید و قطع خودسرانه نکنید. اگر فراموش شد و نزدیک نوبت بعدی است، دوز را دو برابر نکنید مگر پزشک گفته باشد.";
  } else if (/غذا|رژیم|وزن/.test(q)) {
    body =
      "بشقاب سالم: نصف سبزی، یک‌چهارم پروتئین، یک‌چهارم غلات کامل. شیرینی و نوشابه را کم کنید. برای دیابت، نان سفید و برنج زیاد را محدود کنید.";
  } else if (/تب|سرماخوردگی|سرفه/.test(q)) {
    body =
      "استراحت، مایعات گرم و تب‌بر در صورت نیاز. اگر تب بالای ۳۹، تنگی نفس یا درد قفسه سینه شد حتماً پزشک ببیند.";
  } else if (/خلاصه|وضعیت|گزارش/.test(q)) {
    body = snapshot
      ? `وضعیت اخیر: ${snapshot}. بیماری‌های زمینه‌ای: ${conditions}. روند را با چند نوبت پشت‌سرهم قضاوت کنید، نه یک عدد تکی.`
      : "هنوز عدد حیاتی کافی ثبت نشده. قند، فشار و ضربان را امروز وارد کنید تا خلاصه دقیق‌تری بدهم.";
  } else {
    body = snapshot
      ? `پرسش شما را دیدم. بر اساس آخرین ثبت‌ها (${snapshot}) فعلاً وضعیت را پیگیری کنید و تغییرات ناگهانی را به پزشک بگویید.`
      : "سلام، من همراه هوشمند دکترآنلاین هستم. قند، فشار، دارو یا علائم را بپرسید تا راهنمایی عمومی بدهم.";
  }

  return `${who}\n\n${body}\n\nاین پاسخ جایگزین معاینه پزشک نیست. در شرایط اضطراری با ۱۱۵ تماس بگیرید.`;
}
