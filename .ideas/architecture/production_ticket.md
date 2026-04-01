## Production patch for the **current PR**

I’m treating the current PR as the **last production-hardening patch before vertical commands**:

> **E5-T1 + E5-T3**
> canonical temporal truth record + supersession guard

That is the safest copy-drop patch to land now, because your docs show memory append exists, but canonical record building is still missing and supersession enforcement is only partial.  

Below is a **drop-in production implementation** you can paste into the workspace.

---

# 1) `packages/runtime/src/memory/recordTypes.ts`

```ts
import { createHash } from "node:crypto";

export type TruthRecordActor =
  | {
      type: "user";
      userId: string;
      role?: string;
    }
  | {
      type: "service";
      serviceName: string;
      role?: string;
    }
  | {
      type: "system";
      role?: string;
    };

export type TruthRecordCommandRef = {
  commandName: string;
  commandId?: string;
  idempotencyKey?: string;
};

export type TruthRecordCausationRef = {
  causationId?: string;
  correlationId?: string;
  parentRecordId?: string;
};

export type TruthRecordSupersession =
  | {
      mode: "none";
    }
  | {
      mode: "supersedes";
      supersedesRecordId: string;
      reason: string;
      changedFields?: string[];
    };

export type TruthRecordPayload = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  patch?: Record<string, unknown> | null;
  facts?: Record<string, unknown> | null;
};

export type TemporalTruthRecord = {
  recordId: string;
  tenantId: string;

  entityName: string;
  entityId: string;

  action: string;
  semanticVersion: 1;

  happenedAt: string;
  recordedAt: string;

  actor: TruthRecordActor;
  command: TruthRecordCommandRef;
  causation: TruthRecordCausationRef;

  supersession: TruthRecordSupersession;

  payload: TruthRecordPayload;

  payloadHash: string;
  recordHash: string;
};

export type BuildTemporalTruthRecordInput = {
  recordId?: string;
  tenantId: string;

  entityName: string;
  entityId: string;

  action: string;

  happenedAt?: string | Date;
  recordedAt?: string | Date;

  actor: TruthRecordActor;
  command: TruthRecordCommandRef;
  causation?: TruthRecordCausationRef;

  supersession?: TruthRecordSupersession;

  payload?: TruthRecordPayload;
};

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortJson(val)]);
    return Object.fromEntries(entries);
  }

  return value;
}
```

---

# 2) `packages/runtime/src/memory/buildTemporalTruthRecord.ts`

```ts
import { randomUUID } from "node:crypto";

import type {
  BuildTemporalTruthRecordInput,
  TemporalTruthRecord,
  TruthRecordPayload,
  TruthRecordSupersession,
} from "./recordTypes.js";
import { sha256Hex, stableStringify } from "./recordTypes.js";

function toIsoInstant(input?: string | Date): string {
  if (!input) return new Date().toISOString();

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid Date supplied for truth record timestamp.");
    }
    return input.toISOString();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp supplied for truth record: ${input}`);
  }

  return parsed.toISOString();
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected non-empty string for ${fieldName}.`);
  }
}

function normalizePayload(payload?: TruthRecordPayload): TruthRecordPayload {
  return {
    before: payload?.before ?? null,
    after: payload?.after ?? null,
    patch: payload?.patch ?? null,
    facts: payload?.facts ?? null,
  };
}

function normalizeSupersession(
  supersession?: TruthRecordSupersession,
): TruthRecordSupersession {
  if (!supersession) {
    return { mode: "none" };
  }

  if (supersession.mode === "none") {
    return { mode: "none" };
  }

  assertNonEmptyString(
    supersession.supersedesRecordId,
    "supersession.supersedesRecordId",
  );
  assertNonEmptyString(supersession.reason, "supersession.reason");

  return {
    mode: "supersedes",
    supersedesRecordId: supersession.supersedesRecordId,
    reason: supersession.reason.trim(),
    changedFields:
      supersession.changedFields?.filter(
        (field) => typeof field === "string" && field.trim() !== "",
      ) ?? [],
  };
}

export function buildTemporalTruthRecord(
  input: BuildTemporalTruthRecordInput,
): TemporalTruthRecord {
  assertNonEmptyString(input.tenantId, "tenantId");
  assertNonEmptyString(input.entityName, "entityName");
  assertNonEmptyString(input.entityId, "entityId");
  assertNonEmptyString(input.action, "action");
  assertNonEmptyString(input.command.commandName, "command.commandName");

  const happenedAt = toIsoInstant(input.happenedAt);
  const recordedAt = toIsoInstant(input.recordedAt);
  const payload = normalizePayload(input.payload);
  const supersession = normalizeSupersession(input.supersession);

  const base: Omit<TemporalTruthRecord, "payloadHash" | "recordHash"> = {
    recordId: input.recordId ?? randomUUID(),
    tenantId: input.tenantId,

    entityName: input.entityName,
    entityId: input.entityId,

    action: input.action,
    semanticVersion: 1,

    happenedAt,
    recordedAt,

    actor: input.actor,
    command: {
      commandName: input.command.commandName,
      commandId: input.command.commandId,
      idempotencyKey: input.command.idempotencyKey,
    },
    causation: {
      causationId: input.causation?.causationId,
      correlationId: input.causation?.correlationId,
      parentRecordId: input.causation?.parentRecordId,
    },

    supersession,
    payload,
  };

  const payloadHash = sha256Hex(stableStringify(payload));
  const recordHash = sha256Hex(
    stableStringify({
      ...base,
      payloadHash,
    }),
  );

  return {
    ...base,
    payloadHash,
    recordHash,
  };
}
```

