'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/hooks/useTasks';
import { DraggableTaskCard } from './DraggableTaskCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

const columnLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const columnColors: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 dark:bg-slate-800',
  todo: 'bg-blue-50 dark:bg-blue-950',
  in_progress: 'bg-amber-50 dark:bg-amber-950',
  in_review: 'bg-purple-50 dark:bg-purple-950',
  done: 'bg-green-50 dark:bg-green-950',
};

const headerColors: Record<TaskStatus, string> = {
  backlog: 'text-slate-600 dark:text-slate-300',
  todo: 'text-blue-600 dark:text-blue-400',
  in_progress: 'text-amber-600 dark:text-amber-400',
  in_review: 'text-purple-600 dark:text-purple-400',
  done: 'text-green-600 dark:text-green-400',
};

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        'flex min-w-[260px] max-w-[280px] flex-1 flex-col rounded-lg',
        columnColors[status]
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className={cn('text-sm font-semibold', headerColors[status])}>
          {columnLabels[status]}
        </h3>
        <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors',
            isOver && 'bg-primary/5'
          )}
          style={{ minHeight: 80 }}
        >
          {tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
