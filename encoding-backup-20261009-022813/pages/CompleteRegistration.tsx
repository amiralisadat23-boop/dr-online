import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingRegistration, useAuth } from "../auth";

export default function CompleteRegistration() {
  const { completeRegistration } = useAuth();
  const navigate = useNavigate();

  const pending = getPendingRegistration();

  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [smoker, setSmoker] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!pending.token || !pending.phone || !pending.role) {
    return (
      <div className="phone-shell bg-paper min-h-dvh p-6 grid place-items-center">
        <div className="card rounded-3xl p-6 text-center">
          <h1 className="text-xl font-extrabold">
            فرایند ثبت‌نام منقضی شده است
          </h1>

          <p className="text-muted mt-3">
            لطفاً دوباره با شماره موبایل خود شروع کنید.
          </p>

          <button
            className="mt-6 w-full h-11 rounded-2xl bg-teal text-white font-bold"
            onClick={() => navigate("/", { replace: true })}
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("نام و نام خانوادگی را وارد کنید.");
      return;
    }

    setBusy(true);

    try {
      const result = await completeRegistration({
        name: name.trim(),
        role: pending.role!,
        national_id: nationalId.trim() || undefined,
        age: age ? Number(age) : undefined,
        height_cm: height ? Number(height) : undefined,
        weight_kg: weight ? Number(weight) : undefined,
        gender: gender || undefined,
        blood_type: bloodType || undefined,
        caregiver_phone: caregiverPhone.trim() || undefined,
        conditions: conditions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        allergies: allergies.trim() || undefined,
        smoker,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      navigate("/app", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none";

  return (
    <div className="phone-shell bg-paper min-h-dvh px-5 pt-8 pb-10">
      <div className="max-w-xl mx-auto">

        <p className="text-teal font-bold">
          DR ONLINE
        </p>

        <h1 className="text-3xl font-extrabold mt-3">
          تکمیل اطلاعات
        </h1>

        <p className="text-muted mt-2">
          شماره {pending.phone} تأیید شد.
        </p>

        <form
          onSubmit={submit}
          className="mt-7 space-y-4"
        >

          <div className="card rounded-3xl p-5 space-y-4">

            <div>
              <label className="block font-bold mb-2">
                نام و نام خانوادگی
              </label>

              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً امیرعلی احمدی"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">
                کد ملی
              </label>

              <input
                className={inputClass}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                inputMode="numeric"
                maxLength={10}
                placeholder="اختیاری"
              />
            </div>

            {pending.role === "patient" && (
              <>
                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block font-bold mb-2">
                      سن
                    </label>

                    <input
                      className={inputClass}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      inputMode="numeric"
                      type="number"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">
                      جنسیت
                    </label>

                    <select
                      className={inputClass}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">انتخاب</option>
                      <option value="زن">زن</option>
                      <option value="مرد">مرد</option>
                    </select>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block font-bold mb-2">
                      قد (سانتی‌متر)
                    </label>

                    <input
                      className={inputClass}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      inputMode="decimal"
                      type="number"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">
                      وزن (کیلوگرم)
                    </label>

                    <input
                      className={inputClass}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      inputMode="decimal"
                      type="number"
                    />
                  </div>

                </div>

                <div>
                  <label className="block font-bold mb-2">
                    گروه خونی
                  </label>

                  <select
                    className={inputClass}
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                  >
                    <option value="">انتخاب</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    شماره مراقب
                  </label>

                  <input
                    className={inputClass}
                    value={caregiverPhone}
                    onChange={(e) =>
                      setCaregiverPhone(e.target.value)
                    }
                    inputMode="tel"
                    placeholder="اختیاری"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    بیماری‌ها
                  </label>

                  <input
                    className={inputClass}
                    value={conditions}
                    onChange={(e) =>
                      setConditions(e.target.value)
                    }
                    placeholder="مثلاً دیابت، فشار خون"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    حساسیت‌ها
                  </label>

                  <input
                    className={inputClass}
                    value={allergies}
                    onChange={(e) =>
                      setAllergies(e.target.value)
                    }
                    placeholder="اختیاری"
                  />
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={smoker}
                    onChange={(e) =>
                      setSmoker(e.target.checked)
                    }
                  />

                  <span className="font-bold">
                    سیگاری هستم
                  </span>
                </label>
              </>
            )}

          </div>

          {error && (
            <p className="text-coral text-sm font-bold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-2xl bg-teal text-white font-extrabold disabled:opacity-50"
          >
            {busy ? "در حال ثبت اطلاعات..." : "ساخت حساب"}
          </button>

        </form>
      </div>
    </div>
  );
}
