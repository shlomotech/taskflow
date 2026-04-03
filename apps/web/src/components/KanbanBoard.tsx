'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: KanbanTask;
  onDragStart: (taskId: string) => void;
  onClick: (taskId: string) => void;
}

function TaskCard({ task, onDragStart, onClick }: TaskCardProps) {
  return (
    <div
      data-task-id={task.id}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onClick={() => onClick(task.id)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low}`}
        >
          {task.priority}
        </span>
        {task.assignee && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{task.assignee.name}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban column
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  id: TaskStatus;
  label: string;
  tasks: KanbanTask[];
  onDragStart: (taskId: string) => void;
  onDrop: (targetStatus: TaskStatus) => void;
  onCardClick: (taskId: string) => void;
}

function KanbanColumn({ id, label, tasks, onDragStart, onDrop, onCardClick }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(id);
  }

  return (
    <section
      role="region"
      aria-label={label}
      data-column={id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-w-[240px] flex-1 flex-col rounded-xl border bg-gray-50 p-3 transition-colors dark:bg-gray-900/50 ${
        isDragOver
          ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
        <span>{label}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          {tasks.length}
        </span>
      </h2>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-600">
            No tasks
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draggedTaskId = useRef<string | null>(null);

  const {
    data: tasks,
    isLoading,
    isError,
  } = useQuery<KanbanTask[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => apiFetch(`/projects/${projectId}/tasks`) as Promise<KanbanTask[]>,
  });

  function handleDragStart(taskId: string) {
    draggedTaskId.current = taskId;
  }

  function handleDrop(targetStatus: TaskStatus) {
    const taskId = draggedTaskId.current;
    if (!taskId) return;
    draggedTaskId.current = null;

    // Optimistic update
    queryClient.setQueryData<KanbanTask[]>(['tasks', projectId], (old) => {
      if (!old) return old;
      return old.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t));
    });

    // Persist to API
    apiFetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: targetStatus }),
    }).catch(() => {
      // Roll back optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    });
  }

  function handleCardClick(taskId: string) {
    router.push(`/tasks/${taskId}`);
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="min-w-[240px] flex-1 animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
          >
            <div className="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load tasks. Please try again.
        </p>
      </div>
    );
  }

  const tasksByStatus = (tasks ?? []).reduce<Record<TaskStatus, KanbanTask[]>>(
    (acc, task) => {
      const status = task.status in acc ? task.status : 'backlog';
      acc[status] = [...acc[status], task];
      return acc;
    },
    { backlog: [], todo: [], in_progress: [], in_review: [], done: [] },
  );

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.id}
          id={col.id}
          label={col.label}
          tasks={tasksByStatus[col.id]}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onCardClick={handleCardClick}
        />
      ))}
    </div>
  );
}
