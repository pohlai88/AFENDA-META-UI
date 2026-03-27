/**
 * @module truth-compiler/cross-invariant-compiler
 * @description Compiles cross-entity invariant contracts with strict-mode validation.
 *
 * Current scope:
 * - Supports `executionKind="check"` only when exactly one model is involved.
 * - Supports `executionKind="trigger" | "deferred-trigger"` by compiling row-level
 *   guard functions for single-model invariants and join-backed `EXISTS` checks for
 *   multi-model invariants with explicit `joinPaths`.
 * - Strict mode rejects ambiguous/uncompilable check-style cross invariants.
 *
 * @layer db/truth-compiler
 */

import type {
  ConditionExpression,
  ConditionGroup,
  CrossInvariantDefinition,
  CrossInvariantJoinDefinition,
  EntityDef,
  FieldCondition,
} from "@afenda/meta-types";

import type { NormalizedTruthModel, SqlSegment } from "./types.js";
import { quoteIdentifier, renderLiteral, toSnakeIdentifier } from "./sql-utils.js";

export interface CrossInvariantCompilerOptions {
  strict?: boolean;
}

interface ParsedFieldReference {
  model?: string;
  field: string;
}

interface ConditionCompileContext {
  invariantId: string;
  strict: boolean;
  rowRef?: "OLD" | "NEW";
  modelAliases?: Map<string, string>;
}

interface JoinTraversalStep {
  model: string;
  parentModel?: string;
  join?: CrossInvariantJoinDefinition;
}

function parseFieldReference(fieldRef: string): ParsedFieldReference {
  const parts = fieldRef.split(".");

  if (parts.length === 1) {
    return { field: parts[0] };
  }

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `truth-compiler: invalid cross-invariant field reference "${fieldRef}"; use "field" or "model.field"`
    );
  }

  return { model: parts[0], field: parts[1] };
}

function resolveColumnReference(fieldRef: string, context: ConditionCompileContext): string {
  const parsed = parseFieldReference(fieldRef);

  if (context.rowRef) {
    if (parsed.model) {
      throw new Error(
        `truth-compiler: cross invariant "${context.invariantId}" cannot use qualified field ` +
          `reference "${fieldRef}" in row-local evaluation`
      );
    }

    return `${context.rowRef}.${quoteIdentifier(parsed.field)}`;
  }

  if (!context.modelAliases || context.modelAliases.size === 0) {
    if (parsed.model) {
      throw new Error(
        `truth-compiler: cross invariant "${context.invariantId}" cannot use qualified field ` +
          `reference "${fieldRef}" without trigger join context`
      );
    }

    return quoteIdentifier(parsed.field);
  }

  if (parsed.model) {
    const alias = context.modelAliases.get(parsed.model);

    if (!alias) {
      throw new Error(
        `truth-compiler: cross invariant "${context.invariantId}" references unknown model ` +
          `"${parsed.model}" in condition`
      );
    }

    return `${quoteIdentifier(alias)}.${quoteIdentifier(parsed.field)}`;
  }

  if (context.modelAliases.size !== 1) {
    throw new Error(
      `truth-compiler: cross invariant "${context.invariantId}" must qualify field ` +
        `"${fieldRef}" with a model name for multi-model trigger evaluation`
    );
  }

  const onlyAlias = Array.from(context.modelAliases.values())[0];
  return `${quoteIdentifier(onlyAlias)}.${quoteIdentifier(parsed.field)}`;
}

function compileFieldCondition(cond: FieldCondition, context: ConditionCompileContext): string {
  const col = resolveColumnReference(cond.field, context);

  switch (cond.operator) {
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
      const _never: never = cond.operator;
      throw new Error(`truth-compiler: unknown ConditionOperator "${String(_never)}"`);
    }
  }
}

