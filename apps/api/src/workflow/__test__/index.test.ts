import { describe, it, expect, beforeEach } from "vitest";
import {
  registerWorkflow,
  updateWorkflow,
  removeWorkflow,
  getWorkflow,
  listWorkflows,
  triggerWorkflows,
  submitApproval,
  getInstance,
  listInstances,
  getWorkflowStats,
  clearWorkflows,
} from "../index.js";
import { clearDecisionAuditLog, queryDecisionAuditLog } from "../../audit/decisionAuditLogger.js";
import type { WorkflowDefinition } from "@afenda/meta-types";

beforeEach(() => {
  clearWorkflows();
  clearDecisionAuditLog();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleWorkflow(
  id: string,
  trigger: string,
  opts?: Partial<WorkflowDefinition>
): WorkflowDefinition {
  return {
    id,
    name: `Workflow ${id}`,
    trigger,
    steps: [
      {
        id: "step-notify",
        label: "Notify",
        type: "notification",
        config: { channel: "email" },
        terminal: true,
      },
    ],
    initialStepId: "step-notify",
    enabled: true,
    ...opts,
  };
}

function makeApprovalWorkflow(id: string, trigger: string): WorkflowDefinition {
  return {
    id,
    name: `Approval Workflow ${id}`,
    trigger,
    steps: [
      {
        id: "step-approve",
        label: "Manager Approval",
        type: "approval",
        config: { role: "manager" },
        nextStepId: "step-done",
        elseStepId: "step-rejected",
        terminal: false,
      },
      {
        id: "step-done",
        label: "Done",
        type: "notification",
        config: {},
        terminal: true,
      },
      {
        id: "step-rejected",
        label: "Rejected",
        type: "notification",
        config: {},
        terminal: true,
      },
    ],
    initialStepId: "step-approve",
    enabled: true,
  };
}

// ---------------------------------------------------------------------------
// Definition Registry
// ---------------------------------------------------------------------------

describe("workflow — definitions", () => {
  it("registers and retrieves a workflow definition", () => {
    const wf = makeSimpleWorkflow("wf-1", "sales.order.created");
    registerWorkflow(wf);
    expect(getWorkflow("wf-1")).toEqual(wf);
  });

  it("throws when registering a duplicate ID", () => {
    registerWorkflow(makeSimpleWorkflow("wf-dup", "sales.order.*"));
    expect(() => registerWorkflow(makeSimpleWorkflow("wf-dup", "sales.order.*"))).toThrow();
  });

  it("updateWorkflow replaces existing definition", () => {
    registerWorkflow(makeSimpleWorkflow("wf-upd", "sales.*.*", { enabled: false }));
    updateWorkflow(makeSimpleWorkflow("wf-upd", "sales.*.*", { enabled: true }));
    expect(getWorkflow("wf-upd")?.enabled).toBe(true);
  });

  it("removeWorkflow deletes and returns true", () => {
    registerWorkflow(makeSimpleWorkflow("wf-rm", "sales.*.*"));
    expect(removeWorkflow("wf-rm")).toBe(true);
    expect(getWorkflow("wf-rm")).toBeUndefined();
  });

  it("removeWorkflow returns false for unknown ID", () => {
    expect(removeWorkflow("nonexistent")).toBe(false);
  });

  it("listWorkflows returns all registered definitions", () => {
    registerWorkflow(makeSimpleWorkflow("wf-a", "sales.*.*"));
    registerWorkflow(makeSimpleWorkflow("wf-b", "hr.*.*", { enabled: false }));
    expect(listWorkflows().length).toBe(2);
  });

  it("listWorkflows filters by enabled", () => {
    registerWorkflow(makeSimpleWorkflow("wf-on", "sales.*.*", { enabled: true }));
    registerWorkflow(makeSimpleWorkflow("wf-off", "sales.*.*", { enabled: false }));
    expect(listWorkflows({ enabledOnly: true }).length).toBe(1);
  });

  it("listWorkflows filters by tenantId", () => {
    registerWorkflow(makeSimpleWorkflow("wf-ta", "sales.*.*", { tenantId: "tenant-a" }));
    registerWorkflow(makeSimpleWorkflow("wf-tb", "sales.*.*", { tenantId: "tenant-b" }));
    expect(listWorkflows({ tenantId: "tenant-a" }).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Triggering
// ---------------------------------------------------------------------------

describe("workflow — triggering", () => {
  it("triggers matching workflows and creates instances", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-trigger", "sales.order.created"));
    const instances = await triggerWorkflows("sales.order.created", {
      orderId: "o1",
    });
    expect(instances.length).toBe(1);
    expect(instances[0].workflowId).toBe("wf-trigger");
  });

  it("does not trigger disabled workflows", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-disabled", "sales.order.*", { enabled: false }));
    const instances = await triggerWorkflows("sales.order.created", {});
    expect(instances.length).toBe(0);
  });

  it("does not trigger workflows that don't match the event topic", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-mismatch", "hr.employee.*"));
    const instances = await triggerWorkflows("sales.order.created", {});
    expect(instances.length).toBe(0);
  });

  it("filters trigger by DSL condition when specified", async () => {
    registerWorkflow(
      makeSimpleWorkflow("wf-cond", "sales.order.*", {
        condition: "amount > 5000",
      })
    );

    const low = await triggerWorkflows("sales.order.created", { amount: 100 });
    expect(low.length).toBe(0);

    const high = await triggerWorkflows("sales.order.created", {
      amount: 10000,
    });
    expect(high.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Auto-advance (action, notification, integration steps)
// ---------------------------------------------------------------------------

describe("workflow — auto-advance", () => {
  it("auto-completes notification steps and reaches terminal state", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-autorun", "test.event.*"));
    const [instance] = await triggerWorkflows("test.event.fired", {});

    expect(instance.status).toBe("completed");
    expect(instance.history.length).toBeGreaterThan(0);
    expect(instance.completedAt).toBeTruthy();
  });

  it("auto-completes multi-step action sequence", async () => {
    registerWorkflow({
      id: "wf-multi",
      name: "Multi-Step",
      trigger: "multi.step.*",
      steps: [
        {
          id: "s1",
          label: "Action 1",
          type: "action",
          config: {},
          nextStepId: "s2",
          terminal: false,
        },
        {
          id: "s2",
          label: "Notify",
          type: "notification",
          config: {},
          terminal: true,
        },
      ],
      initialStepId: "s1",
      enabled: true,
    });

    const [instance] = await triggerWorkflows("multi.step.fire", {});
    expect(instance.status).toBe("completed");
    expect(instance.history.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Approval steps
// ---------------------------------------------------------------------------

describe("workflow — approvals", () => {
  it("pauses at an approval step with status waiting_approval", async () => {
    registerWorkflow(makeApprovalWorkflow("wf-appr", "order.approve.*"));
    const [instance] = await triggerWorkflows("order.approve.request", {});
    expect(instance.status).toBe("waiting_approval");
    expect(instance.currentStepId).toBe("step-approve");
  });

  it("approving advances to nextStepId and completes", async () => {
    registerWorkflow(makeApprovalWorkflow("wf-appr2", "order.approve.*"));
    const [paused] = await triggerWorkflows("order.approve.request", {});

    const approved = await submitApproval(paused.id, "approved", "manager@co.com");
    expect(approved.status).toBe("completed");
    expect(
      approved.history.some((h) => h.result === "completed" && h.actor === "manager@co.com")
    ).toBe(true);
  });

  it("rejecting advances to elseStepId and completes", async () => {
    registerWorkflow(makeApprovalWorkflow("wf-appr3", "order.approve.*"));
    const [paused] = await triggerWorkflows("order.approve.request", {});

    const rejected = await submitApproval(paused.id, "rejected", "manager@co.com", "Too expensive");
    expect(rejected.status).toBe("completed");
    expect(rejected.history.some((h) => h.result === "rejected")).toBe(true);
  });

  it("throws when submitting approval to a non-waiting instance", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-no-appr", "notif.event.*"));
    const [completed] = await triggerWorkflows("notif.event.fired", {});
    expect(completed.status).toBe("completed");

    await expect(submitApproval(completed.id, "approved", "actor")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Condition steps
// ---------------------------------------------------------------------------

describe("workflow — condition steps", () => {
  function makeConditionWorkflow(id: string): WorkflowDefinition {
    return {
      id,
      name: "Condition Workflow",
      trigger: "condition.test.*",
      steps: [
        {
          id: "s-check",
          label: "Check Amount",
          type: "condition",
          config: { expression: "amount > 1000" },
          nextStepId: "s-high",
          elseStepId: "s-low",
          terminal: false,
        },
        {
          id: "s-high",
          label: "High Value",
          type: "notification",
          config: {},
          terminal: true,
        },
        {
          id: "s-low",
          label: "Low Value",
          type: "notification",
          config: {},
          terminal: true,
        },
      ],
      initialStepId: "s-check",
      enabled: true,
    };
  }

  it("takes nextStepId branch when condition is true", async () => {
    registerWorkflow(makeConditionWorkflow("wf-cond-t"));
    const [instance] = await triggerWorkflows("condition.test.fire", {
      amount: 5000,
    });
    expect(instance.status).toBe("completed");
    expect(instance.history.some((h) => h.stepId === "s-high")).toBe(true);
  });

  it("takes elseStepId branch when condition is false", async () => {
    registerWorkflow(makeConditionWorkflow("wf-cond-f"));
    const [instance] = await triggerWorkflows("condition.test.fire", {
      amount: 50,
    });
    expect(instance.status).toBe("completed");
    expect(instance.history.some((h) => h.stepId === "s-low")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Instances & Stats
// ---------------------------------------------------------------------------

describe("workflow — instances and stats", () => {
  it("getInstance retrieves a created instance", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-inst", "inst.test.*"));
    const [created] = await triggerWorkflows("inst.test.fire", {});
    const fetched = getInstance(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
  });

  it("listInstances filters by workflowId", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-list-a", "list.event.*"));
    registerWorkflow(makeSimpleWorkflow("wf-list-b", "list.event.*"));

    await triggerWorkflows("list.event.fire", {});
    const forA = listInstances({ workflowId: "wf-list-a" });
    expect(forA.length).toBe(1);
    expect(forA[0].workflowId).toBe("wf-list-a");
  });

  it("listInstances filters by status", async () => {
    registerWorkflow(makeApprovalWorkflow("wf-stat", "stat.event.*"));
    await triggerWorkflows("stat.event.fire", {});

    const waiting = listInstances({ status: "waiting_approval" });
    expect(waiting.length).toBe(1);

    const completed = listInstances({ status: "completed" });
    expect(completed.length).toBe(0);
  });

  it("getWorkflowStats reflects definitions and running instances", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-stats1", "stats.*.*"));
    registerWorkflow(makeApprovalWorkflow("wf-stats2", "stats.*.*"));

    await triggerWorkflows("stats.event.fired", {});

    const stats = getWorkflowStats();
    expect(stats.definitions).toBe(2);
    expect(stats.instances).toBe(2);
    // wf-stats1 auto-completes; wf-stats2 waits for approval
    expect(stats.completed).toBe(1);
    expect(stats.running).toBeGreaterThanOrEqual(1);
  });
});

describe("workflow — decision audit hooks", () => {
  it("writes workflow_transitioned audit entries during execution", async () => {
    registerWorkflow(makeSimpleWorkflow("wf-audit", "audit.event.*", { tenantId: "tenant-audit" }));

    await triggerWorkflows("audit.event.fire", { tenantId: "tenant-audit" });

    const logs = queryDecisionAuditLog({
      tenantId: "tenant-audit",
      eventType: "workflow_transitioned",
      scope: "workflow.wf-audit",
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((entry) => entry.decision.reasoning?.includes("started"))).toBe(true);
    expect(logs.some((entry) => entry.decision.output.toStatus === "completed")).toBe(true);
  });

  it("writes workflow_transitioned audit entries for human approval decisions", async () => {
    registerWorkflow(makeApprovalWorkflow("wf-audit-approval", "audit.approval.*"));
    const [instance] = await triggerWorkflows("audit.approval.request", {
      tenantId: "tenant-approval",
    });

    await submitApproval(instance.id, "approved", "approver@acme.com", "Looks good");

    const logs = queryDecisionAuditLog({
      tenantId: "tenant-approval",
      eventType: "workflow_transitioned",
      scope: "workflow.wf-audit-approval",
    });

    expect(logs.some((entry) => entry.userId === "approver@acme.com")).toBe(true);
    expect(logs.some((entry) => entry.decision.input.decision === "approved")).toBe(true);
  });
});
