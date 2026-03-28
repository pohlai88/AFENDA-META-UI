# WAVE 4 — Day 3 Stream B Kickoff
**Platform Foundation: Organization Command Services**

**Kickoff Date**: 2025-01-13  
**Stream**: B (Platform)  
**Phase**: Phase 6 (Organization Foundation)  
**Parallel**: Stream C (Workflow) starts simultaneously  
**Duration**: Days 3-4 (independent track)

---

## Overview

**Stream B Objective**: Replicate tenant command ownership pattern for **organization** aggregate, establishing platform foundation for workspace + workspace-member aggregates.

**Template**: Copy the day-2-validated tenant pattern → apply to organization → validate metrics.

**Success Criteria**:
- ✅ 100% of organization write endpoints routed through command services
- ✅ 6/6 organization route tests passing (identical to tenant test structure)
- ✅ Mutation metadata returned on every write
- ✅ Zero API regressions (754/760 baseline maintained)

---

## Implementation Roadmap

### Phase 1: Discovery (30 min)

**Task**: Locate existing organization routes and identify write endpoints

**Files to Examine**:
```bash
# Find organization-related files
find apps/api/src -name "*organization*" -type f
```

**Expected Output** (search pattern):
- `apps/api/src/routes/organization.ts` — REST endpoints
- `apps/api/src/organization/index.ts` — business logic
- `apps/api/src/organization/__test__/organization.route.test.ts` — existing tests (if any)

**Write Endpoints to Identify**:
| Endpoint | HTTP | Route | Pattern |
|----------|------|-------|---------|
| Create | POST | `/api/organizations` | → `createOrganizationCommand()` |
| Update | PUT | `/api/organizations/:orgId` | → `updateOrganizationCommand()` |
| Delete | DELETE | `/api/organizations/:orgId` | → `deleteOrganizationCommand()` |

**Checkpoint**: Document all write endpoints before proceeding.

---

### Phase 2: Command Service Creation (1-1.5 hours)

**Task**: Create organization-command-service.ts following the tenant pattern

**Reference File**: [apps/api/src/tenant/tenant-command-service.ts](apps/api/src/tenant/tenant-command-service.ts)

**File to Create**: [apps/api/src/organization/organization-command-service.ts](apps/api/src/organization/organization-command-service.ts)

**Template Structure**:

```typescript
import {
  executeMutationCommand,
  type ExecuteMutationCommandResult,
} from "../policy/mutation-command-gateway.js";
import {
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "./index.js";

import type { OrganizationDefinition } from "@afenda/meta-types";

type OrganizationRecord = Record<string, unknown>;

const ORG_CREATE_SOURCE = "api.organizations.create";
const ORG_UPDATE_SOURCE = "api.organizations.update";
const ORG_DELETE_SOURCE = "api.organizations.delete";

function toOrganizationRecord(org: OrganizationDefinition): OrganizationRecord {
  return org as unknown as OrganizationRecord;
}

export async function createOrganizationCommand(input: {
  organization: OrganizationDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  return executeMutationCommand<OrganizationRecord>({
    model: "organization",
    operation: "create",
    actorId: input.actorId,
    source: input.source ?? ORG_CREATE_SOURCE,
    nextRecord: toOrganizationRecord(input.organization),
    mutate: async () => {
      createOrganization(input.organization);
      return toOrganizationRecord(input.organization);
    },
  });
}

export async function updateOrganizationCommand(input: {
  organization: OrganizationDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  const existing = getOrganization(input.organization.id);

  return executeMutationCommand<OrganizationRecord>({
    model: "organization",
    operation: "update",
    recordId: input.organization.id,
    actorId: input.actorId,
    source: input.source ?? ORG_UPDATE_SOURCE,
    existingRecord: existing ? toOrganizationRecord(existing) : null,
    nextRecord: toOrganizationRecord(input.organization),
    mutate: async () => {
      updateOrganization(input.organization);
      return toOrganizationRecord(input.organization);
    },
  });
}

export async function deleteOrganizationCommand(input: {
  organizationId: string;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  const existing = getOrganization(input.organizationId);

  return executeMutationCommand<OrganizationRecord>({
    model: "organization",
    operation: "delete",
    recordId: input.organizationId,
    actorId: input.actorId,
    source: input.source ?? ORG_DELETE_SOURCE,
    existingRecord: existing ? toOrganizationRecord(existing) : null,
    mutate: async () => {
      const removed = deleteOrganization(input.organizationId);
      return removed && existing ? toOrganizationRecord(existing) : null;
    },
  });
}
```

