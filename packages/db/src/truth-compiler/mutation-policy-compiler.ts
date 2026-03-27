/**
 * @module truth-compiler/mutation-policy-compiler
 * @description Compiles event-sourcing mutation policy contracts into guardrail SQL.
 * @layer db/truth-compiler
 */

import type { MutationOperation, MutationPolicyDefinition } from "@afenda/meta-types";

import type { NormalizedTruthModel, SqlSegment } from "./types.js";
import { quoteIdentifier, renderLiteral, toSnakeIdentifier } from "./sql-utils.js";

export interface MutationPolicyCompilerOptions {
  strict?: boolean;
}

const DEFAULT_OPERATIONS: MutationOperation[] = ["create", "update", "delete"];

function eventTypesForModel(model: NormalizedTruthModel, entityName: string): string[] {
  return model.events.filter((eventType) => eventType.startsWith(`${entityName}.`));
}

function operationsFor(policy: MutationPolicyDefinition): MutationOperation[] {
  return policy.directMutationOperations?.length ? policy.directMutationOperations : DEFAULT_OPERATIONS;
}

function renderTriggerOperations(operations: MutationOperation[]): string {
  return operations
    .map((operation) => operation.toUpperCase())
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }))
    .join(" OR ");
}

function validatePolicy(
  model: NormalizedTruthModel,
  policy: MutationPolicyDefinition,
  strict: boolean
): string[] {
  const availableEvents = new Set(model.events);
  const problems: string[] = [];

  for (const entityName of policy.appliesTo) {
    if (policy.mutationPolicy === "direct") {
      continue;
    }

    const modelEvents = eventTypesForModel(model, entityName);
    if (modelEvents.length === 0) {
      problems.push(
        `truth-compiler: mutation policy "${policy.id}" requires event contracts for model "${entityName}"`
      );
    }
  }

  for (const requiredEvent of policy.requiredEvents ?? []) {
    if (!availableEvents.has(requiredEvent)) {
      problems.push(
        `truth-compiler: mutation policy "${policy.id}" references missing required event "${requiredEvent}"`
      );
    }
  }

  if (strict && problems.length > 0) {
    throw new Error(problems.join("; "));
  }

  return problems;
}

function compileEventOnlyGuard(
  entityName: string,
  entityTable: string,
  ns: string,
  policy: MutationPolicyDefinition
): SqlSegment[] {
  const functionName = `enforce_event_only_${toSnakeIdentifier(entityName)}_writes`;
  const triggerName = `trg_enforce_event_only_${toSnakeIdentifier(entityName)}_writes`;
  const quotedFunction = `${quoteIdentifier(ns)}.${quoteIdentifier(functionName)}`;
  const quotedTrigger = quoteIdentifier(triggerName);
  const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entityTable)}`;
  const triggerOperations = renderTriggerOperations(operationsFor(policy));
  const message =
    policy.description ??
    `Direct mutation blocked for ${entityName}; use the truth runtime/event pipeline (${policy.id}).`;

  const functionSql = [
    `-- Mutation policy: ${policy.id} | mode=event-only | model=${entityName}`,
    `CREATE OR REPLACE FUNCTION ${quotedFunction}()`,
    `RETURNS trigger`,
    `LANGUAGE plpgsql`,
    `AS $$`,
    `BEGIN`,
    `  RAISE EXCEPTION USING`,
    `    MESSAGE = ${renderLiteral(message)},`,
    `    ERRCODE = 'P0001',`,
    `    HINT = ${renderLiteral("Route writes through the append-only command/event gateway for this bounded context.")};`,
    `END;`,
    `$$;`,
  ].join("\n");

  const triggerSql = [
    `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
    `CREATE TRIGGER ${quotedTrigger}`,
    `  BEFORE ${triggerOperations} ON ${tableRef}`,
    `  FOR EACH ROW`,
    `  EXECUTE FUNCTION ${quotedFunction}();`,
  ].join("\n");

  return [
    {
      model: entityName,
      kind: "function",
      nodeId: `mutation-policy:${policy.id}`,
      sql: functionSql,
    },
    {
      model: entityName,
      kind: "trigger",
      nodeId: `mutation-policy:${policy.id}`,
      sql: triggerSql,
    },
  ];
}

export function compileMutationPolicies(
  model: NormalizedTruthModel,
  options: MutationPolicyCompilerOptions = {}
): SqlSegment[] {
  const strict = options.strict ?? false;
  const ns = model.namespace ?? "public";
  const entityByName = new Map(model.entities.map((entity) => [entity.name, entity]));
  const segments: SqlSegment[] = [];

  for (const policy of model.mutationPolicies) {
    const nodeId = `mutation-policy:${policy.id}`;
    const problems = validatePolicy(model, policy, strict);

    for (const problem of problems) {
      segments.push({
        model: policy.appliesTo[0] ?? "_global",
        kind: "comment",
        nodeId,
        sql: `-- SKIPPED: ${problem}`,
      });
    }

    segments.push({
      model: policy.appliesTo[0] ?? "_global",
      kind: "comment",
      nodeId,
      sql: [
        `-- Mutation policy: ${policy.id}`,
        `--   mode=${policy.mutationPolicy}`,
        `--   appliesTo=${policy.appliesTo.join(", ")}`,
        `--   requiredEvents=${(policy.requiredEvents ?? []).join(", ") || "<derived>"}`,
      ].join("\n"),
    });

    if (policy.mutationPolicy !== "event-only") {
      continue;
    }

    for (const entityName of policy.appliesTo) {
      const entity = entityByName.get(entityName);
      if (!entity) {
        const message =
          `truth-compiler: mutation policy "${policy.id}" references unknown model "${entityName}"`;
        if (strict) {
          throw new Error(message);
        }

        segments.push({
          model: entityName,
          kind: "comment",
          nodeId,
          sql: `-- SKIPPED: ${message}`,
        });
        continue;
      }

      segments.push(...compileEventOnlyGuard(entityName, entity.table, ns, policy));
    }
  }

  return segments;
}