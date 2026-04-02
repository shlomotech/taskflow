import type { FastifyPluginAsync } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAccessToken } from "../lib/require-access-token.js";
import { parseWithSchema } from "../lib/validation.js";
import {
  createTaskBodySchema,
  projectTasksParamsSchema,
  taskListQuerySchema,
  taskParamsSchema,
  updateTaskBodySchema,
} from "../schemas/tasks.js";
import type { TaskService } from "../services/task-service.js";

interface TaskRoutesOptions {
  taskService: TaskService;
}

const taskRoutes: FastifyPluginAsync<TaskRoutesOptions> = async (
  server,
  options,
) => {
  server.addHook("preHandler", requireAccessToken);

  server.get("/projects/:projectId/tasks", async (request) => {
    const params = parseWithSchema(projectTasksParamsSchema, request.params);
    const query = parseWithSchema(taskListQuerySchema, request.query);

    const tasks = await options.taskService.listProjectTasks(
      params.projectId,
      request.user.sub,
      query.status,
    );

    return {
      data: tasks,
    };
  });

  server.post("/projects/:projectId/tasks", async (request, reply) => {
    const params = parseWithSchema(projectTasksParamsSchema, request.params);
    const body = parseWithSchema(createTaskBodySchema, request.body);
    const task = await options.taskService.createTask(
      params.projectId,
      request.user.sub,
      body,
    );

    return reply.code(201).send({
      data: task,
    });
  });

  server.get("/tasks/:id", async (request) => {
    const params = parseWithSchema(taskParamsSchema, request.params);
    const task = await options.taskService.getTaskForUser(
      params.id,
      request.user.sub,
    );

    if (!task) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    }

    return {
      data: task,
    };
  });

  server.patch("/tasks/:id", async (request) => {
    const params = parseWithSchema(taskParamsSchema, request.params);
    const body = parseWithSchema(updateTaskBodySchema, request.body);
    const task = await options.taskService.updateTask(
      params.id,
      request.user.sub,
      body,
    );

    return {
      data: task,
    };
  });

  server.delete("/tasks/:id", async (request) => {
    const params = parseWithSchema(taskParamsSchema, request.params);
    const result = await options.taskService.deleteTask(
      params.id,
      request.user.sub,
    );

    return {
      data: result,
    };
  });
};

export default taskRoutes;