**Key Patterns to Match**:
- Command functions receive input + optional `actorId` + optional `source`
- All route through `executeMutationCommand()` gateway
- `model` identifies aggregate ("organization")
- `operation` specifies type (create/update/delete)
- `recordId` provided for update/delete
- `existingRecord` captures prior state for comparison
- `nextRecord` defines new state
- `mutate()` performs actual repository write
- Source constants map to API operation (api.organizations.*)

**Validation Checklist**:
- ✅ All 3 command functions created
- ✅ Imports match tenant file structure
- ✅ Type casting matches tenant pattern
- ✅ No projectionCheckpoint calls (will be analyzed in Day 4)

---

### Phase 3: Route Wiring (45-60 min)

**Task**: Update organization.ts routes to call command services

**Reference File**: [apps/api/src/routes/tenant.ts](apps/api/src/routes/tenant.ts)

**File to Modify**: [apps/api/src/routes/organization.ts](apps/api/src/routes/organization.ts)

**Key Changes**:

1. **Import command services**:
```typescript
import {
  createOrganizationCommand,
  updateOrganizationCommand,
  deleteOrganizationCommand,
} from "../organization/organization-command-service.js";
```

2. **Update POST route** (create):
```typescript
router.post("/", async (req: Request, res: Response) => {
  try {
    const organization = req.body as OrganizationDefinition;
    if (!organization.id) {
      return res.status(400).json({ error: "Organization must have an id" });
    }

    const result = await createOrganizationCommand({
      organization,
      actorId: resolveActorId(req),
    });

    res.status(201).json({
      data: organization,
      meta: {
        mutationPolicy: result.mutationPolicy,
        policyId: result.policy?.id,
        eventType: result.event?.eventType,
        eventId: result.event?.id,
      },
    });
  } catch (err) {
    if (err instanceof MutationPolicyViolationError) {
      return res.status(err.statusCode).json({
        code: err.code,
        error: err.message,
        details: {
          model: err.model,
          operation: err.operation,
          mutationPolicy: err.mutationPolicy,
          policyId: err.policy?.id,
        },
      });
    }

    const msg = err instanceof Error ? err.message : "Failed to create organization";
    res.status(400).json({ error: msg });
  }
});
```

3. **Update PUT route** (update) — follow same pattern, call `updateOrganizationCommand()`
4. **Update DELETE route** (remove) — follow same pattern, call `deleteOrganizationCommand()`

5. **Preserve GET routes** — no changes needed (read-only, no command routing)

**Critical Elements**:
- ✅ Error handling: `MutationPolicyViolationError` → 400/403
- ✅ Actor resolution: `resolveActorId(req)` from session
- ✅ Mutation metadata: Return `{ mutationPolicy, policyId, eventType, eventId }`
- ✅ Status codes: 201 for create, 200 for update, 204 for delete (or 200 with body)
- ✅ Input validation: ID presence, ID match (update), existence check (update/delete)

---

### Phase 4: Test Creation (1-1.5 hours)

**Task**: Create organization route tests matching tenant test structure

