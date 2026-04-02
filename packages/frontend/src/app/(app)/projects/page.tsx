'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FolderKanban, Plus, Users, CheckSquare, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  active: { label: 'Active', variant: 'status-done' as const },
  planning: { label: 'Planning', variant: 'status-in-progress' as const },
  done: { label: 'Completed', variant: 'status-backlog' as const },
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  'status-done': 'border-transparent bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]',
  'status-in-progress': 'border-transparent bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]',
  'status-backlog': 'border-transparent bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]',
};

function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Project</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" placeholder="e.g. Marketing Website" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-desc">Description</Label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Briefly describe what this project is about..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">All your active workspaces.</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Project card grid — lg:grid-cols-3 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_PROJECTS.map((project) => {
            const pct = project.taskCount > 0
              ? Math.round((project.doneCount / project.taskCount) * 100)
              : 0;
            const s = STATUS_MAP[project.status];

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                      </div>
                      {/* Status badge using design token */}
                      <Badge className={STATUS_BADGE_CLASS[s.variant]}>{s.label}</Badge>
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
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: 'hsl(var(--status-done))',
                          }}
                        />
                      </div>
                    </div>

                    {/* Meta row — member count badge */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {project.taskCount} tasks
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                        <Users className="h-3 w-3" />
                        {project.memberCount}
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
          <button
            onClick={() => setShowModal(true)}
            className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">New Project</span>
          </button>
        </div>
      </div>

      {showModal && <ProjectCreateModal onClose={() => setShowModal(false)} />}
    </>
  );
}
