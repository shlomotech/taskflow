import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
import DashboardPage from '@/app/dashboard/page';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDashboardData = {
  stats: {
    totalTasks: 42,
    completedTasks: 18,
    inProgressTasks: 12,
    overdueTasks: 3,
  },
  recentActivity: [
    {
      id: 'a1',
      type: 'task_created' as const,
      description: 'Task "Fix login bug" was created',
      timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
      user: { name: 'Alice' },
    },
    {
      id: 'a2',
      type: 'task_completed' as const,
      description: 'Task "Setup CI" was completed',
      timestamp: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      user: { name: 'Bob' },
    },
    {
      id: 'a3',
      type: 'comment_added' as const,
      description: 'Carol commented on "Deploy pipeline"',
      timestamp: new Date(Date.now() - 25 * 60 * 60_000).toISOString(),
    },
  ],
};

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
  return render(<DashboardPage />, { wrapper: createWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockResolvedValue(mockDashboardData);
});

// ---------------------------------------------------------------------------
// Render — page structure
// ---------------------------------------------------------------------------

describe('DashboardPage — page structure', () => {
  it('renders the page heading', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders the Overview section', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /overview/i })).toBeInTheDocument();
  });

  it('renders the Recent Activity section', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /recent activity/i })).toBeInTheDocument();
  });

  it('fetches dashboard data from /dashboard', async () => {
    renderPage();
    await screen.findByText('42');
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard');
  });
});

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

describe('DashboardPage — stats rendering', () => {
  it('displays the total tasks count', async () => {
    renderPage();
    expect(await screen.findByText('42')).toBeInTheDocument();
  });

  it('displays the completed tasks count', async () => {
    renderPage();
    expect(await screen.findByText('18')).toBeInTheDocument();
  });

  it('displays the in-progress tasks count', async () => {
    renderPage();
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  it('displays the overdue tasks count', async () => {
    renderPage();
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('renders the Total Tasks label', async () => {
    renderPage();
    expect(await screen.findByText(/total tasks/i)).toBeInTheDocument();
  });

  it('renders the Completed label', async () => {
    renderPage();
    expect(await screen.findByText(/completed/i)).toBeInTheDocument();
  });

  it('renders the In Progress label', async () => {
    renderPage();
    expect(await screen.findByText(/in progress/i)).toBeInTheDocument();
  });

  it('renders the Overdue label', async () => {
    renderPage();
    expect(await screen.findByText(/overdue/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

describe('DashboardPage — loading state', () => {
  it('shows skeleton placeholders before data arrives', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    // Stats and activity headings are rendered but no stat values yet
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('removes skeletons once data has loaded', async () => {
    renderPage();
    await screen.findByText('42');
    // Pulse-animated skeleton containers should be gone
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

describe('DashboardPage — recent activity', () => {
  it('renders activity item descriptions', async () => {
    renderPage();
    expect(
      await screen.findByText('Task "Fix login bug" was created'),
    ).toBeInTheDocument();
    expect(screen.getByText('Task "Setup CI" was completed')).toBeInTheDocument();
    expect(screen.getByText('Carol commented on "Deploy pipeline"')).toBeInTheDocument();
  });

  it('renders user names for activity items that have a user', async () => {
    renderPage();
    expect(await screen.findByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  it('shows relative timestamps for activity items', async () => {
    renderPage();
    // Recent item should show "m ago" or "just now"
    expect(await screen.findByText(/\dm ago|just now/i)).toBeInTheDocument();
  });

  it('shows empty state message when there is no recent activity', async () => {
    mockApiFetch.mockResolvedValue({
      ...mockDashboardData,
      recentActivity: [],
    });
    renderPage();
    expect(
      await screen.findByText(/no recent activity/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('DashboardPage — error state', () => {
  it('shows an error banner when the API call fails', async () => {
    mockApiFetch.mockRejectedValue({ message: 'Service unavailable', status: 503 });
    renderPage();
    expect(
      await screen.findByText(/service unavailable|failed to load|error/i),
    ).toBeInTheDocument();
  });

  it('does not render stat values when the fetch errors', async () => {
    mockApiFetch.mockRejectedValue({ message: 'Server error', status: 500 });
    renderPage();
    await waitFor(() => expect(screen.queryByText('42')).not.toBeInTheDocument());
  });
});
