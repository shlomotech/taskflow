'use client';

import { X } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  author: string;
  body: string;
  timestamp: string;
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', author: 'Alice', body: 'Started working on this one.', timestamp: '2 hours ago' },
  { id: '2', author: 'Bob', body: 'Left some notes on the design doc.', timestamp: '1 hour ago' },
  { id: '3', author: 'Carol', body: 'LGTM from my side.', timestamp: '30 min ago' },
];

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
}

const priorityBadge: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const statusBadge: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-700',
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  in_review: 'bg-violet-100 text-violet-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const statusLabel: Record<TaskStatus, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done',
};

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    /* Overlay backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal — centered, slide-in */}
      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[85vh] animate-slide-in-right"
        style={{ animation: 'fade-in 0.15s ease-out, slide-in-right 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <h2 className="flex-1 text-base font-semibold text-card-foreground">{task.title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status + priority badges */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusBadge[task.status])}>
              {statusLabel[task.status]}
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', priorityBadge[task.priority])}>
              {task.priority}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
          )}

          {/* Due date */}
          {task.dueDate && (
            <p className="text-xs text-muted-foreground">
              Due: <span className="font-medium text-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>
            </p>
          )}

          {/* Comment thread */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Comments
            </p>
            <ul className="space-y-3">
              {MOCK_COMMENTS.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                    {c.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.author}</span>
                      <span className="text-xs text-muted-foreground">{c.timestamp}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/80">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
