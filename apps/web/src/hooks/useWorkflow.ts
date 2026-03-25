/**
 * useWorkflow Hook
 * ================
 * Trigger and manage workflows from UI components.
 *
 * Features:
 * - Trigger workflows by definition ID
 * - Submit approval decisions
 * - Track workflow status
 * - Error handling and notifications
 */

import { useCallback, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "~/stores/business/hooks";
import {
  loadInstancesStart,
  loadInstancesSuccess,
  loadInstancesFailure,
  createInstanceStart,
  createInstanceSuccess,
  createInstanceFailure,
  updateInstanceStart,
  updateInstanceSuccess,
  updateInstanceFailure,
  addApprovalTask,
  removeApprovalTask,
  setActiveInstance,
  selectPendingApprovals,
  selectWorkflowIsLoading,
  selectWorkflowError,
} from "~/stores/business";
import { toast } from "sonner";
import type { WorkflowInstance } from "@afenda/meta-types";

export interface TriggerWorkflowPayload {
  workflowId: string;
  context: Record<string, unknown>;
  actor?: string;
}

export interface ApprovalDecision {
  instanceId: string;
  decision: "approved" | "rejected";
  actor: string;
  reason?: string;
}

/**
 * Hook to trigger and manage workflows
 * @returns { triggerWorkflow, submitApproval, isLoading, error }
 */
export function useWorkflow(): {
  triggerWorkflow: (payload: TriggerWorkflowPayload) => Promise<WorkflowInstance | null>;
  submitApproval: (decision: ApprovalDecision) => Promise<WorkflowInstance | null>;
  isLoading: boolean;
  error: string | null;
  myApprovals: Array<{
    instanceId: string;
    workflowId: string;
    currentStepId: string;
    stepLabel: string;
    decision?: "approved" | "rejected";
    reason?: string;
    actor?: string;
  }>;
  approvalCount: number;
} {
  const dispatch = useAppDispatch();
  const [localError, setLocalError] = useState<string | null>(null);
  const isLoading = useAppSelector(selectWorkflowIsLoading);
  const error = useAppSelector(selectWorkflowError) || localError;
  const pendingApprovals = useAppSelector(selectPendingApprovals);

  /**
   * Trigger a workflow
   * @param payload - Workflow ID and context
   */
  const triggerWorkflow = useCallback(
    async (payload: TriggerWorkflowPayload): Promise<WorkflowInstance | null> => {
      dispatch(createInstanceStart());
      setLocalError(null);

      try {
        const response = await fetch("/api/workflows/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: payload.workflowId,
            context: payload.context,
            actor: payload.actor || "user",
          }),
        });

        if (!response.ok) {
          let errorMsg = "Failed to trigger workflow";
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch {
            errorMsg = response.statusText;
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const instance: WorkflowInstance = data.instances?.[0] || data.instance;

        if (instance) {
          dispatch(createInstanceSuccess(instance));
          dispatch(setActiveInstance(instance.id));

          // Add approval task if waiting for approval
          if (instance.status === "waiting_approval") {
            dispatch(
              addApprovalTask({
                instanceId: instance.id,
                workflowId: instance.workflowId,
                currentStepId: instance.currentStepId,
                stepLabel: `Step: ${instance.currentStepId}`,
              })
            );
          }

          toast.success("Workflow triggered successfully");
          return instance;
        }

        throw new Error("No workflow instance returned");
      } catch (err: any) {
        const errMsg = err?.message || "Failed to trigger workflow";
        setLocalError(errMsg);
        dispatch(createInstanceFailure(errMsg));
        toast.error(errMsg);
        return null;
      }
    },
    [dispatch]
  );

  /**
   * Submit an approval decision
   * @param decision - Approval decision (approve/reject)
   */
  const submitApproval = useCallback(
    async (decision: ApprovalDecision): Promise<WorkflowInstance | null> => {
      dispatch(updateInstanceStart());
      setLocalError(null);

      try {
        const response = await fetch(`/api/workflows/instances/${decision.instanceId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: decision.decision,
            actor: decision.actor,
            reason: decision.reason,
          }),
        });

        if (!response.ok) {
          let errorMsg = "Failed to submit approval";
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch {
            errorMsg = response.statusText;
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const instance: WorkflowInstance = data.instance;

        if (instance) {
          dispatch(updateInstanceSuccess(instance));
          dispatch(removeApprovalTask(instance.id));

          // Add new approval task if still waiting
          if (instance.status === "waiting_approval") {
            dispatch(
              addApprovalTask({
                instanceId: instance.id,
                workflowId: instance.workflowId,
                currentStepId: instance.currentStepId,
                stepLabel: `Step: ${instance.currentStepId}`,
              })
            );
          }

          const message =
            decision.decision === "approved"
              ? "Workflow approved successfully"
              : "Workflow rejected";
          toast.success(message);
          return instance;
        }

        throw new Error("No workflow instance returned");
      } catch (err: any) {
        const errMsg = err?.message || "Failed to submit approval";
        setLocalError(errMsg);
        dispatch(updateInstanceFailure(errMsg));
        toast.error(errMsg);
        return null;
      }
    },
    [dispatch]
  );

  /**
   * Get pending approvals for current user
   */
  const myApprovals = useMemo(() => pendingApprovals, [pendingApprovals]);

  return {
    triggerWorkflow,
    submitApproval,
    isLoading,
    error,
    myApprovals,
    approvalCount: myApprovals.length,
  };
}
