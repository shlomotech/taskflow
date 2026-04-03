'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types';

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
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
      className={`
        group cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200
        transition-shadow duration-150 active:cursor-grabbing
        dark:bg-gray-800 dark:ring-gray-700
        ${isDragging
          ? 'opacity-50 shadow-lg ring-blue-400 dark:ring-blue-500'
          : 'hover:shadow-md hover:ring-gray-300 dark:hover:ring-gray-600'
        }
      `}
    >
      <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
        {task.title}
      </p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>

        {task.assignee && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white ring-2 ring-white dark:ring-gray-800"
            title={task.assignee.name}
          >
            {task.assignee.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.assignee.avatarUrl}
                alt={task.assignee.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              task.assignee.name.charAt(0).toUpperCase()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
