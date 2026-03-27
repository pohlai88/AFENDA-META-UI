/**
 * @module truth-compiler/transition-compiler
 * @description Compiles StateMachineDefinition contracts into deterministic
 * BEFORE UPDATE trigger functions that enforce the entity lifecycle transition
 * graph at the database level.
 *
 * V1 scope:
 *   - Single state field per entity.
 *   - Flat transition graph (no guard SQL — guards are resolved at API layer).
 *   - One PL/pgSQL function + one trigger per entity state machine.
 *
 * Generated pattern mirrors the existing hand-authored triggers in
 * packages/db/src/triggers/status-transitions.sql (see AD-10).
 *
 * Security (AD-11): all identifiers pass through quoteIdentifier().
 *
 * @layer db/truth-compiler
 */

import type { StateMachineDefinition, Transition } from "@afenda/meta-types";

import type { NormalizedTruthModel, SqlSegment } from "./types.js";
import { quoteIdentifier, toSnakeIdentifier } from "./sql-utils.js";

// ---------------------------------------------------------------------------
// Transition graph helpers
// ---------------------------------------------------------------------------

/**
 * Builds a map of from-state → allowed to-states from the transition list.
 * All declared states are represented (terminal states map to empty arrays).
 */
function buildTransitionMap(transitions: Transition[], allStates: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const state of allStates) {
    map.set(state, []);
  }
  for (const t of transitions) {
    const existing = map.get(t.from) ?? [];
    existing.push(t.to);
    map.set(t.from, existing);
  }
  return map;
}

/**
 * Renders the PL/pgSQL CASE block that resolves allowed next states from the
 * current state for the transition enforcement guard.
 */
function renderCaseBlock(stateField: string, transitionMap: Map<string, string[]>): string {
  const quotedField = quoteIdentifier(stateField);
  const cases: string[] = [];

  for (const [fromState, toStates] of transitionMap) {
    const escapedFrom = fromState.replace(/'/g, "''");
    const arrayLiteral =
      toStates.length > 0
        ? `ARRAY[${toStates.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ")}]`
        : `ARRAY[]::text[]`;
    cases.push(`    WHEN '${escapedFrom}' THEN allowed := ${arrayLiteral};`);
  }

  return [
    `  CASE OLD.${quotedField}`,
    ...cases,
    `    ELSE allowed := ARRAY[]::text[];`,
    `  END CASE;`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Single state machine → FUNCTION + TRIGGER
// ---------------------------------------------------------------------------

function compileSingleStateMachine(
  sm: StateMachineDefinition,
  entityTable: string,
  ns: string
): SqlSegment[] {
  const modelSlug = toSnakeIdentifier(sm.model);
  const fieldSlug = toSnakeIdentifier(sm.stateField);
  const fnName = `enforce_${modelSlug}_${fieldSlug}_transition`;

  const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entityTable)}`;
  const quotedFn = `${quoteIdentifier(ns)}.${quoteIdentifier(fnName)}`;
  const quotedTrigger = quoteIdentifier(fnName); // trigger name === function name by convention
  const quotedField = quoteIdentifier(sm.stateField);

  const transitionMap = buildTransitionMap(sm.transitions, sm.states);
  const caseBlock = renderCaseBlock(sm.stateField, transitionMap);

  const functionSql = [
    `-- State machine: ${sm.model} | field: ${sm.stateField}`,
    `CREATE OR REPLACE FUNCTION ${quotedFn}()`,
    `RETURNS trigger`,
    `LANGUAGE plpgsql`,
    `AS $$`,
    `DECLARE`,
    `  allowed text[];`,
    `BEGIN`,
    `  -- No-op when the state field does not actually change`,
    `  IF OLD.${quotedField} IS NOT DISTINCT FROM NEW.${quotedField} THEN`,
    `    RETURN NEW;`,
    `  END IF;`,
    ``,
    caseBlock,
    ``,
    `  IF NOT (NEW.${quotedField} = ANY(allowed)) THEN`,
    `    RAISE EXCEPTION`,
    `      'invalid_transition [${sm.model}]: % -> %',`,
    `      OLD.${quotedField}, NEW.${quotedField}`,
    `      USING ERRCODE = 'check_violation';`,
    `  END IF;`,
    ``,
    `  RETURN NEW;`,
    `END;`,
    `$$;`,
  ].join("\n");

  const triggerSql = [
    `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
    `CREATE TRIGGER ${quotedTrigger}`,
    `  BEFORE UPDATE ON ${tableRef}`,
    `  FOR EACH ROW EXECUTE FUNCTION ${quotedFn}();`,
  ].join("\n");

  return [
    { model: sm.model, kind: "function", sql: functionSql },
    { model: sm.model, kind: "trigger", sql: triggerSql },
  ];
}

// ---------------------------------------------------------------------------
// Public compiler entry
// ---------------------------------------------------------------------------

/**
 * Compiles all state machine definitions in the normalized model into
 * FUNCTION + TRIGGER SQL segments.
 *
 * Entities without a corresponding EntityDef emit a warning comment and are skipped.
 */
export function compileTransitions(model: NormalizedTruthModel): SqlSegment[] {
  const segments: SqlSegment[] = [];
  const ns = model.namespace ?? "public";
  const entityByName = new Map(model.entities.map((e) => [e.name, e]));

  for (const sm of model.stateMachines) {
    const entity = entityByName.get(sm.model);
    if (!entity) {
      segments.push({
        model: sm.model,
        kind: "comment",
        sql:
          `-- WARNING: no EntityDef found for state machine model "${sm.model}" ` +
          `— skipping transition compiler output`,
      });
      continue;
    }

    try {
      segments.push(...compileSingleStateMachine(sm, entity.table, ns));
    } catch (err) {
      segments.push({
        model: sm.model,
        kind: "comment",
        sql: `-- ERROR compiling state machine "${sm.model}": ${String(err)}`,
      });
    }
  }

  return segments;
}
