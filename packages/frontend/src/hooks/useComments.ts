import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Comment {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const COMMENTS_KEY = (taskId: string) => ['comments', taskId] as const;

export function useComments(taskId: string) {
  return useQuery({
    queryKey: COMMENTS_KEY(taskId),
    queryFn: async () => {
      const { data } = await api.get<Comment[]>(`/tasks/${taskId}/comments`);
      return data;
    },
    enabled: Boolean(taskId),
  });
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<Comment>(`/tasks/${taskId}/comments`, { body });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMENTS_KEY(taskId) });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMENTS_KEY(taskId) });
    },
  });
}
