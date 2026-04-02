import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthTokens {
  access_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await axios.post<AuthUser>(
    `${API_BASE}/api/v1/auth/login`,
    credentials,
    { withCredentials: true },
  );
  return data;
}

export async function registerRequest(credentials: RegisterCredentials): Promise<AuthUser> {
  const { data } = await axios.post<AuthUser>(
    `${API_BASE}/api/v1/auth/register`,
    credentials,
    { withCredentials: true },
  );
  return data;
}

export async function logoutRequest(): Promise<void> {
  await axios.post(`${API_BASE}/api/v1/auth/logout`, {}, { withCredentials: true });
}

export async function getMeRequest(): Promise<AuthUser> {
  const { data } = await axios.get<AuthUser>(`${API_BASE}/api/v1/auth/me`, {
    withCredentials: true,
  });
  return data;
}
