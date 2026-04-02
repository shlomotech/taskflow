'use client';

import { X, Calendar, Tag, AlignLeft } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', authorName: 'Alice', body: 'Started working on this — should have a PR up by EOD.', createdAt: '2026-04-02T10:30:00Z' },
  { id: '2', authorName: 'Bob', body: 'Left some review notes on the design doc. Check the Figma link.', createdAt: '2026-04-02T14:15:00Z' },
  { id: '3', authorName: 'Carol', body: 'LGTM from my side. Ready to merge once CI passes.', createdAt: '2026-04-02T16:00:00Z' },
];

const priorityBadge: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const statusLabel: Record<TaskStatus, { label: string; class: string }> = {
  backlog:     { label: 'Backlog',      class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  todo:        { label: 'To Do',        class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  in_progress: { label: 'In Progress',  class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_review:   { label: 'In Review',    class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  done:        { label: 'Done',         class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TaskDetailDrawer({ task, onClose }: TaskDetailDrawerProps) {
  if (!task) return null;

  const status = statusLabel[task.status];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — 480px wide, slide in from right */}
      <aside
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl animate-slide-in-right"
        aria-label="Task detail"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold leading-snug text-card-foreground">{task.title}</h2>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', status.class)}>
              {status.label}
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', priorityBadge[task.priority])}>
              {task.priority}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" />
                Description
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            {task.dueDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Due</span>
                <span className="ml-auto text-xs font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            {task.assigneeId && (
              <div className="flex items-center gap-3">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold uppercase text-primary">
                  {task.assigneeId[0]}
                </div>
                <span className="text-muted-foreground text-xs">Assignee</span>
                <span className="ml-auto text-xs font-medium">{task.assigneeId}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Project</span>
              <span className="ml-auto text-xs font-medium">{task.projectId}</span>
            </div>
          </div>

          {/* Comment thread */}
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comments
            </p>
            <ul className="flex flex-col gap-4">
              {MOCK_COMMENTS.map((comment) => (
                <li key={comment.id} className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                    {comment.authorName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Comment input */}
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold uppercase text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                U
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Add a comment…"
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
