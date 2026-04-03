'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
}

export default function ProjectListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const { data: projects, isLoading, isError, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
      setProjectName('');
      setProjectDescription('');
      setNameError('');
      router.push(`/projects/${newProject.id}`);
    },
  });

  function openDialog() {
    setProjectName('');
    setProjectDescription('');
    setNameError('');
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setProjectName('');
    setProjectDescription('');
    setNameError('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) {
      setNameError('Project name is required');
      return;
    }
    setNameError('');
    createMutation.mutate({ name: projectName.trim(), description: projectDescription });
  }

  const errorMessage =
    isError && error
      ? (error as { message?: string }).message ?? 'Failed to load projects'
      : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <button
            type="button"
            onClick={openDialog}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New Project
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 animate-pulse rounded-xl bg-white shadow dark:bg-gray-900"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {errorMessage ?? 'Failed to load projects'}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && projects && projects.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">
              No projects yet. Create your first project to get started.
            </p>
          </div>
        )}

        {/* Project list */}
        {!isLoading && !isError && projects && projects.length > 0 && (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/projects/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/projects/${project.id}`);
                  }
                }}
                className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-md dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {project.name}
                    </h2>
                    {project.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {project.completedTaskCount} / {project.taskCount}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">tasks completed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New Project"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              New Project
            </h2>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                    nameError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-600">{nameError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description
                </label>
                <input
                  id="project-description"
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
