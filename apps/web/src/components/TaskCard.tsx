"use client";

import type { Task, TaskStatus } from "@taskflow/shared";

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const nextStatus: Record<TaskStatus, TaskStatus | null> = {
    todo: "in_progress",
    in_progress: "done",
    done: null,
  };

  const prevStatus: Record<TaskStatus, TaskStatus | null> = {
    todo: null,
    in_progress: "todo",
    done: "in_progress",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-gray-500 text-xs mt-2 line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <div className="flex gap-1">
          {prevStatus[task.status] && (
            <button
              onClick={() =>
                onStatusChange(task.id, prevStatus[task.status]!)
              }
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              ← Back
            </button>
          )}
          {nextStatus[task.status] && (
            <button
              onClick={() =>
                onStatusChange(task.id, nextStatus[task.status]!)
              }
              className="text-xs text-blue-500 hover:text-blue-700 px-1 font-medium"
            >
              {task.status === "todo" ? "Start →" : "Done ✓"}
            </button>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-gray-300 hover:text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
