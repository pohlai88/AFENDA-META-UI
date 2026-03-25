/**
 * Validation Cache
 * ================
 * Cache instances, key builders, and invalidation functions
 * for async field and form validations.
 *
 * Framework-agnostic.
 */

import { createAsyncValidationCache } from "../../asyncValidationCache.js";
import type { AsyncFieldValidationConfig, AsyncFormValidationRule } from "../../index.js";
import type { DynamicFormValues } from "../types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_ASYNC_VALIDATION_CACHE_MAX_ENTRIES = 200;

const ASYNC_FIELD_VALIDATION_CACHE_STORAGE_KEY = "afenda:async-validation-cache:field";
const ASYNC_FORM_VALIDATION_CACHE_STORAGE_KEY = "afenda:async-validation-cache:form";

// ---------------------------------------------------------------------------
// Cache Instances
// ---------------------------------------------------------------------------

export const asyncFieldValidationCache = createAsyncValidationCache<string | null>({
  storageKey: ASYNC_FIELD_VALIDATION_CACHE_STORAGE_KEY,
  defaultTtlMs: DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS,
  maxEntries: DEFAULT_ASYNC_VALIDATION_CACHE_MAX_ENTRIES,
});

export const asyncFormValidationCache = createAsyncValidationCache<{ message: string | null; path: string }>({
  storageKey: ASYNC_FORM_VALIDATION_CACHE_STORAGE_KEY,
  defaultTtlMs: DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS,
  maxEntries: DEFAULT_ASYNC_VALIDATION_CACHE_MAX_ENTRIES,
});

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface AsyncFieldRule {
  pathPattern: string;
  asyncValidate: AsyncFieldValidationConfig;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function stableSerialize(value: unknown): string {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`).join(",")}}`;
  }

  return String(value);
}

// ---------------------------------------------------------------------------
// Cache Key Builders
// ---------------------------------------------------------------------------

export function buildAsyncFieldCacheKey(
  cacheScope: string,
  path: string,
  rule: AsyncFieldRule,
  value: unknown
): string {
  const method = rule.asyncValidate.method ?? "POST";
  return `${cacheScope}::${path}::${method}::${rule.asyncValidate.url}::${stableSerialize(value)}`;
}

export function buildAsyncFormCacheKey(
  cacheScope: string,
  rule: AsyncFormValidationRule,
  values: DynamicFormValues
): string {
  const method = rule.asyncValidate.method ?? "POST";
  return [
    cacheScope,
    method,
    rule.asyncValidate.url,
    rule.startField ?? "",
    rule.endField ?? "",
    rule.targetField ?? "",
    stableSerialize(values),
  ].join("::");
}

// ---------------------------------------------------------------------------
// Invalidation Functions
// ---------------------------------------------------------------------------

function getScopePrefix(scope: string): string {
  return `${scope}::`;
}

export function invalidateAsyncValidationCacheByScope(scope: string): { fieldRemoved: number; formRemoved: number } {
  const scopePrefix = getScopePrefix(scope);

  return {
    fieldRemoved: asyncFieldValidationCache.deleteWhere((key) => key.startsWith(scopePrefix)),
    formRemoved: asyncFormValidationCache.deleteWhere((key) => key.startsWith(scopePrefix)),
  };
}

export function invalidateAsyncFieldValidationValue(params: {
  scope: string;
  fieldPath: string;
  value?: unknown;
}) {
  const fieldPrefix = `${getScopePrefix(params.scope)}${params.fieldPath}::`;

  if (params.value === undefined) {
    return asyncFieldValidationCache.deleteWhere((key) => key.startsWith(fieldPrefix));
  }

  const serializedValue = stableSerialize(params.value);
  return asyncFieldValidationCache.deleteWhere(
    (key) => key.startsWith(fieldPrefix) && key.endsWith(`::${serializedValue}`)
  );
}

export function invalidateAllAsyncValidationCaches() {
  asyncFieldValidationCache.clear();
  asyncFormValidationCache.clear();
}
