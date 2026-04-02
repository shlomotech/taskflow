import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DraggableTaskCard } from '@/components/board/DraggableTaskCard';
import { Task } from '@/hooks/useTasks';

vi.mock('@dnd-kit/sortable', () => ({
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

import { useSortable } from '@dnd-kit/sortable';
const mockUseSortable = useSortable as ReturnType<typeof vi.fn>;

const baseTask: Task = {
  id: 'task-1',
  title: 'Fix the login bug',
  status: 'todo',
  priority: 'high',
  projectId: 'proj-1',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('DraggableTaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });
  });

  it('renders the task title', () => {
    render(<DraggableTaskCard task={baseTask} />);
    expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
  });

  it('renders the priority badge', () => {
    render(<DraggableTaskCard task={baseTask} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    const task = { ...baseTask, description: 'Detailed description here' };
    render(<DraggableTaskCard task={task} />);
    expect(screen.getByText('Detailed description here')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    render(<DraggableTaskCard task={baseTask} />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('renders due date when provided', () => {
    const task = { ...baseTask, dueDate: '2024-06-15T00:00:00Z' };
    render(<DraggableTaskCard task={task} />);
    // Date is rendered via toLocaleDateString — just check something date-like is present
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('does not render a date when dueDate is absent', () => {
    render(<DraggableTaskCard task={baseTask} />);
    expect(screen.queryByText(/2024/)).not.toBeInTheDocument();
  });

  it('renders critical priority badge', () => {
    render(<DraggableTaskCard task={{ ...baseTask, priority: 'critical' }} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders low priority badge', () => {
    render(<DraggableTaskCard task={{ ...baseTask, priority: 'low' }} />);
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('reduces opacity when dragging', () => {
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    });
    const { container } = render(<DraggableTaskCard task={baseTask} />);
    // When isDragging=true the card gets opacity-50 class
    expect(container.firstChild).toHaveClass('opacity-50');
  });
});
