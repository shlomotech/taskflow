"use client";

import { useEffect, useState, useCallback } from "react";
import type { Task, TaskStatus, CreateTaskInput } from "@taskflow/shared";
import { TASK_STATUSES } from "@taskflow/shared";
import { TaskCard } from "@/components/TaskCard";
import { CreateTaskModal } from "@/components/CreateTaskModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-200",
  in_progress: "bg-blue-200",
  done: "bg-green-200",
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch {
      console.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (input: CreateTaskInput) => {
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) fetchTasks();
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchTasks();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">TaskFlow</h1>
          <p className="text-gray-500 text-sm">Manage your tasks with ease</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Task
        </button>
      </header>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading tasks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-3 h-3 rounded-full ${statusColors[status]}`}
                  />
                  <h2 className="font-semibold text-sm text-gray-700">
                    {statusLabels[status]}
                  </h2>
                  <span className="text-xs text-gray-400 ml-auto">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateStatus}
                      onDelete={deleteTask}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center text-gray-300 text-sm py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createTask}
      />
    </div>
  );
}
