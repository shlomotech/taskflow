import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Task } from '@/hooks/useTasks';

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DragOverlay: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn(() => []),
    useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    closestCorners: vi.fn(),
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

vi.mock('@/hooks/useTasks', () => ({
  useUpdateTask: vi.fn(),
}));

import { useUpdateTask } from '@/hooks/useTasks';

const mockUseUpdateTask = useUpdateTask as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const makeTasks = (overrides: Partial<Task>[] = []): Task[] =>
  overrides.map((o, i) => ({
    id: `task-${i + 1}`,
    title: `Task ${i + 1}`,
    status: 'todo',
    priority: 'medium',
    projectId: 'proj-1',
    position: i,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...o,
  }));

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateTask.mockReturnValue({ mutate: vi.fn() });
  });

  it('renders all 5 status columns', () => {
    render(<KanbanBoard projectId="proj-1" tasks={[]} />, { wrapper });
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('places tasks in the correct column', () => {
    const tasks = makeTasks([
      { id: 'task-1', title: 'Backlog Task', status: 'backlog' },
      { id: 'task-2', title: 'Todo Task', status: 'todo' },
      { id: 'task-3', title: 'Done Task', status: 'done' },
    ]);
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });
    expect(screen.getByText('Backlog Task')).toBeInTheDocument();
    expect(screen.getByText('Todo Task')).toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
  });

  it('renders with an empty task list without crashing', () => {
    render(<KanbanBoard projectId="proj-1" tasks={[]} />, { wrapper });
    // All columns show 0 count
    const countBadges = screen.getAllByText('0');
    expect(countBadges).toHaveLength(5);
  });

  it('renders the drag overlay container', () => {
    render(<KanbanBoard projectId="proj-1" tasks={[]} />, { wrapper });
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });
});