---

# 3) `packages/runtime/src/memory/supersession.ts`

```ts
import { stableStringify } from "./recordTypes.js";

export type SupersessionRequirementInput = {
  entityName: string;
  previousState: Record<string, unknown> | null | undefined;
  nextState: Record<string, unknown> | null | undefined;
  ignoredFields?: string[];
};

export type SupersessionMetadata =
  | {
      mode: "none";
    }
  | {
      mode: "supersedes";
      supersedesRecordId: string;
      reason: string;
      changedFields?: string[];
    };

export type SupersessionEvaluation = {
  requiresSupersession: boolean;
  changedFields: string[];
};

function toComparableObject(
  value: Record<string, unknown> | null | undefined,
  ignoredFields: Set<string>,
): Record<string, unknown> {
  const src = value ?? {};
  const entries = Object.entries(src)
    .filter(([key]) => !ignoredFields.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
}

function changedTopLevelFields(
  previousState: Record<string, unknown>,
  nextState: Record<string, unknown>,
): string[] {
  const keys = Array.from(
    new Set([...Object.keys(previousState), ...Object.keys(nextState)]),
  ).sort((a, b) => a.localeCompare(b));

  return keys.filter((key) => {
    return stableStringify(previousState[key]) !== stableStringify(nextState[key]);
  });
}

/**
 * Production default:
 * - any meaning-changing update requires supersession
 * - metadata-only fields may be ignored via ignoredFields
 */
export function evaluateSupersessionRequirement(
  input: SupersessionRequirementInput,
): SupersessionEvaluation {
  const ignoredFields = new Set(input.ignoredFields ?? []);

  const previousComparable = toComparableObject(input.previousState, ignoredFields);
  const nextComparable = toComparableObject(input.nextState, ignoredFields);

  const changedFields = changedTopLevelFields(previousComparable, nextComparable);

  return {
    requiresSupersession: changedFields.length > 0,
    changedFields,
  };
}

export function assertSupersessionProvided(params: {
  entityName: string;
  previousState: Record<string, unknown> | null | undefined;
  nextState: Record<string, unknown> | null | undefined;
  supersession: SupersessionMetadata | undefined;
  ignoredFields?: string[];
}): SupersessionEvaluation {
  const evaluation = evaluateSupersessionRequirement({
    entityName: params.entityName,
    previousState: params.previousState,
    nextState: params.nextState,
    ignoredFields: params.ignoredFields,
  });

  if (!evaluation.requiresSupersession) {
    return evaluation;
  }

  if (!params.supersession || params.supersession.mode !== "supersedes") {
    throw new Error(
      `Supersession required for ${params.entityName} but no supersession metadata was provided.`,
    );
  }

  if (
    typeof params.supersession.supersedesRecordId !== "string" ||
    params.supersession.supersedesRecordId.trim() === ""
  ) {
    throw new Error(
      `Supersession required for ${params.entityName} but supersedesRecordId is missing.`,
    );
  }

  if (
    typeof params.supersession.reason !== "string" ||
    params.supersession.reason.trim() === ""
  ) {
    throw new Error(
      `Supersession required for ${params.entityName} but supersession reason is missing.`,
    );
  }

  return evaluation;
}
```

