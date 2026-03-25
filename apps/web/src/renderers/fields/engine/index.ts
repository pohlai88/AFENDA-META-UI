/**
 * Form Engine — Public API
 * ========================
 * Barrel re-export of all framework-agnostic engine modules.
 *
 * Usage:
 *   import { buildZodSchemaFromFormConfig, joinPath } from "./engine/index.js";
 */

// Types
export type { DynamicFormValues } from "./types.js";

// Path toolkit
export {
  joinPath,
  getValueByPath,
  hasValidationErrorAtPath,
  setValidationErrorAtPath,
  matchPathPattern,
  resolveWildcardPaths,
} from "./path/pathToolkit.js";

// Schema — conditional rules
export {
  isConditionSatisfied,
  resolveConditionFieldPath,
  hasRequiredValue,
  type ConditionalRule,
} from "./schema/conditionalRules.js";

// Schema — field-level Zod builders
export {
  getBaseSchemaForField,
  applyFieldRequiredRule,
  applyCustomRule,
} from "./schema/fieldSchema.js";

// Schema — top-level schema compilation
export {
  buildObjectShape,
  buildZodSchemaFromFieldConfig,
  buildZodSchemaFromFormConfig,
  generateSchema,
  type SchemaBuildResult,
} from "./schema/buildSchema.js";

// Validation — cache + key management
export {
  asyncFieldValidationCache,
  asyncFormValidationCache,
  stableSerialize,
  buildAsyncFieldCacheKey,
  buildAsyncFormCacheKey,
  invalidateAsyncValidationCacheByScope,
  invalidateAsyncFieldValidationValue,
  invalidateAllAsyncValidationCaches,
  DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS,
  type AsyncFieldRule,
} from "./validation/validationCache.js";

// Validation — async field runner
export {
  runAsyncValidation,
  collectAsyncFieldRules,
  type AsyncValidationOutcome,
} from "./validation/asyncFieldValidator.js";

// Validation — async form runner
export {
  runAsyncFormLevelValidation,
  type AsyncFormValidationOutcome,
} from "./validation/asyncFormValidator.js";

// Visibility
export { collectHiddenFieldPaths } from "./visibility/visibilityPolicy.js";
