'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LayoutKanban, CheckSquare, Users, Calendar, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MOCK_MEMBERS = [
  { id: '1', name: 'Alice Chen', role: 'Lead', initials: 'AC' },
  { id: '2', name: 'Bob Kim', role: 'Developer', initials: 'BK' },
  { id: '3', name: 'Carol Wu', role: 'Designer', initials: 'CW' },
  { id: '4', name: 'Dave Park', role: 'QA', initials: 'DP' },
];

const MOCK_TASKS = [
  { id: 't1', title: 'Design login screen', status: 'done', priority: 'high' },
  { id: 't2', title: 'Implement JWT auth', status: 'in_progress', priority: 'critical' },
  { id: 't3', title: 'Set up CI pipeline', status: 'done', priority: 'medium' },
  { id: 't4', title: 'API rate limiting', status: 'blocked', priority: 'high' },
  { id: 't5', title: 'User profile page', status: 'in_progress', priority: 'medium' },
  { id: 't6', title: 'Dark mode support', status: 'todo', priority: 'low' },
];

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]',
  in_progress: 'bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]',
  todo: 'bg-[hsl(var(--status-todo)/0.15)] text-[hsl(var(--status-todo))]',
  blocked: 'bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]',
  in_review: 'bg-[hsl(var(--status-in-review)/0.15)] text-[hsl(var(--status-in-review))]',
  backlog: 'bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]',
};

const STATUS_LABELS: Record<string, string> = {
  done: 'Done',
  in_progress: 'In Progress',
  todo: 'To Do',
  blocked: 'Blocked',
  in_review: 'In Review',
  backlog: 'Backlog',
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-[hsl(var(--priority-critical)/0.15)] text-[hsl(var(--priority-critical))]',
  high: 'bg-[hsl(var(--priority-high)/0.15)] text-[hsl(var(--priority-high))]',
  medium: 'bg-[hsl(var(--priority-medium)/0.15)] text-[hsl(var(--priority-medium))]',
  low: 'bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const doneCount = MOCK_TASKS.filter((t) => t.status === 'done').length;
  const pct = Math.round((doneCount / MOCK_TASKS.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">TaskFlow Web App</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TaskFlow Web App</h2>
          <p className="mt-1 text-muted-foreground">
            Main product — task management platform for distributed teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/board`}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <LayoutKanban className="h-4 w-4" />
            Open Board
          </Link>
          <button className="flex items-center justify-center rounded-md border border-border p-2 text-muted-foreground hover:bg-accent transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tasks</p>
              <p className="text-2xl font-bold">{MOCK_TASKS.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--status-done)/0.1)]">
              <Calendar className="h-5 w-5 text-[hsl(var(--status-done))]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">{pct}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold">{MOCK_MEMBERS.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">{doneCount} of {MOCK_TASKS.length} tasks done</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[hsl(var(--status-done))] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {MOCK_TASKS.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority] ?? ''}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status] ?? ''}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Members</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4">
            {MOCK_MEMBERS.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                  {member.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
