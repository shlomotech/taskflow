export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type ProjectRole = "owner" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  createdAt: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorDetails;
}
