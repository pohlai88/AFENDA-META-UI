/**
 * Async Field Validator
 * =====================
 * Executes async validation against remote endpoints for individual fields.
 * Handles wildcard path collection for array items.
 *
 * Framework-agnostic — no React dependencies.
 */

import type { FieldConfig } from "../../index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "../../index.js";
import type { AsyncFieldRule } from "./validationCache.js";

export interface AsyncValidationOutcome {
  message: string | null;
  cacheable: boolean;
}

function isSkippableAsyncValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export async function runAsyncValidation(
  rule: AsyncFieldRule,
  path: string,
  cacheScope: string,
  value: unknown,
  signal?: AbortSignal
): Promise<AsyncValidationOutcome> {
  if (isSkippableAsyncValue(value)) {
    return { message: null, cacheable: false };
  }

  const method = rule.asyncValidate.method ?? "POST";
  const valueAsString = typeof value === "string" ? value : String(value);
  const requestShape = rule.asyncValidate.requestShape ?? "legacy";

  try {
    const requestUrl = method === "GET"
      ? appendQueryParam(
          appendQueryParam(
            appendQueryParam(rule.asyncValidate.url, "value", valueAsString),
            "scope",
            cacheScope
          ),
          "field",
          path
        )
      : rule.asyncValidate.url;

    const requestBody = method === "POST"
      ? requestShape === "contract-v1"
        ? JSON.stringify({
            scope: cacheScope,
            field: path,
            value,
          })
        : JSON.stringify({ value })
      : undefined;

    const response = await fetch(requestUrl, {
      method,
      signal,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        "X-Validation-Scope": cacheScope,
        "X-Validation-Field": path,
      },
      body: requestBody,
    });

    const data = await response
      .json()
      .catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;

    const valid = typeof data.valid === "boolean" ? data.valid : response.ok;
    const responseMessage = typeof data.message === "string" ? data.message : undefined;

    if (!response.ok && responseMessage) {
      return { message: responseMessage, cacheable: true };
    }

    if (!valid) {
      return {
        message: responseMessage || rule.asyncValidate.message || "Invalid value.",
        cacheable: true,
      };
    }

    return { message: null, cacheable: true };
  } catch {
    if (signal?.aborted) {
      return { message: null, cacheable: false };
    }

    return { message: "Validation service unavailable.", cacheable: false };
  }
}

export function collectAsyncFieldRules(fields: FieldConfig[], pathSegments: string[] = []): AsyncFieldRule[] {
  const rules: AsyncFieldRule[] = [];

  fields.forEach((field) => {
    if (isFieldGroupConfig(field)) {
      rules.push(...collectAsyncFieldRules(field.fields, [...pathSegments, field.name]));
      return;
    }

    if (isFieldArrayConfig(field)) {
      rules.push(...collectAsyncFieldRules(field.fields, [...pathSegments, field.name, "*"]));
      return;
    }

    if (field.asyncValidate) {
      rules.push({
        pathPattern: [...pathSegments, field.name].join("."),
        asyncValidate: field.asyncValidate,
      });
    }
  });

  return rules;
}
