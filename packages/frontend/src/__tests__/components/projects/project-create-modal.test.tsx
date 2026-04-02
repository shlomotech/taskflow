import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectCreateModal } from '@/components/projects/project-create-modal';

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: vi.fn(),
}));

import { useCreateProject } from '@/hooks/useProjects';

const mockUseCreateProject = useCreateProject as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ProjectCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the form when closed', () => {
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    render(<ProjectCreateModal open={false} onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('renders the form when open', () => {
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    render(<ProjectCreateModal open={true} onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a name input field', () => {
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    render(<ProjectCreateModal open={true} onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    render(<ProjectCreateModal open={true} onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls mutation with form data on submit', async () => {
    const mutate = vi.fn();
    mockUseCreateProject.mockReturnValue({ mutate, isPending: false });
    render(<ProjectCreateModal open={true} onOpenChange={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText(/name/i), 'My New Project');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My New Project' }),
        expect.anything()
      );
    });
  });

  it('closes the modal on successful submission', async () => {
    const onOpenChange = vi.fn();
    mockUseCreateProject.mockImplementation(({ onSuccess }: { onSuccess?: () => void } = {}) => ({
      mutate: (_data: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
      isPending: false,
    }));

    render(<ProjectCreateModal open={true} onOpenChange={onOpenChange} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Project');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('disables submit while mutation is pending', () => {
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: true });
    render(<ProjectCreateModal open={true} onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });
});
