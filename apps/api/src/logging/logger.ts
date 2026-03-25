/**
 * Root Pino Logger
 * ================
 * Production-grade structured JSON logging with:
 *  • ISO 8601 timestamps
 *  • PII/credential redaction
 *  • Pretty console output in development
 *  • File transports in production (error.log + combined.log)
 *  • Standard serializers for errors, requests, responses
 */

import pino from "pino";
import config from "../config/index.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.creditCard",
];

function buildTransport(): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  if (config.isDev) {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    };
  }

  // Production: write JSON to stdout (for log aggregators) + file targets
  return {
    targets: [
      {
        target: "pino/file",
        options: { destination: 1 }, // stdout
        level: config.logLevel as pino.LevelWithSilent,
      },
      {
        target: "pino/file",
        options: { destination: "./logs/error.log", mkdir: true },
        level: "error",
      },
      {
        target: "pino/file",
        options: { destination: "./logs/combined.log", mkdir: true },
        level: config.logLevel as pino.LevelWithSilent,
      },
    ],
  };
}

export const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,

  base: {
    service: "afenda-api",
    env: config.nodeEnv,
  },

  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },

  formatters: {
    level(label) {
      return { level: label };
    },
  },

  transport: buildTransport(),
});

export default logger;
