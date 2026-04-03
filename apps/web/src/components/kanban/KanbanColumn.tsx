'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '@/types';

const COLUMN_STYLES: Record<TaskStatus, { header: string; dot: string; count: string }> = {
  todo: {
    header: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
    count: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
  in_progress: {
    header: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    count: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  in_review: {
    header: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500',
    count: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  done: {
    header: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
    count: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
};

const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

export default function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const styles = COLUMN_STYLES[status];

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <h2 className={`text-sm font-semibold ${styles.header}`}>
          {COLUMN_LABELS[status]}
        </h2>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${styles.count}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex flex-1 flex-col gap-2 rounded-xl p-2 transition-colors duration-150 min-h-[120px]
          ${isOver
            ? 'bg-blue-50 ring-2 ring-blue-300 ring-dashed dark:bg-blue-900/20 dark:ring-blue-700'
            : 'bg-gray-100/60 dark:bg-gray-800/40'
          }
        `}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-600">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
