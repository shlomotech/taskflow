'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/hooks/useTasks';
import { DraggableTaskCard } from './DraggableTaskCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const columnMeta: Record<TaskStatus, { label: string; bg: string; header: string; badge: string }> = {
  backlog:     { label: 'Backlog',     bg: 'bg-slate-50 dark:bg-slate-900/50',    header: 'text-slate-600 dark:text-slate-300',  badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  todo:        { label: 'To Do',       bg: 'bg-blue-50/60 dark:bg-blue-950/30',   header: 'text-blue-600 dark:text-blue-400',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50/60 dark:bg-amber-950/30', header: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  in_review:   { label: 'In Review',   bg: 'bg-violet-50/60 dark:bg-violet-950/30', header: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  done:        { label: 'Done',        bg: 'bg-emerald-50/60 dark:bg-emerald-950/30', header: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = columnMeta[status];

  return (
    <div className={cn('flex w-[280px] shrink-0 flex-col rounded-xl border border-border/60', meta.bg)}>
      {/* Column header with status-colored count badge */}
      <div className="flex items-center justify-between px-3 py-3">
        <h3 className={cn('text-sm font-semibold', meta.header)}>{meta.label}</h3>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', meta.badge)}>{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-col gap-2 overflow-y-auto p-2 transition-colors',
            isOver && 'bg-primary/5 ring-2 ring-inset ring-primary/20 rounded-b-xl'
          )}
          style={{ minHeight: 400 }}
        >
          {tasks.map((task) => <DraggableTaskCard key={task.id} task={task} onClick={onTaskClick} />)}
          {tasks.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground/50 select-none">Drop here</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
