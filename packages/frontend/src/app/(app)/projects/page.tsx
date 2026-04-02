'use client';

import Link from 'next/link';
import { FolderKanban, Plus, Users, CheckSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MOCK_PROJECTS = [
  {
    id: 'proj-1',
    name: 'TaskFlow Web App',
    description: 'Main product — task management platform for distributed teams.',
    taskCount: 48,
    doneCount: 27,
    memberCount: 5,
    updatedAt: '2 hours ago',
    status: 'active' as const,
  },
  {
    id: 'proj-2',
    name: 'Design System',
    description: 'Shared component library and Figma token source of truth.',
    taskCount: 21,
    doneCount: 14,
    memberCount: 3,
    updatedAt: '1 day ago',
    status: 'active' as const,
  },
  {
    id: 'proj-3',
    name: 'Mobile App (iOS)',
    description: 'Native iOS companion for TaskFlow — v1 scoped to core flows.',
    taskCount: 34,
    doneCount: 4,
    memberCount: 4,
    updatedAt: '3 days ago',
    status: 'planning' as const,
  },
  {
    id: 'proj-4',
    name: 'API v2 Migration',
    description: 'Move REST endpoints to GraphQL with backwards-compatible shim.',
    taskCount: 17,
    doneCount: 17,
    memberCount: 2,
    updatedAt: '1 week ago',
    status: 'done' as const,
  },
];

const STATUS_MAP = {
  active: { label: 'Active', className: 'border-transparent bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]' },
  planning: { label: 'Planning', className: 'border-transparent bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]' },
  done: { label: 'Completed', className: 'border-transparent bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]' },
};

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">All your active workspaces.</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_PROJECTS.map((project) => {
          const pct = project.taskCount > 0
            ? Math.round((project.doneCount / project.taskCount) * 100)
            : 0;
          const s = STATUS_MAP[project.status];

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <FolderKanban className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                    </div>
                    <Badge className={s.className}>{s.label}</Badge>
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {/* Progress bar */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.doneCount} / {project.taskCount} tasks done</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--status-done))] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {project.taskCount} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {project.memberCount} members
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {project.updatedAt}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* New project card */}
        <button className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New Project</span>
        </button>
      </div>
    </div>
  );
}
