/**
 * Async Form Validator
 * ====================
 * Executes async validation against remote endpoints for form-level rules.
 *
 * Framework-agnostic — no React dependencies.
 */

import type { AsyncFormValidationRule } from "../../index.js";
import type { DynamicFormValues } from "../types.js";

export interface AsyncFormValidationOutcome {
  message: string | null;
  path: string;
  cacheable: boolean;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export async function runAsyncFormLevelValidation(
  rule: AsyncFormValidationRule,
  cacheScope: string,
  values: DynamicFormValues,
  signal?: AbortSignal
): Promise<AsyncFormValidationOutcome> {
  const method = rule.asyncValidate.method ?? "POST";
  const requestShape = rule.asyncValidate.requestShape ?? "legacy";

  try {
    const requestUrl =
      method === "GET"
        ? appendQueryParam(rule.asyncValidate.url, "scope", cacheScope)
        : rule.asyncValidate.url;

    const requestBody =
      method === "POST"
        ? requestShape === "contract-v1"
          ? JSON.stringify({
              scope: cacheScope,
              values,
              startField: rule.startField,
              endField: rule.endField,
              targetField: rule.targetField,
            })
          : JSON.stringify(values)
        : undefined;

    const response = await fetch(requestUrl, {
      method,
      signal,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        "X-Validation-Scope": cacheScope,
      },
      body: requestBody,
    });

    const data = (await response.json().catch(() => ({}) as Record<string, unknown>)) as Record<
      string,
      unknown
    >;

    const valid = typeof data.valid === "boolean" ? data.valid : response.ok;
    const responseMessage = typeof data.message === "string" ? data.message : undefined;
    const issuePath =
      typeof data.path === "string"
        ? data.path
        : (rule.targetField ?? rule.endField ?? rule.startField ?? "");

    if (!response.ok && responseMessage) {
      return { message: responseMessage, path: issuePath, cacheable: true };
    }

    if (!valid) {
      return {
        message: responseMessage || rule.asyncValidate.message || "Invalid combination.",
        path: issuePath,
        cacheable: true,
      };
    }

    return { message: null, path: issuePath, cacheable: true };
  } catch {
    if (signal?.aborted) {
      return { message: null, path: "", cacheable: false };
    }

    return {
      message: "Validation service unavailable.",
      path: rule.targetField ?? rule.endField ?? rule.startField ?? "",
      cacheable: false,
    };
  }
}
