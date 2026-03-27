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

import type {
  CrossInvariantDefinition,
  EntityDef,
  InvariantRegistry,
  MutationPolicyDefinition,
  StateMachineDefinition,
} from "@afenda/meta-types";
import type { TruthModel } from "@afenda/meta-types/truth-model";

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

export const SALES_MUTATION_POLICIES: MutationPolicyDefinition[] = [
  {
    id: "sales.sales_order.dual_write_rollout",
    mutationPolicy: "dual-write",
    appliesTo: ["sales_order"],
    requiredEvents: ["sales_order.submitted", "sales_order.confirmed", "sales_order.cancelled"],
    description:
      "Sales orders emit append-only domain events while legacy direct writes remain enabled.",
  },
  {
    id: "sales.subscription.dual_write_rollout",
    mutationPolicy: "dual-write",
    appliesTo: ["subscription"],
    requiredEvents: ["subscription.activated", "subscription.cancelled", "subscription.paused"],
    directMutationOperations: ["update"],
    description:
      "Subscription commands emit policy-aware lifecycle events while retaining direct updates during rollout.",
  },
  {
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
      "Return-order commands append domain events while preserving direct writes for phased runtime migration.",
  },
];

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
  mutationPolicies: SALES_MUTATION_POLICIES,
  namespace: "sales",
};
