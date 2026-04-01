import { sql } from "drizzle-orm";

import type { LifecyclePolicy } from "./types.js";
import {
  LifecyclePolicyPatchSchema,
  LifecyclePolicySchema,
  type LifecyclePolicyPatchValidated,
} from "./schema.js";

function mergeObjects<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base };
  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = out[key];
    if (
      baseValue &&
      patchValue &&
      typeof baseValue === "object" &&
      typeof patchValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(patchValue)
    ) {
      out[key] = mergeObjects(
        baseValue as Record<string, unknown>,
        patchValue as Record<string, unknown>
      );
      continue;
    }
    out[key] = patchValue;
  }
  return out as T;
}

export function applyLifecyclePolicyPatch(
  basePolicy: LifecyclePolicy,
  patch: LifecyclePolicyPatchValidated
): LifecyclePolicy {
  const merged = mergeObjects(basePolicy as unknown as Record<string, unknown>, patch);
  return LifecyclePolicySchema.parse(merged);
}

type OverrideLoaderOptions = {
  tenantId?: number;
  tenantKey?: string;
  industryKey?: string;
};

export type PolicyResolutionStep = {
  scope: "base" | "global" | "industry" | "tenant";
  sourceId: string;
};

export type AppliedPolicyPatch = {
  scope: "global" | "industry" | "tenant";
  sourceId: string;
  patch: LifecyclePolicyPatchValidated;
};

export type ResolvedLifecyclePolicy = {
  policy: LifecyclePolicy;
  steps: PolicyResolutionStep[];
  appliedPatches: AppliedPolicyPatch[];
  skippedPatches: Array<{ scope: string; sourceId: string; reason: string }>;
};

async function resolveIndustryKey(db: any, options: OverrideLoaderOptions): Promise<string | undefined> {
  if (options.industryKey) {
    return options.industryKey;
  }

  const tenantKeyCandidate = options.tenantKey ?? options.tenantId?.toString();
  if (!tenantKeyCandidate) {
    return undefined;
  }

  try {
    const result = await db.execute(sql`
      SELECT industry
      FROM tenant_definitions
      WHERE id = ${tenantKeyCandidate}
      LIMIT 1
    `);
    const industry = (result.rows[0] as { industry?: string } | undefined)?.industry;
    return industry || undefined;
  } catch {
    return undefined;
  }
}

export async function resolveLifecyclePolicyWithOverrides(
  db: any,
  basePolicy: LifecyclePolicy,
  options: OverrideLoaderOptions = {}
): Promise<ResolvedLifecyclePolicy> {
  const modelId = `data-lifecycle.policy.${basePolicy.id}`;
  const tenantKey = options.tenantKey ?? options.tenantId?.toString();
  const industryKey = await resolveIndustryKey(db, options);
  const steps: PolicyResolutionStep[] = [{ scope: "base", sourceId: basePolicy.id }];
  const appliedPatches: AppliedPolicyPatch[] = [];
  const skippedPatches: Array<{ scope: string; sourceId: string; reason: string }> = [];

  try {
    const rowsResult = await db.execute(sql`
      SELECT id, scope, tenant_id, patch
      FROM metadata_overrides
      WHERE enabled = TRUE
        AND model = ${modelId}
        AND (
          scope = 'global'
          OR (scope = 'industry' AND ${industryKey ?? null} IS NOT NULL AND tenant_id = ${industryKey ?? null}::text)
          OR (scope = 'tenant' AND ${tenantKey ?? null} IS NOT NULL AND tenant_id = ${tenantKey ?? null}::text)
        )
      ORDER BY
        CASE scope
          WHEN 'global' THEN 1
          WHEN 'industry' THEN 2
          WHEN 'tenant' THEN 3
          ELSE 3
        END ASC
    `);

    const rawRows = rowsResult.rows as Array<{
      id?: string;
      scope: "global" | "industry" | "tenant";
      tenant_id: string;
      patch: unknown;
    }>;

    let approvedOverrideIds: Set<string> | null = null;
    const overrideIds = rawRows.map((row) => row.id).filter((id): id is string => Boolean(id));
    if (overrideIds.length > 0) {
      try {
        const approvals = await db.execute(sql`
          SELECT metadata_override_id
          FROM lifecycle_override_approvals
          WHERE status = 'approved'
            AND checker_id IS NOT NULL
            AND checker_id <> maker_id
        `);
        const approvedAll = new Set(
          (approvals.rows as Array<{ metadata_override_id: string }>).map((row) => row.metadata_override_id)
        );
        approvedOverrideIds = new Set(overrideIds.filter((id) => approvedAll.has(id)));
      } catch {
        approvedOverrideIds = new Set();
      }
    }

    let currentPolicy = basePolicy;
    for (const row of rawRows) {
      if (row.id && approvedOverrideIds && !approvedOverrideIds.has(row.id)) {
        skippedPatches.push({
          scope: row.scope,
          sourceId: row.tenant_id || "global",
          reason: "maker-checker approval missing",
        });
        continue;
      }
      const parsedPatch = LifecyclePolicyPatchSchema.safeParse(row.patch);
      if (!parsedPatch.success) {
        skippedPatches.push({
          scope: row.scope,
          sourceId: row.tenant_id || "global",
          reason: "invalid patch schema",
        });
        continue;
      }
      currentPolicy = applyLifecyclePolicyPatch(currentPolicy, parsedPatch.data);
      steps.push({
        scope: row.scope,
        sourceId: row.tenant_id || "global",
      });
      appliedPatches.push({
        scope: row.scope,
        sourceId: row.tenant_id || "global",
        patch: parsedPatch.data,
      });
    }

    return { policy: currentPolicy, steps, appliedPatches, skippedPatches };
  } catch {
    // metadata_overrides table may not exist in all environments yet; continue with base policy.
    return { policy: LifecyclePolicySchema.parse(basePolicy), steps, appliedPatches, skippedPatches };
  }
}
