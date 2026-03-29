/**
 * @module compiler/entity-def
 * @description Compiler-facing entity and field definitions consumed by the schema compiler pipeline.
 * @layer truth-contract
 * @consumers db (schema compiler)
 */

export type ColumnType =
  | "uuid"
  | "text"
  | "numeric"
  | "integer"
  | "boolean"
  | "timestamp"
  | "jsonb";

export interface ColumnRef {
  table: string;
  column: string;
}

export interface FieldDef {
  type: ColumnType;
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  defaultSql?: string;
  references?: ColumnRef;
}

export interface EntityDef {
  name: string;
  table: string;
  fields: Record<string, FieldDef>;
}

export interface EntityDefRegistry {
  entities: EntityDef[];
  namespace?: string;
}
