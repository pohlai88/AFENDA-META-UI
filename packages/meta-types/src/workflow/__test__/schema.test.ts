/**
 * Workflow Zod schema contract tests.
 *
 * Design intent: WorkflowDefinition and WorkflowInstance contracts drive the
 * entire workflow orchestration engine. Schema changes silently breaking callers
 * is the highest-risk class of regression here. Fix the code, not the test.
 */
import { describe, expect, it } from "vitest";

import {
  WorkflowDefinitionSchema,
  WorkflowInstanceSchema,
  WorkflowStatusSchema,
  WorkflowStepExecutionSchema,
  WorkflowStepSchema,
  WorkflowStepTypeSchema,
} from "../types.schema.js";

// ---------------------------------------------------------------------------
// WorkflowStepTypeSchema — enum validation
// ---------------------------------------------------------------------------

describe("WorkflowStepTypeSchema", () => {
  it("parses all six step types", () => {
    const stepTypes = [
      "approval",
      "action",
      "condition",
      "timer",
      "notification",
      "integration",
    ] as const;
    for (const t of stepTypes) {
      expect(WorkflowStepTypeSchema.safeParse(t).success, `step type '${t}'`).toBe(true);
    }
  });

  it("contains exactly 6 step types (exhaustiveness gate)", () => {
    expect(WorkflowStepTypeSchema.options).toHaveLength(6);
  });

  it("rejects unknown step type", () => {
    expect(WorkflowStepTypeSchema.safeParse("script").success).toBe(false);
    expect(WorkflowStepTypeSchema.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WorkflowStatusSchema — enum validation
// ---------------------------------------------------------------------------

describe("WorkflowStatusSchema", () => {
  it("parses all expected status values", () => {
    const statuses = [
      "pending",
      "running",
      "waiting_approval",
      "waiting_timer",
      "completed",
      "rejected",
      "failed",
    ] as const;
    for (const s of statuses) {
      expect(WorkflowStatusSchema.safeParse(s).success, `status '${s}'`).toBe(true);
    }
  });

  it("contains exactly 7 status values (exhaustiveness gate)", () => {
    expect(WorkflowStatusSchema.options).toHaveLength(7);
  });

  it("rejects unknown status", () => {
    expect(WorkflowStatusSchema.safeParse("in_progress").success).toBe(false);
    expect(WorkflowStatusSchema.safeParse("paused").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WorkflowStepSchema
// ---------------------------------------------------------------------------

describe("WorkflowStepSchema — valid inputs", () => {
  it("parses a minimal step with required fields only", () => {
    const result = WorkflowStepSchema.safeParse({
      id: "step-001",
      label: "Manager Approval",
      type: "approval",
      config: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("step-001");
      expect(result.data.type).toBe("approval");
    }
  });

  it("parses a step with a nextStepId (non-terminal step)", () => {
    const result = WorkflowStepSchema.safeParse({
      id: "step-001",
      label: "Check Condition",
      type: "condition",
      config: { expression: "amount > 10000" },
      nextStepId: "step-002",
      elseStepId: "step-003",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextStepId).toBe("step-002");
      expect(result.data.elseStepId).toBe("step-003");
    }
  });

  it("parses a terminal step", () => {
    const result = WorkflowStepSchema.safeParse({
      id: "step-final",
      label: "Complete",
      type: "action",
      config: { action: "close_ticket" },
      terminal: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.terminal).toBe(true);
    }
  });

  it("accepts arbitrary key-value pairs in config", () => {
    const result = WorkflowStepSchema.safeParse({
      id: "step-notif",
      label: "Notify Team",
      type: "notification",
      config: {
        template: "approval_requested",
        recipients: ["manager@co.com"],
        channels: ["email", "slack"],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("WorkflowStepSchema — invalid inputs", () => {
  it("rejects missing id", () => {
    expect(WorkflowStepSchema.safeParse({ label: "X", type: "action", config: {} }).success).toBe(
      false
    );
  });

  it("rejects missing label", () => {
    expect(WorkflowStepSchema.safeParse({ id: "s1", type: "action", config: {} }).success).toBe(
      false
    );
  });

  it("rejects invalid type", () => {
    expect(
      WorkflowStepSchema.safeParse({ id: "s1", label: "X", type: "script", config: {} }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WorkflowDefinitionSchema
// ---------------------------------------------------------------------------

describe("WorkflowDefinitionSchema — valid inputs", () => {
  it("parses a minimal enabled workflow definition", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: "wf-onboard",
      name: "Employee Onboarding",
      trigger: "employee.created",
      steps: [{ id: "step-1", label: "Welcome Email", type: "notification", config: {} }],
      initialStepId: "step-1",
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("wf-onboard");
      expect(result.data.enabled).toBe(true);
      expect(result.data.steps).toHaveLength(1);
    }
  });

  it("parses a disabled workflow with optional condition", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: "wf-credit",
      name: "Credit Approval",
      trigger: "salesOrder.submitted",
      condition: "amount > 50000",
      steps: [],
      initialStepId: "step-1",
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.condition).toBe("amount > 50000");
      expect(result.data.enabled).toBe(false);
    }
  });

  it("accepts null tenantId (global workflow shared across tenants)", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: "wf-global",
      name: "Global Workflow",
      trigger: "system.startup",
      steps: [],
      initialStepId: "s1",
      enabled: true,
      tenantId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBeNull();
    }
  });

  it("accepts a tenant-scoped workflow", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: "wf-tenant-specific",
      name: "Custom Approval",
      trigger: "purchase.submitted",
      steps: [],
      initialStepId: "s1",
      enabled: true,
      tenantId: "acme-corp",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe("acme-corp");
    }
  });
});

describe("WorkflowDefinitionSchema — invalid inputs", () => {
  it("rejects missing id", () => {
    expect(
      WorkflowDefinitionSchema.safeParse({
        name: "X",
        trigger: "y",
        steps: [],
        initialStepId: "s1",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects missing trigger", () => {
    expect(
      WorkflowDefinitionSchema.safeParse({
        id: "wf",
        name: "X",
        steps: [],
        initialStepId: "s1",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects non-boolean enabled", () => {
    expect(
      WorkflowDefinitionSchema.safeParse({
        id: "wf",
        name: "X",
        trigger: "y",
        steps: [],
        initialStepId: "s1",
        enabled: "yes",
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WorkflowStepExecutionSchema
// ---------------------------------------------------------------------------

describe("WorkflowStepExecutionSchema — valid inputs", () => {
  it("parses a completed step execution", () => {
    const result = WorkflowStepExecutionSchema.safeParse({
      stepId: "step-1",
      stepLabel: "Manager Approval",
      executedAt: "2026-01-15T14:30:00Z",
      result: "completed",
      actor: "manager@acme.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result).toBe("completed");
    }
  });

  it("parses a rejected step with reason", () => {
    const result = WorkflowStepExecutionSchema.safeParse({
      stepId: "step-approval",
      stepLabel: "Approval Gate",
      executedAt: "2026-01-16T09:00:00Z",
      result: "rejected",
      actor: "director@acme.com",
      reason: "Budget exceeded Q1 limits",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Budget exceeded Q1 limits");
    }
  });

  it("parses all valid result types", () => {
    for (const r of ["completed", "rejected", "skipped", "error"] as const) {
      const res = WorkflowStepExecutionSchema.safeParse({
        stepId: "s1",
        stepLabel: "Step",
        executedAt: "2026-01-01T00:00:00Z",
        result: r,
      });
      expect(res.success, `result='${r}'`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// WorkflowInstanceSchema
// ---------------------------------------------------------------------------

describe("WorkflowInstanceSchema — valid inputs", () => {
  it("parses a running workflow instance", () => {
    const result = WorkflowInstanceSchema.safeParse({
      id: "wfi-001",
      workflowId: "wf-onboard",
      currentStepId: "step-2",
      status: "running",
      context: { employeeId: "emp-123", department: "engineering" },
      history: [
        {
          stepId: "step-1",
          stepLabel: "Welcome Email",
          executedAt: "2026-01-15T08:00:00Z",
          result: "completed",
        },
      ],
      startedAt: "2026-01-15T07:59:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("running");
      expect(result.data.history).toHaveLength(1);
      expect(result.data.completedAt).toBeUndefined();
    }
  });

  it("parses a completed instance with completedAt", () => {
    const result = WorkflowInstanceSchema.safeParse({
      id: "wfi-002",
      workflowId: "wf-credit",
      currentStepId: "step-final",
      status: "completed",
      context: {},
      history: [],
      startedAt: "2026-01-14T10:00:00Z",
      completedAt: "2026-01-14T11:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completedAt).toBe("2026-01-14T11:00:00Z");
    }
  });

  it("rejects instance with an invalid status value", () => {
    const result = WorkflowInstanceSchema.safeParse({
      id: "wfi-003",
      workflowId: "wf-x",
      currentStepId: "step-1",
      status: "in_progress",
      context: {},
      history: [],
      startedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
