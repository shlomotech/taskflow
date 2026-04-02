'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskPriority } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface DraggableTaskCardProps {
  task: Task;
}

const priorityColors: Record<TaskPriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-yellow-400',
  low: 'border-l-blue-400',
};

const priorityBadge: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

export function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-md border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing select-none',
        'border-l-4',
        priorityColors[task.priority],
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/30'
      )}
    >
      <p className="text-sm font-medium leading-snug text-card-foreground">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium capitalize',
            priorityBadge[task.priority]
          )}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="text-xs text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
