import type { MutationPolicyDefinition } from "@afenda/meta-types";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../db/index.js";
import { commissionEntries } from "../../db/schema/index.js";
import { dbGetAggregateEvents } from "../../events/dbEventStore.js";
import {
  getProjectionCheckpoint,
  upsertProjectionCheckpoint,
} from "../../events/projectionCheckpointStore.js";
import {
  assertNoProjectionDrift,
  buildProjectionCheckpoint,
  detectProjectionDrift,
} from "../../events/projectionRuntime.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  executeMutationCommand,
  type ExecuteMutationCommandResult,
} from "../../policy/mutation-command-gateway.js";
import {
  approveCommissionEntries,
  loadCommissionEntriesForMutation,
  payCommissionEntries,
  persistPreparedCommissionGeneration,
  prepareCommissionGeneration,
  type ApproveCommissionEntriesResult,
  type GenerateCommissionForOrderInput,
  type GenerateCommissionForOrderResult,
  type PayCommissionEntriesResult,
} from "./commission-service.js";

type CommissionEntryRecord = typeof commissionEntries.$inferSelect;
type CommissionEntryEvent = NonNullable<
  ExecuteMutationCommandResult<CommissionEntryRecord>["event"]
>;

const COMMISSION_ENTRY_EVENT_ONLY_POLICY: MutationPolicyDefinition = {
  id: "sales.commission_entry.command_projection",
  mutationPolicy: "event-only",
  appliesTo: ["commission_entry"],
  requiredEvents: ["commission_entry.approved", "commission_entry.paid"],
  directMutationOperations: ["update"],
  description:
    "Commission approval and payment command routes append entry-scoped events first and refresh the read model through projection persistence.",
};

const COMMISSION_ENTRY_GENERATION_POLICY: MutationPolicyDefinition = {
  id: "sales.commission_entry.command_generation",
  mutationPolicy: "dual-write",
  appliesTo: ["commission_entry"],
  requiredEvents: ["commission_entry.generated", "commission_entry.recalculated"],
  directMutationOperations: ["create", "update"],
  description:
    "Commission generation remains command-owned under dual-write until create/update parity is proven across the aggregate.",
};

const COMMISSION_ENTRY_PROJECTION_DEFINITION = {
  name: "commission_entry.read_model",
  version: {
    version: 1,
    schemaHash: "commission_entry_read_model_v1",
  },
};

export interface ApproveCommissionEntryCommandInput {
  tenantId: number;
  actorId: number;
  entryId: string;
  source?: string;
}

export interface PayCommissionEntryCommandInput {
  tenantId: number;
  actorId: number;
  entryId: string;
  paidDate?: Date;
  source?: string;
}

export interface GenerateCommissionForOrderCommandInput extends GenerateCommissionForOrderInput {
  source?: string;
}

export interface ApproveCommissionEntriesCommandInput {
  tenantId: number;
  actorId: number;
  entryIds?: string[];
  salespersonId?: number;
  periodStart?: Date;
  periodEnd?: Date;
  source?: string;
}

export interface PayCommissionEntriesCommandInput {
  tenantId: number;
  actorId: number;
  entryIds?: string[];
  salespersonId?: number;
  periodStart?: Date;
  periodEnd?: Date;
  paidDate?: Date;
  source?: string;
}

interface CommissionCommandMetadata {
  mutationPolicy: ExecuteMutationCommandResult<CommissionEntryRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<CommissionEntryRecord>["event"];
}

interface BulkCommissionCommandMetadata {
  mutationPolicy: ExecuteMutationCommandResult<CommissionEntryRecord>["mutationPolicy"];
  events: CommissionEntryEvent[];
  matchedCount: number;
}

export interface ApproveCommissionEntryCommandResult
  extends ApproveCommissionEntriesResult, CommissionCommandMetadata {}

export interface PayCommissionEntryCommandResult
  extends PayCommissionEntriesResult, CommissionCommandMetadata {}

export interface GenerateCommissionForOrderCommandResult
  extends GenerateCommissionForOrderResult, CommissionCommandMetadata {}

export interface ApproveCommissionEntriesCommandResult
  extends ApproveCommissionEntriesResult, BulkCommissionCommandMetadata {}

export interface PayCommissionEntriesCommandResult
  extends PayCommissionEntriesResult, BulkCommissionCommandMetadata {}

