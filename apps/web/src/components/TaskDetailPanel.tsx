'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TaskComment {
  id: string;
  author: { name: string; initials: string; avatarColor?: string };
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: { name: string; initials: string; avatarColor?: string };
  dueDate?: string;
  project?: string;
  tags?: string[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string; icon: React.ReactNode }> = {
  todo: {
    label: 'To Do',
    className: 'badge badge-gray',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
      </svg>
    ),
  },
  in_progress: {
    label: 'In Progress',
    className: 'badge badge-blue',
    icon: (
      <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  in_review: {
    label: 'In Review',
    className: 'badge badge-yellow',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
  done: {
    label: 'Done',
    className: 'badge badge-green',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Cancelled',
    className: 'badge badge-gray',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string; dotColor: string }> = {
  critical: {
    label: 'Critical',
    className: 'badge badge-red',
    dotColor: 'bg-red-500',
  },
  high: {
    label: 'High',
    className: 'badge badge-red',
    dotColor: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    className: 'badge badge-yellow',
    dotColor: 'bg-yellow-500',
  },
  low: {
    label: 'Low',
    className: 'badge badge-gray',
    dotColor: 'bg-gray-400',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({
  name,
  initials,
  avatarColor = 'from-blue-500 to-blue-700',
  size = 'md',
}: {
  name: string;
  initials: string;
  avatarColor?: string;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${sizeClass} ${avatarColor}`}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-2 py-2.5">
      <span className="field-label pt-0.5">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function CommentBubble({ comment }: { comment: TaskComment }) {
  return (
    <div className="flex gap-3">
      <Avatar name={comment.author.name} initials={comment.author.initials} avatarColor={comment.author.avatarColor} />
      <div className="min-w-0 flex-1">
        <div className="rounded-xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{comment.author.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{comment.body}</p>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// TaskDetailPanel
// ---------------------------------------------------------------------------

interface TaskDetailPanelProps {
  task: Task;
  onClose?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onAddComment?: (body: string) => void;
  className?: string;
}

export default function TaskDetailPanel({
  task,
  onClose,
  onStatusChange,
  onAddComment,
  className = '',
}: TaskDetailPanelProps) {
  const [commentDraft, setCommentDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const body = commentDraft.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await onAddComment?.(body);
      setCommentDraft('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug text-gray-900 dark:text-white">{task.title}</h2>
          {task.project && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{task.project}</span>
            </p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost -mr-1 -mt-1 shrink-0 rounded-full !p-1.5"
            aria-label="Close task"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Fields */}
        <div className="divide-y divide-gray-100 px-6 dark:divide-gray-800">
          <FieldRow label="Status">
            <div className="flex flex-wrap gap-2">
              <span className={status.className}>
                <span className="mr-1.5 flex items-center">{status.icon}</span>
                {status.label}
              </span>
              {onStatusChange && (
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  aria-label="Change status"
                >
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Priority">
            <span className={priority.className}>
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${priority.dotColor}`} aria-hidden="true" />
              {priority.label}
            </span>
          </FieldRow>

          <FieldRow label="Assignee">
            {task.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar
                  name={task.assignee.name}
                  initials={task.assignee.initials}
                  avatarColor={task.assignee.avatarColor}
                  size="sm"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{task.assignee.name}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">Unassigned</span>
            )}
          </FieldRow>

          {task.dueDate && (
            <FieldRow label="Due date">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </FieldRow>
          )}

          {task.tags && task.tags.length > 0 && (
            <FieldRow label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="badge badge-gray">
                    {tag}
                  </span>
                ))}
              </div>
            </FieldRow>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="field-label mb-2">Description</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {task.description}
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
          <h3 className="field-label mb-4">
            Comments{task.comments && task.comments.length > 0 ? ` (${task.comments.length})` : ''}
          </h3>

          {task.comments && task.comments.length > 0 ? (
            <div className="space-y-4">
              {task.comments.map((comment) => (
                <CommentBubble key={comment.id} comment={comment} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet.</p>
          )}

          {/* New comment form */}
          {onAddComment && (
            <form onSubmit={handleSubmitComment} className="mt-5">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-blue-500"
                aria-label="New comment"
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={submitting || !commentDraft.trim()} className="btn-primary">
                  {submitting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Updated {formatRelativeTime(task.updatedAt)}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
            <button type="button" className="btn-danger text-xs">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
