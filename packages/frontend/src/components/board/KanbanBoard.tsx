'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { Task, TaskStatus, useUpdateTask } from '@/hooks/useTasks';
import { KanbanColumn } from './KanbanColumn';
import { DraggableTaskCard } from './DraggableTaskCard';

const STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
];

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
}

export function KanbanBoard({ projectId, tasks }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function getTasksByStatus(status: TaskStatus) {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // If dragging over a column drop zone (status string)
    const overId = over.id as string;
    const isOverColumn = STATUSES.includes(overId as TaskStatus);

    if (isOverColumn && activeTask.status !== overId) {
      updateTask.mutate({
        taskId: activeTask.id,
        data: { status: overId as TaskStatus },
      });
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const overId = over.id as string;
    const isOverColumn = STATUSES.includes(overId as TaskStatus);

    if (isOverColumn) {
      if (draggedTask.status !== overId) {
        updateTask.mutate({
          taskId: draggedTask.id,
          data: { status: overId as TaskStatus },
        });
      }
      return;
    }

    // Dropped over another task card — reorder within column
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (draggedTask.status !== overTask.status) {
      updateTask.mutate({
        taskId: draggedTask.id,
        data: { status: overTask.status, position: overTask.position },
      });
    } else if (draggedTask.position !== overTask.position) {
      updateTask.mutate({
        taskId: draggedTask.id,
        data: { position: overTask.position },
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <DraggableTaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
