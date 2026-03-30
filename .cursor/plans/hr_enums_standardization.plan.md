---
name: HR enums standardization
overview: Lock Phase 1 (conventions + TypeScript DRY for approval-like workflows) quickly; keep separate PostgreSQL enums per domain. Follow additive-only enum changes with migrations and product sign-off. Defer equity, benefits, skills, and ratings to explicit product decisions.
todos:
  - id: phase1-conventions-dry
    content: "Phase 1: conventions + canonical block; dedupe _enums.ts; type aliases; grep approval — remove or wire; optional ENUMS.md"
    status: completed
  - id: phase1-ci
    content: "Phase 1: tools/ci-gate/hr-enums-schema-pairing/index.mjs + package.json script"
    status: completed
  - id: phase2-additive
    content: "Phase 2: fuelTypes + deiMetricTypes additive + migrations + sign-off"
    status: completed
  - id: phase3-equity
    content: "Phase 3: equity state machine ADR + enum + compensation + migration"
    status: completed
  - id: phase4-benefits
    content: "Phase 4: optional pending on core benefitStatuses — product only"
    status: completed
  - id: phase5-adr
    content: "Phase 5: ADR skills + performance ratings"
    status: completed
isProject: false
---

# HR enums catalog — optimized plan (enterprise benchmarks)

## Pre-execution checklist (confirmed refinements)

1. **Approval** — Grep `approval_status`, `approvalStatusEnum`, `ApprovalStatusSchema`, `approvalStatuses`. Unused → remove all three exports. Used → wire column; no dead exports.
2. **Types** — `LeaveStatus`, `StaffingPlanStatus`, `RequestStatus` = `WorkflowLifecycleStatus` (not `(typeof leaveStatuses)[number]`).
3. **Placement** — Canonical block immediately after `leaveTypes`; delete Phase 6 duplicates (`requestStatuses`, `requestStatusEnum`, `RequestStatusSchema`) and early PG/Zod duplicates.
4. **CI** — Gate only `[_enums.ts](packages/db/src/schema/hr/_enums.ts)`; ignore `[_zodShared.ts](packages/db/src/schema/hr/_zodShared.ts)` and other helpers.
5. **Conventions** — First substantive doc block **after imports** in `_enums.ts` (not above `import` lines). Optional `[hr-docs/ENUMS.md](packages/db/src/schema/hr/hr-docs/ENUMS.md)`.
6. **Validate** — `pnpm exec tsc --noEmit` + `pnpm exec vitest run` in `packages/db`.

---

## Strengths (locked in)

- DRY in TypeScript, **separate** `pgEnum` types in PostgreSQL.
- Explicit dedupe checklist; CI scoped to `_enums.ts`.
- Phase 1 = **zero PostgreSQL schema churn** (values unchanged).

---

## Current state (repo-validated)

- `[packages/db/src/schema/hr/_enums.ts](packages/db/src/schema/hr/_enums.ts)`: four identical approval-style tuples (`leave`, `staffing`, `approval`, `request` × duplicate `request` ~1097).
- `approvalStatusEnum` exists ~804; resolve via grep (remove or wire).

---

## Phase 1 — canonical block (drop-in)

After `leaveTypes`; omit approval lines if grep shows unused.

```typescript
// ============================================================================
// Shared approval workflow lifecycle (TypeScript DRY, PostgreSQL separate)
// ============================================================================

export const standardApprovalWorkflowStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const WorkflowLifecycleStatusSchema = z.enum(standardApprovalWorkflowStatuses);
export type WorkflowLifecycleStatus = (typeof standardApprovalWorkflowStatuses)[number];

export const leaveStatuses = standardApprovalWorkflowStatuses;
export const staffingPlanStatuses = standardApprovalWorkflowStatuses;
export const approvalStatuses = standardApprovalWorkflowStatuses; // omit if approval_* removed
export const requestStatuses = standardApprovalWorkflowStatuses;

export const leaveStatusEnum = hrSchema.enum("leave_status", [...leaveStatuses]);
export const staffingPlanStatusEnum = hrSchema.enum("staffing_plan_status", [
  ...staffingPlanStatuses,
]);
export const approvalStatusEnum = hrSchema.enum("approval_status", [...approvalStatuses]); // omit if unused
export const requestStatusEnum = hrSchema.enum("request_status", [...requestStatuses]);

export const LeaveStatusSchema = WorkflowLifecycleStatusSchema;
export const StaffingPlanStatusSchema = WorkflowLifecycleStatusSchema;
export const ApprovalStatusSchema = WorkflowLifecycleStatusSchema; // omit if unused
export const RequestStatusSchema = WorkflowLifecycleStatusSchema;
```

**Types:**

```typescript
export type LeaveStatus = WorkflowLifecycleStatus;
export type StaffingPlanStatus = WorkflowLifecycleStatus;
export type RequestStatus = WorkflowLifecycleStatus;
```