**Reference File**: [apps/api/src/routes/__test__/tenant.route.test.ts](apps/api/src/routes/__test__/tenant.route.test.ts#L1-L150)

**File to Create**: [apps/api/src/routes/__test__/organization.route.test.ts](apps/api/src/routes/__test__/organization.route.test.ts)

**Test Suite Structure**:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../index.js"; // Express app
import {
  createOrganizationCommand,
  updateOrganizationCommand,
  deleteOrganizationCommand,
} from "../../organization/organization-command-service.js";
import { MutationPolicyViolationError } from "../../policy/mutation-command-gateway.js";

// Mock command services
vi.mock("../../organization/organization-command-service.js", () => ({
  createOrganizationCommand: vi.fn(),
  updateOrganizationCommand: vi.fn(),
  deleteOrganizationCommand: vi.fn(),
}));

describe("/api/organizations command-owned writes", () => {
  const mockOrganization = {
    id: "org-123",
    name: "Test Corp",
    tenantId: "tenant-1",
  };

  const mockResult = {
    mutationPolicy: "dual-write" as const,
    policy: { id: "policy-1" },
    event: {
      eventType: "OrganizationCreated",
      id: "evt-1",
    },
  };

  it("routes organization creation through command service and returns mutation metadata", async () => {
    vi.mocked(createOrganizationCommand).mockResolvedValueOnce(mockResult);

    const response = await request(app)
      .post("/api/organizations")
      .send(mockOrganization);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: mockOrganization,
      meta: {
        mutationPolicy: "dual-write",
        policyId: "policy-1",
        eventType: "OrganizationCreated",
        eventId: "evt-1",
      },
    });

    expect(createOrganizationCommand).toHaveBeenCalledWith({
      organization: mockOrganization,
      actorId: expect.any(String), // from session
    });
  });

  it("returns 400 when organization id is missing on create", async () => {
    const response = await request(app)
      .post("/api/organizations")
      .send({ name: "Test Corp" }); // missing id

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("id");
  });

  it("routes organization update through command service and returns mutation metadata", async () => {
    vi.mocked(updateOrganizationCommand).mockResolvedValueOnce(mockResult);

    const response = await request(app)
      .put("/api/organizations/org-123")
      .send(mockOrganization);

    expect(response.status).toBe(200);
    expect(response.body.meta.mutationPolicy).toBe("dual-write");
    expect(updateOrganizationCommand).toHaveBeenCalledWith({
      organization: mockOrganization,
      actorId: expect.any(String),
    });
  });

  it("returns 400 when organization id in payload does not match URL", async () => {
    const response = await request(app)
      .put("/api/organizations/org-123")
      .send({ ...mockOrganization, id: "org-999" }); // mismatch

    expect(response.status).toBe(400);
  });

  it("routes organization deletion through command service and returns mutation metadata", async () => {
    vi.mocked(deleteOrganizationCommand).mockResolvedValueOnce(mockResult);

    const response = await request(app)
      .delete("/api/organizations/org-123");

    expect(response.status).toBe(200);
    expect(deleteOrganizationCommand).toHaveBeenCalledWith({
      organizationId: "org-123",
      actorId: expect.any(String),
    });
  });

  it("returns 404 when organization delete target does not exist", async () => {
    const notFoundErr = new Error("Organization not found");
    vi.mocked(deleteOrganizationCommand)
      .mockRejectedValueOnce(notFoundErr);

    const response = await request(app)
      .delete("/api/organizations/org-nonexistent");

    expect(response.status).toBe(400);
  });
});
```

**Test Cases** (minimum 6):
1. ✅ Routes create → command service + returns metadata
2. ✅ Validates create input (missing ID error)
3. ✅ Routes update → command service + returns metadata
4. ✅ Validates update input (mismatched ID error)
5. ✅ Routes delete → command service + returns metadata
6. ✅ Handles delete error (target not found)

**Validation Checklist**:
- ✅ All 6 test cases implemented
- ✅ Mock setup matches tenant test structure
- ✅ Response structure validated (status + body + metadata)
- ✅ Error cases tested
- ✅ Command function invocations verified

---

### Phase 5: Test Execution & Validation (30 min)

**Command**: Run organization tests in isolation

```bash
pnpm --filter @afenda/api test --run src/routes/__test__/organization.route.test.ts
```

**Expected Output**:
```
✓ src/routes/__test__/organization.route.test.ts (6 tests) 75ms
  ✓ /api/organizations command-owned writes (6)
    ✓ routes organization creation through command service and returns mutation metadata
    ✓ returns 400 when organization id is missing on create
    ✓ routes organization update through command service and returns mutation metadata
    ✓ returns 400 when organization id in payload does not match URL
    ✓ routes organization deletion through command service and returns mutation metadata
    ✓ returns 404 when organization delete target does not exist

