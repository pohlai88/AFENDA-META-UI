import { pruneOrphanedUploads } from "./storage.js";

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw.toLowerCase() === "true";
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface UploadCleanupLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export function startUploadRetentionJob(logger: UploadCleanupLogger): () => void {
  const enabled = readBooleanEnv("UPLOAD_RETENTION_ENABLED", false);

  if (!enabled) {
    logger.info("[Uploads] Retention job is disabled");
    return () => undefined;
  }

  const retentionMs = readNumberEnv("UPLOAD_RETENTION_MAX_AGE_MS", DEFAULT_RETENTION_MS);
  const intervalMs = readNumberEnv("UPLOAD_RETENTION_INTERVAL_MS", DEFAULT_INTERVAL_MS);

  const runCleanup = async () => {
    try {
      const pruned = await pruneOrphanedUploads(retentionMs);
      logger.info("[Uploads] Retention cleanup completed", {
        pruned,
        retentionMs,
      });
    } catch (error) {
      logger.error("[Uploads] Retention cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void runCleanup();
  const interval = setInterval(() => {
    void runCleanup();
  }, intervalMs);

  logger.info("[Uploads] Retention job started", {
    intervalMs,
    retentionMs,
  });

  return () => {
    clearInterval(interval);
    logger.info("[Uploads] Retention job stopped");
  };
}
