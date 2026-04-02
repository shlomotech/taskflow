import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '@/app/(app)/dashboard/page';

vi.mock('@/hooks/useActivity', () => ({
  useActivity: vi.fn(),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTaskStats: vi.fn(),
}));

import { useActivity } from '@/hooks/useActivity';
import { useTaskStats } from '@/hooks/useTasks';

const mockUseActivity = useActivity as ReturnType<typeof vi.fn>;
const mockUseTaskStats = useTaskStats as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const defaultStats = {
  backlog: 2,
  todo: 5,
  in_progress: 3,
  in_review: 1,
  done: 10,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTaskStats.mockReturnValue({ isLoading: false, data: defaultStats });
    mockUseActivity.mockReturnValue({ isLoading: false, data: [] });
  });

  it('renders 4 stat cards', () => {
    render(<DashboardPage />, { wrapper });
    // The dashboard shows stat cards for todo, in_progress, in_review, done (4 key statuses)
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('renders the todo count', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the in_progress count', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the activity feed section', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByRole('region', { name: /activity/i })).toBeInTheDocument();
  });

  it('shows loading skeletons while stats are loading', () => {
    mockUseTaskStats.mockReturnValue({ isLoading: true, data: undefined });
    render(<DashboardPage />, { wrapper });
    expect(screen.getAllByRole('status')).not.toHaveLength(0);
  });
});
