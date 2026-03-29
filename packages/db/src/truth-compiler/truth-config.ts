/**
 * @module truth-compiler/truth-config
 * @description Registered truth models for the AFENDA sales bounded context.
 *
 * This file is the single source of truth for all entity defs, invariant registries,
 * and state machine definitions that feed into the compiler pipeline.
 *
 * To add a new bounded context:
 *   1. Define EntityDef[] for its tables.
 *   2. Define InvariantRegistry[] for its invariants.
 *   3. Define StateMachineDefinition[] for its lifecycle transitions.
 *   4. Export a TruthModel manifest referencing all model IDs.
 *   5. Add registries to the COMPILER_INPUT below.
 *
 * @layer db/truth-compiler
 */

import type { EntityDef, StateMachineDefinition } from "@afenda/meta-types/compiler";
import type {
  CrossInvariantDefinition,
  InvariantRegistry,
  MutationPolicyDefinition,
} from "@afenda/meta-types/policy";
import type { TruthModel } from "@afenda/meta-types/compiler";

import type { NormalizerInput } from "./normalizer.js";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const SALES_TRUTH_MODEL: TruthModel = {
  entities: ["consignment_agreement", "sales_order", "subscription"],
  events: [
    "consignment_agreement.activated",
    "consignment_agreement.expired",
    "consignment_agreement.terminated",
    "sales_order.submitted",
    "sales_order.confirmed",
    "sales_order.cancelled",
    "subscription.activated",
    "subscription.paused",
    "subscription.renewed",
    "subscription.cancelled",
    "subscription.direct_update",
  ],
  invariants: [
    "sales.consignment_agreement.active_has_partner",
    "sales.sales_order.confirmed_amount_positive",
  ],
  crossInvariants: ["sales.cross.active_subscription_requires_sale_order"],
  relationships: ["consignment_agreement_to_sales_order"],
  policies: [],
  mutationPolicies: [
    {
      id: "sales.sales_order.dual_write_rollout",
      mutationPolicy: "dual-write",
      appliesTo: ["sales_order"],
      requiredEvents: ["sales_order.submitted", "sales_order.confirmed", "sales_order.cancelled"],
      description:
        "Sales orders emit append-only domain events while legacy direct writes remain enabled.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Entity Definitions
// ---------------------------------------------------------------------------

export const SALES_ENTITY_DEFS: EntityDef[] = [
  {
    name: "consignment_agreement",
    table: "consignment_agreements",
    fields: {
      id: { type: "uuid", primary: true, defaultSql: "gen_random_uuid()" },
      status: { type: "text", nullable: false },
      partner_id: {
        type: "uuid",
        nullable: false,
        references: { table: "partners", column: "id" },
      },
      tenant_id: { type: "integer", nullable: false },
      created_at: { type: "timestamp", defaultSql: "now()" },
    },
  },
  {
    name: "sales_order",
    table: "sales_orders",
    fields: {
      id: { type: "uuid", primary: true, defaultSql: "gen_random_uuid()" },
      status: { type: "text", nullable: false },
      amount_total: { type: "numeric", nullable: false },
      tenant_id: { type: "integer", nullable: false },
      created_at: { type: "timestamp", defaultSql: "now()" },
    },
  },
  {
    name: "subscription",
    table: "subscriptions",
    fields: {
      id: { type: "uuid", primary: true, defaultSql: "gen_random_uuid()" },
      status: { type: "text", nullable: false },
      recurring_total: { type: "numeric", nullable: false },
      sales_order_id: {
        type: "uuid",
        nullable: true,
        references: { table: "sales_orders", column: "id" },
      },
      close_reason_id: { type: "uuid", nullable: true },
      tenant_id: { type: "integer", nullable: false },
      created_at: { type: "timestamp", defaultSql: "now()" },
    },
  },
];

// ---------------------------------------------------------------------------
// Invariant Registries
// ---------------------------------------------------------------------------

export const SALES_INVARIANT_REGISTRIES: InvariantRegistry[] = [
  {
    model: "consignment_agreement",
    invariants: [
      {
        id: "sales.consignment_agreement.active_has_partner",
        description: "Active consignment agreements must have a partner assigned",
        targetModel: "consignment_agreement",
        scope: "entity",
        severity: "error",
        condition: {
          logic: "or",
          conditions: [
            { field: "status", operator: "neq", value: "active" },
            { field: "partner_id", operator: "is_not_empty" },
          ],
        },
        triggerOn: ["create", "update", "transition"],
        tenantOverridable: false,
      },
    ],
  },
  {
    model: "sales_order",
    invariants: [
      {
        id: "sales.sales_order.confirmed_amount_positive",
        description: "Confirmed orders must have a positive total amount",
        targetModel: "sales_order",
        scope: "entity",
        severity: "fatal",
        condition: {
          logic: "or",
          conditions: [
            { field: "status", operator: "neq", value: "sale" },
            { field: "amount_total", operator: "gt", value: 0 },
          ],
        },
        triggerOn: ["update", "transition"],
        tenantOverridable: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// State Machine Definitions
// ---------------------------------------------------------------------------

export const SALES_STATE_MACHINES: StateMachineDefinition[] = [
  {
    model: "consignment_agreement",
    stateField: "status",
    states: ["draft", "active", "expired", "terminated"],
    initialState: "draft",
    terminalStates: ["expired", "terminated"],
    transitions: [
      { from: "draft", event: "activate", to: "active" },
      { from: "active", event: "expire", to: "expired" },
      { from: "draft", event: "terminate", to: "terminated" },
      { from: "active", event: "terminate", to: "terminated" },
    ],
    tenantExtensible: false,
  },
  {
    model: "sales_order",
    stateField: "status",
    states: ["draft", "sent", "sale", "done", "cancel"],
    initialState: "draft",
    terminalStates: ["done", "cancel"],
    transitions: [
      { from: "draft", event: "send", to: "sent" },
      { from: "draft", event: "confirm", to: "sale" },
      { from: "sent", event: "confirm", to: "sale" },
      { from: "sale", event: "complete", to: "done" },
      { from: "draft", event: "cancel", to: "cancel" },
      { from: "sent", event: "cancel", to: "cancel" },
      { from: "sale", event: "cancel", to: "cancel" },
    ],
    tenantExtensible: false,
  },
  {
    model: "subscription",
    stateField: "status",
    states: ["draft", "active", "paused", "past_due", "cancelled", "expired"],
    initialState: "draft",
    terminalStates: ["expired", "cancelled"],
    transitions: [
      { from: "draft", event: "activate", to: "active" },
      { from: "active", event: "pause", to: "paused" },
      { from: "paused", event: "resume", to: "active" },
      { from: "active", event: "payment_failed", to: "past_due" },
      { from: "past_due", event: "payment_resolved", to: "active" },
      { from: "active", event: "expire", to: "expired" },
      { from: "draft", event: "cancel", to: "cancelled" },
      { from: "active", event: "cancel", to: "cancelled" },
      { from: "paused", event: "cancel", to: "cancelled" },
      { from: "past_due", event: "cancel", to: "cancelled" },
    ],
    tenantExtensible: false,
  },
];

// ---------------------------------------------------------------------------
// Mutation Policies (Phase 3.7.3)
// ---------------------------------------------------------------------------

export const MUTATION_POLICIES: MutationPolicyDefinition[] = [
  {
    id: "sales.sales_order.command_projection",
    mutationPolicy: "event-only",
    appliesTo: ["sales_order"],
    requiredEvents: ["sales_order.submitted", "sales_order.confirmed", "sales_order.cancelled"],
    description:
      "Sales-order command routes append events first and refresh the read model through projection persistence.",
  },
  {
    id: "sales.subscription.command_projection",
    mutationPolicy: "event-only",
    appliesTo: ["subscription"],
    requiredEvents: [
      "subscription.activated",
      "subscription.cancelled",
      "subscription.paused",
      "subscription.direct_update",
    ],
    directMutationOperations: ["update"],
    description:
      "Subscription command routes append events first and refresh the read model through projection persistence.",
  },
  {
    id: "sales.return_order.command_projection",
    mutationPolicy: "event-only",
    appliesTo: ["return_order"],
    requiredEvents: [
      "return_order.approved",
      "return_order.received",
      "return_order.inspected",
      "return_order.credited",
    ],
    directMutationOperations: ["update"],
    description:
      "Return-order command routes append events first and refresh the read model through projection persistence.",
  },
  {
    id: "sales.commission_entry.command_projection",
    mutationPolicy: "event-only",
    appliesTo: ["commission_entry"],
    requiredEvents: [
      "commission_entry.approved",
      "commission_entry.paid",
      "commission_entry.generated",
      "commission_entry.recalculated",
    ],
    directMutationOperations: ["create", "update", "delete"],
    description:
      "Commission-entry command routes now own mutation orchestration; direct generic updates are blocked in favor of append-and-project command flows.",
  },
  {
    id: "platform.tenant.command_event_only",
    mutationPolicy: "event-only",
    appliesTo: ["tenant"],
    requiredEvents: ["tenant.direct_create", "tenant.direct_update", "tenant.direct_delete"],
    directMutationOperations: ["create", "update", "delete"],
    description:
      "Tenant command routes are now append-and-project only; direct CRUD writes are blocked by default policy enforcement.",
  },
  {
    id: "platform.organization.command_event_only",
    mutationPolicy: "event-only",
    appliesTo: ["organization"],
    requiredEvents: [
      "organization.direct_create",
      "organization.direct_update",
      "organization.direct_delete",
    ],
    directMutationOperations: ["create", "update", "delete"],
    description:
      "Organization command routes are now append-and-project only; direct CRUD writes are blocked by default policy enforcement.",
  },
  {
    id: "platform.workflow.command_event_only",
    mutationPolicy: "event-only",
    appliesTo: ["workflow"],
    requiredEvents: ["workflow.direct_create", "workflow.direct_update", "workflow.direct_delete"],
    directMutationOperations: ["create", "update", "delete"],
    description:
      "Workflow definition command routes are now append-and-project only; direct registry writes are blocked by default policy enforcement.",
  },
  {
    id: "platform.workflow_instance.command_event_only",
    mutationPolicy: "event-only",
    appliesTo: ["workflow_instance"],
    requiredEvents: ["workflow_instance.direct_update"],
    directMutationOperations: ["update"],
    description:
      "Workflow instance command routes are now append-and-project only; direct engine state transitions are blocked by default policy enforcement.",
  },
];

export const SCOPED_MUTATION_POLICIES: MutationPolicyDefinition[] = [
  {
    id: "sales.commission_entry.command_generation",
    mutationPolicy: "dual-write",
    appliesTo: ["commission_entry"],
    requiredEvents: ["commission_entry.generated", "commission_entry.recalculated"],
    directMutationOperations: ["create", "update"],
    description:
      "Commission generation remains command-owned under dual-write until create/update parity is proven across the aggregate.",
  },
];

export const MUTATION_POLICY_REGISTRY: MutationPolicyDefinition[] = [
  ...MUTATION_POLICIES,
  ...SCOPED_MUTATION_POLICIES,
];

export function getMutationPolicyById(policyId: string): MutationPolicyDefinition | undefined {
  return MUTATION_POLICY_REGISTRY.find((policy) => policy.id === policyId);
}

export function requireMutationPolicyById(policyId: string): MutationPolicyDefinition {
  const policy = getMutationPolicyById(policyId);
  if (policy) {
    return policy;
  }

  throw new Error(
    `truth-config: missing mutation policy "${policyId}" in MUTATION_POLICY_REGISTRY`
  );
}

// ---------------------------------------------------------------------------
// Deprecated aliases — remove after one release cycle
// ---------------------------------------------------------------------------

/** @deprecated Use MUTATION_POLICIES */
export const SALES_MUTATION_POLICIES = MUTATION_POLICIES;
/** @deprecated Use SCOPED_MUTATION_POLICIES */
export const SALES_SCOPED_MUTATION_POLICIES = SCOPED_MUTATION_POLICIES;
/** @deprecated Use MUTATION_POLICY_REGISTRY */
export const SALES_MUTATION_POLICY_REGISTRY = MUTATION_POLICY_REGISTRY;
/** @deprecated Use getMutationPolicyById */
export const getSalesMutationPolicyById = getMutationPolicyById;
/** @deprecated Use requireMutationPolicyById */
export const requireSalesMutationPolicyById = requireMutationPolicyById;

export const SALES_CROSS_INVARIANTS: CrossInvariantDefinition[] = [
  {
    id: "sales.cross.active_subscription_requires_sale_order",
    description:
      "Active subscriptions must resolve to a related sales order that is already in sale state.",
    involvedModels: ["subscription", "sales_order"],
    severity: "warning",
    condition: {
      logic: "or",
      conditions: [
        { field: "subscription.status", operator: "neq", value: "active" },
        { field: "sales_order.status", operator: "eq", value: "sale" },
      ],
    },
    joinPaths: [
      {
        fromModel: "subscription",
        fromField: "sales_order_id",
        toModel: "sales_order",
        toField: "id",
      },
    ],
    executionKind: "trigger",
    dependsOn: ["sales.sales_order.confirmed_amount_positive"],
    triggerOn: ["create", "update", "transition"],
    tenantOverridable: false,
  },
];

// ---------------------------------------------------------------------------
// Compiler Input — wire up registries for the full pipeline
// ---------------------------------------------------------------------------

/** Complete compiler input for the AFENDA sales domain. */
export const COMPILER_INPUT: NormalizerInput = {
  model: SALES_TRUTH_MODEL,
  entityDefs: SALES_ENTITY_DEFS,
  invariantRegistries: SALES_INVARIANT_REGISTRIES,
  crossInvariantDefinitions: SALES_CROSS_INVARIANTS,
  stateMachines: SALES_STATE_MACHINES,
  mutationPolicies: MUTATION_POLICIES,
  namespace: "sales",
};
