/**
 * Logging barrel export
 * =====================
 * Re-exports the root logger and provides a helper for module-level child loggers.
 */

export { logger } from "./logger.js";
export { logger as default } from "./logger.js";

import { logger } from "./logger.js";

/**
 * Create a child logger bound to a specific module name.
 * Usage: `const log = createChildLogger("rbac");`
 */
export function createChildLogger(module: string) {
  return logger.child({ module });
}
