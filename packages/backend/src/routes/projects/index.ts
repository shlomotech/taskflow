import type { FastifyPluginAsync } from "fastify";
import { AppError } from "../../lib/errors.js";
import { parseWithSchema } from "../../lib/validation.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createProjectBodySchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from "../../schemas/projects.js";
import type { ProjectService } from "../../services/project.service.js";

interface ProjectsRoutesOptions {
  projectService: ProjectService;
}

const projectsRoutes: FastifyPluginAsync<ProjectsRoutesOptions> = async (
  server,
  options,
) => {
  server.addHook("preHandler", authenticate);

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

  server.get("/:projectId", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const project = await options.projectService.getProjectForUser(
      params.projectId,
      request.user.sub,
    );

    if (!project) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    return {
      data: project,
    };
  });

  server.patch("/:projectId", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const body = parseWithSchema(updateProjectBodySchema, request.body);
    const project = await options.projectService.updateProject(
      params.projectId,
      request.user.sub,
      body,
    );

    return {
      data: project,
    };
  });

  server.delete("/:projectId", async (request) => {
    const params = parseWithSchema(projectParamsSchema, request.params);
    const result = await options.projectService.deleteProject(
      params.projectId,
      request.user.sub,
    );

    return {
      data: result,
    };
  });
};

export default projectsRoutes;