function compileConditionExpression(
  expr: ConditionExpression,
  context: ConditionCompileContext
): string {
  if ("logic" in expr) {
    const group = expr as ConditionGroup;
    const parts = group.conditions.map((condition) =>
      compileConditionExpression(condition, context)
    );
    const logic = group.logic === "and" ? " AND " : " OR ";
    return `(${parts.join(logic)})`;
  }

  return compileFieldCondition(expr as FieldCondition, context);
}

function collectFieldReferences(expr: ConditionExpression): ParsedFieldReference[] {
  if ("logic" in expr) {
    return (expr as ConditionGroup).conditions.flatMap((condition) =>
      collectFieldReferences(condition)
    );
  }

  return [parseFieldReference((expr as FieldCondition).field)];
}

function assertFieldExists(
  entity: EntityDef | undefined,
  modelName: string,
  fieldName: string,
  invariantId: string
): void {
  if (!entity || !(fieldName in entity.fields)) {
    throw new Error(
      `truth-compiler: cross invariant "${invariantId}" references unknown field ` +
        `"${modelName}.${fieldName}"`
    );
  }
}

function buildJoinTraversal(
  crossInvariant: CrossInvariantDefinition,
  targetModel: string,
  entityByName: Map<string, EntityDef>
): JoinTraversalStep[] {
  const joinPaths = crossInvariant.joinPaths ?? [];

  if (crossInvariant.involvedModels.length <= 1) {
    return [{ model: targetModel }];
  }

  if (joinPaths.length === 0) {
    throw new Error(
      `truth-compiler: cross invariant "${crossInvariant.id}" requires joinPaths ` +
        `for multi-model trigger evaluation`
    );
  }

  const involvedModels = new Set(crossInvariant.involvedModels);
  const adjacency = new Map<
    string,
    Array<{ neighbor: string; join: CrossInvariantJoinDefinition }>
  >();

  for (const join of joinPaths) {
    if (!involvedModels.has(join.fromModel) || !involvedModels.has(join.toModel)) {
      throw new Error(
        `truth-compiler: cross invariant "${crossInvariant.id}" defines join ` +
          `"${join.fromModel}.${join.fromField} -> ${join.toModel}.${join.toField}" outside involvedModels`
      );
    }

    assertFieldExists(
      entityByName.get(join.fromModel),
      join.fromModel,
      join.fromField,
      crossInvariant.id
    );
    assertFieldExists(
      entityByName.get(join.toModel),
      join.toModel,
      join.toField,
      crossInvariant.id
    );

    const fromList = adjacency.get(join.fromModel) ?? [];
    fromList.push({ neighbor: join.toModel, join });
    adjacency.set(join.fromModel, fromList);

    const toList = adjacency.get(join.toModel) ?? [];
    toList.push({ neighbor: join.fromModel, join });
    adjacency.set(join.toModel, toList);
  }

  const queue = [targetModel];
  const visited = new Set<string>([targetModel]);
  const traversal: JoinTraversalStep[] = [{ model: targetModel }];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const neighbors = (adjacency.get(current) ?? [])
      .slice()
      .sort((left, right) => left.neighbor.localeCompare(right.neighbor));

    for (const neighborInfo of neighbors) {
      if (visited.has(neighborInfo.neighbor)) {
        continue;
      }

      visited.add(neighborInfo.neighbor);
      queue.push(neighborInfo.neighbor);
      traversal.push({
        model: neighborInfo.neighbor,
        parentModel: current,
        join: neighborInfo.join,
      });
    }
  }

  for (const modelName of crossInvariant.involvedModels) {
    if (!visited.has(modelName)) {
      throw new Error(
        `truth-compiler: cross invariant "${crossInvariant.id}" cannot reach model ` +
          `"${modelName}" from trigger root "${targetModel}" using joinPaths`
      );
    }
  }

  return traversal;
}

function buildAliasMap(traversal: JoinTraversalStep[]): Map<string, string> {
  return new Map(traversal.map((step) => [step.model, `m_${toSnakeIdentifier(step.model)}`]));
}

