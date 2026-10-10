const ITERATIONS = 180_000;
const SESSION_KEY = "dr-online-session";
const LOCK_KEY = "dr-online-lock";
const DEVICE_KEY = "dr-online-device";
const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 3 * 60 * 1000;
const ENC_PREFIX = "enc1$";

function toB64(bytes: ArrayBuffer | Uint8Array) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function fromB64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

function deviceSecret() {
  let raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) {
    raw = toB64(crypto.getRandomValues(new Uint8Array(32)));
    localStorage.setItem(DEVICE_KEY, raw);
  }
  return fromB64(raw);
}

async function hmacSign(message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    deviceSecret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toB64(sig);
}

async function hmacVerify(message: string, signature: string) {
  try {
    const expected = fromB64(await hmacSign(message));
    return equal(expected, fromB64(signature));
  } catch {
    return false;
  }
}

async function deriveBits(password: string, salt: Uint8Array, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    base,
    256,
  );
}

async function wrapKey() {
  return crypto.subtle.importKey("raw", deviceSecret(), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, iterRaw, saltB64, hashB64] = stored.split("$");
  if (algo !== "pbkdf2" || !saltB64 || !hashB64) return false;
  const bits = await deriveBits(password, fromB64(saltB64), Number(iterRaw) || ITERATIONS);
  return equal(new Uint8Array(bits), fromB64(hashB64));
}

export function passwordPolicy(password: string) {
  if (password.length < 8) return "رمز باید حداقل ۸ کاراکتر باشد.";
  if (!/\d/.test(password) || !/[A-Za-zآ-ی]/.test(password)) {
    return "رمز باید ترکیبی از حرف و عدد باشد.";
  }
  return null;
}

let vaultKey: CryptoKey | null = null;

export function vaultUnlocked() {
  return !!vaultKey;
}

export async function unlockVault() {
  vaultKey = await wrapKey();
}

export function lockVault() {
  vaultKey = null;
}

export async function sealText(plain: string) {
  if (!plain || plain.startsWith(ENC_PREFIX) || !vaultKey) return plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    new TextEncoder().encode(plain),
  );
  return `${ENC_PREFIX}${toB64(iv)}$${toB64(cipher)}`;
}

export async function openText(value: string) {
  if (!value || !value.startsWith(ENC_PREFIX)) return value;
  if (!vaultKey) return "••••";
  const [, ivB64, dataB64] = value.split("$");
  try {
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) },
      vaultKey,
      fromB64(dataB64),
    );
    return new TextDecoder().decode(raw);
  } catch {
    return "••••";
  }
}

export type Session = { userId: string; token: string; exp: number; sig: string };

export async function writeSession(userId: string) {
  const session: Omit<Session, "sig"> = {
    userId,
    token: toB64(crypto.getRandomValues(new Uint8Array(24))),
    exp: Date.now() + SESSION_MS,
  };
  const payload = `${session.userId}.${session.token}.${session.exp}`;
  const full: Session = { ...session, sig: await hmacSign(payload) };
  localStorage.setItem(SESSION_KEY, JSON.stringify(full));
  return full;
}

export async function readSession(): Promise<Session | null> {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    if (!s.userId || !s.token || !s.sig || s.exp < Date.now()) {
      clearSession();
      return null;
    }
    const ok = await hmacVerify(`${s.userId}.${s.token}.${s.exp}`, s.sig);
    if (!ok) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("dr-online-user");
  lockVault();
}

type LockState = { fails: number; until: number };

export function lockStatus(identity: string) {
  const all = readLocks();
  const row = all[identity] || { fails: 0, until: 0 };
  if (row.until > Date.now()) {
    const sec = Math.ceil((row.until - Date.now()) / 1000);
    return { locked: true, message: `ورود موقتاً قفل است. ${sec} ثانیه صبر کنید.` };
  }
  return { locked: false, message: null as string | null };
}

export function registerFail(identity: string) {
  const all = readLocks();
  const row = all[identity] || { fails: 0, until: 0 };
  row.fails += 1;
  if (row.fails >= MAX_FAILS) {
    row.until = Date.now() + LOCK_MS;
    row.fails = 0;
  }
  all[identity] = row;
  localStorage.setItem(LOCK_KEY, JSON.stringify(all));
  if (row.until > Date.now()) return lockStatus(identity).message;
  const left = MAX_FAILS - row.fails;
  return `اطلاعات ورود درست نیست. ${left} تلاش باقی مانده.`;
}

export function clearFails(identity: string) {
  const all = readLocks();
  delete all[identity];
  localStorage.setItem(LOCK_KEY, JSON.stringify(all));
}

function readLocks(): Record<string, LockState> {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || "{}") as Record<string, LockState>;
  } catch {
    return {};
  }
}
