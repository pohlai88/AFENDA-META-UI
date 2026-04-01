import { requireMutationPolicyById } from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { upsertProjectionCheckpoint } from "../../events/projectionCheckpointStore.js";
import { buildProjectionCheckpoint } from "../../events/projectionRuntime.js";
import { returnOrders } from "../../db/schema/index.js";
import { NotFoundError } from "../../middleware/errorHandler.js";
import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../../policy/command-runtime-spine.js";
import {
  approveReturn,
  generateReturnCreditNote,
  inspectReturnOrder,
  receiveReturn,
  type ApproveReturnInput,
  type ApproveReturnResult,
  type GenerateCreditNoteInput,
  type GenerateCreditNoteResult,
  type InspectReturnInput,
  type InspectReturnResult,
  type ReceiveReturnInput,
  type ReceiveReturnResult,
} from "./returns-service.js";
import {
  buildSalesTruthImpactEventMetadata,
  type SalesTruthImpactEventMetadata,
} from "./logic/truth-graph-engine.js";

type ReturnOrderRecord = typeof returnOrders.$inferSelect;

const RETURN_ORDER_EVENT_ONLY_POLICY = requireMutationPolicyById(
  "sales.return_order.command_projection"
);

const RETURN_ORDER_PROJECTION_DEFINITION = {
  name: "return_order.read_model",
  version: {
    version: 1,
    schemaHash: "return_order_read_model_v1",
  },
};
const assertReturnOrderProjectionDrift = createProjectionDriftValidator({
  aggregateType: "return_order",
  definition: RETURN_ORDER_PROJECTION_DEFINITION,
});

export interface ApproveReturnOrderCommandInput extends ApproveReturnInput {
  source?: string;
}

export interface ReceiveReturnOrderCommandInput extends ReceiveReturnInput {
  source?: string;
}

export interface InspectReturnOrderCommandInput extends InspectReturnInput {
  source?: string;
}

export interface GenerateReturnCreditNoteCommandInput extends GenerateCreditNoteInput {
  source?: string;
}

export interface ApproveReturnOrderCommandResult extends ApproveReturnResult {
  mutationPolicy: ExecuteMutationCommandResult<ReturnOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<ReturnOrderRecord>["event"];
}

export interface ReceiveReturnOrderCommandResult extends ReceiveReturnResult {
  mutationPolicy: ExecuteMutationCommandResult<ReturnOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<ReturnOrderRecord>["event"];
}

export interface InspectReturnOrderCommandResult extends InspectReturnResult {
  mutationPolicy: ExecuteMutationCommandResult<ReturnOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<ReturnOrderRecord>["event"];
}

export interface GenerateReturnCreditNoteCommandResult extends GenerateCreditNoteResult {
  mutationPolicy: ExecuteMutationCommandResult<ReturnOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<ReturnOrderRecord>["event"];
}

