'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios
      .get<AuthUser>(`${API_BASE}/api/v1/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { data } = await axios.post<AuthUser>(
        `${API_BASE}/api/v1/auth/login`,
        credentials,
        { withCredentials: true },
      );
      setUser(data);
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      const { data } = await axios.post<AuthUser>(
        `${API_BASE}/api/v1/auth/register`,
        credentials,
        { withCredentials: true },
      );
      setUser(data);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await axios.post(`${API_BASE}/api/v1/auth/logout`, {}, { withCredentials: true });
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
