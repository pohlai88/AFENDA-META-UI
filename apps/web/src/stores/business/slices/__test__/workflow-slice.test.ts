/**
 * Workflow Slice Unit Tests
 * =========================
 * Tests for Redux workflow state management.
 */

import { describe, expect, it } from "vitest";
import workflowReducer, {
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
  selectPendingInstances,
  selectCompletedInstances,
  selectPendingApprovals,
  selectWorkflowIsLoading,
  type WorkflowState,
} from "../workflow-slice";
import type { WorkflowInstance } from "@afenda/meta-types/workflow";
const mockInstance: WorkflowInstance = {
  id: "wf_1",
  workflowId: "approval_workflow",
  currentStepId: "step_1",
  status: "pending",
  context: { orderId: "SO-001" },
  history: [],
  startedAt: new Date().toISOString(),
};

const initialState: WorkflowState = {
  instances: new Map(),
  activeInstanceId: null,
  approvalTasks: [],
  isLoading: false,
  error: null,
  lastUpdatedAt: null,
};

type WorkflowRootState = {
  workflow: WorkflowState;
};

describe("workflow-slice", () => {
  describe("instance lifecycle", () => {
    it("handles loadInstancesStart", () => {
      const state = workflowReducer(initialState, loadInstancesStart());
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("handles loadInstancesSuccess", () => {
      const instances = [mockInstance];
      const state = workflowReducer(initialState, loadInstancesSuccess({ instances }));

      expect(state.isLoading).toBe(false);
      expect(state.instances.size).toBe(1);
      expect(state.instances.get("wf_1")).toEqual(mockInstance);
    });

    it("handles loadInstancesFailure", () => {
      const state = workflowReducer(initialState, loadInstancesFailure("Network error"));

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Network error");
    });

    it("handles createInstanceStart", () => {
      const state = workflowReducer(initialState, createInstanceStart());
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("handles createInstanceSuccess", () => {
      const state = workflowReducer(initialState, createInstanceSuccess(mockInstance));

      expect(state.isLoading).toBe(false);
      expect(state.instances.size).toBe(1);
      expect(state.activeInstanceId).toBe("wf_1");
    });

    it("handles createInstanceFailure", () => {
      const state = workflowReducer(initialState, createInstanceFailure("Failed to create"));

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Failed to create");
    });
  });

  describe("instance updates", () => {
    it("handles updateInstanceStart", () => {
      const state = workflowReducer(initialState, updateInstanceStart());
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("handles updateInstanceSuccess", () => {
      const loaded = workflowReducer(
        initialState,
        loadInstancesSuccess({ instances: [mockInstance] })
      );

      const updated = workflowReducer(
        loaded,
        updateInstanceSuccess({
          ...mockInstance,
          status: "waiting_approval",
        })
      );

      expect(updated.isLoading).toBe(false);
      expect(updated.instances.get("wf_1")?.status).toBe("waiting_approval");
    });

    it("handles updateInstanceFailure", () => {
      const state = workflowReducer(initialState, updateInstanceFailure("Update failed"));

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Update failed");
    });

    it("clears activeInstanceId when instance completes", () => {
      const loaded = workflowReducer(
        initialState,
        loadInstancesSuccess({ instances: [mockInstance] })
      );
      const active = workflowReducer(loaded, setActiveInstance("wf_1"));

      const completed = workflowReducer(
        active,
        updateInstanceSuccess({
          ...mockInstance,
          status: "completed",
          completedAt: new Date().toISOString(),
        })
      );

      expect(completed.activeInstanceId).toBeNull();
    });
  });

  describe("instance queries", () => {
    it("setActiveInstance updates activeInstanceId", () => {
      const state = workflowReducer(initialState, setActiveInstance("wf_1"));
      expect(state.activeInstanceId).toBe("wf_1");
    });

    it("clearInstance removes instance and clears active", () => {
      const loaded = workflowReducer(
        initialState,
        loadInstancesSuccess({ instances: [mockInstance] })
      );
      const active = workflowReducer(loaded, setActiveInstance("wf_1"));

      const cleared = workflowReducer(active, clearInstance("wf_1"));

      expect(cleared.instances.size).toBe(0);
      expect(cleared.activeInstanceId).toBeNull();
    });
  });

  describe("approval tasks", () => {
    it("adds approval tasks", () => {
      const state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      expect(state.approvalTasks).toHaveLength(1);
      expect(state.approvalTasks[0].instanceId).toBe("wf_1");
    });

    it("prevents duplicate approval tasks", () => {
      let state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      state = workflowReducer(
        state,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      expect(state.approvalTasks).toHaveLength(1);
    });

    it("removes approval tasks", () => {
      let state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      state = workflowReducer(state, removeApprovalTask("wf_1"));

      expect(state.approvalTasks).toHaveLength(0);
    });

    it("updates approval tasks", () => {
      let state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      state = workflowReducer(
        state,
        updateApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
          decision: "approved",
          actor: "manager@acme.com",
        })
      );

      expect(state.approvalTasks[0].decision).toBe("approved");
      expect(state.approvalTasks[0].actor).toBe("manager@acme.com");
    });

    it("clears all approval tasks", () => {
      let state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      state = workflowReducer(
        state,
        addApprovalTask({
          instanceId: "wf_2",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Director Approval",
        })
      );

      state = workflowReducer(state, clearApprovalTasks());

      expect(state.approvalTasks).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("clears errors", () => {
      let state = workflowReducer(initialState, loadInstancesFailure("Error occurred"));

      expect(state.error).toBe("Error occurred");

      state = workflowReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe("selectors", () => {
    it("selectPendingInstances returns only pending workflow instances", () => {
      const rootState: WorkflowRootState = {
        workflow: workflowReducer(
          initialState,
          loadInstancesSuccess({
            instances: [
              mockInstance,
              { ...mockInstance, id: "wf_2", status: "completed" as const },
              { ...mockInstance, id: "wf_3", status: "running" as const },
            ],
          })
        ),
      };

      const pending = selectPendingInstances(rootState);

      expect(pending).toHaveLength(2);
      expect(pending.map((i) => i.id)).toContain("wf_1");
      expect(pending.map((i) => i.id)).toContain("wf_3");
    });

    it("selectCompletedInstances returns only completed workflow instances", () => {
      const rootState: WorkflowRootState = {
        workflow: workflowReducer(
          initialState,
          loadInstancesSuccess({
            instances: [
              mockInstance,
              { ...mockInstance, id: "wf_2", status: "completed" as const },
              { ...mockInstance, id: "wf_3", status: "rejected" as const },
              { ...mockInstance, id: "wf_4", status: "failed" as const },
            ],
          })
        ),
      };

      const completed = selectCompletedInstances(rootState);

      expect(completed).toHaveLength(3);
    });

    it("selectPendingApprovals returns all approval tasks", () => {
      let state = workflowReducer(
        initialState,
        addApprovalTask({
          instanceId: "wf_1",
          workflowId: "approval_workflow",
          currentStepId: "approval_step",
          stepLabel: "Manager Approval",
        })
      );

      const rootState: WorkflowRootState = { workflow: state };
      const approvals = selectPendingApprovals(rootState);

      expect(approvals).toHaveLength(1);
    });

    it("selectWorkflowIsLoading returns loading state", () => {
      const rootState: WorkflowRootState = {
        workflow: workflowReducer(initialState, loadInstancesStart()),
      };

      const isLoading = selectWorkflowIsLoading(rootState);
      expect(isLoading).toBe(true);
    });
  });
});
