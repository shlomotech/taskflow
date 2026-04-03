import { describe, it, expect, vi } from 'vitest';
import { middleware } from '@/middleware';

// Minimal NextRequest / NextResponse stubs
function makeRequest(pathname: string, cookieValue?: string) {
  const url = `http://localhost${pathname}`;
  const cookies = {
    get: (name: string) => (name === 'taskflow_token' && cookieValue ? { value: cookieValue } : undefined),
  };
  const nextUrl = {
    pathname,
    clone() {
      let search = '';
      return {
        get pathname() { return this._pathname; },
        set pathname(v: string) { this._pathname = v; },
        _pathname: pathname,
        get search() { return search; },
        set search(v: string) { search = v; },
        searchParams: { set: vi.fn() },
        toString() { return `http://localhost${this._pathname}`; },
      };
    },
  };
  return { nextUrl, cookies, url } as unknown as Parameters<typeof middleware>[0];
}

vi.mock('next/server', () => {
  const redirect = vi.fn((url: URL | { toString(): string }) => ({ type: 'redirect', url: url.toString() }));
  const next = vi.fn(() => ({ type: 'next' }));
  return {
    NextResponse: { redirect, next },
  };
});

import { NextResponse } from 'next/server';
const mockRedirect = NextResponse.redirect as ReturnType<typeof vi.fn>;
const mockNext = NextResponse.next as ReturnType<typeof vi.fn>;

describe('middleware — protected route redirect', () => {
  it('redirects unauthenticated requests to /dashboard → /login', () => {
    middleware(makeRequest('/dashboard'));
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl._pathname ?? redirectUrl.toString()).toMatch(/login/);
  });

  it('passes through authenticated requests to protected routes', () => {
    middleware(makeRequest('/dashboard', 'valid-token'));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes through unauthenticated requests to /login', () => {
    middleware(makeRequest('/login'));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes through unauthenticated requests to /register', () => {
    middleware(makeRequest('/register'));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated users away from /login → /dashboard', () => {
    middleware(makeRequest('/login', 'valid-token'));
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl._pathname ?? redirectUrl.toString()).toMatch(/dashboard/);
  });

  it('redirects authenticated users away from /register → /dashboard', () => {
    middleware(makeRequest('/register', 'valid-token'));
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl._pathname ?? redirectUrl.toString()).toMatch(/dashboard/);
  });
});
