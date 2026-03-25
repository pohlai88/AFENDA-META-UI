/**
 * HTTP Request Logger Middleware (pino-http)
 * ==========================================
 * Replaces the custom Winston requestLogger with pino-http.
 *
 * pino-http automatically:
 *  • Generates a unique requestId per request
 *  • Attaches `req.log` (child logger with requestId context) to every request
 *  • Logs response status, duration, method, url on completion
 *  • Serializes req/res with Pino standard serializers
 */

import pinoHttp from "pino-http";
import crypto from "node:crypto";
import { logger } from "../logging/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export const httpLogger = pinoHttp.default({
  logger,
  autoLogging: true,

  // Use X-Request-Id header if present, otherwise generate a UUID
  genReqId(req: IncomingMessage) {
    return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
  },

  customSuccessMessage(req: IncomingMessage, res: ServerResponse) {
    return `${req.method} ${req.url} completed ${res.statusCode}`;
  },

  customErrorMessage(req: IncomingMessage, _res: ServerResponse, err: Error) {
    return `${req.method} ${req.url} errored: ${err.message}`;
  },

  // Attach userId from session to every request log line
  customProps(req: IncomingMessage) {
    const session = (req as IncomingMessage & { session?: { uid: string } }).session;
    return {
      userId: session?.uid ?? "anonymous",
    };
  },
});

export default httpLogger;
