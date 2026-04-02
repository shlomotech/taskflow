import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectsPage from '@/app/(app)/projects/page';

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(),
  useCreateProject: vi.fn(),
}));

import { useProjects, useCreateProject } from '@/hooks/useProjects';

const mockUseProjects = useProjects as ReturnType<typeof vi.fn>;
const mockUseCreateProject = useCreateProject as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const sampleProjects = [
  { id: '1', name: 'Alpha Project', taskCount: 5 },
  { id: '2', name: 'Beta Project', taskCount: 2 },
  { id: '3', name: 'Gamma Project', taskCount: 8 },
];

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders project cards from useProjects', () => {
    mockUseProjects.mockReturnValue({ isLoading: false, data: sampleProjects });
    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
    expect(screen.getByText('Gamma Project')).toBeInTheDocument();
  });

  it('renders the correct number of project cards', () => {
    mockUseProjects.mockReturnValue({ isLoading: false, data: sampleProjects });
    render(<ProjectsPage />, { wrapper });
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('renders a "New Project" button', () => {
    mockUseProjects.mockReturnValue({ isLoading: false, data: sampleProjects });
    render(<ProjectsPage />, { wrapper });
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  it('opens the ProjectCreateModal when the New Project button is clicked', async () => {
    mockUseProjects.mockReturnValue({ isLoading: false, data: sampleProjects });
    render(<ProjectsPage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /new project/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows loading state while projects are fetching', () => {
    mockUseProjects.mockReturnValue({ isLoading: true, data: undefined });
    render(<ProjectsPage />, { wrapper });
    expect(screen.getAllByRole('status')).not.toHaveLength(0);
  });

  it('shows empty state when no projects exist', () => {
    mockUseProjects.mockReturnValue({ isLoading: false, data: [] });
    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });
});
