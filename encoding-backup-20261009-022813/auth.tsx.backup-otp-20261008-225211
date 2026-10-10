import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearFails,
  clearSession,
  hashPassword,
  lockStatus,
  passwordPolicy,
  readSession,
  registerFail,
  unlockVault,
  verifyPassword,
  writeSession,
} from "./crypto";

import { db, encryptExistingRecords } from "./db";
import { seedIfEmpty } from "./seed";
import { apiLogin, apiRegister } from "./api";

import type {
  PublicUser,
  Role,
  User,
} from "./types";

function toPublic(u: User): PublicUser {
  const { passwordHash: _hidden, ...rest } = u;
  return rest;
}

type AuthValue = {
  user: PublicUser | null;
  ready: boolean;
  login: (
    identity: string,
    password: string,
    role: Role,
  ) => Promise<string | null>;
  register: (
    payload: RegisterPayload,
  ) => Promise<string | null>;
  changePassword: (
    current: string,
    next: string,
  ) => Promise<string | null>;
  logout: () => void;
};

export type RegisterPayload = {
  role: Role;
  name: string;
  phone: string;
  password: string;
  nationalId?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: "Ø²Ù†" | "Ù…Ø±Ø¯";
  bloodType?: string;
  caregiverPhone?: string;
  conditions?: string[];
  allergies?: string;
  relation?: string;
  patientNationalId?: string;
};

const AuthContext = createContext<AuthValue | null>(null);

function normalizeApiUser(data: any) {
  return data?.user || data;
}

function apiUserToLocalUser(
  apiUser: any,
  password: string,
): User {
  return {
    id: `api-${String(apiUser.id)}`,
    role: apiUser.role as Role,
    name: apiUser.name,
    phone: apiUser.phone,
    passwordHash: "",
    nationalId: undefined,
  };
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<PublicUser | null>(null);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    (async () => {
      try {
        await seedIfEmpty();

        const session = await readSession();

        if (session) {
          const found =
            await db.users.get(session.userId);

          if (found) {
            await unlockVault();
            await encryptExistingRecords();
            setUser(toPublic(found));
          } else {
            clearSession();
          }
        }
      } catch (error) {
        console.error(
          "Auth initialization failed:",
          error,
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,

      logout() {
        clearSession();
        setUser(null);
      },

      async login(
        identity,
        password,
        role,
      ) {
        const id = identity.trim();

        if (!id || !password) {
          return "Ø´Ù…Ø§Ø±Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ùˆ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.";
        }

        const lockKey =
          `${role}:${id}`;

        const lock =
          lockStatus(lockKey);

        if (lock.locked) {
          return lock.message;
        }

        try {
          /*
           * REAL BACKEND LOGIN
           *
           * Authentication is now performed
           * by FastAPI, not IndexedDB.
           */
          const result =
            await apiLogin(
              id,
              password,
            );

          const apiUser =
            normalizeApiUser(result);

          if (
            !apiUser ||
            apiUser.id === undefined ||
            !apiUser.name ||
            !apiUser.phone
          ) {
            return "Ø¨Ø§Ø²Ú¯Ø´ØªÛŒ Ø³Ø±ÙˆØ± Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.";
          }

          if (
            apiUser.role &&
            apiUser.role !== role
          ) {
            return "Ù†Ù‚Ø´ Ú©Ø§Ø±Ø¨Ø± Ø¨Ø§ Ù†Ù‚Ø´ Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ù…ØªÙAØ§ÙˆØª Ø§Ø³Øª.";
          }

          clearFails(lockKey);

          await unlockVault();

          /*
           * Keep a local cache so existing
           * application screens continue working.
           */
          const localUser =
            apiUserToLocalUser(
              apiUser,
              password,
            );

          const existing =
            await db.users.get(
              localUser.id,
            );

          if (existing) {
            await db.users.update(
              localUser.id,
              {
                name: localUser.name,
                phone: localUser.phone,
                role: localUser.role,
              },
            );
          } else {
            await db.users.put(
              localUser,
            );
          }

          await writeSession(
            localUser.id,
          );

          setUser(
            toPublic(localUser),
          );

          return null;
        } catch (error) {
          console.error(
            "Backend login failed:",
            error,
          );

          return registerFail(
            lockKey,
          );
        }
      },

      async register(payload) {
        const policy =
          passwordPolicy(
            payload.password,
          );

        if (policy) {
          return policy;
        }

        if (
          !payload.name.trim() ||
          !payload.phone.trim()
        ) {
          return "Ù†Ø§Ù… Ùˆ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.";
        }

        if (
          payload.role === "patient" &&
          payload.nationalId &&
          payload.nationalId.length < 10
        ) {
          return "Ú©Ø¯ Ù…Ù„ÛŒ Ù†Ø§Ø¯Ø±Ø³Øª Ø§Ø³Øª.";
        }

        try {
          /*
           * REAL BACKEND REGISTER
           *
           * The backend currently accepts:
           * name, phone, password, role
           */
          const apiUser =
            await apiRegister(
              payload.name.trim(),
              payload.phone.trim(),
              payload.password,
              payload.role,
            );

          if (
            !apiUser ||
            apiUser.id === undefined
          ) {
            return "Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… Ø¯Ø± Ø³Ø±ÙˆØ± Ù†Ø§Ù…ÙˆÙAÙ‚ Ø¨ÙˆØ¯.";
          }

          await unlockVault();

          const localUser =
            apiUserToLocalUser(
              apiUser,
              payload.password,
            );

          /*
           * Cache the authenticated user locally.
           */
          await db.users.put(
            localUser,
          );

          /*
           * Keep the patient profile locally
           * for the current frontend screens.
           */
          if (
            payload.role === "patient"
          ) {
            const existingProfile =
              await db.profiles
                .where("userId")
                .equals(localUser.id)
                .first();

            if (!existingProfile) {
              await db.profiles.add({
                id: crypto.randomUUID(),
                userId: localUser.id,
                nationalId:
                  payload.nationalId || "",
                age:
                  payload.age || 0,
                heightCm:
                  payload.heightCm || 0,
                weightKg:
                  payload.weightKg || 0,
                gender:
                  payload.gender || "Ø²Ù†",
                bloodType:
                  payload.bloodType ||
                  "Ù†Ø§Ù…Ø´Ø®Øµ",
                caregiverPhone:
                  payload.caregiverPhone ||
                  "",
                conditions:
                  payload.conditions || [],
                allergies:
                  payload.allergies ||
                  "Ù†Ø¯Ø§Ø±Ø¯",
                smoker: false,
              });
            }
          }

          await writeSession(
            localUser.id,
          );

          setUser(
            toPublic(localUser),
          );

          return null;
        } catch (error: any) {
          console.error(
            "Backend registration failed:",
            error,
          );

          return (
            error?.message ||
            "Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… Ù†Ø§Ù…ÙˆÙAÙ‚ Ø¨ÙˆØ¯."
          );
        }
      },

      async changePassword(
        current,
        next,
      ) {
        /*
         * Password changes should eventually
         * be handled by a dedicated backend
         * endpoint.
         *
         * For now we keep the existing local
         * password-change behavior disabled
         * instead of pretending it changes the
         * server password.
         */
        if (!user) {
          return "ÙˆØ§Ø±Ø¯ Ø­Ø³Ø§Ø¨ Ù†Ø´Ø¯Ù‡â€ŒØ§ÛŒØ¯.";
        }

        return "ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø³Ø±ÙˆØ± Ù‡Ù†ÙˆØ² ÙAØ¹Ø§Ù„ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.";
      },
    }),
    [user, ready],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error("Auth");
  }

  return ctx;
}
