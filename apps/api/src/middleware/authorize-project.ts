import type { FastifyRequest } from "fastify";
import type { ProjectRole } from "@taskflow/shared";
import { AppError } from "../services/errors.js";

const projectRoleRank: Record<ProjectRole, number> = {
  viewer: 0,
  member: 1,
  owner: 2,
};

export interface ProjectRoleResolverInput {
  projectId: string;
  userId: string;
}

export type ProjectRoleResolver = (
  input: ProjectRoleResolverInput
) => Promise<ProjectRole | null>;

interface ProjectParams {
  projectId?: string;
}

export function requireProjectRole(minRole: ProjectRole) {
  return async (request: FastifyRequest<{ Params: ProjectParams }>) => {
    const projectId = request.params.projectId;

    if (!projectId) {
      throw new AppError(
        "PROJECT_ID_REQUIRED",
        400,
        "Route params must include projectId."
      );
    }

    const resolver = request.server.projectRoleResolver;
    if (!resolver) {
      throw new AppError(
        "PROJECT_AUTH_NOT_CONFIGURED",
        503,
        "Project authorization is not configured."
      );
    }

    const role = await resolver({
      projectId,
      userId: request.user.sub,
    });

    if (!role || projectRoleRank[role] < projectRoleRank[minRole]) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "Insufficient project permissions."
      );
    }
  };
}
