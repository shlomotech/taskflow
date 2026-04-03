import ProjectCard from '@/components/projects/ProjectCard';
import type { Project } from '@/types';

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'TaskFlow Platform',
    description: 'Core task management platform development',
    color: 'blue',
    taskCount: 24,
    completedCount: 16,
    updatedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Mobile App',
    description: 'iOS and Android companion app',
    color: 'purple',
    taskCount: 18,
    completedCount: 6,
    updatedAt: '2026-04-02T14:30:00Z',
  },
  {
    id: '3',
    name: 'API Integrations',
    description: 'Third-party API connectors and webhooks',
    color: 'green',
    taskCount: 12,
    completedCount: 12,
    updatedAt: '2026-03-28T09:00:00Z',
  },
  {
    id: '4',
    name: 'Design System',
    description: 'Component library and design tokens',
    color: 'orange',
    taskCount: 8,
    completedCount: 3,
    updatedAt: '2026-04-03T08:00:00Z',
  },
  {
    id: '5',
    name: 'Analytics Dashboard',
    description: 'Reporting and metrics visualization',
    color: 'teal',
    taskCount: 15,
    completedCount: 5,
    updatedAt: '2026-04-01T16:00:00Z',
  },
  {
    id: '6',
    name: 'Onboarding Flow',
    description: 'New user onboarding and tutorials',
    color: 'pink',
    taskCount: 10,
    completedCount: 2,
    updatedAt: '2026-04-02T11:00:00Z',
  },
];

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {MOCK_PROJECTS.length} active projects
            </p>
          </div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600">
            New Project
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_PROJECTS.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
