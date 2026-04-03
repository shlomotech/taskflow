import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiRequestError {
  message: string;
  status: number;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init?.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = 'An unexpected error occurred';
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore JSON parse errors
    }
    const err: ApiRequestError = { message, status: res.status };
    throw err;
  }

  return res.json() as Promise<T>;
}
