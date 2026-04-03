import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  apiRegister: vi.fn(),
  setToken: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { apiRegister, setToken } from '@/lib/auth';
import RegisterPage from '@/app/(auth)/register/page';

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockApiRegister = apiRegister as ReturnType<typeof vi.fn>;
const mockSetToken = setToken as ReturnType<typeof vi.fn>;

const VALID_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, overrides: Partial<typeof VALID_USER> = {}) {
  const values = { ...VALID_USER, ...overrides };
  if (values.name) await user.type(screen.getByLabelText(/^name/i), values.name);
  if (values.email) await user.type(screen.getByLabelText(/^email/i), values.email);
  if (values.password) await user.type(screen.getByLabelText(/^password$/i), values.password);
  if (values.confirmPassword) await user.type(screen.getByLabelText(/confirm password/i), values.confirmPassword);
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });

  Object.defineProperty(document, 'cookie', {
    set: vi.fn(),
    get: vi.fn().mockReturnValue(''),
    configurable: true,
  });
});

describe('RegisterPage — render', () => {
  it('renders the page heading', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
  });

  it('renders name, email, password, and confirm password inputs', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});

describe('RegisterPage — field validation', () => {
  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^email/i), VALID_USER.email);
    await user.type(screen.getByLabelText(/^password$/i), VALID_USER.password);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_USER.confirmPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('shows error when email is empty', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^name/i), VALID_USER.name);
    await user.type(screen.getByLabelText(/^password$/i), VALID_USER.password);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_USER.confirmPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows error when email format is invalid', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^name/i), VALID_USER.name);
    await user.type(screen.getByLabelText(/^email/i), 'bad-email');
    await user.type(screen.getByLabelText(/^password$/i), VALID_USER.password);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_USER.confirmPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^name/i), VALID_USER.name);
    await user.type(screen.getByLabelText(/^email/i), VALID_USER.email);
    await user.type(screen.getByLabelText(/^password$/i), 'abc');
    await user.type(screen.getByLabelText(/confirm password/i), 'abc');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^name/i), VALID_USER.name);
    await user.type(screen.getByLabelText(/^email/i), VALID_USER.email);
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('shows error when confirmPassword is empty', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/^name/i), VALID_USER.name);
    await user.type(screen.getByLabelText(/^email/i), VALID_USER.email);
    await user.type(screen.getByLabelText(/^password$/i), VALID_USER.password);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/please confirm your password/i)).toBeInTheDocument();
  });

  it('does not call apiRegister when validation fails', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(mockApiRegister).not.toHaveBeenCalled();
  });
});

describe('RegisterPage — successful registration flow', () => {
  it('calls apiRegister with name, email, and password', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockResolvedValue({ token: 'reg-tok', user: { id: '2', email: VALID_USER.email, name: VALID_USER.name } });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    await waitFor(() =>
      expect(mockApiRegister).toHaveBeenCalledWith(VALID_USER.name, VALID_USER.email, VALID_USER.password)
    );
  });

  it('stores the token after successful registration', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockResolvedValue({ token: 'reg-tok', user: { id: '2', email: VALID_USER.email, name: VALID_USER.name } });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    await waitFor(() => expect(mockSetToken).toHaveBeenCalledWith('reg-tok'));
  });

  it('redirects to /dashboard after successful registration', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockResolvedValue({ token: 'reg-tok', user: { id: '2', email: VALID_USER.email, name: VALID_USER.name } });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolve!: (v: unknown) => void;
    mockApiRegister.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<RegisterPage />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('button', { name: /creating account/i })).toBeDisabled();
    resolve({ token: 'tok', user: { id: '2', email: VALID_USER.email, name: VALID_USER.name } });
  });
});

describe('RegisterPage — API error handling', () => {
  it('shows server error message on generic API failure', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockRejectedValue({ message: 'Registration failed. Please try again.' });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    expect(await screen.findByText(/registration failed/i)).toBeInTheDocument();
  });

  it('shows field-level errors returned from the API', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockRejectedValue({ message: 'Validation error', errors: { email: 'Email already in use' } });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument();
  });

  it('re-enables the submit button after an error', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockRejectedValue({ message: 'Registration failed. Please try again.' });
    render(<RegisterPage />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('button', { name: /create account/i })).not.toBeDisabled();
  });
});
