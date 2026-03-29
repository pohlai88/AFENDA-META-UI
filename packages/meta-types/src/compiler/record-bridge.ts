/**
 * @module compiler/record-bridge
 * @description Utility types bridging meta-types interfaces to Drizzle row shapes.
 * @layer truth-contract
 * @consumers db, api
 */

/**
 * Maps a meta-types interface to a Drizzle-compatible row shape.
 * Converts Date fields to `string | Date` to accommodate both DB and serialized forms.
 *
 * @example
 * type TenantRow = RecordOf<TenantDefinition>;
 */
export type RecordOf<T> = {
  [K in keyof T]: T[K] extends Date
    ? string | Date
    : T[K] extends Date | undefined
      ? string | Date | undefined
      : T[K];
};

/**
 * Adds standard DB columns to a record shape.
 *
 * @example
 * type TenantDbRow = RowShape<TenantDefinition>;
 * // { id: string; created_at: string | Date; updated_at: string | Date; } & RecordOf<TenantDefinition>
 */
export type RowShape<T> = RecordOf<T> & {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
};
