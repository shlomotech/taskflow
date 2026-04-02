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

  async listProjectsForUser(userId: string): Promise<ProjectRecord[]> {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT id, name, description, owner_id, created_at, updated_at
        FROM projects
        WHERE owner_id = $1
        ORDER BY updated_at DESC, created_at DESC
      `,
      [userId],
    );

    return result.rows.map(mapProjectRecord);
  }

  async createProject(
    ownerId: string,
    input: CreateProjectBody,
  ): Promise<ProjectRecord> {
    const result = await this.pool.query<ProjectRow>(
      `
        INSERT INTO projects (id, name, description, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, owner_id, created_at, updated_at
      `,
      [
        randomUUID(),
        input.name.trim(),
        normalizeDescription(input.description),
        ownerId,
      ],
    );

    return mapProjectRecord(result.rows[0]);
  }

  async getProjectForUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectRecord | null> {
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

  async updateProject(
    projectId: string,
    userId: string,
    input: UpdateProjectBody,
  ): Promise<ProjectRecord> {
    const existingProject = await this.getOwnedProjectOrThrow(projectId, userId);
    const name = input.name?.trim() ?? existingProject.name;
    const description =
      input.description !== undefined
        ? normalizeDescription(input.description)
        : existingProject.description;

    const result = await this.pool.query<ProjectRow>(
      `
        UPDATE projects
        SET name = $2,
            description = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, description, owner_id, created_at, updated_at
      `,
      [projectId, name, description],
    );

    return mapProjectRecord(result.rows[0]);
  }

  async deleteProject(
    projectId: string,
    userId: string,
  ): Promise<DeleteProjectResult> {
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

  private async getOwnedProjectOrThrow(
    projectId: string,
    userId: string,
  ): Promise<ProjectRecord> {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT id, name, description, owner_id, created_at, updated_at
        FROM projects
        WHERE id = $1
        LIMIT 1
      `,
      [projectId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    if (row.owner_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this project");
    }

    return mapProjectRecord(row);
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

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
