/**
 * @module truth-compiler/invariant-compiler
 * @description Compiles declarative InvariantDefinition contracts into idempotent SQL
 * CHECK constraints for entity-scoped, row-local invariants.
 *
 * V1 scope:
 *   - Entity-scoped invariants with row-local conditions → ALTER TABLE … ADD CONSTRAINT CHECK.
 *   - Aggregate / cross-aggregate / global scopes → placeholder comments for Phase 3.7.
 *
 * Security (AD-11):
 *   - All identifiers pass through quoteIdentifier() — rejects non-ASCII / injection chars.
 *   - All literal values pass through renderLiteral() — prevents value injection.
 *
 * @layer db/truth-compiler
 */

import type { ConditionExpression, ConditionGroup, FieldCondition } from "@afenda/meta-types";

import type { NormalizedTruthModel, SqlSegment } from "./types.js";
import { quoteIdentifier, renderLiteral, toSnakeIdentifier } from "./sql-utils.js";

// ---------------------------------------------------------------------------
// ConditionExpression → SQL translation
// ---------------------------------------------------------------------------

/**
 * Translates a FieldCondition leaf node into a SQL expression fragment.
 * Switch is exhaustive — TypeScript will error if a new ConditionOperator is added
 * without updating this function.
 */
function compileFieldCondition(cond: FieldCondition): string {
  const col = quoteIdentifier(cond.field);
  const op = cond.operator;

  switch (op) {
    case "eq":
      return `${col} = ${renderLiteral(cond.value)}`;
    case "neq":
      return `${col} <> ${renderLiteral(cond.value)}`;
    case "gt":
      return `${col} > ${renderLiteral(cond.value)}`;
    case "gte":
      return `${col} >= ${renderLiteral(cond.value)}`;
    case "lt":
      return `${col} < ${renderLiteral(cond.value)}`;
    case "lte":
      return `${col} <= ${renderLiteral(cond.value)}`;
    case "in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return `${col} = ANY(${renderLiteral(arr)})`;
    }
    case "not_in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return `NOT (${col} = ANY(${renderLiteral(arr)}))`;
    }
    case "contains":
      return `${col} LIKE ${renderLiteral(`%${String(cond.value ?? "")}%`)}`;
    case "not_contains":
      return `${col} NOT LIKE ${renderLiteral(`%${String(cond.value ?? "")}%`)}`;
    case "is_empty":
      return `${col} IS NULL`;
    case "is_not_empty":
      return `${col} IS NOT NULL`;
    default: {
      // Exhaustiveness guard — will cause a compile error if ConditionOperator gains new members
      const _never: never = op;
      throw new Error(`truth-compiler: unknown ConditionOperator "${String(_never)}"`);
    }
  }
}

/**
 * Recursively translates a ConditionExpression (FieldCondition | ConditionGroup)
 * into a SQL expression string.
 */
function compileConditionExpression(expr: ConditionExpression): string {
  if ("logic" in expr) {
    // ConditionGroup — recurse into sub-expressions
    const group = expr as ConditionGroup;
    const parts = group.conditions.map(compileConditionExpression);
    const logicOp = group.logic === "and" ? " AND " : " OR ";
    return `(${parts.join(logicOp)})`;
  }
  // FieldCondition leaf
  return compileFieldCondition(expr as FieldCondition);
}

// ---------------------------------------------------------------------------
// Invariant → CHECK constraint SQL
// ---------------------------------------------------------------------------

/**
 * Compiles entity-scoped invariants into idempotent DROP + ADD CONSTRAINT segments.
 *
 * Non-entity-scoped invariants are stubbed as SQL comments pointing to Phase 3.7
 * cross-entity enforcement work.
 */
export function compileInvariants(model: NormalizedTruthModel): SqlSegment[] {
  const segments: SqlSegment[] = [];
  const ns = model.namespace ?? "public";

  for (const entity of model.entities) {
    const entityInvariants = model.invariants.filter((inv) => inv.targetModel === entity.name);

    for (const inv of entityInvariants) {
      // Non-entity scopes require trigger/saga enforcement — deferred to Phase 3.7.
      if (inv.scope !== "entity") {
        segments.push({
          model: entity.name,
          kind: "comment",
          sql:
            `-- TODO Phase 3.7: invariant "${inv.id}" (scope=${inv.scope}) ` +
            `requires trigger/saga enforcement — skipped in V1 compiler`,
        });
        continue;
      }

      let conditionSql: string;
      try {
        conditionSql = compileConditionExpression(inv.condition);
      } catch (err) {
        segments.push({
          model: entity.name,
          kind: "comment",
          sql: `-- ERROR compiling invariant "${inv.id}": ${String(err)}`,
        });
        continue;
      }

      const constraintName = `chk_inv_${toSnakeIdentifier(inv.id)}`;
      const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entity.table)}`;
      const quotedConstraint = quoteIdentifier(constraintName);

      segments.push({
        model: entity.name,
        kind: "check",
        sql: [
          `-- Invariant: ${inv.id} | severity=${inv.severity} | scope=${inv.scope}`,
          `ALTER TABLE ${tableRef}`,
          `  DROP CONSTRAINT IF EXISTS ${quotedConstraint};`,
          `ALTER TABLE ${tableRef}`,
          `  ADD CONSTRAINT ${quotedConstraint}`,
          `  CHECK (${conditionSql});`,
        ].join("\n"),
      });
    }
  }

  return segments;
}
