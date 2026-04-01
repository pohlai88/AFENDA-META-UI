/**
 * Shared dynamic SQL fragments for readonly access and reports.
 * Prefer matching generated `*.access.ts` patterns before introducing new shapes.
 */

import { and, type SQL } from "drizzle-orm";

/** Combine optional predicates into a single AND; returns undefined if empty. */
export function combineAnd(conditions: (SQL | undefined)[]): SQL | undefined {
  const parts = conditions.filter((c): c is SQL => c !== undefined);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(...parts);
}
