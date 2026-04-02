import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type {
  CreateProjectBody,
  UpdateProjectBody,
} from "../schemas/projects.js";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteProjectResult {
  id: string;
}

export interface ProjectService {
  listProjectsForUser(userId: string): Promise<ProjectRecord[]>;
  createProject(
    ownerId: string,
    input: CreateProjectBody,
  ): Promise<ProjectRecord>;
  getProjectForUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectRecord | null>;
  updateProject(
    projectId: string,
    userId: string,
    input: UpdateProjectBody,
  ): Promise<ProjectRecord>;
  deleteProject(projectId: string, userId: string): Promise<DeleteProjectResult>;
}

export class PostgresProjectService implements ProjectService {
  constructor(private readonly pool: Pool) {}

  async listProjectsForUser(userId: string) {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT id, name, description, owner_id, created_at, updated_at
        FROM projects
        WHERE owner_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map(mapProjectRecord);
  }

  async createProject(ownerId: string, input: CreateProjectBody) {
    const projectId = randomUUID();
    const result = await this.pool.query<ProjectRow>(
      `
        INSERT INTO projects (id, name, description, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, owner_id, created_at, updated_at
      `,
      [projectId, input.name.trim(), input.description?.trim() ?? null, ownerId],
    );

    return mapProjectRecord(result.rows[0]);
  }

  async getProjectForUser(projectId: string, userId: string) {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT id, name, description, owner_id, created_at, updated_at
        FROM projects
        WHERE id = $1 AND owner_id = $2
        LIMIT 1
      `,
      [projectId, userId],
    );

    return result.rows[0] ? mapProjectRecord(result.rows[0]) : null;
  }

  async updateProject(projectId: string, userId: string, input: UpdateProjectBody) {
    const project = await this.getOwnedProjectOrThrow(projectId, userId);
    const nextName = input.name?.trim() ?? project.name;
    const nextDescription =
      input.description !== undefined ? input.description?.trim() ?? null : project.description;

    const result = await this.pool.query<ProjectRow>(
      `
        UPDATE projects
        SET name = $2,
            description = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, description, owner_id, created_at, updated_at
      `,
      [projectId, nextName, nextDescription],
    );

    return mapProjectRecord(result.rows[0]);
  }

  async deleteProject(projectId: string, userId: string) {
    await this.getOwnedProjectOrThrow(projectId, userId);

    await this.pool.query(
      `
        DELETE FROM projects
        WHERE id = $1
      `,
      [projectId],
    );

    return { id: projectId };
  }

  private async getOwnedProjectOrThrow(projectId: string, userId: string) {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT id, name, description, owner_id, created_at, updated_at
        FROM projects
        WHERE id = $1
        LIMIT 1
      `,
      [projectId],
    );

    const project = result.rows[0];

    if (!project) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    if (project.owner_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this project");
    }

    return mapProjectRecord(project);
  }
}

function mapProjectRecord(project: ProjectRow): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.owner_id,
    createdAt: toIsoString(project.created_at),
    updatedAt: toIsoString(project.updated_at),
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
