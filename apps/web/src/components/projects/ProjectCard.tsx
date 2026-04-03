import Link from 'next/link';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
}

const PROJECT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const colorClass = PROJECT_COLORS[project.color] ?? 'bg-blue-500';
  const progress =
    project.taskCount > 0
      ? Math.round((project.completedCount / project.taskCount) * 100)
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-gray-600"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`h-10 w-10 flex-shrink-0 rounded-lg ${colorClass}`} />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {project.taskCount} tasks
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
        {project.name}
      </h3>

      {project.description && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {project.description}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
