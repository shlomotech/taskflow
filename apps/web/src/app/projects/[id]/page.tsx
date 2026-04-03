import KanbanBoard from '@/components/KanbanBoard';
import QueryProvider from '@/providers/QueryProvider';

interface ProjectPageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <QueryProvider>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Kanban Board</h1>
        </header>
        <KanbanBoard projectId={params.id} />
      </main>
    </QueryProvider>
  );
}
