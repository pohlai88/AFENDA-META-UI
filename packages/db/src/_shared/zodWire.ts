import { z } from "zod/v4";

export function nullableOptional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date string in YYYY-MM-DD format");

export const dateOptionalSchema = dateStringSchema.optional();

export const dateNullableOptionalSchema = dateStringSchema.nullable().optional();

export const dateCoerceSchema = z.coerce.date();

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isoDateWireString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  const stringValue = typeof value === "string" ? value : String(value);
  return ISO_DATE_ONLY.test(stringValue) ? stringValue : null;
}

export function isParseableTimestamptzString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export const timestamptzStringSchema = z
  .string()
  .min(1)
  .refine(isParseableTimestamptzString, "expected a parseable ISO-8601 datetime (timestamptz)");

export const timestamptzOptionalSchema = timestamptzStringSchema.optional();

export const timestamptzNullableOptionalSchema = timestamptzStringSchema.nullable().optional();

export const timestamptzWireSchema = z.union([timestamptzStringSchema, z.date()]);

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