/**
 * Cross-domain type contract tests.
 *
 * Design intent: runtime Zod schemas and exported TypeScript contracts must stay in lockstep.
 * If these fail, the source contracts changed and downstream consumers need review.
 */
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  InventoryItemSchema,
  LocationDefinitionSchema,
  StockMovementLineSchema,
  StockMovementSchema,
  TenantDefinitionSchema,
  WorkflowDefinitionSchema,
  WorkflowInstanceSchema,
  WorkflowStepExecutionSchema,
  WorkflowStepSchema,
} from "../../index.js";
import type {
  InventoryItem,
  LocationDefinition,
  MetadataOverride,
  StockMovement,
  StockMovementLine,
  TenantDefinition,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  WorkflowStepExecution,
} from "../../index.js";
import { MetadataOverrideSchema } from "../../platform/tenant.schema.js";

describe("schema-to-type contracts", () => {
  it("WorkflowStepSchema matches WorkflowStep", () => {
    expectTypeOf<z.infer<typeof WorkflowStepSchema>>().toEqualTypeOf<WorkflowStep>();
  });

  it("WorkflowDefinitionSchema matches WorkflowDefinition", () => {
    expectTypeOf<z.infer<typeof WorkflowDefinitionSchema>>().toEqualTypeOf<WorkflowDefinition>();
  });

  it("WorkflowStepExecutionSchema matches WorkflowStepExecution", () => {
    expectTypeOf<z.infer<typeof WorkflowStepExecutionSchema>>().toEqualTypeOf<WorkflowStepExecution>();
  });

  it("WorkflowInstanceSchema matches WorkflowInstance", () => {
    expectTypeOf<z.infer<typeof WorkflowInstanceSchema>>().toEqualTypeOf<WorkflowInstance>();
  });

  it("TenantDefinitionSchema matches TenantDefinition", () => {
    expectTypeOf<z.infer<typeof TenantDefinitionSchema>>().toEqualTypeOf<TenantDefinition>();
  });

  it("MetadataOverrideSchema matches MetadataOverride", () => {
    expectTypeOf<z.infer<typeof MetadataOverrideSchema>>().toEqualTypeOf<MetadataOverride>();
  });

  it("LocationDefinitionSchema matches LocationDefinition", () => {
    expectTypeOf<z.infer<typeof LocationDefinitionSchema>>().toEqualTypeOf<LocationDefinition>();
  });

  it("StockMovementLineSchema matches StockMovementLine", () => {
    expectTypeOf<z.infer<typeof StockMovementLineSchema>>().toEqualTypeOf<StockMovementLine>();
  });

  it("StockMovementSchema matches StockMovement", () => {
    expectTypeOf<z.infer<typeof StockMovementSchema>>().toEqualTypeOf<StockMovement>();
  });

  it("InventoryItemSchema matches InventoryItem", () => {
    expectTypeOf<z.infer<typeof InventoryItemSchema>>().toEqualTypeOf<InventoryItem>();
  });
});