---

## Phase 1 — execution order (ship sequence)

1. Insert canonical block (minus approval lines if removing).
2. Delete duplicates: literals, `requestStatuses` ~1097, PG enums ~801–804 & ~1284, Zod duplicates (Phase 6 + early).
3. Set type aliases to `WorkflowLifecycleStatus`.
4. Resolve approval (grep → remove trio or wire column).
5. Add conventions block after imports; optional `ENUMS.md`.
6. Add CI script under `tools/ci-gate/hr-enums-schema-pairing/`; wire `pnpm ci:gate:hr-enums-schema` (or `ci:gate` aggregator if you use one).
7. Run `tsc` + `vitest` in `packages/db`.

---

## Phase 1 — dedupe checklist

1. Old literals: `leaveStatuses`, `staffingPlanStatuses`, `approvalStatuses` (if approval removed, skip approval).
2. Duplicate `requestStatuses` ~1097.
3. Duplicate `leaveStatusEnum`, `staffingPlanStatusEnum`, `approvalStatusEnum` ~801–804.
4. Duplicate `requestStatusEnum` ~1284.
5. Duplicate `LeaveStatusSchema`, `StaffingPlanStatusSchema`, `RequestStatusSchema` (+ approval schema if removed).
6. Old `export type * = (typeof …)[number]` for those three → replace with `WorkflowLifecycleStatus`.

---

## Phase 1 — minimal Node CI script (drop-in skeleton)

**Path:** `tools/ci-gate/hr-enums-schema-pairing/index.mjs`  
**Pattern:** Same repo root as `[tools/ci-gate/zod4-iso-dates/index.mjs](tools/ci-gate/zod4-iso-dates/index.mjs)`: `join(__dirname, "..", "..", "..")` → `packages/db/src/schema/hr/_enums.ts`.

**v1 logic (text/regex, no AST):**

- Find `hrSchema.enum("…", [...SpreadId])` — allow whitespace/newlines inside `[]` (use `[\s\S]*?` or normalize newlines first).
- For each `SpreadId`, pass if `src` matches **any** of:
  - `z.enum(SpreadId` or `z.enum( SpreadId`
  - `export const SomethingSchema = z.enum(SpreadId`
  - `export const SomethingSchema = WorkflowLifecycleStatusSchema` **only if** `SpreadId` is one of `leaveStatuses|staffingPlanStatuses|approvalStatuses|requestStatuses` (optional allowlist after Phase 1 lands).
- **Allowlist** inline spreads `[...foo, ...bar]` or rare tuples with no single identifier — document in script header.
- **Exit 1** with one line per missing pairing; **exit 0** if all covered.

**Skeleton (~40 lines):**

```javascript
#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const ENUMS = join(repoRoot, "packages", "db", "src", "schema", "hr", "_enums.ts");

const src = readFileSync(ENUMS, "utf8");

/** Match hrSchema.enum("db_name", [...tupleName]) with possible newlines */
const re = /hrSchema\.enum\(\s*["'][^"']+["']\s*,\s*\[\s*\.\.\.\s*([a-zA-Z0-9_]+)\s*\]\s*\)/gs;

const failures = [];
for (const m of src.matchAll(re)) {
  const tuple = m[1];
  const zDirect = new RegExp(`z\\.enum\\s*\\(\\s*${tuple}\\b`);
  const zExport = new RegExp(`Schema\\s*=\\s*z\\.enum\\s*\\(\\s*${tuple}\\b`);
  if (!zDirect.test(src) && !zExport.test(src)) {
    failures.push(tuple);
  }
}

if (failures.length) {
  console.error(
    "hr-enums-schema: missing z.enum pairing for spread:",
    [...new Set(failures)].join(", ")
  );
  process.exit(1);
}
console.log("hr-enums-schema: OK");
```

**Caveats to handle in a follow-up iteration:** multiline `hrSchema.enum(` before `[...tuple]`; `Schema = OtherSchema` alias chains (extend allowlist or second regex). **Rollout:** `HR_ENUMS_GATE=warn` env → print only, exit 0.

**Wire:** Root `package.json` — e.g. `"ci:gate:hr-enums-schema": "node tools/ci-gate/hr-enums-schema-pairing/index.mjs"`.

---

## Later phases

| Phase | Focus                                                |
| ----- | ---------------------------------------------------- |
| **2** | Additive `fuelTypes`, `deiMetricTypes` + migrations  |
| **3** | Equity state machine + enum + migration              |
| **4** | Core `benefitStatuses` + `pending` if product agrees |
| **5** | ADR: skills + ratings                                |

---

## Out of scope

- One shared physical PG enum type for all HR workflows.
- Model changes without ADR.

---

## Enterprise alignment

- DRY in TS, separate in DB; additive-only value changes with migrations + ADR.
- Docs + CI reduce drift; equity / benefits / skills / ratings stay product-owned until ADRs.
