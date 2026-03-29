/**
 * @module truth-compiler/invariant-compiler
 * @description Compiles declarative InvariantDefinition contracts into idempotent SQL
 * CHECK constraints for entity-scoped, row-local invariants.
 *
 * Scope:
 *   - Entity-scoped invariants → ALTER TABLE … ADD CONSTRAINT CHECK (row-local, strongly enforced).
 *   - Aggregate / cross-aggregate / global scopes → DEFERRABLE INITIALLY DEFERRED CONSTRAINT TRIGGER
 *     (statement-boundary enforcement; replace function body with aggregate query for multi-row checks).
 *
 * Security (AD-11):
 *   - All identifiers pass through quoteIdentifier() — rejects non-ASCII / injection chars.
 *   - All literal values pass through renderLiteral() — prevents value injection.
 *
 * @layer db/truth-compiler
 */

import type {
  ConditionExpression,
  ConditionGroup,
  FieldCondition,
} from "@afenda/meta-types/schema";
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
      let conditionSql: string;
      try {
        conditionSql = compileConditionExpression(inv.condition);
      } catch (err) {
        // Fail loudly — a silently-skipped constraint is a half-truth.
        throw new Error(
          `truth-compiler: failed to compile invariant "${inv.id}" (scope=${inv.scope}): ${String(err)}`
        );
      }

      const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entity.table)}`;

      if (inv.scope === "entity") {
        // Row-local CHECK constraint — strongly enforced by PostgreSQL per-row.
        const constraintName = `chk_inv_${toSnakeIdentifier(inv.id)}`;
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
      } else {
        // Aggregate / cross-aggregate / global scope.
        // Compiled as a DEFERRABLE INITIALLY DEFERRED CONSTRAINT TRIGGER so enforcement
        // runs at statement boundary rather than per-row. For multi-row aggregate checks,
        // replace the function body with an appropriate aggregate query.
        const functionName = `enforce_inv_${toSnakeIdentifier(inv.id)}`;
        const triggerName = `trg_inv_${toSnakeIdentifier(inv.id)}`;
        const quotedFunction = `${quoteIdentifier(ns)}.${quoteIdentifier(functionName)}`;
        const quotedTrigger = quoteIdentifier(triggerName);

        const message =
          `Invariant "${inv.id}" (scope=${inv.scope}) violated. ` + `Condition: ${conditionSql}`;
        const scopeNote =
          inv.scope === "global"
            ? `-- NOTE: global scope applies across all tenant boundaries.`
            : `-- NOTE: aggregate scope — for multi-row aggregate checks, replace the function body with your aggregate query.`;

        const functionSql = [
          `-- Invariant: ${inv.id} | severity=${inv.severity} | scope=${inv.scope}`,
          scopeNote,
          `CREATE OR REPLACE FUNCTION ${quotedFunction}()`,
          `RETURNS trigger`,
          `LANGUAGE plpgsql`,
          `AS $$`,
          `DECLARE`,
          `  _holds BOOLEAN;`,
          `BEGIN`,
          `  SELECT (${conditionSql}) INTO _holds`,
          `  FROM ${tableRef}`,
          `  WHERE id = NEW.id;`,
          `  IF NOT _holds THEN`,
          `    RAISE EXCEPTION USING`,
          `      MESSAGE = ${renderLiteral(message)},`,
          `      ERRCODE = 'P0001',`,
          `      HINT = ${renderLiteral(`Aggregate invariant ${inv.id} requires enforcement. Review and update the trigger function body with an appropriate aggregate query.`)};`,
          `  END IF;`,
          `  RETURN NEW;`,
          `END;`,
          `$$;`,
        ].join("\n");

        const triggerSql = [
          `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
          `CREATE CONSTRAINT TRIGGER ${quotedTrigger}`,
          `  AFTER INSERT OR UPDATE ON ${tableRef}`,
          `  DEFERRABLE INITIALLY DEFERRED`,
          `  FOR EACH ROW`,
          `  EXECUTE FUNCTION ${quotedFunction}();`,
        ].join("\n");

        segments.push({
          model: entity.name,
          kind: "function",
          nodeId: `invariant:${inv.id}`,
          sql: functionSql,
        });

        segments.push({
          model: entity.name,
          kind: "trigger",
          nodeId: `invariant:${inv.id}`,
          sql: triggerSql,
        });
      }
    }
  }

  return segments;
}
