import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { db, openChat, openNote, sealChat, sealNote } from "../db";
import { useAuth } from "../auth";
import { alertFromVital, assessVital, assistantReply } from "../ai";
import type { Alert, ChatMessage, Medication, Note, PatientProfile, User, Vital, VitalType } from "../types";

import { apiGetProfile, apiSaveProfile, apiGetVitals, apiAddVital } from "../api";
function usePatientBundle(patientUserId?: string) {
  const [profile, setProfile] = useState<PatientProfile | undefined>();
  const [patient, setPatient] = useState<User | undefined>();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  async function reload() {
    if (!patientUserId) return;
    setPatient(await db.users.get(patientUserId));
    try {
        const apiProfile = await apiGetProfile(patientUserId);

        if (apiProfile) {
          setProfile({
            id: String(apiProfile.id ?? crypto.randomUUID()),
            userId: patientUserId,
            nationalId: apiProfile.national_id,
            age: apiProfile.age,
            heightCm: apiProfile.height_cm,
            weightKg: apiProfile.weight_kg,
            gender: apiProfile.gender as PatientProfile["gender"],
            bloodType: apiProfile.blood_type,
            caregiverPhone: apiProfile.caregiver_phone,
            conditions: apiProfile.conditions,
            allergies: apiProfile.allergies,
            smoker: apiProfile.smoker,
          });
        }
      } catch (error) {
        console.warn("Profile API unavailable, using local cache:", error);

        setProfile(
          await db.profiles.where("userId").equals(patientUserId).first(),
        );
      }
    let allVitals: Vital[] = [];

      try {
        const apiVitals = await apiGetVitals(patientUserId);

        allVitals = apiVitals.map((v) => ({
          id: String(v.id),
          patientUserId,
          type: v.type as VitalType,
          value: v.value,
          value2: v.value2 ?? undefined,
          context: v.context ?? undefined,
          at: v.recorded_at,
        }));
      } catch (error) {
        console.warn("Vitals API unavailable, using local cache:", error);

        allVitals = await db.vitals
          .where("patientUserId")
          .equals(patientUserId)
          .toArray();
      }
    setVitals(allVitals.sort((a, b) => b.at - a.at));
    setMeds(await db.medications.where("patientUserId").equals(patientUserId).toArray());
    setNotes(
      (
        await Promise.all(
          (await db.notes.where("patientUserId").equals(patientUserId).toArray()).map(openNote),
        )
      ).sort((a, b) => b.at - a.at),
    );
    setAlerts((await db.alerts.where("patientUserId").equals(patientUserId).toArray()).sort((a, b) => b.at - a.at));
  }

  useEffect(() => {
    reload();
  }, [patientUserId]);

  return { profile, patient, vitals, meds, notes, alerts, reload };
}

