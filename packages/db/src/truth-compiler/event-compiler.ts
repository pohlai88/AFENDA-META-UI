/**
 * @module truth-compiler/event-compiler
 * @description Compiles registered domain event types into append-only event-log hooks.
 *
 * V1 scope:
 *   - Groups events by entity model prefix (convention: "model.event_name").
 *   - Emits per-entity AFTER INSERT/UPDATE/DELETE triggers.
 *   - Uses the existing consumer-owned sales.emit_domain_event(...) helper and
 *     sales.domain_event_logs storage contract.
 *   - Stores the truth event contract in the payload for downstream replay/audit.
 *
 * @layer db/truth-compiler
 */

import { domainEventTypes } from "../schema/sales/_enums.js";

import type { NormalizedTruthModel, SqlSegment } from "./types.js";
import { quoteIdentifier, renderLiteral, toSnakeIdentifier } from "./sql-utils.js";

const AVAILABLE_DOMAIN_EVENT_TYPES = new Set<string>(domainEventTypes);

function groupEventsByModel(eventTypes: string[]): Map<string, string[]> {
  const eventsByModel = new Map<string, string[]>();

  for (const eventType of eventTypes) {
    const dotIndex = eventType.indexOf(".");
    const modelKey = dotIndex > -1 ? eventType.slice(0, dotIndex) : "_global";
    const existing = eventsByModel.get(modelKey) ?? [];
    existing.push(eventType);
    eventsByModel.set(modelKey, existing);
  }

  for (const [model, events] of eventsByModel) {
    eventsByModel.set(
      model,
      [...events].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }))
    );
  }

  return new Map(
    [...eventsByModel.entries()].sort(([left], [right]) =>
      left.localeCompare(right, "en", { sensitivity: "base" })
    )
  );
}

function toDomainEventEnum(entityModel: string, suffix: "MUTATED" | "DELETED"): string {
  const logicalModel = entityModel.startsWith("sales_")
    ? entityModel.slice("sales_".length)
    : entityModel;
  return `${toSnakeIdentifier(logicalModel).toUpperCase()}_${suffix}`;
}

function renderPayloadExpression(
  events: string[],
  stateField: string | undefined,
  rowRef: "OLD" | "NEW"
): string {
  const parts = [
    `'operation'`,
    `TG_OP`,
    `'truth_event_contract'`,
    `jsonb_build_array(${events.map((eventType) => renderLiteral(eventType)).join(", ")})`,
  ];

  if (stateField) {
    const quotedStateField = quoteIdentifier(stateField);
    parts.push(
      `'state_field'`,
      renderLiteral(stateField),
      `'state_value'`,
      `${rowRef}.${quotedStateField}`
    );
  }

  return `jsonb_build_object(${parts.join(", ")})`;
}