Test Files: 1 passed (1)
Tests: 6 passed (6)
Duration: 3.07s
```

**Validation Success Criteria**:
- ✅ All 6 tests passing
- ✅ Duration < 100ms (similar to tenant tests)
- ✅ No errors or warnings

**Checkpoint**: If tests fail, review tenant.route.test.ts for pattern differences.

---

### Phase 6: Full API Regression Test (30 min)

**Command**: Run full API test suite to verify no regressions

```bash
pnpm --filter @afenda/api test --run
```

**Expected Output**:
```
Test Files: 51 passed | 1 skipped (52)
Tests: 760 passed | 6 skipped (766)
Duration: ~20s

Key Results:
  ✓ Tenant routes: 6/6 ✅
  ✓ Organization routes: 6/6 ✅  ← NEW
  ✓ Sales routes: 39/39 ✅
  ✓ Sales command services: 26/26 ✅
  ✓ Projection runtime: 5/5 ✅
  ✓ Mutation policy: 7/7 ✅
```

**Validation Success Criteria**:
- ✅ 6 new tests added (organization route tests)
- ✅ Total test count: 760 → 766 (6 new)
- ✅ No regression: tenant + sales + projection tests unchanged
- ✅ Duration: ~20-21s

---

## Success Metrics (Day 3 Exit Criteria)

| Metric | Target | Validation |
|--------|--------|-----------|
| **Organization Command Ownership** | 100% (3/3 endpoints) | Route tests: 6/6 passing ✓ |
| **Organization Test Coverage** | 6 tests | organization.route.test.ts: 6/6 ✓ |
| **Mutation Metadata** | Every write | Response includes policy + event ✓ |
| **API Baseline** | 754/760 → 760/766 (+6) | No regressions ✓ |
| **Build Status** | `pnpm run build` ✓ | All packages compile ✓ |

---

## Deliverables Checklist

- [ ] **File**: [apps/api/src/organization/organization-command-service.ts](apps/api/src/organization/organization-command-service.ts)
  - [ ] 3 command functions: createOrganizationCommand, updateOrganizationCommand, deleteOrganizationCommand
  - [ ] All route through executeMutationCommand gateway
  - [ ] Source constants defined
  - [ ] Matching tenant pattern

- [ ] **File**: [apps/api/src/routes/organization.ts](apps/api/src/routes/organization.ts) (modified)
  - [ ] Import command services
  - [ ] POST route: calls createOrganizationCommand + returns metadata
  - [ ] PUT route: calls updateOrganizationCommand + returns metadata
  - [ ] DELETE route: calls deleteOrganizationCommand + returns metadata
  - [ ] Error handling: MutationPolicyViolationError caught
  - [ ] Input validation: ID presence, ID match, existence check

- [ ] **File**: [apps/api/src/routes/__test__/organization.route.test.ts](apps/api/src/routes/__test__/organization.route.test.ts)
  - [ ] 6 test cases (create, update, delete + error cases)
  - [ ] Mock setup for command services
  - [ ] Response validation (status, body, metadata)
  - [ ] All tests passing

- [ ] **Verification**:
  - [ ] `pnpm --filter @afenda/api test --run src/routes/__test__/organization.route.test.ts` → 6/6 ✓
  - [ ] `pnpm --filter @afenda/api test --run` → 760/766 (+6 new) ✓
  - [ ] `pnpm run build` → no errors ✓

---

## Parallel: Stream C (Workflow) Starting Today

While Stream B completes organization command services, Stream C simultaneously begins workflow foundation:

- Audit current workflow write mutations (transition, approval)
- Design workflow actor identity schema (follow sales pattern)
- Begin workflow-transition-command-service.ts implementation

See: [WAVE4-DAY3-STREAM-C-KICKOFF.md](WAVE4-DAY3-STREAM-C-KICKOFF.md) (to be created)

---

## Next: Day 4 Cross-Domain Alignment

Once Stream B completes organization command services:
1. Integrate platform + workflow command projections into shared mutation registry
2. Validate replay determinism across domain boundaries
3. Create cross-domain rewind tests

See: [WAVE4-DAY4-CROSS-DOMAIN.md](WAVE4-DAY4-CROSS-DOMAIN.md) (to be created on Day 4)

---

**Status**: 🟢 Ready for Day 3 Execution
