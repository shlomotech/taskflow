import type { FastifyPluginAsync } from "fastify";
import { parseWithSchema } from "../../lib/validation.js";
import {
  authenticate,
  getAuthenticatedUserId,
} from "../../middleware/authenticate.js";
import { updateCurrentUserBodySchema } from "../../schemas/users.js";
import type { UsersRouteOptions } from "./types.js";

const usersRoutes: FastifyPluginAsync<UsersRouteOptions> = async (
  server,
  options,
) => {
  server.get(
    "/me",
    {
      preHandler: authenticate,
    },
    async (request) => {
      const user = await options.usersService.getCurrentUser(
        getAuthenticatedUserId(request),
      );

      return {
        user,
      };
    },
  );

  server.patch(
    "/me",
    {
      preHandler: authenticate,
    },
    async (request) => {
      const input = parseWithSchema(updateCurrentUserBodySchema, request.body);
      const user = await options.usersService.updateCurrentUser(
        getAuthenticatedUserId(request),
        input,
      );

      return {
        user,
      };
    },
  );
};

export default usersRoutes;
