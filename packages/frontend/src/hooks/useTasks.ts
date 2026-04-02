import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, 'projectId'>> {
  position?: number;
}

const TASKS_KEY = (projectId: string) => ['tasks', projectId] as const;

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: TASKS_KEY(projectId),
    queryFn: async () => {
      const { data } = await api.get<Task[]>(`/projects/${projectId}/tasks`);
      return data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post<Task>(
        `/projects/${input.projectId}/tasks`,
        input,
      );
      return data;
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: TASKS_KEY(task.projectId) });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const { data } = await api.patch<Task>(`/tasks/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY(projectId) });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY(projectId) });
    },
  });
}
