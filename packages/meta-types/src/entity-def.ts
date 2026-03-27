/**
 * @module entity-def
 * @description Compiler-facing entity and field definitions consumed by the schema compiler pipeline.
 *
 * These types represent authored truth: the richer structural definition of an entity
 * beyond the lightweight ID manifest in TruthModel. The schema compiler resolves these
 * to generate DB artifacts (Drizzle schema, SQL constraints, migration files).
 *
 * Deliberately separate from `schema.ts` FieldType — those are form/rendering layer types.
 * ColumnType here is the DB-column-level primitive that maps 1:1 to Drizzle column builders.
 *
 * @layer truth-contract
 * @consumers db (schema compiler)
 */

// ---------------------------------------------------------------------------
// Column-Level Types
// ---------------------------------------------------------------------------

/** Supported DB column types for compiler output. */
export type ColumnType =
  | "uuid"
  | "text"
  | "numeric"
  | "integer"
  | "boolean"
  | "timestamp"
  | "jsonb";

/** A foreign key reference to another table/column. */
export interface ColumnRef {
  /** Physical table name of the referenced table. */
  table: string;
  /** Column name on the referenced table (typically "id"). */
  column: string;
}

/** Compiler-level field definition — maps to a single DB column. */
export interface FieldDef {
  type: ColumnType;
  /** Whether the column allows NULL. Defaults to false (NOT NULL emitted by default). */
  nullable?: boolean;
  /** Whether this column is the primary key. */
  primary?: boolean;
  /** Whether a UNIQUE constraint is needed. */
  unique?: boolean;
  /**
   * SQL default expression as a string, e.g. "now()", "gen_random_uuid()", "false".
   * The compiler emits this verbatim — must be a valid SQL expression for the target DB.
   */
  defaultSql?: string;
  /** Foreign key reference — resolved by the compiler into a DB relation or Drizzle `.references()`. */
  references?: ColumnRef;
}

// ---------------------------------------------------------------------------
// Entity-Level Types
// ---------------------------------------------------------------------------

/** Compiler-facing full entity definition — the input to schema/constraint generation. */
export interface EntityDef {
  /** Logical entity name — matches the model identifier used in TruthModel and invariants. */
  name: string;
  /** Physical table name emitted in generated Drizzle schema and SQL artifacts. */
  table: string;
  /** All column definitions keyed by field/column name. */
  fields: Record<string, FieldDef>;
}

/**
 * A complete entity definition registry for a bounded context.
 * Provided as the input to the schema compiler stage.
 */
export interface EntityDefRegistry {
  /** All entity definitions for this bounded context. */
  entities: EntityDef[];
  /** Optional namespace prefix for generated constraint/trigger names to avoid collisions. */
  namespace?: string;
}
