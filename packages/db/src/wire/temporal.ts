// ============================================================================
// TEMPORAL WIRE CONTRACT (Zod v4)
// ----------------------------------------------------------------------------
// PURPOSE:
// Single source of truth for temporal validation at API / JSON boundaries.
//
// DESIGN PRINCIPLES:
// - Wire (JSON/API) = STRING ONLY (ISO formats)
// - Runtime = explicit conversion (Date only where needed)
// - Strict ISO for instants (offset required)
// - Empty string normalization via emptyToNull + nullable wire schemas
// - Metadata for OpenAPI / documentation
//
// KINDS:
// - DateOnly  -> YYYY-MM-DD (Postgres: date)
// - Instant   -> ISO datetime WITH timezone (Postgres: timestamptz)
//
// DO NOT outside this module:
// - Date.parse() in refinements
// - ad-hoc YYYY-MM-DD regex on z.string()
// - z.coerce.date() in JSON/API schemas (use *Wire; coerce only at runtime)
//
// ============================================================================

import { z } from "zod/v4";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? null : v), schema);
}

export function nullableOptional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}

// ----------------------------------------------------------------------------
// DATE ONLY (YYYY-MM-DD)
// ----------------------------------------------------------------------------

export const dateOnlyWire = z.iso.date().meta({
  description: "ISO calendar date (YYYY-MM-DD)",
  example: "2026-03-31",
});

export const dateOnlyWireOptional = dateOnlyWire.optional();
export const dateOnlyWireNullable = dateOnlyWire.nullable();
export const dateOnlyWireNullableOptional = nullableOptional(dateOnlyWire);

export const dateOnlyWireNormalized = emptyToNull(dateOnlyWireNullable);

/** Wire date-only string validated then converted to UTC-midnight `Date` (API → services). */
export const dateOnlyWireAsDate = dateOnlyWire.transform((s) => toRuntimeDateOnly(s));

export const dateOnlyWireAsDateOptional = dateOnlyWireAsDate.optional();
export const dateOnlyWireAsDateNullable = dateOnlyWireAsDate.nullable();
export const dateOnlyWireAsDateNullableOptional = nullableOptional(dateOnlyWireAsDate);

// ----------------------------------------------------------------------------
// INSTANT (ISO datetime WITH timezone)
// ----------------------------------------------------------------------------

export const instantWire = z.iso.datetime({ offset: true }).meta({
  description: "ISO datetime with timezone (RFC 3339)",
  example: "2026-03-31T10:15:30Z",
});

export const instantWireOptional = instantWire.optional();
export const instantWireNullable = instantWire.nullable();
export const instantWireNullableOptional = nullableOptional(instantWire);

export const instantWireNormalized = emptyToNull(instantWireNullable);

/** Wire instant string validated then converted to `Date` (API → services). */
export const instantWireAsDate = instantWire.transform((s) => toRuntimeInstant(s));

export const instantWireAsDateOptional = instantWireAsDate.optional();
export const instantWireAsDateNullable = instantWireAsDate.nullable();
export const instantWireAsDateNullableOptional = nullableOptional(instantWireAsDate);

// ----------------------------------------------------------------------------
// RUNTIME (explicit conversion only)
// ----------------------------------------------------------------------------

/** For controlled input that must become a Date (not JSON wire). */
export const instantRuntime = z.coerce.date();

/** For controlled input that must become a Date (not JSON wire). */
export const dateOnlyRuntime = z.coerce.date();

// ----------------------------------------------------------------------------
// Transformers (wire <-> runtime)
// ----------------------------------------------------------------------------

export function toRuntimeInstant(value: string): Date {
  return new Date(value);
}

export function toWireInstant(date: Date): string {
  return date.toISOString();
}

export function toRuntimeDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toWireDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Comparison helpers
// ----------------------------------------------------------------------------

/** Lexicographic compare on YYYY-MM-DD (do not use `new Date` for ordering). */
export function compareDateOnly(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Compare instants (ISO strings with offset) by UTC epoch ms. */
export function compareInstant(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

// ----------------------------------------------------------------------------
// Legacy (explicitly marked; Date.parse / regex confined here)
// ----------------------------------------------------------------------------

/**
 * @deprecated Prefer `instantWire`. Accepts any `Date.parse`-compatible string.
 */
export const instantLegacy = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Invalid datetime (legacy parser)",
});

/**
 * @deprecated Prefer `dateOnlyWire`.
 */
export const dateOnlyLegacy = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ----------------------------------------------------------------------------
// @deprecated — backward compatibility for earlier @afenda/db/wire consumers
// ----------------------------------------------------------------------------

/** @deprecated Use `dateOnlyWire` */
export const dateStringSchema = dateOnlyWire;

/** @deprecated Use `dateOnlyWireOptional` */
export const dateOptionalSchema = dateOnlyWireOptional;

/** @deprecated Use `dateOnlyWireNullableOptional` */
export const dateNullableOptionalSchema = dateOnlyWireNullableOptional;

/** @deprecated Use `dateOnlyRuntime` or `instantRuntime` at runtime boundaries */
export const dateCoerceSchema = z.coerce.date();

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isoDateWireString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  const stringValue = typeof value === "string" ? value : String(value);
  return ISO_DATE_ONLY.test(stringValue) ? stringValue : null;
}

/** @deprecated Prefer `instantLegacy` or validate with `instantWire` */
export function isParseableTimestamptzString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

/** @deprecated Use `instantLegacy` */
export const timestamptzStringSchema = instantLegacy;

/** @deprecated Use `instantLegacy.optional()` */
export const timestamptzOptionalSchema = instantLegacy.optional();

/** @deprecated Use `instantLegacy.nullable().optional()` */
export const timestamptzNullableOptionalSchema = instantLegacy.nullable().optional();

/** @deprecated Use `z.union([instantWire, z.date()])` only at documented boundaries */
export const timestamptzWireSchema = z.union([instantLegacy, z.date()]);

/** @deprecated */
export const timestamptzWireNullableOptionalSchema = timestamptzWireSchema.nullable().optional();

export function dateValue(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function parseUnknownToEpochMs(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }

  return null;
}
