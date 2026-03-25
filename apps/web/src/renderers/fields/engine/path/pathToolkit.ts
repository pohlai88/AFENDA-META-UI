/**
 * Path Toolkit
 * ============
 * Pure utility functions for dot-notation path traversal,
 * wildcard resolution, and validation-error placement.
 *
 * Framework-agnostic — no React or form-library dependencies.
 */

import type { DynamicFormValues } from "../types.js";

export function joinPath(basePath: string, segment: string): string {
  return basePath ? `${basePath}.${segment}` : segment;
}

export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) {
    return obj;
  }

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") {
      return undefined;
    }

    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function hasValidationErrorAtPath(errors: unknown, path: string): boolean {
  const errorValue = getValueByPath(errors, path);

  if (!errorValue) {
    return false;
  }

  if (typeof errorValue === "string") {
    return true;
  }

  if (typeof errorValue === "object") {
    const message = (errorValue as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return true;
    }
  }

  return false;
}

export function setValidationErrorAtPath(
  errors: Record<string, unknown>,
  path: string,
  message: string
): void {
  if (!path) {
    errors.root = {
      type: "asyncValidate",
      message,
    };
    return;
  }

  const segments = path.split(".");
  let cursor: Record<string, unknown> = errors;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;

    if (isLast) {
      cursor[segment] = {
        type: "asyncValidate",
        message,
      };
      return;
    }

    if (!cursor[segment] || typeof cursor[segment] !== "object") {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  });
}

export function matchPathPattern(pathPattern: string, actualPath: string): boolean {
  const patternSegments = pathPattern.split(".");
  const valueSegments = actualPath.split(".");

  if (patternSegments.length !== valueSegments.length) {
    return false;
  }

  return patternSegments.every(
    (segment, index) => segment === "*" || segment === valueSegments[index]
  );
}

export function resolveWildcardPaths(values: DynamicFormValues, pathPattern: string): string[] {
  const segments = pathPattern.split(".");
  const resolved: string[] = [];

  const walk = (current: unknown, depth: number, prefix: string[]) => {
    if (depth >= segments.length) {
      resolved.push(prefix.join("."));
      return;
    }

    const segment = segments[depth];

    if (segment === "*") {
      if (!Array.isArray(current)) {
        return;
      }

      current.forEach((item, index) => {
        walk(item, depth + 1, [...prefix, String(index)]);
      });

      return;
    }

    const next =
      current != null && typeof current === "object"
        ? (current as Record<string, unknown>)[segment]
        : undefined;

    walk(next, depth + 1, [...prefix, segment]);
  };

  walk(values, 0, []);

  if (resolved.length > 0) {
    return resolved;
  }

  if (!pathPattern.includes("*")) {
    return [pathPattern];
  }

  return [];
}
