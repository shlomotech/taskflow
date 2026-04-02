import type { Config } from "../../config.js";
import type { AuthService } from "../../services/auth.service.js";

export interface AuthRouteOptions {
  authService: AuthService;
  config: Config;
}