export function PatientHome() {
  const { user } = useAuth();
  const data = usePatientBundle(user?.id);
  const last = (t: VitalType) => data.vitals.find((v) => v.type === t);

  return (
    <div className="space-y-4 rise">
      <Hero name={user?.name || ""} profile={data.profile} />
      <div className="grid grid-cols-2 gap-3 stagger">
        <VitalTile title="Ù‚Ù†Ø¯ Ø®ÙˆÙ†" unit="mg/dL" v={last("sugar")} />
        <VitalTile title="ÙØ´Ø§Ø±" unit="mmHg" v={last("bp")} />
        <VitalTile title="Ø¶Ø±Ø¨Ø§Ù†" unit="bpm" v={last("hr")} />
        <VitalTile title="Ø§Ú©Ø³ÛŒÚ˜Ù†" unit="%" v={last("o2")} />
      </div>
      <Link to="/app/log" className="block text-center h-12 leading-[48px] rounded-2xl bg-teal text-white font-bold">
        Ø«Ø¨Øª Ø¹Ù„Ø§Ø¦Ù… Ø§Ù…Ø±ÙˆØ²
      </Link>
      <section className="card rounded-3xl p-4">
        <p className="font-bold mb-3">Ø¯Ø§Ø±ÙˆÙ‡Ø§</p>
        {data.meds.map((m) => (
          <div key={m.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-muted">{m.schedule}</p>
            </div>
            <p className="text-sm text-teal">{m.dose}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Hero({ name, profile }: { name: string; profile?: PatientProfile }) {
  const bmi =
    profile && profile.heightCm
      ? (profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1)
      : "â€”";
  return (
    <div className="rounded-[28px] p-5 text-white bg-gradient-to-br from-teal to-teal-deep">
      <p className="opacity-80 text-sm">Ø³Ù„Ø§Ù…ØŒ Ø®ÙˆØ´ Ø§ÙˆÙ…Ø¯ÛŒ</p>
      <h2 className="text-2xl font-extrabold mt-1">{name.split(" ")[0]} Ø¬Ø§Ù†</h2>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini k="Ø³Ù†" v={profile?.age ?? "â€”"} />
        <Mini k="Ù‚Ø¯" v={profile?.heightCm ? `${profile.heightCm}` : "â€”"} />
        <Mini k="BMI" v={bmi} />
      </div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="bg-white/15 rounded-2xl py-2">
      <p className="text-[11px] opacity-80">{k}</p>
      <p className="font-bold">{v}</p>
    </div>
  );
}

function VitalTile({ title, unit, v }: { title: string; unit: string; v?: Vital }) {
  const a = v ? assessVital(v) : null;
  const color = !a ? "text-muted" : a.level === "ok" ? "text-ok" : a.level === "warn" ? "text-amber-600" : "text-coral";
  return (
    <div className="card rounded-3xl p-4 min-h-[120px] rise">
      <p className="text-sm text-muted">{title}</p>
      <p className={`text-3xl font-extrabold mt-2 ${color}`}>
        {v ? (v.value2 ? `${v.value}/${v.value2}` : v.value) : "â€”"}
      </p>
      <p className="text-xs text-muted mt-1">{v ? unit : "Ù‡Ù†ÙˆØ² Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡"}</p>
    </div>
  );
}

export function LogVital() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<VitalType>("sugar");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [context, setContext] = useState("Ù†Ø§Ø´ØªØ§");

  const types: { id: VitalType; label: string }[] = [
    { id: "sugar", label: "Ù‚Ù†Ø¯" },
    { id: "bp", label: "ÙØ´Ø§Ø±" },
    { id: "hr", label: "Ø¶Ø±Ø¨Ø§Ù†" },
    { id: "o2", label: "Ø§Ú©Ø³ÛŒÚ˜Ù†" },
    { id: "temp", label: "ØªØ¨" },
    { id: "weight", label: "ÙˆØ²Ù†" },
    { id: "mood", label: "Ø­Ø§Ù„" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-4">Ø«Ø¨Øª Ø¹Ù„Ø§Ø¦Ù…</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`px-3 py-2 rounded-full text-sm ${type === t.id ? "bg-teal text-white" : "bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="card rounded-3xl p-4 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">{type === "bp" ? "Ø³ÛŒØ³ØªÙˆÙ„" : "Ù…Ù‚Ø¯Ø§Ø±"}</span>
          <input
            className="mt-1 w-full h-12 rounded-2xl bg-paper px-4"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
          />
        </label>
        {type === "bp" && (
          <label className="block">
            <span className="text-sm text-muted">Ø¯ÛŒØ§Ø³ØªÙˆÙ„</span>
            <input
              className="mt-1 w-full h-12 rounded-2xl bg-paper px-4"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              inputMode="decimal"
            />
          </label>
        )}
        {type === "sugar" && (
          <div className="flex gap-2">
            {["Ù†Ø§Ø´ØªØ§", "Ø¨Ø¹Ø¯ ØºØ°Ø§", "ØªØµØ§Ø¯ÙÛŒ"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setContext(c)}
                className={`flex-1 h-10 rounded-xl text-sm ${context === c ? "bg-teal text-white" : "bg-paper"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <button
          className="w-full h-12 rounded-2xl bg-teal text-white font-bold"
          onClick={async () => {
            if (!user || !value || Number.isNaN(Number(value))) return;
            const vital: Vital = {
              id: crypto.randomUUID(),
              patientUserId: user.id,
              type,
              value: Number(value),
              value2: value2 ? Number(value2) : undefined,
              context: type === "sugar" ? context : undefined,
              at: Date.now(),
            };
            try {
              await apiAddVital(user.id, {
                type,
                value: Number(value),
                value2: value2 ? Number(value2) : undefined,
                context: type === "sugar" ? context : undefined,
              });
            } catch (error) {
              console.error("Failed to save vital to backend:", error);

              // Keep local cache as offline fallback.
              await db.vitals.add(vital);
            }
            const alert = alertFromVital(user.id, vital);
            if (alert) await db.alerts.add(alert);
            navigate("/app");
          }}
        >
          Ø°Ø®ÛŒØ±Ù‡
        </button>
      </div>
    </div>
  );
}

export function PatientRecord() {
  const { user } = useAuth();
  const data = usePatientBundle(user?.id);
  const p = data.profile;
  return (
    <div className="space-y-4 rise">
      <h2 className="text-2xl font-extrabold">Ù¾Ø±ÙˆÙ†Ø¯Ù‡ Ù…Ù†</h2>
      <div className="card rounded-3xl p-4 space-y-2 text-sm">
        <Row k="Ú©Ø¯ Ù…Ù„ÛŒ" v={p?.nationalId} />
        <Row k="Ø³Ù†" v={p?.age} />
        <Row k="Ù‚Ø¯" v={p?.heightCm ? `${p.heightCm} Ø³Ø§Ù†ØªÛŒâ€ŒÙ…ØªØ±` : undefined} />
        <Row k="ÙˆØ²Ù†" v={p?.weightKg ? `${p.weightKg} Ú©ÛŒÙ„Ùˆ` : undefined} />
        <Row k="Ú¯Ø±ÙˆÙ‡ Ø®ÙˆÙ†ÛŒ" v={p?.bloodType} />
        <Row k="Ø´Ù…Ø§Ø±Ù‡ Ù…Ø±Ø§Ù‚Ø¨" v={p?.caregiverPhone} />
        <Row k="Ø¨ÛŒÙ…Ø§Ø±ÛŒâ€ŒÙ‡Ø§" v={p?.conditions.join("ØŒ ")} />
        <Row k="Ø­Ø³Ø§Ø³ÛŒØª" v={p?.allergies} />
      </div>
      <Notes notes={data.notes} />
      <SugarChart vitals={data.vitals} />
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-black/5">
      <span className="text-muted">{k}</span>
      <span className="font-medium">{v || "â€”"}</span>
    </div>
  );
}

function Notes({ notes }: { notes: Note[] }) {
  return (
    <section className="card rounded-3xl p-4">
      <p className="font-bold mb-2">ÛŒØ§Ø¯Ø¯Ø§Ø´Øªâ€ŒÙ‡Ø§</p>
      {notes.length === 0 && <p className="text-sm text-muted">ÛŒØ§Ø¯Ø¯Ø§Ø´ØªÛŒ Ù†ÛŒØ³Øª.</p>}
      {notes.map((n) => (
        <p key={n.id} className="text-sm leading-7 py-2 border-b border-black/5 last:border-0">
          <span className="text-teal text-xs">{n.kind === "doctor" ? "Ù¾Ø²Ø´Ú©" : "Ù…Ø±Ø§Ù‚Ø¨"} Â· </span>
          {n.body}
        </p>
      ))}
    </section>
  );
}

function SugarChart({ vitals }: { vitals: Vital[] }) {
  const data = useMemo(
    () =>
      vitals
        .filter((v) => v.type === "sugar")
        .slice(0, 8)
        .reverse()
        .map((v) => ({ t: new Date(v.at).toLocaleDateString("fa-IR"), v: v.value })),
    [vitals],
  );
  if (data.length < 2) return null;
  return (
    <section className="card rounded-3xl p-4">
      <p className="font-bold mb-3">Ø±ÙˆÙ†Ø¯ Ù‚Ù†Ø¯ Ø®ÙˆÙ†</p>
      <div className="h-40">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="v" stroke="#0f6e6b" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState(user?.id || "");
  const [patients, setPatients] = useState<User[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (user.role === "patient") setTargetId(user.id);
      else {
        const links = await db.links.where("fromUserId").equals(user.id).toArray();
        const ps = await db.users.bulkGet(links.map((l) => l.patientUserId));
        setPatients(ps.filter(Boolean) as User[]);
        if (links[0]) setTargetId(links[0].patientUserId);
      }
      const all = await db.chats.where("userId").equals(user.id).toArray();
      setMessages((await Promise.all(all.map(openChat))).sort((a, b) => a.at - b.at));
    })();
  }, [user]);

  async function send() {
    if (!user || !text.trim()) return;
    const mine: ChatMessage = { id: crypto.randomUUID(), userId: user.id, role: "user", content: text, at: Date.now() };
    const profile = await db.profiles.where("userId").equals(targetId).first();
    const vitals = await db.vitals.where("patientUserId").equals(targetId).toArray();
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      role: "assistant",
      content: assistantReply(text, profile, vitals, user.role),
      at: Date.now() + 1,
    };
    await db.chats.bulkAdd([await sealChat(mine), await sealChat(reply)]);
    setMessages((m) => [...m, mine, reply]);
    setText("");
  }

  return (
    <div className="flex flex-col min-h-[70vh]">
      <h2 className="text-2xl font-extrabold">Ù‡Ù…Ø±Ø§Ù‡ Ù‡ÙˆØ´Ù…Ù†Ø¯</h2>
      {user?.role !== "patient" && (
        <select
          className="mt-3 h-11 rounded-2xl bg-white px-3"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              Ù¾Ø±ÙˆÙ†Ø¯Ù‡ {p.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex-1 space-y-3 mt-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-7 whitespace-pre-line ${
              m.role === "user" ? "mr-auto bg-teal text-white" : "ml-auto card"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input
          className="flex-1 h-12 rounded-2xl bg-white px-4"
          placeholder="Ù…Ø«Ù„Ø§Ù‹ Ù‚Ù†Ø¯ Ø®ÙˆÙ†Ù… Ø¨Ø§Ù„Ø§Ø³Øª..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="h-12 px-4 rounded-2xl bg-teal text-white font-bold">
          Ø¨Ù¾Ø±Ø³
        </button>
      </div>
    </div>
  );
}

export function MonitorHome() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ patient: User; profile?: PatientProfile; last?: Vital; alerts: number }[]>([]);
  const [nid, setNid] = useState("");

  async function load() {
    if (!user) return;
    const links = await db.links.where("fromUserId").equals(user.id).toArray();
    const out = [];
    for (const l of links) {
      const patient = await db.users.get(l.patientUserId);
      if (!patient) continue;
      const profile = await db.profiles.where("userId").equals(patient.id).first();
      const vitals = await db.vitals.where("patientUserId").equals(patient.id).toArray();
      const last = vitals.sort((a, b) => b.at - a.at)[0];
      const alerts = await db.alerts.where("patientUserId").equals(patient.id).toArray();
      out.push({ patient, profile, last, alerts: alerts.filter((a) => !a.read).length });
    }
    setRows(out);
  }

  useEffect(() => {
    load();
  }, [user]);

  return (
    <div className="space-y-4 rise">
      <h2 className="text-2xl font-extrabold">{user?.role === "doctor" ? "Ø¨ÛŒÙ…Ø§Ø±Ø§Ù† Ù…Ù†" : "ØªØ­Øª Ù†Ø¸Ø± Ù…Ù†"}</h2>
      {user?.role === "caregiver" && (
        <div className="flex gap-2">
          <input
            className="flex-1 h-12 rounded-2xl bg-white px-4"
            placeholder="Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø§ Ú©Ø¯ Ù…Ù„ÛŒ"
            value={nid}
            onChange={(e) => setNid(e.target.value)}
          />
          <button
            className="h-12 px-4 rounded-2xl bg-teal text-white font-bold"
            onClick={async () => {
              if (!user) return;
              const patient = await db.users.where("nationalId").equals(nid.trim()).first();
              if (!patient) return;
              await db.links.add({
                id: crypto.randomUUID(),
                fromUserId: user.id,
                patientUserId: patient.id,
                relation: "Ù…Ø±Ø§Ù‚Ø¨",
                kind: "care",
              });
              setNid("");
              load();
            }}
          >
            Ø§ÙØ²ÙˆØ¯Ù†
          </button>
        </div>
      )}
      {rows.map((r) => (
        <Link key={r.patient.id} to={`/app/patient/${r.patient.id}`} className="card rounded-3xl p-4 block">
          <div className="flex justify-between">
            <div>
              <p className="font-bold">{r.patient.name}</p>
              <p className="text-xs text-muted mt-1">
                {r.profile?.age} Ø³Ø§Ù„Ù‡ Â· {r.profile?.conditions.join("ØŒ ")}
              </p>
            </div>
            {r.alerts > 0 && (
              <span className="h-7 min-w-7 px-2 rounded-full bg-coral text-white text-xs grid place-items-center">
                {r.alerts}
              </span>
            )}
          </div>
          <p className="text-sm mt-3 text-teal">
            Ø¢Ø®Ø±ÛŒÙ† Ø«Ø¨Øª: {r.last ? `${r.last.type} ${r.last.value}` : "Ù†Ø¯Ø§Ø±Ø¯"}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const data = usePatientBundle(id);
  const [note, setNote] = useState("");
  const [med, setMed] = useState({ name: "", dose: "", schedule: "" });

  return (
    <div className="space-y-4 rise">
      <h2 className="text-2xl font-extrabold">{data.patient?.name}</h2>
      <div className="grid grid-cols-2 gap-3">
        <VitalTile title="Ù‚Ù†Ø¯" unit="" v={data.vitals.find((v) => v.type === "sugar")} />
        <VitalTile title="ÙØ´Ø§Ø±" unit="" v={data.vitals.find((v) => v.type === "bp")} />
      </div>
      <div className="card rounded-3xl p-4 text-sm space-y-2">
        <Row k="Ú©Ø¯ Ù…Ù„ÛŒ" v={data.profile?.nationalId} />
        <Row k="Ø´Ù…Ø§Ø±Ù‡ Ù…Ø±Ø§Ù‚Ø¨" v={data.profile?.caregiverPhone} />
        <Row k="ØªÙ…Ø§Ø³ Ø¨ÛŒÙ…Ø§Ø±" v={data.patient?.phone} />
        <Row k="Ù‚Ø¯ / ÙˆØ²Ù†" v={`${data.profile?.heightCm} / ${data.profile?.weightKg}`} />
        <Row k="Ú¯Ø±ÙˆÙ‡ Ø®ÙˆÙ†ÛŒ" v={data.profile?.bloodType} />
        <Row k="Ø­Ø³Ø§Ø³ÛŒØª" v={data.profile?.allergies} />
      </div>
      <SugarChart vitals={data.vitals} />
      <Notes notes={data.notes} />
      <div className="card rounded-3xl p-4 space-y-2">
        <p className="font-bold">ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ø¬Ø¯ÛŒØ¯</p>
        <textarea
          className="w-full h-24 rounded-2xl bg-paper p-3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="w-full h-11 rounded-2xl bg-teal text-white font-bold"
          onClick={async () => {
            if (!user || !id || !note.trim()) return;
            await db.notes.add(
              await sealNote({
                id: crypto.randomUUID(),
                authorId: user.id,
                patientUserId: id,
                body: note,
                kind: user.role === "doctor" ? "doctor" : "caregiver",
                at: Date.now(),
              }),
            );
            setNote("");
            data.reload();
          }}
        >
          Ø«Ø¨Øª ÛŒØ§Ø¯Ø¯Ø§Ø´Øª
        </button>
      </div>
      {user?.role === "doctor" && (
        <div className="card rounded-3xl p-4 space-y-2">
          <p className="font-bold">Ø¯Ø§Ø±ÙˆÛŒ Ø¬Ø¯ÛŒØ¯</p>
          <input className="w-full h-11 rounded-2xl bg-paper px-3" placeholder="Ù†Ø§Ù… Ø¯Ø§Ø±Ùˆ" value={med.name} onChange={(e) => setMed({ ...med, name: e.target.value })} />
          <input className="w-full h-11 rounded-2xl bg-paper px-3" placeholder="Ø¯ÙˆØ²" value={med.dose} onChange={(e) => setMed({ ...med, dose: e.target.value })} />
          <input className="w-full h-11 rounded-2xl bg-paper px-3" placeholder="Ø²Ù…Ø§Ù† Ù…ØµØ±Ù" value={med.schedule} onChange={(e) => setMed({ ...med, schedule: e.target.value })} />
          <button
            className="w-full h-11 rounded-2xl bg-teal-deep text-white font-bold"
            onClick={async () => {
              if (!id || !med.name) return;
              await db.medications.add({ id: crypto.randomUUID(), patientUserId: id, ...med });
              setMed({ name: "", dose: "", schedule: "" });
              data.reload();
            }}
          >
            Ø§ÙØ²ÙˆØ¯Ù† Ø¯Ø§Ø±Ùˆ
          </button>
        </div>
      )}
    </div>
  );
}

export function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<(Alert & { patientName: string })[]>([]);
  useEffect(() => {
    (async () => {
      if (!user) return;
      const links = await db.links.where("fromUserId").equals(user.id).toArray();
      const ids = user.role === "patient" ? [user.id] : links.map((l) => l.patientUserId);
      const all = await db.alerts.toArray();
      const rows = [];
      for (const a of all.filter((x) => ids.includes(x.patientUserId))) {
        const p = await db.users.get(a.patientUserId);
        rows.push({ ...a, patientName: p?.name || "" });
      }
      setAlerts(rows.sort((a, b) => b.at - a.at));
    })();
  }, [user]);

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">Ù‡Ø´Ø¯Ø§Ø±Ù‡Ø§</h2>
      {alerts.map((a) => (
        <div key={a.id} className="card rounded-3xl p-4">
          <p className={`text-xs font-bold ${a.level === "danger" ? "text-coral" : "text-amber-700"}`}>
            {a.patientName}
          </p>
          <p className="font-bold mt-1">{a.title}</p>
          <p className="text-sm text-muted mt-1">{a.body}</p>
        </div>
      ))}
      {alerts.length === 0 && <p className="text-muted">Ù‡Ø´Ø¯Ø§Ø±ÛŒ Ù†ÛŒØ³Øª.</p>}
    </div>
  );
}

export function MePage() {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const roleFa = user?.role === "doctor" ? "Ù¾Ø²Ø´Ú©" : user?.role === "caregiver" ? "Ù…Ø±Ø§Ù‚Ø¨" : "Ø¨ÛŒÙ…Ø§Ø±";

  return (
    <div className="space-y-4 rise">
      <div className="card rounded-3xl p-5 space-y-3">
        <h2 className="text-2xl font-extrabold">{user?.name}</h2>
        <Row k="Ù†Ù‚Ø´" v={roleFa} />
        <Row k="Ù…ÙˆØ¨Ø§ÛŒÙ„" v={user?.phone} />
        <Row k="Ú©Ø¯ Ù…Ù„ÛŒ" v={user?.nationalId} />
        <p className="text-sm text-muted leading-7 pt-2">
          Ù¾Ø§ÛŒÚ¯Ø§Ù‡ Ø¯Ø§Ø¯Ù‡ Ø±ÙˆÛŒ Ø®ÙˆØ¯ Ú¯ÙˆØ´ÛŒ Ø§Ø³Øª Ùˆ Ø¨Ù‡ Ø³Ø±ÙˆØ± Ø§ÛŒÙ†ØªØ±Ù†ØªÛŒ ÙˆØµÙ„ Ù†ÛŒØ³Øª. Ø±Ù…Ø² Ø­Ø³Ø§Ø¨ Ø¨Ø§ PBKDF2 Ù‡Ø´ Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ùˆ Ú¯ÙØªÚ¯Ùˆ Ø¨Ø§ AES-256-GCM Ø±Ù…Ø² Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ Ù†Ø´Ø³Øª Ø§Ù…Ø¶Ø§Ø´Ø¯Ù‡ Û¸ Ø³Ø§Ø¹ØªÙ‡ Ø§Ø³Øª Ùˆ ÙˆØ±ÙˆØ¯ Ø§Ø´ØªØ¨Ø§Ù‡ Ú†Ù†Ø¯Ø¨Ø§Ø±Ù‡ Ù‚ÙÙ„ Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø§Ø¨Ø±ÛŒ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø®Ø§Ù…ÙˆØ´ Ø§Ø³Øª.
        </p>
      </div>
      <form
        className="card rounded-3xl p-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setMsg(null);
          const res = await changePassword(current, next);
          if (res) setErr(res);
          else {
            setMsg("Ø±Ù…Ø² Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¹ÙˆØ¶ Ø´Ø¯.");
            setCurrent("");
            setNext("");
          }
        }}
      >
        <p className="font-bold">ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ø­Ø³Ø§Ø¨</p>
        <input
          className="w-full h-12 rounded-2xl bg-paper px-4"
          type="password"
          placeholder="Ø±Ù…Ø² ÙØ¹Ù„ÛŒ"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="w-full h-12 rounded-2xl bg-paper px-4"
          type="password"
          placeholder="Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ (Ø­Ø¯Ø§Ù‚Ù„ Û¸ Ú©Ø§Ø±Ø§Ú©ØªØ±ØŒ Ø­Ø±Ù Ùˆ Ø¹Ø¯Ø¯)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {err && <p className="text-coral text-sm">{err}</p>}
        {msg && <p className="text-ok text-sm">{msg}</p>}
        <button className="w-full h-11 rounded-2xl bg-teal text-white font-bold">Ø°Ø®ÛŒØ±Ù‡ Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯</button>
      </form>
      <button
        className="w-full h-12 rounded-2xl bg-coral text-white font-bold pressable"
        onClick={() => {
          logout();
          navigate("/");
        }}
      >
        Ø®Ø±ÙˆØ¬ Ø§Ø² Ø­Ø³Ø§Ø¨
      </button>
    </div>
  );
}

