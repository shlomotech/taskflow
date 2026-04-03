import Link from 'next/link';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import type { Task } from '@/types';

const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment',
    status: 'done',
    priority: 'high',
    projectId: '1',
    assignee: { id: 'u1', name: 'Alice Chen' },
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 't2',
    title: 'Design authentication flow',
    description: 'Create wireframes and user journey maps for auth screens',
    status: 'done',
    priority: 'high',
    projectId: '1',
    assignee: { id: 'u2', name: 'Bob Smith' },
    createdAt: '2026-03-21T09:00:00Z',
  },
  {
    id: 't3',
    title: 'Implement login & register pages',
    status: 'in_progress',
    priority: 'critical',
    projectId: '1',
    assignee: { id: 'u1', name: 'Alice Chen' },
    createdAt: '2026-03-25T11:00:00Z',
  },
  {
    id: 't4',
    title: 'Build Kanban board UI',
    description: 'Drag-and-drop task management with @dnd-kit',
    status: 'in_progress',
    priority: 'high',
    projectId: '1',
    assignee: { id: 'u3', name: 'Carol Davis' },
    createdAt: '2026-03-26T14:00:00Z',
  },
  {
    id: 't5',
    title: 'Dashboard stats cards',
    description: 'Active tasks, overdue items, team velocity metrics',
    status: 'in_review',
    priority: 'medium',
    projectId: '1',
    assignee: { id: 'u2', name: 'Bob Smith' },
    createdAt: '2026-03-28T10:00:00Z',
  },
  {
    id: 't6',
    title: 'Write unit tests for auth hooks',
    status: 'in_review',
    priority: 'medium',
    projectId: '1',
    createdAt: '2026-03-29T09:00:00Z',
  },
  {
    id: 't7',
    title: 'Mobile responsive layout',
    description: 'Ensure all views work on screens < 768px',
    status: 'todo',
    priority: 'medium',
    projectId: '1',
    assignee: { id: 'u3', name: 'Carol Davis' },
    createdAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 't8',
    title: 'Dark mode support',
    description: 'Add dark mode toggle and persist user preference',
    status: 'todo',
    priority: 'low',
    projectId: '1',
    createdAt: '2026-04-01T11:00:00Z',
  },
  {
    id: 't9',
    title: 'Notification system',
    description: 'Real-time in-app notifications for task assignments',
    status: 'todo',
    priority: 'low',
    projectId: '1',
    createdAt: '2026-04-02T09:00:00Z',
  },
];

interface KanbanPageProps {
  params: { id: string };
}

export default function KanbanPage({ params }: KanbanPageProps) {
  const projectTasks = MOCK_TASKS.filter((t) => t.projectId === params.id);
  const tasks = projectTasks.length > 0 ? projectTasks : MOCK_TASKS;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-screen-2xl">
          <nav className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/projects" className="hover:text-blue-600 dark:hover:text-blue-400">
              Projects
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">TaskFlow Platform</span>
          </nav>

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              TaskFlow Platform
            </h1>
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600">
              + Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <main className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-screen-2xl">
          <KanbanBoard initialTasks={tasks} />
        </div>
      </main>
    </div>
  );
}
