// In-memory access token storage (survives re-renders, not page refresh)
let _accessToken: string | null = null;

const REFRESH_TOKEN_KEY = 'taskflow_refresh_token';

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setTokens(access: string, refresh: string): void {
  _accessToken = access;
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens(): void {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
