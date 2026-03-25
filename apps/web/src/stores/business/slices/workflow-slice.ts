/**
 * Workflow Slice
 * ==============
 * Redux slice for workflow instance management and human approvals.
 *
 * Features:
 * - Track active workflow instances
 * - Manage approval workflows
 * - Workflow status tracking
 * - Approval decision history
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import type { WorkflowInstance, WorkflowStatus } from "@afenda/meta-types";

interface ApprovalTask {
  instanceId: string;
  workflowId: string;
  currentStepId: string;
  stepLabel: string;
  decision?: "approved" | "rejected";
  reason?: string;
  actor?: string;
}

export interface WorkflowState {
  instances: Map<string, WorkflowInstance>;
  activeInstanceId: string | null;
  approvalTasks: ApprovalTask[];
  isLoading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
}

const initialState: WorkflowState = {
  instances: new Map(),
  activeInstanceId: null,
  approvalTasks: [],
  isLoading: false,
  error: null,
  lastUpdatedAt: null,
};

/**
 * Workflow slice
 *
 * Usage:
 * ```tsx
 * const instance = useSelector(selectWorkflowInstance('wf_1'));
 * const approvals = useSelector(selectPendingApprovals);
 * dispatch(updateWorkflowInstance(instance));
 * ```
 */
const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    // ────────────────────────────────────────────────────────────────────────
    // Instance Management
    // ────────────────────────────────────────────────────────────────────────

    loadInstancesStart(state) {
      state.isLoading = true;
      state.error = null;
    },

    loadInstancesSuccess(
      state,
      action: PayloadAction<{ instances: WorkflowInstance[] }>
    ) {
      state.instances = new Map(action.payload.instances.map((i) => [i.id, i]));
      state.isLoading = false;
      state.lastUpdatedAt = new Date().toISOString();
    },

    loadInstancesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createInstanceStart(state) {
      state.isLoading = true;
      state.error = null;
    },

    createInstanceSuccess(state, action: PayloadAction<WorkflowInstance>) {
      state.instances.set(action.payload.id, action.payload);
      state.activeInstanceId = action.payload.id;
      state.isLoading = false;
      state.lastUpdatedAt = new Date().toISOString();
    },

    createInstanceFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateInstanceStart(state) {
      state.isLoading = true;
      state.error = null;
    },

    updateInstanceSuccess(state, action: PayloadAction<WorkflowInstance>) {
      state.instances.set(action.payload.id, action.payload);
      state.isLoading = false;
      state.lastUpdatedAt = new Date().toISOString();

      // If instance is completed/rejected/failed, clear as active
      if (
        action.payload.status === "completed" ||
        action.payload.status === "rejected" ||
        action.payload.status === "failed"
      ) {
        if (state.activeInstanceId === action.payload.id) {
          state.activeInstanceId = null;
        }
      }
    },

    updateInstanceFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    setActiveInstance(state, action: PayloadAction<string | null>) {
      state.activeInstanceId = action.payload;
    },

    clearInstance(state, action: PayloadAction<string>) {
      state.instances.delete(action.payload);
      if (state.activeInstanceId === action.payload) {
        state.activeInstanceId = null;
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Approval Tasks
    // ────────────────────────────────────────────────────────────────────────

    addApprovalTask(state, action: PayloadAction<ApprovalTask>) {
      // Avoid duplicates
      const exists = state.approvalTasks.some(
        (t) => t.instanceId === action.payload.instanceId
      );
      if (!exists) {
        state.approvalTasks.push(action.payload);
      }
    },

    removeApprovalTask(state, action: PayloadAction<string>) {
      state.approvalTasks = state.approvalTasks.filter(
        (t) => t.instanceId !== action.payload
      );
    },

    updateApprovalTask(state, action: PayloadAction<ApprovalTask>) {
      const index = state.approvalTasks.findIndex(
        (t) => t.instanceId === action.payload.instanceId
      );
      if (index >= 0) {
        state.approvalTasks[index] = action.payload;
      }
    },

    clearApprovalTasks(state) {
      state.approvalTasks = [];
    },

    // ────────────────────────────────────────────────────────────────────────
    // Error Handling
    // ────────────────────────────────────────────────────────────────────────

    clearError(state) {
      state.error = null;
    },
  },
});

// ────────────────────────────────────────────────────────────────────────
// Selectors
// ────────────────────────────────────────────────────────────────────────

export const selectWorkflowInstance =
  (instanceId: string) => (state: RootState) =>
    instanceId && state.workflow.instances.has(instanceId)
      ? state.workflow.instances.get(instanceId)
      : undefined;

export const selectAllInstances = (state: RootState) =>
  Array.from(state.workflow.instances.values());

export const selectInstancesByStatus =
  (status: WorkflowStatus) => (state: RootState) =>
    Array.from(state.workflow.instances.values()).filter((i) => i.status === status);

export const selectPendingInstances = (state: RootState) =>
  Array.from(state.workflow.instances.values()).filter(
    (i) =>
      i.status === "pending" ||
      i.status === "running" ||
      i.status === "waiting_approval" ||
      i.status === "waiting_timer"
  );

export const selectCompletedInstances = (state: RootState) =>
  Array.from(state.workflow.instances.values()).filter(
    (i) =>
      i.status === "completed" ||
      i.status === "rejected" ||
      i.status === "failed"
  );

export const selectPendingApprovals = (state: RootState) =>
  state.workflow.approvalTasks;

export const selectApprovalTask =
  (instanceId: string) => (state: RootState) =>
    state.workflow.approvalTasks.find((t) => t.instanceId === instanceId);

export const selectActiveInstance = (state: RootState) => {
  if (state.workflow.activeInstanceId === null) return undefined;
  return state.workflow.instances.get(state.workflow.activeInstanceId);
};

export const selectWorkflowIsLoading = (state: RootState) =>
  state.workflow.isLoading;

export const selectWorkflowError = (state: RootState) =>
  state.workflow.error;

export const selectWorkflowLastUpdatedAt = (state: RootState) =>
  state.workflow.lastUpdatedAt;

// ────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────

export const {
  loadInstancesStart,
  loadInstancesSuccess,
  loadInstancesFailure,
  createInstanceStart,
  createInstanceSuccess,
  createInstanceFailure,
  updateInstanceStart,
  updateInstanceSuccess,
  updateInstanceFailure,
  setActiveInstance,
  clearInstance,
  addApprovalTask,
  removeApprovalTask,
  updateApprovalTask,
  clearApprovalTasks,
  clearError,
} = workflowSlice.actions;

export default workflowSlice.reducer;
