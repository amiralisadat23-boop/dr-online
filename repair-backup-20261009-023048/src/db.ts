import Dexie, { type Table } from "dexie";
import { openText, sealText, vaultUnlocked } from "./crypto";
import type {
  Alert,
  ChatMessage,
  Link,
  Medication,
  Note,
  PatientProfile,
  User,
  Vital,
} from "./types";

export async function sealNote(note: Note): Promise<Note> {
  return { ...note, body: await sealText(note.body) };
}

export async function openNote(note: Note): Promise<Note> {
  return { ...note, body: await openText(note.body) };
}

export async function sealChat(msg: ChatMessage): Promise<ChatMessage> {
  return { ...msg, content: await sealText(msg.content) };
}

export async function openChat(msg: ChatMessage): Promise<ChatMessage> {
  return { ...msg, content: await openText(msg.content) };
}

export async function encryptExistingRecords() {
  if (!vaultUnlocked()) return;
  const notes = await db.notes.toArray();
  for (const n of notes) {
    if (n.body.startsWith("enc1$")) continue;
    await db.notes.put(await sealNote(n));
  }
  const chats = await db.chats.toArray();
  for (const c of chats) {
    if (c.content.startsWith("enc1$")) continue;
    await db.chats.put(await sealChat(c));
  }
}

class DrOnlineDB extends Dexie {
  users!: Table<User, string>;
  profiles!: Table<PatientProfile, string>;
  links!: Table<Link, string>;
  vitals!: Table<Vital, string>;
  medications!: Table<Medication, string>;
  notes!: Table<Note, string>;
  chats!: Table<ChatMessage, string>;
  alerts!: Table<Alert, string>;

  constructor() {
    super("dr-online-secure");
    this.version(1).stores({
      users: "id, role, phone, nationalId",
      profiles: "id, userId, nationalId",
      links: "id, fromUserId, patientUserId, kind",
      vitals: "id, patientUserId, type, at",
      medications: "id, patientUserId",
      notes: "id, patientUserId, authorId, at",
      chats: "id, userId, at",
      alerts: "id, patientUserId, at, level",
    });
    this.version(2).stores({
      users: "id, role, phone, nationalId",
      profiles: "id, userId, nationalId",
      links: "id, fromUserId, patientUserId, kind",
      vitals: "id, patientUserId, type, at",
      medications: "id, patientUserId",
      notes: "id, patientUserId, authorId, at",
      chats: "id, userId, at",
      alerts: "id, patientUserId, at, level",
    });
  }
}

export const db = new DrOnlineDB();
