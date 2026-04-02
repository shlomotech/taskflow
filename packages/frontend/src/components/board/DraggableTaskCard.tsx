'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Task, TaskPriority } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface DraggableTaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityBorderColor: Record<TaskPriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-400',
  low: 'border-l-green-500',
};

const priorityBadge: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group flex items-start gap-2 rounded-lg border border-border bg-card p-3 shadow-sm select-none',
        'border-l-4 transition-shadow duration-150 hover:shadow-md cursor-pointer',
        priorityBorderColor[task.priority],
        isDragging && 'opacity-40 shadow-xl ring-2 ring-primary/30 rotate-1'
      )}
      onClick={() => !isDragging && onClick?.(task)}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
        aria-label="Drag"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <p className="text-sm font-medium leading-snug text-card-foreground line-clamp-2">{task.title}</p>
        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold capitalize', priorityBadge[task.priority])}>
            {task.priority}
          </span>
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>
            )}
            {task.assigneeId && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary">
                {task.assigneeId[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
