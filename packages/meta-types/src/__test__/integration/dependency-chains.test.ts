/**
 * Cross-domain dependency chain tests.
 *
 * Design intent: domain contracts must compose without adapters. These tests bind
 * schema, layout, policy, compiler, workflow, platform, events, and inventory types together.
 * If a test fails, fix the domain contracts — never weaken the assertions here.
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type { TruthModel, MutationPolicyDefinition, ProjectionDefinition } from "../../compiler/truth-model.js";
import type { TransitionEvent } from "../../compiler/state-machine.js";
import type { DomainEvent } from "../../events/types.js";
import type { EventTransitionBinding } from "../../events/types.js";
import type { InventoryItem, StockMovement } from "../../inventory/types.js";
import type { LayoutDefinition } from "../../layout/types.js";
import type { ModelDefinition } from "../../module/types.js";
import type { TenantDefinition } from "../../platform/tenant.js";
import type { InvariantDefinition, InvariantViolation, InvariantTriggerOperation } from "../../policy/invariants.js";
import type {
  MutationPolicyResolutionInput,
  DirectMutationPolicyCheckInput,
  DirectMutationPolicyResult,
  MutationOperation,
} from "../../policy/mutation-policy.js";
import type { PolicyDefinition, PolicyViolation, PolicyEvaluationResult } from "../../policy/types.js";
import type { SimulationScenario, PolicySimulationResult, SimulationReport } from "../../policy/sandbox.js";
import type { ModelMeta } from "../../schema/types.js";
import type { WorkflowDefinition } from "../../workflow/types.js";

const invoiceMeta: ModelMeta = {
  model: "Invoice",
  label: "Invoice",
  label_plural: "Invoices",
  fields: [
    { name: "status", type: "string", label: "Status" },
    { name: "customerId", type: "uuid", label: "Customer" },
  ],
  views: {},
  actions: [],
};

describe("cross-domain composition", () => {
  it("module, layout, policy, and event contracts compose around the same model", () => {
    const modelDefinition: ModelDefinition = {
      name: "Invoice",
      label: "Invoice",
      meta: invoiceMeta,
    };

    const layout: LayoutDefinition = {
      id: "invoice-form",
      model: modelDefinition.meta.model,
      name: "Invoice Form",
      viewType: "form",
      root: {
        type: "section",
        title: "Main",
        children: [{ type: "field", fieldId: "status" }],
      },
      isDefault: true,
    };

    const invariant: InvariantDefinition = {
      id: "invoice-status-required",
      description: "Invoice status must be populated",
      targetModel: modelDefinition.meta.model,
      scope: "entity",
      severity: "error",
      condition: { field: "status", operator: "is_not_empty" },
      triggerOn: ["create", "update"],
      tenantOverridable: false,
    };

    const transitionEvent: TransitionEvent = "approve";
    const binding: EventTransitionBinding = {
      eventType: "invoice.approved",
      model: invariant.targetModel,
      transitionEvent,
    };

    expect(layout.model).toBe(modelDefinition.meta.model);
    expect(invariant.targetModel).toBe(modelDefinition.meta.model);
    expect(binding.model).toBe("Invoice");
    expect(binding.transitionEvent).toBe("approve");
  });

  it("workflow, tenant, and inventory contracts share compatible tenant identifiers", () => {
    const tenant: TenantDefinition = {
      id: "tenant-acme",
      name: "Acme",
      isolationStrategy: "logical",
      enabled: true,
    };

    const workflow: WorkflowDefinition = {
      id: "wf-invoice-approval",
      name: "Invoice Approval",
      trigger: "invoice.created",
      steps: [
        {
          id: "step-review",
          label: "Review",
          type: "approval",
          config: {},
        },
      ],
      initialStepId: "step-review",
      enabled: true,
      tenantId: tenant.id,
    };

    const inventoryItem: InventoryItem = {
      id: "item-001",
      sku: "SKU-001",
      name: "Tracked Item",
      unitOfMeasure: "each",
      trackingMethod: "serial",
      tenantId: tenant.id,
      enabled: true,
    };

    const movement: StockMovement = {
      id: "mov-001",
      type: "receipt",
      status: "draft",
      tenantId: tenant.id,
      lines: [
        {
          id: "line-001",
          itemId: inventoryItem.id,
          quantity: 1,
          unitOfMeasure: inventoryItem.unitOfMeasure,
          serialNumber: "SN-001",
        },
      ],
    };

    expect(workflow.tenantId).toBe(tenant.id);
    expect(inventoryItem.tenantId).toBe(tenant.id);
    expect(movement.tenantId).toBe(tenant.id);
    expect(movement.lines[0]?.itemId).toBe(inventoryItem.id);
  });

  it("preserves core string contracts across domains at the type level", () => {
    expectTypeOf<LayoutDefinition["model"]>().toEqualTypeOf<ModelMeta["model"]>();
    expectTypeOf<WorkflowDefinition["tenantId"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<InventoryItem["tenantId"]>().toEqualTypeOf<TenantDefinition["id"]>();
    expectTypeOf<StockMovement["tenantId"]>().toEqualTypeOf<TenantDefinition["id"]>();
    expectTypeOf<EventTransitionBinding["transitionEvent"]>().toEqualTypeOf<TransitionEvent>();
  });
});

describe("compiler → policy mutation chain", () => {
  it("TruthModel mutationPolicies feed into MutationPolicyResolutionInput without adaptation", () => {
    const policyDef: MutationPolicyDefinition = {
      id: "policy-direct-invoice",
      mutationPolicy: "direct",
      appliesTo: ["Invoice"],
      directMutationOperations: ["create", "update"],
    };

    const truthModel: TruthModel = {
      entities: ["Invoice"],
      events: ["invoice.created", "invoice.updated"],
      invariants: [],
      relationships: [],
      policies: [],
      mutationPolicies: [policyDef],
    };

    // Resolution input is constructed directly from truth model fields — no adapter
    const resolutionInput: MutationPolicyResolutionInput = {
      model: truthModel.entities[0]!,
      policies: truthModel.mutationPolicies ?? [],
    };

    expect(resolutionInput.model).toBe("Invoice");
    expect(resolutionInput.policies).toHaveLength(1);
    expect(resolutionInput.policies[0]?.id).toBe("policy-direct-invoice");
  });

  it("DirectMutationPolicyCheckInput extends MutationPolicyResolutionInput with operation", () => {
    const policies: MutationPolicyDefinition[] = [
      {
        id: "mp-create-only",
        mutationPolicy: "direct",
        appliesTo: ["Order"],
        directMutationOperations: ["create"],
      },
    ];

    const checkInput: DirectMutationPolicyCheckInput = {
      model: "Order",
      policies,
      operation: "create",
    };

    const result: DirectMutationPolicyResult = {
      allowed: true,
      reason: "direct mutation permitted",
      policy: policies[0],
    };

    expect(checkInput.operation).toBe("create");
    expect(result.allowed).toBe(true);
    expect(result.policy?.id).toBe("mp-create-only");
  });

  it("DirectMutationPolicyResult blocked path carries correct context", () => {
    const blockingPolicy: MutationPolicyDefinition = {
      id: "mp-event-only",
      mutationPolicy: "event-only",
      appliesTo: ["Ledger"],
      requiredEvents: ["ledger.entry.created"],
    };

    const blockedResult: DirectMutationPolicyResult = {
      allowed: false,
      reason: "event-only policy prohibits direct mutation",
      policy: blockingPolicy,
    };

    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.policy?.mutationPolicy).toBe("event-only");
    expect(blockedResult.policy?.requiredEvents).toContain("ledger.entry.created");
  });

  it("MutationOperation is a structural subset of InvariantTriggerOperation", () => {
    // All mutation operations must be valid trigger operations — verified at type level
    const mutationOps: MutationOperation[] = ["create", "update", "delete"];
    const triggerOps: InvariantTriggerOperation[] = ["create", "update", "delete", "transition"];

    const mutationAsSubset = mutationOps.every((op) =>
      (triggerOps as string[]).includes(op),
    );

    expect(mutationAsSubset).toBe(true);
    // "transition" is NOT a MutationOperation — it's invariant-only
    expect(mutationOps).not.toContain("transition");
    expect(triggerOps).toContain("transition");
  });
});

describe("invariant → simulation sandbox chain", () => {
  it("InvariantDefinition and SimulationScenario reference the same entity surface", () => {
    const invariant: InvariantDefinition = {
      id: "inv-stock-positive",
      description: "Stock on hand must never go negative",
      targetModel: "StockLedger",
      scope: "entity",
      severity: "fatal",
      condition: { field: "onHandQuantity", operator: "greater_than_or_equal", value: 0 },
      triggerOn: ["update"],
      tenantOverridable: false,
    };

    const scenario: SimulationScenario = {
      id: "sim-001",
      name: "Negative stock simulation",
      entity: invariant.targetModel,
      record: { id: "ledger-1", onHandQuantity: -5 },
      actor: { uid: "user-01", roles: ["warehouse-manager"] },
      operation: "update",
    };

    expect(scenario.entity).toBe(invariant.targetModel);
    expect(scenario.entity).toBe("StockLedger");
  });

  it("PolicySimulationResult wraps a PolicyDefinition and resolves to the same violation shape", () => {
    const policy: PolicyDefinition = {
      id: "pol-stock-guard",
      scope: "StockLedger",
      name: "Stock Guard",
      validate: "onHandQuantity >= 0",
      message: "Stock cannot be negative",
      severity: "error",
      enabled: true,
    };

    const violation: PolicyViolation = {
      policyId: policy.id,
      policyName: policy.name,
      message: policy.message,
      severity: policy.severity,
    };

    const simResult: PolicySimulationResult = {
      policy,
      applicable: true,
      passed: false,
      violation,
      evaluationTimeMs: 2,
    };

    expect(simResult.policy.id).toBe(violation.policyId);
    expect(simResult.passed).toBe(false);
    expect(simResult.violation?.severity).toBe("error");
  });

  it("SimulationReport aggregates PolicySimulationResults under a single scenario", () => {
    const scenario: SimulationScenario = {
      id: "sim-002",
      name: "Approval gate simulation",
      entity: "SalesOrder",
      record: { id: "so-1", approved: false },
      actor: { uid: "user-02", roles: ["sales-rep"] },
      operation: "approve",
    };

    const passingResult: PolicySimulationResult = {
      policy: {
        id: "pol-sale-rep",
        scope: "SalesOrder",
        name: "Sales Rep Approval",
        validate: "actor.roles.includes('sales-rep')",
        message: "Must be a sales rep",
        severity: "error",
        enabled: true,
      },
      applicable: true,
      passed: true,
      evaluationTimeMs: 1,
    };

    const aggregate: PolicyEvaluationResult = {
      passed: true,
      errors: [],
      warnings: [],
      info: [],
      evaluationTimeMs: 1,
    };

    const report: SimulationReport = {
      scenario,
      results: [passingResult],
      aggregate,
      totalTimeMs: 1,
      timestamp: "2024-01-01T00:00:00.000Z",
    };

    expect(report.scenario.id).toBe("sim-002");
    expect(report.results).toHaveLength(1);
    expect(report.aggregate.passed).toBe(true);
    expect(report.aggregate.errors).toHaveLength(0);
  });

  it("InvariantViolation and PolicyViolation share compatible severity surface at type level", () => {
    expectTypeOf<InvariantViolation["severity"]>().toEqualTypeOf<PolicyViolation["severity"]>();
  });
});

describe("truth-model → event sourcing → projection chain", () => {
  it("ProjectionDefinition handler processes a DomainEvent and returns updated state", () => {
    interface InvoiceState {
      id: string;
      status: "draft" | "approved" | "cancelled";
      total: number;
    }

    const projection: ProjectionDefinition<InvoiceState> = {
      name: "invoice-status-projection",
      source: "Invoice",
      consistency: "realtime",
      version: { version: 1, schemaHash: "abc123" },
      handler: (state, event) => {
        if (event.eventType === "invoice.approved") {
          return { ...state, status: "approved" };
        }
        return state;
      },
    };

    const initialState: InvoiceState = { id: "inv-1", status: "draft", total: 500 };
    const approvalEvent: DomainEvent = {
      id: "evt-001",
      aggregateType: "Invoice",
      aggregateId: "inv-1",
      eventType: "invoice.approved",
      payload: {},
      version: 2,
      timestamp: "2024-01-01T12:00:00.000Z",
    };

    const nextState = projection.handler(initialState, approvalEvent);

    expect(nextState.status).toBe("approved");
    expect(nextState.id).toBe("inv-1");
    expect(nextState.total).toBe(500);
  });

  it("TruthModel events list drives the projection source contract", () => {
    const truthModel: TruthModel = {
      entities: ["Invoice"],
      events: ["invoice.created", "invoice.approved", "invoice.cancelled"],
      invariants: ["inv-status-required"],
      relationships: [],
      policies: [],
    };

    const projection: ProjectionDefinition = {
      name: "invoice-lifecycle",
      source: truthModel.entities[0]!,
      consistency: "materialized",
      version: { version: 2, schemaHash: "def456" },
      handler: (state, _event) => state,
    };

    // Source must be one of the truth model's entity names
    expect(truthModel.entities).toContain(projection.source);
    expect(truthModel.events).toHaveLength(3);
    expect(projection.consistency).toBe("materialized");
  });

  it("TruthModel mutationPolicies and events are both required for event-only policies", () => {
    const eventOnlyPolicy: MutationPolicyDefinition = {
      id: "mp-event-ledger",
      mutationPolicy: "event-only",
      appliesTo: ["GeneralLedger"],
      requiredEvents: ["ledger.entry.created"],
    };

    const model: TruthModel = {
      entities: ["GeneralLedger"],
      events: ["ledger.entry.created"],
      invariants: [],
      relationships: [],
      policies: [],
      mutationPolicies: [eventOnlyPolicy],
    };

    const requiredEvent = eventOnlyPolicy.requiredEvents?.[0];
    expect(model.events).toContain(requiredEvent);
    expect(model.mutationPolicies?.[0]?.mutationPolicy).toBe("event-only");
  });
});
