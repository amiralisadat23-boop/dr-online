import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, HeartHandshake, Stethoscope } from "lucide-react";
import { useAuth } from "../auth";
import type { Role } from "../types";

export function Welcome() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) {
      navigate("/app", { replace: true });
    }
  }, [ready, user, navigate]);

  return (
    <div className="phone-shell bg-paper min-h-dvh px-5 pt-10 pb-8 relative overflow-hidden">
      <div className="absolute -left-10 -top-8 w-40 h-40 rounded-full bg-teal/15 floaty" />
      <div className="absolute -right-8 top-24 w-28 h-28 rounded-full bg-coral/15 floaty" />

      <p className="text-teal font-bold tracking-wide rise">
        DR ONLINE
      </p>

      <h1 className="mt-3 text-4xl font-extrabold leading-[1.2] rise delay-1">
        مراقبت سلامت
        <br />
        در کنار هم
      </h1>

      <p className="mt-3 text-muted leading-7 rise delay-2">
        بیمار علائم را ثبت می‌کند، مراقب وضعیت را می‌بیند و پزشک پرونده را
        زیر نظر دارد — با یک همراه هوشمند.
      </p>

      <div className="mt-8 space-y-3 rise delay-3 stagger">
        <RoleCard
          to="/login/patient"
          icon={<Activity />}
          title="من بیمار هستم"
          desc="ثبت قند، فشار، دارو و پرونده پزشکی"
        />

        <RoleCard
          to="/login/caregiver"
          icon={<HeartHandshake />}
          title="من مراقب هستم"
          desc="نظارت روی بیمار، هشدار و یادداشت مراقبتی"
        />

        <RoleCard
          to="/login/doctor"
          icon={<Stethoscope />}
          title="من پزشک هستم"
          desc="پنل بیماران، روند علائم و توصیه پزشکی"
        />
      </div>
    </div>
  );
}

function RoleCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="card pressable rounded-3xl p-4 flex items-center gap-4 text-right rise"
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted mt-0.5">{desc}</p>
      </div>

      <div className="w-12 h-12 rounded-2xl bg-teal text-white grid place-items-center shrink-0">
        {icon}
      </div>
    </Link>
  );
}

