import type { FastifyPluginAsync } from "fastify";
import { requireAccessToken } from "../lib/require-access-token.js";
import { parseWithSchema } from "../lib/validation.js";
import {
  createLabelBodySchema,
  labelParamsSchema,
  taskLabelParamsSchema,
  taskLabelsParamsSchema,
  updateLabelBodySchema,
} from "../schemas/labels.js";
import type { LabelService } from "../services/label-service.js";

interface LabelRoutesOptions {
  labelService: LabelService;
}

const labelRoutes: FastifyPluginAsync<LabelRoutesOptions> = async (
  server,
  options,
) => {
  server.addHook("preHandler", requireAccessToken);

  server.get("/labels", async () => {
    const labels = await options.labelService.listLabels();

    return {
      data: labels,
    };
  });

  server.post("/labels", async (request, reply) => {
    const body = parseWithSchema(createLabelBodySchema, request.body);
    const label = await options.labelService.createLabel(body);

    return reply.code(201).send({
      data: label,
    });
  });

  server.patch("/labels/:id", async (request) => {
    const params = parseWithSchema(labelParamsSchema, request.params);
    const body = parseWithSchema(updateLabelBodySchema, request.body);
    const label = await options.labelService.updateLabel(params.id, body);

    return {
      data: label,
    };
  });

  server.delete("/labels/:id", async (request) => {
    const params = parseWithSchema(labelParamsSchema, request.params);
    const result = await options.labelService.deleteLabel(params.id);

    return {
      data: result,
    };
  });

  server.get("/tasks/:taskId/labels", async (request) => {
    const params = parseWithSchema(taskLabelsParamsSchema, request.params);
    const labels = await options.labelService.listTaskLabels(
      params.taskId,
      request.user.sub,
    );

    return {
      data: labels,
    };
  });

  server.post("/tasks/:taskId/labels/:labelId", async (request) => {
    const params = parseWithSchema(taskLabelParamsSchema, request.params);
    const result = await options.labelService.addLabelToTask(
      params.taskId,
      params.labelId,
      request.user.sub,
    );

    return {
      data: result,
    };
  });

  server.delete("/tasks/:taskId/labels/:labelId", async (request) => {
    const params = parseWithSchema(taskLabelParamsSchema, request.params);
    const result = await options.labelService.removeLabelFromTask(
      params.taskId,
      params.labelId,
      request.user.sub,
    );

    return {
      data: result,
    };
  });
};

export default labelRoutes;
