import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
  position: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  position?: number;
  dueDate?: string;
}

export function useTasks(projectId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => apiFetch<Task[]>(`/api/projects/${projectId}/tasks`),
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery<Task>({
    queryKey: ['tasks', taskId],
    queryFn: () => apiFetch<Task>(`/api/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskInput }) =>
      apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, ...data } : t)) ?? []
      );

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['tasks', projectId], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
