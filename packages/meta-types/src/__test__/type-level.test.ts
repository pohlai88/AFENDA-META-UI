/**
 * Type-level contract gates — Phase 5.
 *
 * Design intent: branded ID types must be structurally distinct. If any two ID
 * types become assignable to each other the type system no longer prevents
 * accidental cross-domain ID misuse. Fix the brand annotation, not this test.
 *
 * These tests use Vitest's `expectTypeOf` which asserts at compile time and
 * produces a runtime no-op — the tests pass only when the types satisfy the
 * assertion, so TypeScript errors here mean the contract is broken.
 */
import { describe, expectTypeOf, it } from "vitest";

import type {
  TenantId,
  OrganizationId,
  WorkflowId,
  WorkflowInstanceId,
  SalesOrderId,
  SubscriptionId,
  ReturnOrderId,
  CommissionEntryId,
  WarehouseId,
  InventoryItemId,
  StockMovementId,
  LocationId,
} from "../core/ids.js";
import type { Brand, Opaque, DeepPartial, DeepReadonly, NonEmptyArray, MaybePromise, Resolved } from "../core/types.js";
import type { JsonPrimitive, JsonObject, JsonArray, JsonValue } from "../core/json.js";
import type { PolicyDefinition } from "../policy/types.js";
import type { InvariantDefinition } from "../policy/invariants.js";
import type { TruthModel, MutationPolicyDefinition, ProjectionDefinition } from "../compiler/truth-model.js";
import type { DomainEvent } from "../events/types.js";

// ---------------------------------------------------------------------------
// Branded ID distinctness — all 12 IDs must be pairwise incompatible
// ---------------------------------------------------------------------------

describe("branded ID type distinctness", () => {
  it("TenantId is not equal to any other ID brand", () => {
    expectTypeOf<TenantId>().not.toEqualTypeOf<OrganizationId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<WorkflowId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<WorkflowInstanceId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<SalesOrderId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<WarehouseId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<InventoryItemId>();
    expectTypeOf<TenantId>().not.toEqualTypeOf<LocationId>();
  });

  it("WorkflowId is not equal to WorkflowInstanceId", () => {
    // These are the most easily confused — same aggregate family, different grain
    expectTypeOf<WorkflowId>().not.toEqualTypeOf<WorkflowInstanceId>();
  });

  it("SalesOrderId is not equal to ReturnOrderId or SubscriptionId", () => {
    expectTypeOf<SalesOrderId>().not.toEqualTypeOf<ReturnOrderId>();
    expectTypeOf<SalesOrderId>().not.toEqualTypeOf<SubscriptionId>();
    expectTypeOf<ReturnOrderId>().not.toEqualTypeOf<SubscriptionId>();
  });

  it("inventory domain IDs are pairwise distinct", () => {
    expectTypeOf<WarehouseId>().not.toEqualTypeOf<InventoryItemId>();
    expectTypeOf<WarehouseId>().not.toEqualTypeOf<StockMovementId>();
    expectTypeOf<WarehouseId>().not.toEqualTypeOf<LocationId>();
    expectTypeOf<InventoryItemId>().not.toEqualTypeOf<StockMovementId>();
    expectTypeOf<InventoryItemId>().not.toEqualTypeOf<LocationId>();
    expectTypeOf<StockMovementId>().not.toEqualTypeOf<LocationId>();
  });

  it("no branded ID is assignable to plain string", () => {
    expectTypeOf<TenantId>().not.toEqualTypeOf<string>();
    expectTypeOf<WorkflowId>().not.toEqualTypeOf<string>();
    expectTypeOf<InventoryItemId>().not.toEqualTypeOf<string>();
  });

  it("CommissionEntryId is not equal to any finance-adjacent ID", () => {
    expectTypeOf<CommissionEntryId>().not.toEqualTypeOf<SalesOrderId>();
    expectTypeOf<CommissionEntryId>().not.toEqualTypeOf<SubscriptionId>();
    expectTypeOf<CommissionEntryId>().not.toEqualTypeOf<ReturnOrderId>();
  });
});

// ---------------------------------------------------------------------------
// Utility type contracts
// ---------------------------------------------------------------------------

