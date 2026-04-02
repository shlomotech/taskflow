import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { Task, TaskStatus } from '@/hooks/useTasks';

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@/components/board/DraggableTaskCard', () => ({
  DraggableTaskCard: ({ task }: { task: Task }) => (
    <div data-testid={`task-card-${task.id}`}>{task.title}</div>
  ),
}));

import { useDroppable } from '@dnd-kit/core';
const mockUseDroppable = useDroppable as ReturnType<typeof vi.fn>;

const makeTasks = (count: number, status: TaskStatus = 'todo'): Task[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `task-${i + 1}`,
    title: `Task ${i + 1}`,
    status,
    priority: 'medium',
    projectId: 'proj-1',
    position: i,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }));

describe('KanbanColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDroppable.mockReturnValue({ setNodeRef: vi.fn(), isOver: false });
  });

  it('renders the column header label for "todo"', () => {
    render(<KanbanColumn status="todo" tasks={[]} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('renders the column header label for "in_progress"', () => {
    render(<KanbanColumn status="in_progress" tasks={[]} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the column header label for "backlog"', () => {
    render(<KanbanColumn status="backlog" tasks={[]} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('renders the column header label for "in_review"', () => {
    render(<KanbanColumn status="in_review" tasks={[]} />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('renders the column header label for "done"', () => {
    render(<KanbanColumn status="done" tasks={[]} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders a count badge showing 0 when no tasks', () => {
    render(<KanbanColumn status="todo" tasks={[]} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a count badge matching the number of tasks', () => {
    render(<KanbanColumn status="todo" tasks={makeTasks(3)} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a task card for each task', () => {
    const tasks = makeTasks(2);
    render(<KanbanColumn status="todo" tasks={tasks} />);
    expect(screen.getByTestId('task-card-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-task-2')).toBeInTheDocument();
  });
});
