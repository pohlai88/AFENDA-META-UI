/**
 * Frontend Logger
 * ===============
 * Browser-safe structured logging that:
 *  • Works in development (pretty console output)
 *  • Can be configured for production (remote logging endpoints)
 *  • Provides structured logging similar to Pino
 *  • Supports context bindings for module/component logging
 */

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  trace(message: string): void;
  trace(context: LogContext, message: string): void;
  trace(message: string, context: LogContext | unknown): void;
  debug(message: string): void;
  debug(context: LogContext, message: string): void;
  debug(message: string, context: LogContext | unknown): void;
  info(message: string): void;
  info(context: LogContext, message: string): void;
  info(message: string, context: LogContext | unknown): void;
  warn(message: string): void;
  warn(context: LogContext, message: string): void;
  warn(message: string, context: LogContext | unknown): void;
  error(message: string): void;
  error(context: LogContext, message: string): void;
  error(message: string, context: LogContext | unknown): void;
  fatal(message: string): void;
  fatal(context: LogContext, message: string): void;
  fatal(message: string, context: LogContext | unknown): void;
  child(bindings: LogContext): Logger;
}

class BrowserLogger implements Logger {
  private bindings: LogContext;
  private minLevel: LogLevel;

  constructor(bindings: LogContext = {}, minLevel: LogLevel = "info") {
    this.bindings = bindings;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    const currentIndex = levels.indexOf(this.minLevel);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }

  private log(level: LogLevel, firstArg: LogContext | string, secondArg?: LogContext | string | unknown) {
    if (!this.shouldLog(level)) return;

    let context: LogContext;
    let msg: string;

    // Detect parameter pattern
    if (typeof firstArg === "string") {
      // Pattern: (message) or (message, context/data)
      msg = firstArg;
      if (typeof secondArg === "object" && secondArg !== null) {
        context = secondArg as LogContext;
      } else if (secondArg !== undefined) {
        // Handle primitives and other types
        context = { data: secondArg };
      } else {
        context = {};
      }
    } else {
      // Pattern: (context, message)
      context = firstArg;
      msg = typeof secondArg === "string" ? secondArg : "";
    }

    const logData = {
      level,
      time: new Date().toISOString(),
      ...this.bindings,
      ...context,
      msg,
    };

    // In development: pretty console output
    if (import.meta.env.DEV) {
      const emoji = {
        trace: "🔍",
        debug: "🐛",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
        fatal: "💀",
      }[level];

      const style = {
        trace: "color: gray",
        debug: "color: blue",
        info: "color: green",
        warn: "color: orange",
        error: "color: red",
        fatal: "color: darkred; font-weight: bold",
      }[level];

      console.log(`%c${emoji} [${level.toUpperCase()}] ${msg}`, style, logData);
      return;
    }

    // In production: structured JSON (could send to remote endpoint)
    if (level === "error" || level === "fatal") {
      console.error(JSON.stringify(logData));

      // TODO: Send to remote logging endpoint
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logData)
      // }).catch(() => {}); // Silent fail
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  trace(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("trace", firstArg,secondArg);
  }

  debug(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("debug", firstArg, secondArg);
  }

  info(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("info", firstArg, secondArg);
  }

  warn(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("warn", firstArg, secondArg);
  }

  error(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("error", firstArg, secondArg);
  }

  fatal(firstArg: LogContext | string, secondArg?: LogContext | string | unknown): void {
    this.log("fatal", firstArg, secondArg);
  }

  child(bindings: LogContext): Logger {
    return new BrowserLogger({ ...this.bindings, ...bindings }, this.minLevel);
  }
}

// Create root logger
const logLevel = (import.meta.env.VITE_LOG_LEVEL ||
  (import.meta.env.DEV ? "debug" : "info")) as LogLevel;

export const logger = new BrowserLogger({}, logLevel);

export default logger;
