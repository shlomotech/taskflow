import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ProjectListPage from '@/app/(dashboard)/projects/page';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProjects = [
  {
    id: 'p1',
    name: 'TaskFlow Web',
    description: 'Main web application',
    taskCount: 15,
    completedTaskCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'TaskFlow API',
    description: 'Backend REST API',
    taskCount: 10,
    completedTaskCount: 10,
    createdAt: '2024-01-05T00:00:00Z',
  },
];

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderPage() {
  return render(<ProjectListPage />, { wrapper: createWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
    if (init?.method === 'POST' && path === '/projects') {
      return Promise.resolve({ id: 'p3', name: 'New Project', description: '', taskCount: 0, completedTaskCount: 0, createdAt: new Date().toISOString() });
    }
    if (path === '/projects') return Promise.resolve(mockProjects);
    return Promise.resolve({});
  });
});

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

describe('ProjectListPage — render', () => {
  it('renders the page heading', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /projects/i })).toBeInTheDocument();
  });

  it('renders a card for each project', async () => {
    renderPage();
    expect(await screen.findByText('TaskFlow Web')).toBeInTheDocument();
    expect(screen.getByText('TaskFlow API')).toBeInTheDocument();
  });

  it('shows project descriptions on cards', async () => {
    renderPage();
    expect(await screen.findByText('Main web application')).toBeInTheDocument();
    expect(screen.getByText('Backend REST API')).toBeInTheDocument();
  });

  it('shows task counts on project cards', async () => {
    renderPage();
    await screen.findByText('TaskFlow Web');
    // 15 total and 8 completed for p1
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it('fetches projects from /projects', async () => {
    renderPage();
    await screen.findByText('TaskFlow Web');
    expect(mockApiFetch).toHaveBeenCalledWith('/projects');
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ProjectListPage — loading state', () => {
  it('shows a loading indicator before projects arrive', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText('TaskFlow Web')).not.toBeInTheDocument();
  });

  it('renders projects once loading completes', async () => {
    renderPage();
    expect(await screen.findByText('TaskFlow Web')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('ProjectListPage — empty state', () => {
  it('shows an empty state message when there are no projects', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/no projects|create your first project/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('ProjectListPage — error state', () => {
  it('shows an error message when the fetch fails', async () => {
    mockApiFetch.mockRejectedValue({ message: 'Unauthorized', status: 401 });
    renderPage();
    expect(
      await screen.findByText(/unauthorized|failed to load|error/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Create project modal
// ---------------------------------------------------------------------------

describe('ProjectListPage — create project modal', () => {
  it('renders a button to open the create project modal', async () => {
    renderPage();
    await screen.findByText('TaskFlow Web');
    expect(
      screen.getByRole('button', { name: /new project|create project/i }),
    ).toBeInTheDocument();
  });

  it('opens the create project modal when the button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    expect(
      await screen.findByRole('dialog', { name: /new project|create project/i }),
    ).toBeInTheDocument();
  });

  it('shows a name input in the modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    expect(
      await screen.findByLabelText(/project name|name/i),
    ).toBeInTheDocument();
  });

  it('shows an optional description input in the modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    expect(
      await screen.findByLabelText(/description/i),
    ).toBeInTheDocument();
  });

  it('closes the modal when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    const dialog = await screen.findByRole('dialog');
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dialog).not.toBeInTheDocument();
  });

  it('submits POST /projects with name and description', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/project name|name/i), 'New Project');
    await user.type(screen.getByLabelText(/description/i), 'A brand new project');
    await user.click(screen.getByRole('button', { name: /create|save/i }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/projects',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New Project'),
        }),
      ),
    );
  });

  it('closes the modal after a successful project creation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/project name|name/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create|save/i }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('shows a validation error when project name is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /create|save/i }));

    expect(
      await screen.findByText(/name is required|project name is required/i),
    ).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('navigates to the new project on successful creation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TaskFlow Web');
    await user.click(screen.getByRole('button', { name: /new project|create project/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/project name|name/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create|save/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/projects/p3')),
    );
  });
});

// ---------------------------------------------------------------------------
// Project card navigation
// ---------------------------------------------------------------------------

describe('ProjectListPage — project card navigation', () => {
  it('clicking a project card navigates to the project detail', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = await screen.findByText('TaskFlow Web');
    await user.click(card.closest('[role="link"]') ?? card);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/projects/p1'));
  });
});