export async function approveReturnOrderCommand(
  input: ApproveReturnOrderCommandInput
): Promise<ApproveReturnOrderCommandResult> {
  const existing = await loadReturnOrder(input.tenantId, input.returnOrderId);
  let serviceResult: ApproveReturnResult | undefined;

  const commandResult = await executeReturnOrderCommand({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.returns.approve",
    nextReturnOrder: {
      ...existing,
      status: "approved",
      approvedBy: input.actorId,
      approvedDate: input.approvedDate ?? new Date(),
    },
    eventMetadata: buildSalesTruthImpactEventMetadata("return_orders", "approve"),
    persistProjection: async () => {
      serviceResult = await approveReturn(input);
    },
  });

  if (!serviceResult) {
    throw new Error("return-order-command-service: approve mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function receiveReturnOrderCommand(
  input: ReceiveReturnOrderCommandInput
): Promise<ReceiveReturnOrderCommandResult> {
  const existing = await loadReturnOrder(input.tenantId, input.returnOrderId);
  let serviceResult: ReceiveReturnResult | undefined;

  const commandResult = await executeReturnOrderCommand({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.returns.receive",
    nextReturnOrder: {
      ...existing,
      status: "received",
    },
    eventMetadata: buildSalesTruthImpactEventMetadata("return_orders", "receive"),
    persistProjection: async () => {
      serviceResult = await receiveReturn(input);
    },
  });

  if (!serviceResult) {
    throw new Error("return-order-command-service: receive mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function inspectReturnOrderCommand(
  input: InspectReturnOrderCommandInput
): Promise<InspectReturnOrderCommandResult> {
  const existing = await loadReturnOrder(input.tenantId, input.returnOrderId);
  let serviceResult: InspectReturnResult | undefined;

  const commandResult = await executeReturnOrderCommand({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.returns.inspect",
    nextReturnOrder: {
      ...existing,
      status: "inspected",
    },
    eventMetadata: buildSalesTruthImpactEventMetadata("return_orders", "inspect"),
    persistProjection: async () => {
      serviceResult = await inspectReturnOrder(input);
    },
  });

  if (!serviceResult) {
    throw new Error("return-order-command-service: inspect mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function generateReturnCreditNoteCommand(
  input: GenerateReturnCreditNoteCommandInput
): Promise<GenerateReturnCreditNoteCommandResult> {
  const existing = await loadReturnOrder(input.tenantId, input.returnOrderId);
  let serviceResult: GenerateCreditNoteResult | undefined;

  const commandResult = await executeReturnOrderCommand({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.returns.credit_note",
    nextReturnOrder: {
      ...existing,
      status: "credited",
    },
    eventMetadata: buildSalesTruthImpactEventMetadata("return_orders", "credit_note"),
    persistProjection: async () => {
      serviceResult = await generateReturnCreditNote(input);
    },
  });

  if (!serviceResult) {
    throw new Error("return-order-command-service: credit-note mutation returned no result");
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

async function loadReturnOrder(
  tenantId: number,
  returnOrderId: string
): Promise<ReturnOrderRecord> {
  const [record] = await db
    .select()
    .from(returnOrders)
    .where(
      and(
        eq(returnOrders.tenantId, tenantId),
        eq(returnOrders.id, returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .limit(1);

  if (!record) {
    throw new NotFoundError(`Return order ${returnOrderId} was not found for tenant ${tenantId}.`);
  }

  return record;
}

async function executeReturnOrderCommand(input: {
  tenantId: number;
  returnOrderId: string;
  actorId?: number;
  source: string;
  nextReturnOrder: ReturnOrderRecord;
  eventMetadata?: SalesTruthImpactEventMetadata;
  persistProjection: () => Promise<void>;
}): Promise<ExecuteMutationCommandResult<ReturnOrderRecord>> {
  return executeCommandRuntime({
    model: "return_order",
    operation: "update",
    recordId: input.returnOrderId,
    actorId: typeof input.actorId === "number" ? String(input.actorId) : undefined,
    source: input.source,
    eventMetadata: input.eventMetadata,
    policies: [RETURN_ORDER_EVENT_ONLY_POLICY],
    nextRecord: input.nextReturnOrder,
    mutate: async () => input.nextReturnOrder,
    loadProjectionState: async () =>
      loadReturnOrderProjectionState({
        tenantId: input.tenantId,
        returnOrderId: input.returnOrderId,
      }),
    projectEvent: ({ currentState, nextRecord }) => nextRecord ?? currentState,
    persistProjectionState: async ({ event }) => {
      await input.persistProjection();
      upsertProjectionCheckpoint(
        buildProjectionCheckpoint({
          definition: RETURN_ORDER_PROJECTION_DEFINITION,
          aggregateType: "return_order",
          aggregateId: input.returnOrderId,
          lastAppliedVersion: event.version,
          updatedAt: event.timestamp,
        })
      );
    },
  });
}

async function loadReturnOrderProjectionState(input: {
  tenantId: number;
  returnOrderId: string;
}): Promise<ReturnOrderRecord> {
  const returnOrder = await loadReturnOrder(input.tenantId, input.returnOrderId);
  await assertReturnOrderProjectionDrift(input.returnOrderId);
  return returnOrder;
}