function renderJoinCondition(
  join: CrossInvariantJoinDefinition,
  parentModel: string,
  childModel: string,
  aliasByModel: Map<string, string>
): string {
  const parentAlias = quoteIdentifier(aliasByModel.get(parentModel) as string);
  const childAlias = quoteIdentifier(aliasByModel.get(childModel) as string);

  if (join.fromModel === parentModel && join.toModel === childModel) {
    return `${parentAlias}.${quoteIdentifier(join.fromField)} = ${childAlias}.${quoteIdentifier(join.toField)}`;
  }

  if (join.toModel === parentModel && join.fromModel === childModel) {
    return `${parentAlias}.${quoteIdentifier(join.toField)} = ${childAlias}.${quoteIdentifier(join.fromField)}`;
  }

  throw new Error(
    `truth-compiler: internal join traversal mismatch for ${parentModel} -> ${childModel}`
  );
}

function renderTriggerRootSelect(
  entity: EntityDef,
  rowRef: "OLD" | "NEW",
  alias: string
): string[] {
  const fieldNames = Object.keys(entity.fields).sort();

  return [
    `    FROM (`,
    `      SELECT`,
    ...fieldNames.map((fieldName, index) => {
      const suffix = index === fieldNames.length - 1 ? "" : ",";
      return `        ${rowRef}.${quoteIdentifier(fieldName)} AS ${quoteIdentifier(fieldName)}${suffix}`;
    }),
    `    ) AS ${quoteIdentifier(alias)}`,
  ];
}

