export type Role = "patient" | "caregiver" | "doctor";

export type User = {
  id: string;
  role: Role;
  name: string;
  phone: string;
  passwordHash: string;
  nationalId?: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export type PatientProfile = {
  id: string;
  userId: string;
  nationalId: string;
  age: number;
  heightCm: number;
  weightKg: number;
  gender: "زن" | "مرد";
  bloodType: string;
  caregiverPhone: string;
  conditions: string[];
  allergies: string;
  sleepHours?: number;
  smoker: boolean;
};

export type Link = {
  id: string;
  fromUserId: string;
  patientUserId: string;
  relation: string;
  kind: "care" | "doctor";
};

export type VitalType = "sugar" | "bp" | "hr" | "temp" | "weight" | "o2" | "mood";

export type Vital = {
  id: string;
  patientUserId: string;
  type: VitalType;
  value: number;
  value2?: number;
  context?: string;
  at: number;
};

export type Medication = {
  id: string;
  patientUserId: string;
  name: string;
  dose: string;
  schedule: string;
};

export type Note = {
  id: string;
  authorId: string;
  patientUserId: string;
  body: string;
  kind: "caregiver" | "doctor";
  at: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  at: number;
};

export type Alert = {
  id: string;
  patientUserId: string;
  title: string;
  body: string;
  level: "info" | "warn" | "danger";
  at: number;
  read: boolean;
};
