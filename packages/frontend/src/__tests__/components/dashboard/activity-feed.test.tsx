import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

vi.mock('@/hooks/useActivity', () => ({
  useActivity: vi.fn(),
}));

import { useActivity } from '@/hooks/useActivity';

const mockUseActivity = useActivity as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading state while fetching', () => {
    mockUseActivity.mockReturnValue({ data: undefined, isLoading: true });
    render(<ActivityFeed />, { wrapper });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders activity items when data is loaded', () => {
    mockUseActivity.mockReturnValue({
      isLoading: false,
      data: [
        { id: '1', message: 'Task "Fix bug" moved to Done', createdAt: '2026-04-01T10:00:00Z' },
        { id: '2', message: 'New task "Add feature" created', createdAt: '2026-04-01T09:00:00Z' },
      ],
    });
    render(<ActivityFeed />, { wrapper });
    expect(screen.getByText(/Fix bug/)).toBeInTheDocument();
    expect(screen.getByText(/Add feature/)).toBeInTheDocument();
  });

  it('renders an empty state when there are no items', () => {
    mockUseActivity.mockReturnValue({ isLoading: false, data: [] });
    render(<ActivityFeed />, { wrapper });
    expect(screen.getByText(/no activity/i)).toBeInTheDocument();
  });

  it('renders the correct number of activity items', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      message: `Activity ${i}`,
      createdAt: '2026-04-01T10:00:00Z',
    }));
    mockUseActivity.mockReturnValue({ isLoading: false, data: items });
    render(<ActivityFeed />, { wrapper });
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
