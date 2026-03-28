import { requireMutationPolicyById } from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../db/index.js";
import { commissionEntries } from "../../db/schema/index.js";
import { upsertProjectionCheckpoint } from "../../events/projectionCheckpointStore.js";
import { buildProjectionCheckpoint } from "../../events/projectionRuntime.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../../policy/command-runtime-spine.js";
import {
  approveCommissionEntries,
  loadCommissionEntriesForMutation,
  payCommissionEntries,
  persistPreparedCommissionGeneration,
  prepareCommissionGeneration,
  removeCommissionEntry,
  type ApproveCommissionEntriesResult,
  type GenerateCommissionForOrderInput,
  type GenerateCommissionForOrderResult,
  type PayCommissionEntriesResult,
  type RemoveCommissionEntryResult,
} from "./commission-service.js";

type CommissionEntryRecord = typeof commissionEntries.$inferSelect;
type CommissionEntryEvent = NonNullable<
  ExecuteMutationCommandResult<CommissionEntryRecord>["event"]
>;

const COMMISSION_ENTRY_EVENT_ONLY_POLICY = requireMutationPolicyById(
  "sales.commission_entry.command_projection"
);
const COMMISSION_ENTRY_GENERATION_POLICY = requireMutationPolicyById(
  "sales.commission_entry.command_generation"
);

const COMMISSION_ENTRY_PROJECTION_DEFINITION = {
  name: "commission_entry.read_model",
  version: {
    version: 1,
    schemaHash: "commission_entry_read_model_v1",
  },
};
const assertCommissionEntryProjectionDrift = createProjectionDriftValidator({
  aggregateType: "commission_entry",
  definition: COMMISSION_ENTRY_PROJECTION_DEFINITION,
});

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

export interface RemoveCommissionEntryCommandInput {
  tenantId: number;
  actorId: number;
  entryId: string;
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

export interface RemoveCommissionEntryCommandResult
  extends RemoveCommissionEntryResult, CommissionCommandMetadata {}

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

  const commandResult = await executeCommandRuntime({
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

export async function removeCommissionEntryCommand(
  input: RemoveCommissionEntryCommandInput
): Promise<RemoveCommissionEntryCommandResult> {
  await loadCommissionEntry(input.tenantId, input.entryId);

  let serviceResult: RemoveCommissionEntryResult | undefined;
  const commandResult = await executeCommandRuntime({
    model: "commission_entry",
    operation: "delete",
    recordId: input.entryId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.commissions.delete.single",
    policies: [COMMISSION_ENTRY_EVENT_ONLY_POLICY],
    mutate: async () => null,
    loadProjectionState: async () =>
      loadCommissionEntryProjectionState({
        tenantId: input.tenantId,
        entryId: input.entryId,
      }),
    projectEvent: () => null,
    persistProjectionState: async ({ event }) => {
      serviceResult = await removeCommissionEntry({
        tenantId: input.tenantId,
        actorId: input.actorId,
        entryId: input.entryId,
      });
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

  if (!serviceResult) {
    throw new Error("commission-command-service: delete mutation returned no result");
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
  return executeCommandRuntime({
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
  await assertCommissionEntryProjectionDrift(input.entryId);
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
