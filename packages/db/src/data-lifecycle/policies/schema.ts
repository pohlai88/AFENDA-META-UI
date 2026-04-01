import { z } from "zod/v4";

const identifier = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i, "must be a valid SQL identifier");

const dottedRef = z
  .string()
  .regex(
    /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)+$/i,
    "must be a dotted SQL reference (schema.object)"
  );

const optionalDottedRef = dottedRef.optional();

export const LifecycleFunctionRefsSchema = z.object({
  promoteToWarm: optionalDottedRef,
  identifyColdCandidates: optionalDottedRef,
  checkLifecycleHealth: optionalDottedRef,
  listWarmInventory: optionalDottedRef,
  coldCatalogTable: optionalDottedRef,
});

export const PartitionTargetPolicySchema = z.object({
  schemaName: identifier,
  parentTable: identifier,
  partitionColumn: identifier,
  yearsAhead: z.number().int().min(0).max(10).optional(),
});

export const RetentionArchiveRuleSchema = z.object({
  id: z.string().min(1),
  type: z.literal("archive-and-soft-delete"),
  sourceSchema: identifier,
  sourceTable: identifier,
  archiveSchema: identifier,
  archiveTable: identifier,
  tenantColumn: identifier,
  dateColumn: identifier,
  retentionYears: z.number().int().min(1).max(100),
  softDeleteColumn: identifier,
  updatedAtColumn: identifier.optional(),
  updatedByColumn: identifier.optional(),
  dedupeKeyColumn: identifier,
});

export const RetentionPurgeRuleSchema = z.object({
  id: z.string().min(1),
  type: z.literal("purge"),
  schemaName: identifier,
  tableName: identifier,
  tenantColumn: identifier,
  dateColumn: identifier,
  retentionYears: z.number().int().min(1).max(100),
});

export const RetentionRuleSchema = z.discriminatedUnion("type", [
  RetentionArchiveRuleSchema,
  RetentionPurgeRuleSchema,
]);

export const LifecyclePolicySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  partitionTargets: z.array(PartitionTargetPolicySchema),
  retentionRules: z.array(RetentionRuleSchema),
  functions: LifecycleFunctionRefsSchema,
  sloGates: z
    .object({
      maxPartitionActionsPerRun: z.number().int().min(1).max(5000).optional(),
      maxRetentionActionsPerRun: z.number().int().min(1).max(10000).optional(),
      maxArchiveFailures: z.number().int().min(0).max(1000).optional(),
      maxArchiveFailureRatePct: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export const LifecyclePolicyPatchSchema = z
  .object({
    description: z.string().min(1).optional(),
    partitionTargets: z.array(PartitionTargetPolicySchema).optional(),
    retentionRules: z.array(RetentionRuleSchema).optional(),
    functions: LifecycleFunctionRefsSchema.partial().optional(),
    sloGates: z
      .object({
        maxPartitionActionsPerRun: z.number().int().min(1).max(5000).optional(),
        maxRetentionActionsPerRun: z.number().int().min(1).max(10000).optional(),
        maxArchiveFailures: z.number().int().min(0).max(1000).optional(),
        maxArchiveFailureRatePct: z.number().min(0).max(100).optional(),
      })
      .optional(),
  })
  .strict();

export function assertSafeDottedReference(ref: string, label: string): void {
  const parsed = dottedRef.safeParse(ref);
  if (!parsed.success) {
    throw new Error(`Invalid ${label}: "${ref}"`);
  }
}

export type LifecyclePolicyValidated = z.infer<typeof LifecyclePolicySchema>;
export type LifecyclePolicyPatchValidated = z.infer<typeof LifecyclePolicyPatchSchema>;
