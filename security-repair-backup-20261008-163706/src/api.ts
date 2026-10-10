const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type ApiRole = "patient" | "caregiver" | "doctor";

export type ApiUser = {
  id: number;
  name: string;
  phone: string;
  role: ApiRole;
};

async function request(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getAccessToken()
        ? { Authorization: `Bearer ${getAccessToken()}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Server request failed",
    );
  }

  return data;
}

export async function apiHealth() {
  return request("/api/health");
}

export async function apiLogin(
  phone: string,
  password: string,
) {
  const result = await request(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        phone,
        password,
      }),
    },
  );

  if (result?.access_token) {
    setAccessToken(
      result.access_token
    );
  }

  return result;
}

export async function apiRegister(
  name: string,
  phone: string,
  password: string,
  role: ApiRole = "patient",
) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      phone,
      password,
      role,
    }),
  }) as Promise<ApiUser>;
}

export type ApiPatientProfile = {
  id?: number;
  user_id: number;
  national_id: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  gender: string;
  blood_type: string;
  caregiver_phone: string;
  conditions: string[];
  allergies: string;
  smoker: boolean;
};

export type ApiVital = {
  id: number;
  patient_user_id: number;
  type: string;
  value: number;
  value2?: number | null;
  context?: string | null;
  recorded_at: number;
};

function backendUserId(userId: string | number) {
  const value = String(userId);

  if (value.startsWith("api-")) {
    return Number(value.replace("api-", ""));
  }

  return Number(value);
}

export async function apiGetProfile(userId: string | number) {
  const id = backendUserId(userId);

  return request(`/api/medical/patients/${id}/profile`) as Promise<
    ApiPatientProfile | null
  >;
}

export async function apiSaveProfile(
  userId: string | number,
  profile: Omit<ApiPatientProfile, "user_id" | "id">,
) {
  const id = backendUserId(userId);

  return request(`/api/medical/patients/${id}/profile`, {
    method: "PUT",
    body: JSON.stringify({
      user_id: id,
      ...profile,
    }),
  }) as Promise<ApiPatientProfile>;
}

export async function apiGetVitals(userId: string | number) {
  const id = backendUserId(userId);

  return request(`/api/medical/patients/${id}/vitals`) as Promise<ApiVital[]>;
}

export async function apiAddVital(
  userId: string | number,
  vital: {
    type: string;
    value: number;
    value2?: number;
    context?: string;
  },
) {
  const id = backendUserId(userId);

  return request("/api/medical/vitals", {
    method: "POST",
    body: JSON.stringify({
      patient_user_id: id,
      ...vital,
    }),
  }) as Promise<ApiVital>;
}

const ACCESS_TOKEN_KEY = "dr-online-access-token";

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

