import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";
import { parseWithSchema } from "../lib/validation.js";
import {
  createProjectBodySchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from "../schemas/projects.js";
import type { ProjectService } from "../services/project-service.js";

interface ProjectRoutesOptions {
  projectService: ProjectService;
}

const projectRoutes: FastifyPluginAsync<ProjectRoutesOptions> = async (
  server,
  options,
) => {
  server.addHook("preHandler", requireAccessToken);

  server.get("/", async (request) => {
    const projects = await options.projectService.listProjectsForUser(
      request.user.sub,
    );

    return {
      data: projects,
    };
  });

  server.post("/", async (request, reply) => {
    const body = parseWithSchema(createProjectBodySchema, request.body);
    const project = await options.projectService.createProject(
      request.user.sub,
      body,
    );

    return reply.code(201).send({
      data: project,
    });
  });

  server.get("/:id", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const project = await options.projectService.getProjectForUser(
      params.id,
      request.user.sub,
    );

    if (!project) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    return {
      data: project,
    };
  });

  server.patch("/:id", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const body = parseWithSchema(updateProjectBodySchema, request.body);
    const project = await options.projectService.updateProject(
      params.id,
      request.user.sub,
      body,
    );

    return {
      data: project,
    };
  });

  server.delete("/:id", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const result = await options.projectService.deleteProject(
      params.id,
      request.user.sub,
    );

    return {
      data: result,
    };
  });
};

export default projectRoutes;

async function requireAccessToken(request: FastifyRequest) {
  await request.jwtVerify();

  if (request.user.type !== "access") {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
  }
}
