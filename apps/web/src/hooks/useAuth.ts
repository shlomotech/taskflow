'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, removeToken, isAuthenticated } from '@/lib/auth';

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
}

export function useAuth(): AuthState & { logout: () => void } {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ authenticated: false, loading: true });

  useEffect(() => {
    setState({ authenticated: isAuthenticated(), loading: false });
  }, []);

  const logout = useCallback(() => {
    removeToken();
    // Clear the cookie used by middleware
    document.cookie = 'taskflow_token=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  return { ...state, logout };
}

export function useRequireAuth(): AuthState & { logout: () => void } {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.authenticated) {
      router.push('/login');
    }
  }, [auth.loading, auth.authenticated, router]);

  return auth;
}
