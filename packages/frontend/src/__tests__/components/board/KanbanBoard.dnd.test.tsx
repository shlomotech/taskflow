import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Task } from '@/hooks/useTasks';

// Capture DndContext callbacks so we can simulate drag events
let capturedOnDragEnd: ((event: unknown) => void) | null = null;
let capturedOnDragOver: ((event: unknown) => void) | null = null;
let capturedOnDragStart: ((event: unknown) => void) | null = null;

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
      onDragOver,
      onDragStart,
    }: {
      children: React.ReactNode;
      onDragEnd?: (e: unknown) => void;
      onDragOver?: (e: unknown) => void;
      onDragStart?: (e: unknown) => void;
    }) => {
      capturedOnDragEnd = onDragEnd ?? null;
      capturedOnDragOver = onDragOver ?? null;
      capturedOnDragStart = onDragStart ?? null;
      return <div>{children}</div>;
    },
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

const tasks: Task[] = [
  {
    id: 'task-1',
    title: 'Todo Task',
    status: 'todo',
    priority: 'medium',
    projectId: 'proj-1',
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    title: 'In Progress Task',
    status: 'in_progress',
    priority: 'high',
    projectId: 'proj-1',
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('KanbanBoard — drag and drop', () => {
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capturedOnDragEnd = null;
    capturedOnDragOver = null;
    capturedOnDragStart = null;
    mutateFn = vi.fn();
    mockUseUpdateTask.mockReturnValue({ mutate: mutateFn });
  });

  it('fires updateTask mutation when task is dropped on a different column', () => {
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });

    // Simulate DragEnd: drop task-1 (todo) onto 'in_progress' column
    capturedOnDragEnd?.({
      active: { id: 'task-1' },
      over: { id: 'in_progress' },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: 'task-1',
      data: { status: 'in_progress' },
    });
  });

  it('does not fire mutation when dropped on the same column', () => {
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });

    // task-1 is already in 'todo', dropping on 'todo' column should be a no-op
    capturedOnDragEnd?.({
      active: { id: 'task-1' },
      over: { id: 'todo' },
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('does not fire mutation when dropped with no "over" target', () => {
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });

    capturedOnDragEnd?.({
      active: { id: 'task-1' },
      over: null,
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('fires updateTask mutation via onDragOver when dragging over a different column', () => {
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });

    // Simulate DragOver: drag task-1 (todo) over 'done' column
    capturedOnDragOver?.({
      active: { id: 'task-1' },
      over: { id: 'done' },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: 'task-1',
      data: { status: 'done' },
    });
  });

  it('moves task to position of target task when dropped on another task in same column', () => {
    const tasksInSameColumn: Task[] = [
      { ...tasks[0], id: 'task-a', position: 0, status: 'todo' },
      { ...tasks[0], id: 'task-b', position: 1, status: 'todo' },
    ];
    render(
      <KanbanBoard projectId="proj-1" tasks={tasksInSameColumn} />,
      { wrapper }
    );

    capturedOnDragEnd?.({
      active: { id: 'task-a' },
      over: { id: 'task-b' },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: 'task-a',
      data: { position: 1 },
    });
  });

  it('updates status and position when task is dropped on a task in a different column', () => {
    render(<KanbanBoard projectId="proj-1" tasks={tasks} />, { wrapper });

    // task-1 is 'todo', task-2 is 'in_progress' with position 0
    capturedOnDragEnd?.({
      active: { id: 'task-1' },
      over: { id: 'task-2' },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: 'task-1',
      data: { status: 'in_progress', position: 0 },
    });
  });
});
