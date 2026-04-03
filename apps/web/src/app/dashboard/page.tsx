'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'comment_added';
  description: string;
  timestamp: string;
  user?: { name: string };
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  accent?: 'blue' | 'green' | 'yellow' | 'red';
}

function StatCard({ label, value, accent = 'blue' }: StatCardProps) {
  const accentClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900 dark:shadow-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-2 inline-flex items-center rounded-md px-2.5 py-0.5 text-3xl font-bold ${accentClasses[accent]}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'task_completed') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (type === 'comment_added') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    </span>
  );
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Error banner */}
        {isError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {(error as { message?: string }).message ?? 'Failed to load dashboard data. Please try again.'}
          </div>
        )}

        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Overview
          </h2>

          {isLoading ? (
            <StatsSkeleton />
          ) : data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Tasks" value={data.stats.totalTasks} accent="blue" />
              <StatCard label="Completed" value={data.stats.completedTasks} accent="green" />
              <StatCard label="In Progress" value={data.stats.inProgressTasks} accent="yellow" />
              <StatCard label="Overdue" value={data.stats.overdueTasks} accent="red" />
            </div>
          ) : null}
        </section>

        {/* Recent Activity */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Recent Activity
          </h2>

          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900 dark:shadow-gray-800">
            {isLoading ? (
              <ActivitySkeleton />
            ) : data && data.recentActivity.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <ActivityIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{item.description}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {item.user ? `${item.user.name} · ` : ''}
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !isLoading ? (
              <div className="flex flex-col items-center py-10 text-center">
                <svg
                  className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity yet.</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Activity will appear here as your team works on tasks.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
