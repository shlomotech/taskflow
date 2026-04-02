import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BoardPage from '@/app/(app)/projects/[projectId]/board/page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ projectId: 'proj-1' })),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: vi.fn(),
  useUpdateTask: vi.fn(),
}));

vi.mock('@/components/board/KanbanBoard', () => ({
  KanbanBoard: ({ tasks }: { tasks: unknown[] }) => (
    <div data-testid="kanban-board">board({tasks.length} tasks)</div>
  ),
}));

import { useTasks, useUpdateTask } from '@/hooks/useTasks';

const mockUseTasks = useTasks as ReturnType<typeof vi.fn>;
const mockUseUpdateTask = useUpdateTask as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('BoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateTask.mockReturnValue({ mutate: vi.fn() });
  });

  it('shows a loading spinner while tasks are loading', () => {
    mockUseTasks.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    const { container } = render(<BoardPage />, { wrapper });
    // The spinner has animate-spin class
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows an error message when tasks fail to load', () => {
    mockUseTasks.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<BoardPage />, { wrapper });
    expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
  });

  it('renders the Board heading', () => {
    mockUseTasks.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<BoardPage />, { wrapper });
    expect(screen.getByRole('heading', { name: /board/i })).toBeInTheDocument();
  });

  it('renders the KanbanBoard with tasks', () => {
    const tasks = [
      {
        id: 'task-1', title: 'First task', status: 'todo', priority: 'medium',
        projectId: 'proj-1', position: 0, createdAt: '', updatedAt: '',
      },
    ];
    mockUseTasks.mockReturnValue({ isLoading: false, isError: false, data: tasks });
    render(<BoardPage />, { wrapper });
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    expect(screen.getByText('board(1 tasks)')).toBeInTheDocument();
  });

  it('renders KanbanBoard with empty tasks list', () => {
    mockUseTasks.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<BoardPage />, { wrapper });
    expect(screen.getByText('board(0 tasks)')).toBeInTheDocument();
  });
});
