'use client';

import { useParams } from 'next/navigation';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { useTasks } from '@/hooks/useTasks';

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: tasks, isLoading, isError } = useTasks(projectId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load tasks. Please try again.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Board</h2>
      </div>
      <KanbanBoard projectId={projectId} tasks={tasks ?? []} />
    </div>
  );
}