function buildJoinBackedCheckLines(
  crossInvariant: CrossInvariantDefinition,
  entity: EntityDef,
  targetModel: string,
  entityByName: Map<string, EntityDef>,
  ns: string,
  rowRef: "OLD" | "NEW"
): string[] {
  const traversal = buildJoinTraversal(crossInvariant, targetModel, entityByName);
  const aliasByModel = buildAliasMap(traversal);
  const targetAlias = aliasByModel.get(targetModel) as string;
  const referencedModels = new Set<string>();

  for (const fieldRef of collectFieldReferences(crossInvariant.condition)) {
    if (!fieldRef.model) {
      throw new Error(
        `truth-compiler: cross invariant "${crossInvariant.id}" must qualify field ` +
          `"${fieldRef.field}" with a model name for multi-model trigger evaluation`
      );
    }

    if (!crossInvariant.involvedModels.includes(fieldRef.model)) {
      throw new Error(
        `truth-compiler: cross invariant "${crossInvariant.id}" references model ` +
          `"${fieldRef.model}" outside involvedModels`
      );
    }

    assertFieldExists(
      entityByName.get(fieldRef.model),
      fieldRef.model,
      fieldRef.field,
      crossInvariant.id
    );
    referencedModels.add(fieldRef.model);
  }

  if (referencedModels.size === 0) {
    throw new Error(
      `truth-compiler: cross invariant "${crossInvariant.id}" must reference at least one qualified model field`
    );
  }

  const conditionSql = compileConditionExpression(crossInvariant.condition, {
    invariantId: crossInvariant.id,
    strict: true,
    modelAliases: aliasByModel,
  });

  const lines = [
    `  IF NOT EXISTS (`,
    `    SELECT 1`,
    ...renderTriggerRootSelect(entity, rowRef, targetAlias),
  ];

  for (const step of traversal) {
    if (!step.parentModel || !step.join) {
      continue;
    }

    const joinedEntity = entityByName.get(step.model);

    if (!joinedEntity) {
      throw new Error(
        `truth-compiler: cross invariant "${crossInvariant.id}" references unknown model ` +
          `"${step.model}" in normalized manifest`
      );
    }

    const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(joinedEntity.table)}`;
    lines.push(
      `    JOIN ${tableRef} AS ${quoteIdentifier(aliasByModel.get(step.model) as string)}`,
      `      ON ${renderJoinCondition(step.join, step.parentModel, step.model, aliasByModel)}`
    );
  }

  lines.push(`    WHERE ${conditionSql}`, `  ) THEN`);
  return lines;
}

function renderRaiseStatement(
  severity: "fatal" | "error" | "warning",
  invariantId: string,
  entityName: string
): string[] {
  const message = `Cross invariant ${invariantId} violated during direct mutation of ${entityName}.`;
  const detail =
    "Review involved models and route the change through the truth runtime if coordinated state changes are required.";

  if (severity === "warning") {
    return [`      RAISE WARNING ${renderLiteral(message)};`];
  }

  return [
    `      RAISE EXCEPTION USING`,
    `        MESSAGE = ${renderLiteral(message)},`,
    `        DETAIL = ${renderLiteral(detail)},`,
    `        ERRCODE = '23514';`,
  ];
}

function compileTriggerCrossInvariant(
  crossInvariant: NormalizedTruthModel["crossInvariants"][number],
  entityTable: string,
  entityName: string,
  entityByName: Map<string, EntityDef>,
  ns: string
): SqlSegment[] {
  const functionName = `enforce_xinv_${toSnakeIdentifier(crossInvariant.id)}_on_${toSnakeIdentifier(entityName)}`;
  const triggerName = `trg_xinv_${toSnakeIdentifier(crossInvariant.id)}_${toSnakeIdentifier(entityName)}`;
  const quotedFunction = `${quoteIdentifier(ns)}.${quoteIdentifier(functionName)}`;
  const quotedTrigger = quoteIdentifier(triggerName);
  const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entityTable)}`;
  const isDeferred = crossInvariant.executionKind === "deferred-trigger";
  const nodeId = `cross-invariant:${crossInvariant.id}`;
  const raiseLines = renderRaiseStatement(crossInvariant.severity, crossInvariant.id, entityName);
  const entity = entityByName.get(entityName);

  if (!entity) {
    throw new Error(
      `truth-compiler: cross invariant "${crossInvariant.id}" references unknown model ` +
        `"${entityName}" in normalized manifest`
    );
  }

  const isJoinBacked = crossInvariant.involvedModels.length > 1;
  const oldCheckLines = isJoinBacked
    ? buildJoinBackedCheckLines(crossInvariant, entity, entityName, entityByName, ns, "OLD")
    : [
        `    IF NOT (${compileConditionExpression(crossInvariant.condition, {
          invariantId: crossInvariant.id,
          strict: false,
          rowRef: "OLD",
        })}) THEN`,
      ];
  const newCheckLines = isJoinBacked
    ? buildJoinBackedCheckLines(crossInvariant, entity, entityName, entityByName, ns, "NEW")
    : [
        `  IF NOT (${compileConditionExpression(crossInvariant.condition, {
          invariantId: crossInvariant.id,
          strict: false,
          rowRef: "NEW",
        })}) THEN`,
      ];

  const functionSql = [
    `-- Cross invariant: ${crossInvariant.id} | severity=${crossInvariant.severity} | executionKind=${crossInvariant.executionKind} | model=${entityName}`,
    `CREATE OR REPLACE FUNCTION ${quotedFunction}()`,
    `RETURNS trigger`,
    `LANGUAGE plpgsql`,
    `AS $$`,
    `BEGIN`,
    `  IF TG_OP = 'DELETE' THEN`,
    ...oldCheckLines,
    ...raiseLines,
    `    END IF;`,
    `    RETURN ${isDeferred ? "NULL" : "OLD"};`,
    `  END IF;`,
    ``,
    ...newCheckLines,
    ...raiseLines,
    `  END IF;`,
    ``,
    `  RETURN ${isDeferred ? "NULL" : "NEW"};`,
    `END;`,
    `$$;`,
  ].join("\n");

  const triggerSql = isDeferred
    ? [
        `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
        `CREATE CONSTRAINT TRIGGER ${quotedTrigger}`,
        `  AFTER INSERT OR UPDATE OR DELETE ON ${tableRef}`,
        `  DEFERRABLE INITIALLY DEFERRED`,
        `  FOR EACH ROW`,
        `  EXECUTE FUNCTION ${quotedFunction}();`,
      ].join("\n")
    : [
        `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
        `CREATE TRIGGER ${quotedTrigger}`,
        `  BEFORE INSERT OR UPDATE OR DELETE ON ${tableRef}`,
        `  FOR EACH ROW`,
        `  EXECUTE FUNCTION ${quotedFunction}();`,
      ].join("\n");

  return [
    { model: entityName, kind: "function", nodeId, sql: functionSql },
    { model: entityName, kind: "trigger", nodeId, sql: triggerSql },
  ];
}

