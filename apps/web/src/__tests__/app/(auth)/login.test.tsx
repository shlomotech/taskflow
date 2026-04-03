import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  apiLogin: vi.fn(),
  setToken: vi.fn(),
}));

import { useRouter, useSearchParams } from 'next/navigation';
import { apiLogin, setToken } from '@/lib/auth';
import LoginPage from '@/app/(auth)/login/page';

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
const mockApiLogin = apiLogin as ReturnType<typeof vi.fn>;
const mockSetToken = setToken as ReturnType<typeof vi.fn>;

const mockSearchParams = { get: vi.fn().mockReturnValue(null) };

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockUseSearchParams.mockReturnValue(mockSearchParams);
  mockSearchParams.get.mockReturnValue(null);

  // jsdom does not implement document.cookie assignment fully — stub it
  Object.defineProperty(document, 'cookie', {
    set: vi.fn(),
    get: vi.fn().mockReturnValue(''),
    configurable: true,
  });
});

describe('LoginPage — render', () => {
  it('renders the page heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
  });
});

describe('LoginPage — form validation', () => {
  it('shows error when email is empty on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows error when email format is invalid', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('shows error when password is empty on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'abc');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it('does not call apiLogin when validation fails', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockApiLogin).not.toHaveBeenCalled();
  });
});

describe('LoginPage — successful submit', () => {
  it('calls apiLogin with email and password', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValue({ token: 'tok123', user: { id: '1', email: 'user@example.com', name: 'User' } });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockApiLogin).toHaveBeenCalledWith('user@example.com', 'password123'));
  });

  it('stores the token and redirects to /dashboard by default', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValue({ token: 'tok123', user: { id: '1', email: 'user@example.com', name: 'User' } });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith('tok123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to ?next param when provided', async () => {
    const user = userEvent.setup();
    mockSearchParams.get.mockReturnValue('/projects');
    mockApiLogin.mockResolvedValue({ token: 'tok123', user: { id: '1', email: 'user@example.com', name: 'User' } });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/projects'));
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolve!: (v: unknown) => void;
    mockApiLogin.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled();
    resolve({ token: 'tok', user: { id: '1', email: 'user@example.com', name: 'User' } });
  });
});

describe('LoginPage — API error handling', () => {
  it('shows a server error message on generic API failure', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValue({ message: 'Invalid email or password' });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows field-level errors returned from the API', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValue({ message: 'Validation failed', errors: { email: 'Email not found' } });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email not found/i)).toBeInTheDocument();
  });

  it('re-enables the submit button after an error', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValue({ message: 'Invalid email or password' });
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });
});