export async function generateCommissionForOrderCommand(
  input: GenerateCommissionForOrderCommandInput
): Promise<GenerateCommissionForOrderCommandResult> {
  const prepared = await prepareCommissionGeneration({
    ...input,
    entryId: randomUUID(),
  });
  const operation = prepared.persistence === "created" ? "create" : "update";
  let serviceResult: GenerateCommissionForOrderResult | undefined;

  const commandResult = await executeMutationCommand({
    model: "commission_entry",
    operation,
    recordId: prepared.persistence === "updated" ? prepared.existingEntry?.id : undefined,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.commissions.generate",
    policies: [COMMISSION_ENTRY_GENERATION_POLICY],
    mutate: async () => {
      serviceResult = await persistPreparedCommissionGeneration(prepared);
      return serviceResult.entry;
    },
  });

  if (!serviceResult) {
    throw new Error("commission-command-service: generation mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function approveCommissionEntryCommand(
  input: ApproveCommissionEntryCommandInput
): Promise<ApproveCommissionEntryCommandResult> {
  const existing = await loadCommissionEntry(input.tenantId, input.entryId);

  if (existing.status !== "draft") {
    return {
      updatedCount: 0,
      unchangedCount: 1,
      entries: [],
      mutationPolicy: "event-only",
    };
  }

  let serviceResult: ApproveCommissionEntriesResult | undefined;
  const commandResult = await executeCommissionEntryCommand({
    tenantId: input.tenantId,
    entryId: input.entryId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.commissions.approve.single",
    nextEntry: {
      ...existing,
      status: "approved",
      paidDate: null,
      updatedBy: input.actorId,
    },
    persistProjection: async () => {
      serviceResult = await approveCommissionEntries({
        tenantId: input.tenantId,
        actorId: input.actorId,
        entryIds: [input.entryId],
      });
    },
  });

  if (!serviceResult) {
    throw new Error("commission-command-service: approve mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function payCommissionEntryCommand(
  input: PayCommissionEntryCommandInput
): Promise<PayCommissionEntryCommandResult> {
  const existing = await loadCommissionEntry(input.tenantId, input.entryId);

  if (existing.status === "draft") {
    throw new ValidationError(
      `Draft commission entries must be approved before payment: ${existing.id}`
    );
  }

  if (existing.status === "paid") {
    return {
      updatedCount: 0,
      unchangedCount: 1,
      entries: [],
      mutationPolicy: "event-only",
    };
  }

  const paidDate = input.paidDate ?? new Date();
  let serviceResult: PayCommissionEntriesResult | undefined;
  const commandResult = await executeCommissionEntryCommand({
    tenantId: input.tenantId,
    entryId: input.entryId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.commissions.pay.single",
    nextEntry: {
      ...existing,
      status: "paid",
      paidDate,
      updatedBy: input.actorId,
    },
    persistProjection: async () => {
      serviceResult = await payCommissionEntries({
        tenantId: input.tenantId,
        actorId: input.actorId,
        entryIds: [input.entryId],
        paidDate,
      });
    },
  });

  if (!serviceResult) {
    throw new Error("commission-command-service: pay mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function approveCommissionEntriesCommand(
  input: ApproveCommissionEntriesCommandInput
): Promise<ApproveCommissionEntriesCommandResult> {
  const entries = await loadCommissionEntriesForMutation({
    tenantId: input.tenantId,
    entryIds: input.entryIds,
    salespersonId: input.salespersonId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });
  const updatedEntries: CommissionEntryRecord[] = [];
  const events: CommissionEntryEvent[] = [];
  let unchangedCount = 0;

  for (const entry of entries) {
    if (entry.status !== "draft") {
      unchangedCount += 1;
      continue;
    }

    let serviceResult: ApproveCommissionEntriesResult | undefined;
    const commandResult = await executeCommissionEntryCommand({
      tenantId: input.tenantId,
      entryId: entry.id,
      actorId: input.actorId,
      source: input.source ?? "api.sales.commissions.approve.bulk",
      nextEntry: {
        ...entry,
        status: "approved",
        paidDate: null,
        updatedBy: input.actorId,
      },
      persistProjection: async () => {
        serviceResult = await approveCommissionEntries({
          tenantId: input.tenantId,
          actorId: input.actorId,
          entryIds: [entry.id],
        });
      },
    });

    if (!serviceResult) {
      throw new Error("commission-command-service: bulk approve mutation returned no result");
    }

    updatedEntries.push(...serviceResult.entries);
    if (commandResult.event) {
      events.push(commandResult.event);
    }
  }

  return {
    updatedCount: updatedEntries.length,
    unchangedCount,
    entries: updatedEntries,
    mutationPolicy: "event-only",
    events,
    matchedCount: entries.length,
  };
}

export async function payCommissionEntriesCommand(
  input: PayCommissionEntriesCommandInput
): Promise<PayCommissionEntriesCommandResult> {
  const entries = await loadCommissionEntriesForMutation({
    tenantId: input.tenantId,
    entryIds: input.entryIds,
    salespersonId: input.salespersonId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });
  const draftEntryIds = entries
    .filter((entry) => entry.status === "draft")
    .map((entry) => entry.id);

  if (draftEntryIds.length > 0) {
    throw new ValidationError(
      `Draft commission entries must be approved before payment: ${draftEntryIds.join(", ")}`
    );
  }

  const paidDate = input.paidDate ?? new Date();
  const updatedEntries: CommissionEntryRecord[] = [];
  const events: CommissionEntryEvent[] = [];
  let unchangedCount = 0;

  for (const entry of entries) {
    if (entry.status === "paid") {
      unchangedCount += 1;
      continue;
    }

    let serviceResult: PayCommissionEntriesResult | undefined;
    const commandResult = await executeCommissionEntryCommand({
      tenantId: input.tenantId,
      entryId: entry.id,
      actorId: input.actorId,
      source: input.source ?? "api.sales.commissions.pay.bulk",
      nextEntry: {
        ...entry,
        status: "paid",
        paidDate,
        updatedBy: input.actorId,
      },
      persistProjection: async () => {
        serviceResult = await payCommissionEntries({
          tenantId: input.tenantId,
          actorId: input.actorId,
          entryIds: [entry.id],
          paidDate,
        });
      },
    });

    if (!serviceResult) {
      throw new Error("commission-command-service: bulk pay mutation returned no result");
    }

    updatedEntries.push(...serviceResult.entries);
    if (commandResult.event) {
      events.push(commandResult.event);
    }
  }

  return {
    updatedCount: updatedEntries.length,
    unchangedCount,
    entries: updatedEntries,
    mutationPolicy: "event-only",
    events,
    matchedCount: entries.length,
  };
}

async function executeCommissionEntryCommand(input: {
  tenantId: number;
  entryId: string;
  actorId: number;
  source: string;
  nextEntry: CommissionEntryRecord;
  persistProjection: () => Promise<void>;
}): Promise<ExecuteMutationCommandResult<CommissionEntryRecord>> {
  return executeMutationCommand({
    model: "commission_entry",
    operation: "update",
    recordId: input.entryId,
    actorId: String(input.actorId),
    source: input.source,
    policies: [COMMISSION_ENTRY_EVENT_ONLY_POLICY],
    nextRecord: input.nextEntry,
    mutate: async () => input.nextEntry,
    loadProjectionState: async () =>
      loadCommissionEntryProjectionState({
        tenantId: input.tenantId,
        entryId: input.entryId,
      }),
    projectEvent: ({ currentState, nextRecord }) => nextRecord ?? currentState,
    persistProjectionState: async ({ event }) => {
      await input.persistProjection();
      upsertProjectionCheckpoint(
        buildProjectionCheckpoint({
          definition: COMMISSION_ENTRY_PROJECTION_DEFINITION,
          aggregateType: "commission_entry",
          aggregateId: input.entryId,
          lastAppliedVersion: event.version,
          updatedAt: event.timestamp,
        })
      );
    },
  });
}

async function loadCommissionEntryProjectionState(input: {
  tenantId: number;
  entryId: string;
}): Promise<CommissionEntryRecord> {
  const record = await loadCommissionEntry(input.tenantId, input.entryId);
  const checkpoint = getProjectionCheckpoint({
    projectionName: COMMISSION_ENTRY_PROJECTION_DEFINITION.name,
    aggregateType: "commission_entry",
    aggregateId: input.entryId,
  });

  if (checkpoint) {
    const events = await dbGetAggregateEvents("commission_entry", input.entryId);
    const latestEventVersion = events.at(-1)?.version ?? 0;
    assertNoProjectionDrift(
      detectProjectionDrift({
        definition: COMMISSION_ENTRY_PROJECTION_DEFINITION,
        checkpoint,
        latestEventVersion,
      })
    );
  }

  return record;
}

async function loadCommissionEntry(
  tenantId: number,
  entryId: string
): Promise<CommissionEntryRecord> {
  const [record] = await db
    .select()
    .from(commissionEntries)
    .where(
      and(
        eq(commissionEntries.tenantId, tenantId),
        eq(commissionEntries.id, entryId),
        isNull(commissionEntries.deletedAt)
      )
    )
    .limit(1);

  if (!record) {
    throw new NotFoundError(`Commission entry ${entryId} was not found for tenant ${tenantId}.`);
  }

  return record;
}
