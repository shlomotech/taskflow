'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

interface Assignee {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: Assignee | null;
  dueDate?: string | null;
}

interface Comment {
  id: string;
  body: string;
  authorId: string;
  author?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_OPTIONS: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCurrentUserId(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? payload.userId ?? payload.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TaskFieldsEditor
// ---------------------------------------------------------------------------

interface TaskFieldsEditorProps {
  task: Task;
  onSave: (updates: Partial<Task>) => void;
  isSaving: boolean;
}

function TaskFieldsEditor({ task, onSave, isSaving }: TaskFieldsEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [editing, setEditing] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || null,
    });
    setEditing(false);
  }

  function handleCancel() {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate ?? '');
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{task.title}</h1>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Edit
          </button>
        </div>

        {task.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Status
            </span>
            <p className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {STATUS_LABELS[task.status]}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Priority
            </span>
            <p className="mt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>
            </p>
          </div>

          {task.assignee && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Assignee
              </span>
              <p className="mt-0.5 font-medium text-gray-900 dark:text-white">{task.assignee.name}</p>
            </div>
          )}

          {task.dueDate && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Due Date
              </span>
              <p className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {new Date(task.dueDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-300 bg-white p-6 dark:border-blue-700 dark:bg-gray-800"
    >
      <div className="mb-4">
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Title
        </label>
        <input
          id="task-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="task-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-due" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate ? dueDate.split('T')[0] : ''}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// CommentItem
// ---------------------------------------------------------------------------

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function CommentItem({ comment, currentUserId, onEdit, onDelete, isDeleting }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const isOwn = currentUserId === (comment.author?.id ?? comment.authorId);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onEdit(comment.id, body.trim());
    setEditing(false);
  }

  return (
    <div className="group flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {(comment.author?.name ?? 'U').charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {comment.author?.name ?? 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(comment.createdAt)}
          </span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="mt-1">
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoFocus
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="submit"
                disabled={!body.trim()}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setBody(comment.body);
                  setEditing(false);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {comment.body}
          </p>
        )}

        {isOwn && !editing && (
          <div className="mt-1 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommentsThread
// ---------------------------------------------------------------------------

interface CommentsThreadProps {
  taskId: string;
}

function CommentsThread({ taskId }: CommentsThreadProps) {
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ['task-comments', taskId],
    queryFn: () => apiFetch(`/tasks/${taskId}/comments`) as Promise<Comment[]>,
  });

  const postMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setNewComment('');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      apiFetch(`/tasks/${taskId}/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tasks/${taskId}/comments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    postMutation.mutate(newComment.trim());
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Comments</h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 space-y-5">
          {(comments ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet.</p>
          ) : (
            (comments ?? []).map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                onEdit={(id, body) => editMutation.mutate({ id, body })}
                onDelete={(id) => deleteMutation.mutate(id)}
                isDeleting={deleteMutation.isPending}
              />
            ))
          )}
        </div>
      )}

      <form onSubmit={handlePost} className="border-t border-gray-100 pt-4 dark:border-gray-700">
        <label htmlFor="new-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Add a comment
        </label>
        <textarea
          id="new-comment"
          rows={3}
          placeholder="Write a comment…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
        <div className="mt-2">
          <button
            type="submit"
            disabled={postMutation.isPending || !newComment.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {postMutation.isPending ? 'Posting…' : 'Comment'}
          </button>
        </div>
        {postMutation.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">Failed to post comment. Please try again.</p>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskDetailView
// ---------------------------------------------------------------------------

interface TaskDetailViewProps {
  projectId: string;
  taskId: string;
}

export default function TaskDetailView({ projectId, taskId }: TaskDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => apiFetch(`/tasks/${taskId}`) as Promise<Task>,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Task>) =>
      apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['task', taskId], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load task. Please try again.</p>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Back to board"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">Back to board</span>
      </header>

      <div className="space-y-6">
        <TaskFieldsEditor
          task={task}
          onSave={(updates) => updateMutation.mutate(updates)}
          isSaving={updateMutation.isPending}
        />

        {updateMutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">Failed to save changes. Please try again.</p>
        )}

        <CommentsThread taskId={taskId} />
      </div>
    </div>
  );
}