function compileEntityEventHook(
  entityModel: string,
  entityTable: string,
  events: string[],
  ns: string,
  stateField?: string
): SqlSegment[] {
  const mutatedEventType = toDomainEventEnum(entityModel, "MUTATED");
  const deletedEventType = toDomainEventEnum(entityModel, "DELETED");

  if (!AVAILABLE_DOMAIN_EVENT_TYPES.has(mutatedEventType)) {
    return [
      {
        model: entityModel,
        kind: "comment",
        sql:
          `-- WARNING: cannot compile event hook for \"${entityModel}\" ` +
          `— domain_event_type missing ${mutatedEventType}`,
      },
    ];
  }

  if (!AVAILABLE_DOMAIN_EVENT_TYPES.has(deletedEventType)) {
    return [
      {
        model: entityModel,
        kind: "comment",
        sql:
          `-- WARNING: cannot compile event hook for \"${entityModel}\" ` +
          `— domain_event_type missing ${deletedEventType}`,
      },
    ];
  }

  const functionName = `emit_${toSnakeIdentifier(entityModel)}_event`;
  const triggerName = `trg_emit_${toSnakeIdentifier(entityModel)}_event`;
  const tableRef = `${quoteIdentifier(ns)}.${quoteIdentifier(entityTable)}`;
  const quotedFunction = `${quoteIdentifier(ns)}.${quoteIdentifier(functionName)}`;
  const quotedTrigger = quoteIdentifier(triggerName);
  const quotedCurrentActor = `${quoteIdentifier(ns)}.${quoteIdentifier("current_actor_id")}`;
  const quotedEmitDomainEvent = `${quoteIdentifier(ns)}.${quoteIdentifier("emit_domain_event")}`;
  const oldPayload = renderPayloadExpression(events, stateField, "OLD");
  const newPayload = renderPayloadExpression(events, stateField, "NEW");

  const functionSql = [
    `-- Event contract: ${entityModel} (${events.length} registered types)`,
    ...events.map((eventType) => `--   • ${eventType}`),
    `CREATE OR REPLACE FUNCTION ${quotedFunction}()`,
    `RETURNS trigger`,
    `LANGUAGE plpgsql`,
    `AS $$`,
    `DECLARE`,
    `  actor_id integer;`,
    `  event_payload jsonb;`,
    `BEGIN`,
    `  actor_id := ${quotedCurrentActor}();`,
    ``,
    `  IF TG_OP = 'DELETE' THEN`,
    `    event_payload := ${oldPayload};`,
    `    PERFORM ${quotedEmitDomainEvent}(`,
    `      '${deletedEventType}',`,
    `      ${renderLiteral(entityModel)},`,
    `      OLD.${quoteIdentifier("tenant_id")},`,
    `      OLD.${quoteIdentifier("id")},`,
    `      event_payload,`,
    `      actor_id`,
    `    );`,
    `    RETURN OLD;`,
    `  END IF;`,
    ``,
    `  event_payload := ${newPayload};`,
    `  PERFORM ${quotedEmitDomainEvent}(`,
    `    '${mutatedEventType}',`,
    `    ${renderLiteral(entityModel)},`,
    `    NEW.${quoteIdentifier("tenant_id")},`,
    `    NEW.${quoteIdentifier("id")},`,
    `    event_payload,`,
    `    actor_id`,
    `  );`,
    `  RETURN NEW;`,
    `END;`,
    `$$;`,
  ].join("\n");

  const triggerSql = [
    `DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${tableRef};`,
    `CREATE TRIGGER ${quotedTrigger}`,
    `  AFTER INSERT OR UPDATE OR DELETE ON ${tableRef}`,
    `  FOR EACH ROW`,
    `  EXECUTE FUNCTION ${quotedFunction}();`,
  ].join("\n");

  return [
    { model: entityModel, kind: "function", sql: functionSql },
    { model: entityModel, kind: "trigger", sql: triggerSql },
  ];
}

/**
 * Compiles domain event types into append-only trigger hooks that write to the
 * consumer-owned sales.domain_event_logs table via sales.emit_domain_event(...).
 */
export function compileEvents(model: NormalizedTruthModel): SqlSegment[] {
  const segments: SqlSegment[] = [];
  if (model.events.length === 0) return segments;

  const ns = model.namespace ?? "public";
  const entityByName = new Map(model.entities.map((entity) => [entity.name, entity]));
  const stateFieldByModel = new Map(
    model.stateMachines.map((stateMachine) => [stateMachine.model, stateMachine.stateField])
  );
  const eventsByModel = groupEventsByModel(model.events);

  for (const [entityModel, events] of eventsByModel) {
    const entity = entityByName.get(entityModel);

    if (!entity) {
      segments.push({
        model: entityModel,
        kind: "comment",
        sql:
          `-- WARNING: no EntityDef found for event contract \"${entityModel}\" ` +
          `— skipping event compiler output`,
      });
      continue;
    }

    segments.push(
      ...compileEntityEventHook(
        entityModel,
        entity.table,
        events,
        ns,
        stateFieldByModel.get(entityModel)
      )
    );
  }

  return segments;
}