---

# 4) `packages/runtime/src/memory/index.ts`

```ts
export * from "./recordTypes.js";
export * from "./buildTemporalTruthRecord.js";
export * from "./supersession.js";
```

---

# 5) Patch your append-memory call site

Wherever your command pipeline currently appends memory, replace ad hoc record assembly with this.

## Example integration in `executeCommand.ts`

```ts
import { buildTemporalTruthRecord } from "../memory/buildTemporalTruthRecord.js";
import { assertSupersessionProvided } from "../memory/supersession.js";

// ... inside command execution after successful mutation result is known

const supersessionEvaluation = assertSupersessionProvided({
  entityName: mutationResult.entityName,
  previousState: mutationResult.previousState,
  nextState: mutationResult.nextState,
  supersession: mutationResult.supersession,
  ignoredFields: [
    "updatedAt",
    "updatedBy",
    "version",
    "lastSeenAt",
  ],
});

const truthRecord = buildTemporalTruthRecord({
  tenantId: tenantContext.tenantId,
  entityName: mutationResult.entityName,
  entityId: mutationResult.entityId,
  action: command.name,
  happenedAt: command.occurredAt ?? new Date(),
  actor: actorContext.userId
    ? {
        type: "user",
        userId: actorContext.userId,
        role: actorContext.role,
      }
    : {
        type: "system",
        role: actorContext.role,
      },
  command: {
    commandName: command.name,
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
  },
  causation: {
    causationId: command.causationId,
    correlationId: command.correlationId,
    parentRecordId: mutationResult.parentRecordId,
  },
  supersession: supersessionEvaluation.requiresSupersession
    ? {
        mode: "supersedes",
        supersedesRecordId: mutationResult.supersession!.supersedesRecordId,
        reason: mutationResult.supersession!.reason,
        changedFields: supersessionEvaluation.changedFields,
      }
    : { mode: "none" },
  payload: {
    before: mutationResult.previousState ?? null,
    after: mutationResult.nextState ?? null,
    patch: mutationResult.patch ?? null,
    facts: mutationResult.facts ?? null,
  },
});

await appendRecord(truthRecord, tx);
```

---

# 6) Strong suggested mutation result shape

If your current mutation layer does not expose a stable result contract yet, use this now.

## `packages/runtime/src/command/types.ts`

```ts
export type MutationResult = {
  entityName: string;
  entityId: string;

  previousState?: Record<string, unknown> | null;
  nextState?: Record<string, unknown> | null;
  patch?: Record<string, unknown> | null;
  facts?: Record<string, unknown> | null;

  parentRecordId?: string;

  supersession?:
    | {
        mode: "supersedes";
        supersedesRecordId: string;
        reason: string;
      }
    | {
        mode: "none";
      };
};
```

This keeps the command pipeline deterministic and makes later E6 work much cleaner.

---

# 7) Vitest tests

## `packages/runtime/src/memory/buildTemporalTruthRecord.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { buildTemporalTruthRecord } from "./buildTemporalTruthRecord.js";
import {
  assertSupersessionProvided,
  evaluateSupersessionRequirement,
} from "./supersession.js";

