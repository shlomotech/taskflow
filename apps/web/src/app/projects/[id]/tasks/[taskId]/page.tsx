import QueryProvider from '@/providers/QueryProvider';
import TaskDetailView from '@/components/TaskDetailView';

interface TaskDetailPageProps {
  params: { id: string; taskId: string };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  return (
    <QueryProvider>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <TaskDetailView projectId={params.id} taskId={params.taskId} />
      </main>
    </QueryProvider>
  );
}