export function compileCrossInvariants(
  model: NormalizedTruthModel,
  options: CrossInvariantCompilerOptions = {}
): SqlSegment[] {
  const strict = options.strict ?? false;
  const ns = model.namespace ?? "public";
  const entityByName = new Map(model.entities.map((entity) => [entity.name, entity]));
  const segments: SqlSegment[] = [];

  for (const crossInvariant of model.crossInvariants) {
    const nodeId = `cross-invariant:${crossInvariant.id}`;

    if (
      crossInvariant.executionKind === "trigger" ||
      crossInvariant.executionKind === "deferred-trigger"
    ) {
      for (const targetModel of crossInvariant.involvedModels) {
        const entity = entityByName.get(targetModel);

        if (!entity) {
          const message =
            `truth-compiler: cross invariant "${crossInvariant.id}" references unknown model ` +
            `"${targetModel}" in normalized manifest`;
          if (strict) {
            throw new Error(message);
          }

          segments.push({
            model: targetModel,
            kind: "comment",
            nodeId,
            sql: `-- SKIPPED: ${message}`,
          });
          continue;
        }

        segments.push(
          ...compileTriggerCrossInvariant(
            crossInvariant,
            entity.table,
            targetModel,
            entityByName,
            ns
          )
        );
      }

      continue;
    }

    if (crossInvariant.involvedModels.length !== 1) {
      const message =
        `truth-compiler: cross invariant "${crossInvariant.id}" uses executionKind=check ` +
        `with ${crossInvariant.involvedModels.length} models. CHECK output is only valid for a single target model.`;

      if (strict) {
        throw new Error(message);
      }

      segments.push({
        model: crossInvariant.involvedModels[0] ?? "_global",
        kind: "comment",
        nodeId,
        sql: `-- SKIPPED: ${message}`,
      });
      continue;
    }

    const targetModel = crossInvariant.involvedModels[0];
    const entity = entityByName.get(targetModel);

    if (!entity) {
      const message =
        `truth-compiler: cross invariant "${crossInvariant.id}" references unknown model ` +
        `"${targetModel}" in normalized manifest`;
      if (strict) {
        throw new Error(message);
      }

      segments.push({
        model: targetModel,
        kind: "comment",
        nodeId,
        sql: `-- SKIPPED: ${message}`,
      });
      continue;
    }

    const conditionSql = compileConditionExpression(crossInvariant.condition, {
      invariantId: crossInvariant.id,
      strict,
    });
    const constraintName = `chk_xinv_${toSnakeIdentifier(crossInvariant.id)}`;
    const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entity.table)}`;
    const quotedConstraint = quoteIdentifier(constraintName);

    segments.push({
      model: targetModel,
      kind: "check",
      nodeId,
      sql: [
        `-- Cross invariant: ${crossInvariant.id} | severity=${crossInvariant.severity} | executionKind=check`,
        `ALTER TABLE ${tableRef}`,
        `  DROP CONSTRAINT IF EXISTS ${quotedConstraint};`,
        `ALTER TABLE ${tableRef}`,
        `  ADD CONSTRAINT ${quotedConstraint}`,
        `  CHECK (${conditionSql});`,
      ].join("\n"),
    });
  }

  return segments;
}
