'use client';

import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { Task, TaskStatus, useUpdateTask } from '@/hooks/useTasks';
import { KanbanColumn } from './KanbanColumn';
import { DraggableTaskCard } from './DraggableTaskCard';
import { TaskDetailModal } from './TaskDetailModal';

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
}

export function KanbanBoard({ projectId, tasks }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getByStatus = (s: TaskStatus) =>
    tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const overId = over.id as string;
    if (STATUSES.includes(overId as TaskStatus) && task.status !== overId) {
      updateTask.mutate({ taskId: task.id, data: { status: overId as TaskStatus } });
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const overId = over.id as string;
    if (STATUSES.includes(overId as TaskStatus)) {
      if (task.status !== overId) updateTask.mutate({ taskId: task.id, data: { status: overId as TaskStatus } });
      return;
    }
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;
    if (task.status !== overTask.status) {
      updateTask.mutate({ taskId: task.id, data: { status: overTask.status, position: overTask.position } });
    } else if (task.position !== overTask.position) {
      updateTask.mutate({ taskId: task.id, data: { position: overTask.position } });
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Horizontal scroll on mobile, flex row on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {STATUSES.map((s) => (
            <KanbanColumn key={s} status={s} tasks={getByStatus(s)} onTaskClick={setSelectedTask} />
          ))}
        </div>

        {/* DragOverlay — rotated + elevated for floating effect */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rotate-2 scale-105 shadow-2xl opacity-90">
              <DraggableTaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail modal */}
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </>
  );
}
