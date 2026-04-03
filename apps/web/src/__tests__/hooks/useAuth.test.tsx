import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  removeToken: vi.fn(),
  isAuthenticated: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { isAuthenticated, removeToken } from '@/lib/auth';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockIsAuthenticated = isAuthenticated as ReturnType<typeof vi.fn>;
const mockRemoveToken = removeToken as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });

  Object.defineProperty(document, 'cookie', {
    set: vi.fn(),
    get: vi.fn().mockReturnValue(''),
    configurable: true,
  });
});

describe('useAuth', () => {
  it('starts in loading state', () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useAuth());
    // loading starts true until the effect runs
    expect(result.current.loading).toBe(true);
  });

  it('resolves authenticated=true when token exists', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(result.current.authenticated).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('resolves authenticated=false when no token', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(result.current.authenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('logout removes token and redirects to /login', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    act(() => { result.current.logout(); });
    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

describe('useRequireAuth', () => {
  it('redirects unauthenticated user to /login after loading completes', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    renderHook(() => useRequireAuth());
    await act(async () => {});
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('does not redirect authenticated user', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    renderHook(() => useRequireAuth());
    await act(async () => {});
    expect(mockPush).not.toHaveBeenCalled();
  });
});
