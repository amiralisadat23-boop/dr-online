import { hashPassword } from "./crypto";
import { db } from "./db";
import type { Alert, Vital } from "./types";

const uid = () => crypto.randomUUID();
const ago = (hours: number) => Date.now() - hours * 3600_000;

export async function seedIfEmpty() {
  const existing = await db.users.toArray();
  for (const u of existing) {
    const anyUser = u as { password?: string; passwordHash?: string };
    if (anyUser.password && !anyUser.passwordHash) {
      await db.users.update(u.id, {
        passwordHash: await hashPassword(anyUser.password),
        password: undefined,
      } as never);
    }
  }
  const count = await db.users.count();
  if (count > 0) return;
  const demoHash = await hashPassword("123456");

  const patientId = "p-sara";
  const patient2Id = "p-ali";
  const caregiverId = "c-maryam";
  const doctorId = "d-rezaei";

  await db.users.bulkAdd([
    {
      id: patientId,
      role: "patient",
      name: "سارا محمدی",
      phone: "09120001111",
      passwordHash: demoHash,
      nationalId: "0012345678",
    },
    {
      id: patient2Id,
      role: "patient",
      name: "علی کریمی",
      phone: "09120002222",
      passwordHash: demoHash,
      nationalId: "0012345679",
    },
    {
      id: caregiverId,
      role: "caregiver",
      name: "مریم محمدی",
      phone: "09121234567",
      passwordHash: demoHash,
    },
    {
      id: doctorId,
      role: "doctor",
      name: "دکتر رضا رضایی",
      phone: "09127654321",
      passwordHash: demoHash,
    },
  ]);

  await db.profiles.bulkAdd([
    {
      id: uid(),
      userId: patientId,
      nationalId: "0012345678",
      age: 54,
      heightCm: 162,
      weightKg: 71,
      gender: "زن",
      bloodType: "A+",
      caregiverPhone: "09121234567",
      conditions: ["دیابت نوع ۲", "فشار خون"],
      allergies: "پنی‌سیلین",
      sleepHours: 6,
      smoker: false,
    },
    {
      id: uid(),
      userId: patient2Id,
      nationalId: "0012345679",
      age: 67,
      heightCm: 174,
      weightKg: 82,
      gender: "مرد",
      bloodType: "O+",
      caregiverPhone: "09121234567",
      conditions: ["نارسایی قلبی خفیف"],
      allergies: "ندارد",
      sleepHours: 7,
      smoker: true,
    },
  ]);

  await db.links.bulkAdd([
    { id: uid(), fromUserId: caregiverId, patientUserId: patientId, relation: "دختر", kind: "care" },
    { id: uid(), fromUserId: caregiverId, patientUserId: patient2Id, relation: "عمو", kind: "care" },
    { id: uid(), fromUserId: doctorId, patientUserId: patientId, relation: "فوق تخصص غدد", kind: "doctor" },
    { id: uid(), fromUserId: doctorId, patientUserId: patient2Id, relation: "قلب و عروق", kind: "doctor" },
  ]);

  await db.medications.bulkAdd([
    { id: uid(), patientUserId: patientId, name: "متفورمین", dose: "۵۰۰ میلی‌گرم", schedule: "صبح و شب بعد غذا" },
    { id: uid(), patientUserId: patientId, name: "لوزارتان", dose: "۵۰ میلی‌گرم", schedule: "هر صبح" },
    { id: uid(), patientUserId: patient2Id, name: "آسپرین", dose: "۸۰ میلی‌گرم", schedule: "هر شب" },
  ]);

  const sugar: Vital[] = [118, 142, 96, 188, 131].map((v, i) => ({
    id: uid(),
    patientUserId: patientId,
    type: "sugar",
    value: v,
    context: i % 2 ? "بعد غذا" : "ناشتا",
    at: ago(i * 8 + 2),
  }));
  const bp: Vital[] = [
    { s: 128, d: 82 },
    { s: 146, d: 91 },
    { s: 132, d: 84 },
  ].map((v, i) => ({
    id: uid(),
    patientUserId: patientId,
    type: "bp" as const,
    value: v.s,
    value2: v.d,
    at: ago(i * 12 + 3),
  }));

  await db.vitals.bulkAdd([
    ...sugar,
    ...bp,
    { id: uid(), patientUserId: patientId, type: "hr", value: 78, at: ago(4) },
    { id: uid(), patientUserId: patientId, type: "weight", value: 71, at: ago(24) },
    { id: uid(), patientUserId: patientId, type: "o2", value: 97, at: ago(5) },
    { id: uid(), patientUserId: patient2Id, type: "hr", value: 92, at: ago(3) },
    { id: uid(), patientUserId: patient2Id, type: "bp", value: 138, value2: 86, at: ago(6) },
    { id: uid(), patientUserId: patient2Id, type: "o2", value: 94, at: ago(3) },
  ]);

  await db.notes.bulkAdd([
    {
      id: uid(),
      authorId: caregiverId,
      patientUserId: patientId,
      body: "امروز داروی صبح را سر وقت خورد. کمی خستگی بعد از پیاده‌روی داشت.",
      kind: "caregiver",
      at: ago(6),
    },
    {
      id: uid(),
      authorId: doctorId,
      patientUserId: patientId,
      body: "قند بعد غذا را روزانه ثبت کند. اگر سه نوبت بالای ۱۸۰ ماند، تماس بگیرد.",
      kind: "doctor",
      at: ago(30),
    },
  ]);

  const alerts: Alert[] = [
    {
      id: uid(),
      patientUserId: patientId,
      title: "قند خون بالا",
      body: "آخرین قند بعد غذا ۱۸۸ میلی‌گرم در دسی‌لیتر بود.",
      level: "warn",
      at: ago(2),
      read: false,
    },
    {
      id: uid(),
      patientUserId: patient2Id,
      title: "اکسیژن کمی پایین",
      body: "اشباع اکسیژن ۹۴٪ ثبت شده؛ در صورت تنگی نفس به پزشک خبر دهید.",
      level: "info",
      at: ago(3),
      read: false,
    },
  ];
  await db.alerts.bulkAdd(alerts);
}