export function Login({ role }: { role: Role }) {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const title =
    role === "patient"
      ? "ورود بیمار"
      : role === "caregiver"
        ? "ورود مراقب"
        : "ورود پزشک";

  async function sendCode() {
    setError(null);

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("شماره موبایل را وارد کنید.");
      return;
    }

    setBusy(true);

    try {
      const result = await requestOtp(normalizedPhone);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDevCode(result.devCode || null);
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setError(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError("کد تأیید باید ۶ رقم باشد.");
      return;
    }

    setBusy(true);

    try {
      const result = await verifyOtp(phone, code, role);

      if (result === "REGISTRATION_REQUIRED") {
        navigate("/complete-registration", { replace: true });
        return;
      }

      if (result) {
        setError(result);
        return;
      }

      navigate("/app", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="phone-shell bg-paper min-h-dvh px-5 pt-10">
      <Link to="/" className="text-sm text-teal">
        بازگشت
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold rise">
        {title}
      </h1>

      {step === "phone" ? (
        <>
          <p className="text-muted mt-2 text-sm">
            شماره موبایل خود را وارد کنید تا کد تأیید برای شما ارسال شود.
          </p>

          <form
            className="mt-8 space-y-4 rise delay-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <Field
              label="شماره موبایل"
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
            />

            {error && (
              <p className="text-coral text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-2xl bg-teal text-white font-bold pressable disabled:opacity-60"
            >
              {busy ? "در حال ارسال..." : "ارسال کد تأیید"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-muted mt-2 text-sm">
            کد ۶ رقمی ارسال‌شده برای شماره
            <br />
            <span className="font-bold text-ink">
              {phone}
            </span>
            <br />
            را وارد کنید.
          </p>

          <form
            className="mt-8 space-y-4 rise delay-2"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmCode();
            }}
          >
            <Field
              label="کد تأیید ۶ رقمی"
              value={code}
              onChange={(value) =>
                setCode(
                  value.replace(/\D/g, "").slice(0, 6),
                )
              }
              type="tel"
              autoComplete="one-time-code"
            />

            {devCode && (
              <div className="rounded-2xl bg-teal/10 p-3 text-sm">
                کد تست توسعه:
                <span className="font-extrabold mr-2">
                  {devCode}
                </span>
              </div>
            )}

            {error && (
              <p className="text-coral text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full h-12 rounded-2xl bg-teal text-white font-bold pressable disabled:opacity-60"
            >
              {busy ? "در حال بررسی..." : "تأیید و ورود"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCode("");
                setError(null);
                setDevCode(null);
                setStep("phone");
              }}
              className="w-full h-11 rounded-2xl bg-white font-bold"
            >
              تغییر شماره
            </button>
          </form>
        </>
      )}

      <Link
        to={`/register/${role}`}
        className="block text-center mt-5 text-teal font-bold"
      >
        حساب ندارم، ثبت‌نام می‌کنم
      </Link>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>

      <input
        className="mt-1 w-full h-12 rounded-2xl bg-white px-4 outline-none border border-black/5"
        value={value}
        type={type}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

const CONDITIONS = [
  "دیابت",
  "فشار خون",
  "بیماری قلبی",
  "آسم",
  "کلیوی",
  "تیروئید",
];

export function Register({ role }: { role: Role }) {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    nationalId: "",
    age: "45",
    heightCm: "165",
    weightKg: "70",
    gender: "زن" as "زن" | "مرد",
    bloodType: "A+",
    caregiverPhone: "",
    allergies: "",
    conditions: [] as string[],
    relation: "فرزند",
    patientNationalId: "",
  });

  const set = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="phone-shell bg-paper min-h-dvh px-5 pt-10 pb-10">
      <Link to={`/login/${role}`} className="text-sm text-teal">
        بازگشت
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold">
        ثبت‌نام
      </h1>

      <p className="text-muted mt-2 text-sm">
        رمز حداقل ۸ کاراکتر و ترکیبی از حروف و عدد باشد.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();

          const err = await register({
            role,
            name: form.name,
            phone: form.phone,
            password: form.password,
            nationalId: form.nationalId,
            age: Number(form.age),
            heightCm: Number(form.heightCm),
            weightKg: Number(form.weightKg),
            gender: form.gender,
            bloodType: form.bloodType,
            caregiverPhone: form.caregiverPhone,
            conditions: form.conditions,
            allergies: form.allergies,
            relation: form.relation,
            patientNationalId: form.patientNationalId,
          });

          if (err) {
            setError(err);
          } else {
            navigate("/app");
          }
        }}
      >
        <Field
          label="نام و نام خانوادگی"
          value={form.name}
          onChange={(v) => set("name", v)}
        />

        <Field
          label="شماره موبایل"
          value={form.phone}
          onChange={(v) => set("phone", v)}
        />

        <Field
          label="رمز عبور"
          value={form.password}
          onChange={(v) => set("password", v)}
          type="password"
          autoComplete="new-password"
        />

        {role === "patient" && (
          <>
            <Field
              label="کد ملی"
              value={form.nationalId}
              onChange={(v) => set("nationalId", v)}
            />

            <div className="grid grid-cols-3 gap-2">
              <Field
                label="سن"
                value={form.age}
                onChange={(v) => set("age", v)}
              />

              <Field
                label="قد (سانتی‌متر)"
                value={form.heightCm}
                onChange={(v) => set("heightCm", v)}
              />

              <Field
                label="وزن"
                value={form.weightKg}
                onChange={(v) => set("weightKg", v)}
              />
            </div>

            <Field
              label="شماره مراقب"
              value={form.caregiverPhone}
              onChange={(v) => set("caregiverPhone", v)}
            />

            <Field
              label="گروه خونی"
              value={form.bloodType}
              onChange={(v) => set("bloodType", v)}
            />

            <Field
              label="حساسیت دارویی"
              value={form.allergies}
              onChange={(v) => set("allergies", v)}
            />

            <p className="text-sm text-muted pt-1">
              بیماری‌های زمینه‌ای
            </p>

            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const on = form.conditions.includes(c);

                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        conditions: on
                          ? f.conditions.filter((x) => x !== c)
                          : [...f.conditions, c],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      on
                        ? "bg-teal text-white"
                        : "bg-white"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {role === "caregiver" && (
          <>
            <Field
              label="کد ملی بیمار تحت نظر (اختیاری)"
              value={form.patientNationalId}
              onChange={(v) =>
                set("patientNationalId", v)
              }
            />

            <Field
              label="نسبت با بیمار"
              value={form.relation}
              onChange={(v) => set("relation", v)}
            />
          </>
        )}

        {error && (
          <p className="text-coral text-sm">
            {error}
          </p>
        )}

        <button className="w-full h-12 rounded-2xl bg-teal text-white font-bold mt-2 pressable">
          ساخت حساب
        </button>
      </form>
    </div>
  );
}

