import type { MutationPolicyDefinition } from "@afenda/meta-types";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { returnOrders } from "../../db/schema/index.js";
import { NotFoundError } from "../../middleware/errorHandler.js";
import {
  executeMutationCommand,
  type ExecuteMutationCommandResult,
} from "../../policy/mutation-command-gateway.js";
import {
  approveReturn,
  type ApproveReturnInput,
  type ApproveReturnResult,
} from "./returns-service.js";

type ReturnOrderRecord = typeof returnOrders.$inferSelect;

const RETURN_ORDER_DUAL_WRITE_POLICY: MutationPolicyDefinition = {
  id: "sales.return_order.dual_write_rollout",
  mutationPolicy: "dual-write",
  appliesTo: ["return_order"],
  requiredEvents: [
    "return_order.approved",
    "return_order.received",
    "return_order.inspected",
    "return_order.credited",
  ],
  directMutationOperations: ["update"],
  description:
    "Return-order command routes execute transactional writes while appending policy-aware domain events.",
};

export interface ApproveReturnOrderCommandInput extends ApproveReturnInput {
  source?: string;
}

export interface ApproveReturnOrderCommandResult extends ApproveReturnResult {
  mutationPolicy: ExecuteMutationCommandResult<ReturnOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<ReturnOrderRecord>["event"];
}

export async function approveReturnOrderCommand(
  input: ApproveReturnOrderCommandInput
): Promise<ApproveReturnOrderCommandResult> {
  const existing = await loadReturnOrder(input.tenantId, input.returnOrderId);
  let serviceResult: ApproveReturnResult | undefined;

  const commandResult = await executeMutationCommand<ReturnOrderRecord>({
    model: "return_order",
    operation: "update",
    recordId: input.returnOrderId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.returns.approve",
    policies: [RETURN_ORDER_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "approved",
      approvedBy: input.actorId,
      approvedDate: input.approvedDate ?? new Date(),
    },
    mutate: async () => {
      serviceResult = await approveReturn(input);
      return serviceResult.returnOrder;
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
