import type { Env } from "./env";
import { routeRequest } from "./routes";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return routeRequest(request, env);
  },
};