describe("buildTemporalTruthRecord", () => {
  it("builds a deterministic record hash for logically identical payloads", () => {
    const base = {
      tenantId: "tenant_1",
      entityName: "salesOrder",
      entityId: "so_123",
      action: "ConfirmSalesOrder",
      happenedAt: "2026-04-01T00:00:00.000Z",
      recordedAt: "2026-04-01T00:00:01.000Z",
      actor: {
        type: "user" as const,
        userId: "user_1",
        role: "sales_manager",
      },
      command: {
        commandName: "ConfirmSalesOrder",
        commandId: "cmd_1",
        idempotencyKey: "idem_1",
      },
      causation: {
        causationId: "cause_1",
        correlationId: "corr_1",
      },
      supersession: {
        mode: "none" as const,
      },
    };

    const recordA = buildTemporalTruthRecord({
      ...base,
      recordId: "rec_1",
      payload: {
        facts: {
          b: 2,
          a: 1,
        },
      },
    });

    const recordB = buildTemporalTruthRecord({
      ...base,
      recordId: "rec_1",
      payload: {
        facts: {
          a: 1,
          b: 2,
        },
      },
    });

    expect(recordA.payloadHash).toBe(recordB.payloadHash);
    expect(recordA.recordHash).toBe(recordB.recordHash);
  });

  it("defaults supersession to none", () => {
    const record = buildTemporalTruthRecord({
      tenantId: "tenant_1",
      entityName: "journalEntry",
      entityId: "je_1",
      action: "PostOrderJournal",
      actor: {
        type: "system",
      },
      command: {
        commandName: "PostOrderJournal",
      },
    });

    expect(record.supersession).toEqual({ mode: "none" });
  });
});

describe("supersession", () => {
  it("does not require supersession for metadata-only changes when ignored", () => {
    const evaluation = evaluateSupersessionRequirement({
      entityName: "salesOrder",
      previousState: {
        status: "draft",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      nextState: {
        status: "draft",
        updatedAt: "2026-04-01T00:01:00.000Z",
      },
      ignoredFields: ["updatedAt"],
    });

    expect(evaluation.requiresSupersession).toBe(false);
    expect(evaluation.changedFields).toEqual([]);
  });

  it("requires supersession for meaning-changing updates", () => {
    expect(() =>
      assertSupersessionProvided({
        entityName: "salesOrder",
        previousState: {
          status: "draft",
          totalAmount: "100.00",
        },
        nextState: {
          status: "confirmed",
          totalAmount: "100.00",
        },
        supersession: { mode: "none" },
      }),
    ).toThrow(/Supersession required/);
  });

  it("accepts valid supersession metadata", () => {
    const evaluation = assertSupersessionProvided({
      entityName: "salesOrder",
      previousState: {
        status: "draft",
      },
      nextState: {
        status: "confirmed",
      },
      supersession: {
        mode: "supersedes",
        supersedesRecordId: "rec_prev",
        reason: "Order confirmation replaced draft economic intent",
      },
    });

    expect(evaluation.requiresSupersession).toBe(true);
    expect(evaluation.changedFields).toEqual(["status"]);
  });
});
```

---

# 8) Why this patch is the right one to land now

This patch closes the core runtime gap for canonical temporal record construction and supersession enforcement inside the shared command pipeline. Remaining work is production adoption across all live mutation entry points.

It also matches the blueprint’s memory requirement that Phase 1 uses append-only temporal memory with supersession lineage before wider vertical completion.

---

# 9) What this gives you immediately

**Precise status:** **core-runtime complete, entrypoint migration incomplete** — canonical behavior exists in `packages/core/src/runtime/command/executeCommand.ts`; live HTTP handlers still need to route domain-significant mutations through that pipeline.

This patch gives canonical record assembly, hashing, causation/correlation propagation, supersession enforcement, and consistent append payload shape for commands that execute through `packages/core/src/runtime/command/executeCommand.ts` (including the API adapter `mutationCommandGateway` in `apps/api/src/policy/mutation-command-gateway.ts`). Full production completeness requires migrating live API mutation entry paths to the shared command pipeline.

**Remaining work (next PR boundary):** migrate domain mutations from `executeMutationCommand` to `mutationCommandGateway` / `executeCommand`, then implement E6 vertical commands on top of that path. Keep CRUD-only / non-economic endpoints on the generic gateway unless they truly belong in the truth runtime.

After that migration, the next development step becomes straightforward:
**ConfirmSalesOrder → ReserveInventoryForOrder → PostOrderJournal**.

If you want, next I’ll give you the same copy-drop production patch for **`ConfirmSalesOrder`** in your runtime style.