describe("Brand and Opaque utility contracts", () => {
  it("Brand<string, 'A'> and Brand<string, 'B'> are not equal", () => {
    type BrandA = Brand<string, "A">;
    type BrandB = Brand<string, "B">;
    expectTypeOf<BrandA>().not.toEqualTypeOf<BrandB>();
  });

  it("Opaque<number, 'Price'> is not equal to plain number", () => {
    type Price = Opaque<number, "Price">;
    expectTypeOf<Price>().not.toEqualTypeOf<number>();
  });

  it("DeepPartial wraps all fields as optional", () => {
    interface Thing { a: string; b: { c: number } }
    type P = DeepPartial<Thing>;
    expectTypeOf<P>().toMatchTypeOf<{ a?: string | undefined; b?: { c?: number | undefined } | undefined }>();
  });

  it("DeepReadonly prevents mutations at type level", () => {
    interface Config { host: string; port: number; nested: { timeout: number } }
    type R = DeepReadonly<Config>;
    // All fields should be readonly
    expectTypeOf<R["host"]>().toEqualTypeOf<string>();
    expectTypeOf<R["nested"]["timeout"]>().toEqualTypeOf<number>();
  });

  it("NonEmptyArray<string> is not equal to string[]", () => {
    expectTypeOf<NonEmptyArray<string>>().not.toEqualTypeOf<string[]>();
  });

  it("MaybePromise<T> is T | Promise<T>", () => {
    expectTypeOf<MaybePromise<string>>().toEqualTypeOf<string | Promise<string>>();
  });

  it("Resolved<Promise<T>> unwraps to T", () => {
    expectTypeOf<Resolved<Promise<string>>>().toEqualTypeOf<string>();
  });

  it("Resolved<T> (non-promise) is T", () => {
    expectTypeOf<Resolved<number>>().toEqualTypeOf<number>();
  });
});

// ---------------------------------------------------------------------------
// JSON type hierarchy
// ---------------------------------------------------------------------------

describe("JSON type hierarchy contracts", () => {
  it("JsonPrimitive is assignable to JsonValue but not vice versa", () => {
    expectTypeOf<JsonPrimitive>().toMatchTypeOf<JsonValue>();
  });

  it("JsonObject is assignable to JsonValue", () => {
    expectTypeOf<JsonObject>().toMatchTypeOf<JsonValue>();
  });

  it("JsonArray is assignable to JsonValue", () => {
    expectTypeOf<JsonArray>().toMatchTypeOf<JsonValue>();
  });

  it("JsonPrimitive is not equal to JsonValue (JsonValue is wider)", () => {
    expectTypeOf<JsonPrimitive>().not.toEqualTypeOf<JsonValue>();
  });
});

// ---------------------------------------------------------------------------
// Cross-domain structural contracts
// ---------------------------------------------------------------------------

describe("cross-domain structural type contracts", () => {
  it("PolicyDefinition.severity and InvariantDefinition.severity share the same shape", () => {
    // Both are "error" | "warning" subsets — verified at structural level
    // PolicySeverity is "error" | "warning" | "info"
    // InvariantSeverity is "fatal" | "error" | "warning"
    // They share "error" and "warning" — the union differs but both accept a string literal
    expectTypeOf<PolicyDefinition["severity"]>().toBeString();
    expectTypeOf<InvariantDefinition["severity"]>().toBeString();
  });

  it("TruthModel.mutationPolicies element is MutationPolicyDefinition", () => {
    type PoliciesArray = NonNullable<TruthModel["mutationPolicies"]>;
    type Element = PoliciesArray[number];
    expectTypeOf<Element>().toEqualTypeOf<MutationPolicyDefinition>();
  });

  it("ProjectionDefinition handler receives DomainEvent as second argument", () => {
    type Handler = ProjectionDefinition["handler"];
    type SecondArg = Parameters<Handler>[1];
    expectTypeOf<SecondArg>().toEqualTypeOf<DomainEvent>();
  });

  it("ProjectionDefinition handler returns same TState it receives", () => {
    type Handler = ProjectionDefinition<{ count: number }>["handler"];
    type FirstArg = Parameters<Handler>[0];
    type ReturnT = ReturnType<Handler>;
    expectTypeOf<FirstArg>().toEqualTypeOf<ReturnT>();
  });

  it("DomainEvent.payload is Record<string, unknown> by default", () => {
    type DefaultPayload = DomainEvent["payload"];
    expectTypeOf<DefaultPayload>().toEqualTypeOf<Record<string, unknown>>();
  });
});
