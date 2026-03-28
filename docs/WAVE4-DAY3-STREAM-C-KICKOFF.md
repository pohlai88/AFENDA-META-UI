# WAVE 4 — Day 3 Stream C Kickoff
**Workflow Foundation: Actor Identity + Transition Commands**

**Kickoff Date**: 2025-01-13  
**Stream**: C (Workflow)  
**Phase**: Phase 7 (Workflow Foundation)  
**Parallel**: Stream B (Platform) executes simultaneously  
**Duration**: Days 3-4 (independent track)  
**Pattern**: Sales return-order actor identity → workflow transitions/approvals

---

## Overview

**Stream C Objective**: Extend audit trail coverage to workflow mutations (state transitions, approvals) by implementing **actor identity tracking for workflow writes**, following the sales `return-order.inspect` pattern.

**Key Difference from Stream B**:
- **Stream B**: Replicate tenant pattern (simple dual-write)
- **Stream C**: Replicate sales pattern (actor identity + domain policy)

**Success Criteria**:
- ✅ All workflow write endpoints track actor identity (who performed transition?)
- ✅ Workflow command services created (transition, approval, cancel)
- ✅ 100% of workflow writes routed through command services
- ✅ Actor identity persisted in events + audit trail
- ✅ Zero API regressions (760/766 baseline maintained)

---

## Implementation Roadmap

### Phase 1: Workflow Audit (45-60 min)

**Task**: Locate existing workflow routes and identify write endpoints + actor patterns

**Files to Examine**:
```bash
# Find workflow-related files
find apps/api/src -name "*workflow*" -o -name "*transition*" -o -name "*approval*" | grep -v node_modules

# Find workflow routes specifically
grep -r "router\.(post|put|delete)" apps/api/src/routes/ | grep -i workflow
```

**Expected Output** (search pattern):
- `apps/api/src/routes/workflow.ts` — workflow REST endpoints
- `apps/api/src/workflow/index.ts` — business logic
- `apps/api/src/workflow/transition.ts` — state transitions
- `apps/api/src/workflow/approval.ts` — approval logic
- `apps/api/src/workflow/__test__/workflow.route.test.ts` — existing tests (if any)

**Write Endpoints to Audit**:

| Operation | HTTP | Route | Current Actor Pattern | Target Pattern |
|-----------|------|-------|----------------------|-----------------|
| Transition State | POST | `/api/workflows/:workflowId/transition` | ? | actor from session |
| Approve | POST | `/api/workflows/:workflowId/approve` | ? | actor from session + role |
| Reject | POST | `/api/workflows/:workflowId/reject` | ? | actor from session + role |
| Cancel | PUT | `/api/workflows/:workflowId` | ? | actor from session |

**Reference Pattern**: [apps/api/src/modules/sales/return-order/return-order-command-service.ts](apps/api/src/modules/sales/return-order/return-order-command-service.ts#L1-L100)

**Analysis Checklist**:
- [ ] Count total workflow write endpoints
- [ ] Identify which have actor identity tracking
- [ ] Identify which lack actor identity tracking
- [ ] Note current error handling for authorization
- [ ] Document permission model (who can transition? approve? cancel?)

---

### Phase 2: Actor Identity Schema Design (30-45 min)

**Task**: Define actor identity structure for workflow mutations

**Reference Pattern**: [Sales return-order actor identity pattern](apps/api/src/modules/sales/return-order/return-order-command-service.ts)

**Sales Pattern Example**:

```typescript
export async function transitionReturnOrderCommand(input: {
  returnOrderId: string;
  toState: string;
  actor: {
    userId: string;
    role: "inspector" | "manager" | "finance";  // Domain role
  };
  reason?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<ReturnOrderRecord>> {
  // Validate actor has permission for this transition
  validateActorPermissions(input.actor.role, input.toState);

  return executeMutationCommand<ReturnOrderRecord>({
    model: "return_order",
    operation: "transition",
    recordId: input.returnOrderId,
    actorId: input.actor.userId,
    source: input.source ?? "api.return-orders.transition",
    // ... rest of command
  });
}
```

**Workflow Actor Identity Design**:

```typescript
// types/workflow.ts
export interface WorkflowActorIdentity {
  userId: string;                              // Who
  role: "approver" | "submitter" | "admin";    // Role context
  department?: string;                         // Organization context
  tenantId: string;                            // Tenant isolation
  timestamp?: number;                          // When
  source?: "api" | "webhook" | "system";       // How
}

// Example event payload (emitted on transition)
interface WorkflowTransitionEvent {
  aggregateId: string;        // workflow ID
  fromState: string;
  toState: string;
  actor: WorkflowActorIdentity;
  reason?: string;
  eventId: string;
  timestamp: number;
}
```

**Key Design Decisions**:
1. **Actor Identity**: userId + role + tenant (similar to return-order)
2. **Permission Model**: Role-based (approver | submitter | admin)
3. **Audit Trail**: Store actor identity in event payload
4. **Error Handling**: Reject if actor lacks permission for transition

**Validation Checklist**:
- [ ] WorkflowActorIdentity interface defined in meta-types
- [ ] Permission model documented (who can do what?)
- [ ] Event payload structure includes actor identity
- [ ] Matches sales pattern (but workflow-specific roles)

---

### Phase 3: Workflow Command Services (1.5-2 hours)

**Task**: Create workflow command services with actor identity tracking

**Reference File**: [apps/api/src/modules/sales/return-order/return-order-command-service.ts](apps/api/src/modules/sales/return-order/return-order-command-service.ts)

**File to Create**: [apps/api/src/workflow/workflow-command-service.ts](apps/api/src/workflow/workflow-command-service.ts)

**Template Structure**:

```typescript
import {
  executeMutationCommand,
  type ExecuteMutationCommandResult,
} from "../policy/mutation-command-gateway.js";
import {
  getWorkflow,
  updateWorkflowState,
  createApprovalRecord,
} from "./index.js";

import type {
  WorkflowRecord,
  WorkflowActorIdentity,
} from "@afenda/meta-types";

const WORKFLOW_TRANSITION_SOURCE = "api.workflows.transition";
const WORKFLOW_APPROVE_SOURCE = "api.workflows.approve";
const WORKFLOW_REJECT_SOURCE = "api.workflows.reject";
const WORKFLOW_CANCEL_SOURCE = "api.workflows.cancel";

// ────────────────────────────────────────────────────────────────────────
// Permission Validation
// ────────────────────────────────────────────────────────────────────────

function validateActorCanTransition(
  actor: WorkflowActorIdentity,
  fromState: string,
  toState: string
): void {
  // Example: approx rules (customize per permission model)
  const allowedTransitions: Record<string, string[]> = {
    draft: ["submitted"],          // submitter can submit
    submitted: ["approved", "rejected"], // approver can review
    approved: ["completed"],       // system
    rejected: ["draft"],           // submitter can re-draft
  };

  const validTargets = allowedTransitions[fromState] ?? [];

  // Actor-level checks
  if (actor.role === "submitter" && fromState === "approved") {
    throw new Error("Submitter cannot edit approved workflows");
  }

  if (actor.role === "approver" && fromState !== "submitted") {
    throw new Error("Approver can only review submitted workflows");
  }

  if (!validTargets.includes(toState)) {
    throw new Error(`Invalid transition: ${fromState} → ${toState}`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Command Functions
// ────────────────────────────────────────────────────────────────────────

export async function transitionWorkflowCommand(input: {
  workflowId: string;
  toState: string;
  actor: WorkflowActorIdentity;
  reason?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflowId);
  if (!existing) {
    throw new Error(`Workflow ${input.workflowId} not found`);
  }

  // Validate actor has permission for this transition
  validateActorCanTransition(input.actor, existing.state, input.toState);

  const nextRecord: WorkflowRecord = {
    ...existing,
    state: input.toState,
    lastModifiedBy: input.actor.userId,
    lastModifiedAt: new Date().toISOString(),
  };

  return executeMutationCommand<WorkflowRecord>({
    model: "workflow",
    operation: "transition",
    recordId: input.workflowId,
    actorId: input.actor.userId,
    source: input.source ?? WORKFLOW_TRANSITION_SOURCE,
    existingRecord: existing,
    nextRecord,
    mutate: async () => {
      updateWorkflowState(input.workflowId, input.toState, {
        lastModifiedBy: input.actor.userId,
        lastModifiedAt: nextRecord.lastModifiedAt,
      });
      return nextRecord;
    },
  });
}

export async function approveWorkflowCommand(input: {
  workflowId: string;
  actor: WorkflowActorIdentity;
  comment?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflowId);
  if (!existing) {
    throw new Error(`Workflow ${input.workflowId} not found`);
  }

  // Only approvers can approve
  if (input.actor.role !== "approver") {
    throw new Error("Only approvers can approve workflows");
  }

  const nextRecord: WorkflowRecord = {
    ...existing,
    state: "approved",
    lastModifiedBy: input.actor.userId,
    lastModifiedAt: new Date().toISOString(),
  };

  return executeMutationCommand<WorkflowRecord>({
    model: "workflow",
    operation: "approve",
    recordId: input.workflowId,
    actorId: input.actor.userId,
    source: input.source ?? WORKFLOW_APPROVE_SOURCE,
    existingRecord: existing,
    nextRecord,
    mutate: async () => {
      updateWorkflowState(input.workflowId, "approved", {
        lastModifiedBy: input.actor.userId,
        lastModifiedAt: nextRecord.lastModifiedAt,
      });
      // Store approval record for audit trail
      createApprovalRecord({
        workflowId: input.workflowId,
        approver: input.actor,
        comment: input.comment,
        approvedAt: nextRecord.lastModifiedAt,
      });
      return nextRecord;
    },
  });
}

export async function rejectWorkflowCommand(input: {
  workflowId: string;
  actor: WorkflowActorIdentity;
  reason: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflowId);
  if (!existing) {
    throw new Error(`Workflow ${input.workflowId} not found`);
  }

  // Only approvers can reject
  if (input.actor.role !== "approver") {
    throw new Error("Only approvers can reject workflows");
  }

  const nextRecord: WorkflowRecord = {
    ...existing,
    state: "rejected",
    lastModifiedBy: input.actor.userId,
    lastModifiedAt: new Date().toISOString(),
  };

  return executeMutationCommand<WorkflowRecord>({
    model: "workflow",
    operation: "reject",
    recordId: input.workflowId,
    actorId: input.actor.userId,
    source: input.source ?? WORKFLOW_REJECT_SOURCE,
    existingRecord: existing,
    nextRecord,
    mutate: async () => {
      updateWorkflowState(input.workflowId, "rejected", {
        lastModifiedBy: input.actor.userId,
        lastModifiedAt: nextRecord.lastModifiedAt,
      });
      return nextRecord;
    },
  });
}

export async function cancelWorkflowCommand(input: {
  workflowId: string;
  actor: WorkflowActorIdentity;
  reason: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflowId);
  if (!existing) {
    throw new Error(`Workflow ${input.workflowId} not found`);
  }

  // Only admins can cancel (or submitter if still in draft)
  if (
    input.actor.role !== "admin" &&
    !(input.actor.role === "submitter" && existing.state === "draft")
  ) {
    throw new Error("Cannot cancel workflow at current state");
  }

  const nextRecord: WorkflowRecord = {
    ...existing,
    state: "cancelled",
    lastModifiedBy: input.actor.userId,
    lastModifiedAt: new Date().toISOString(),
  };

  return executeMutationCommand<WorkflowRecord>({
    model: "workflow",
    operation: "cancel",
    recordId: input.workflowId,
    actorId: input.actor.userId,
    source: input.source ?? WORKFLOW_CANCEL_SOURCE,
    existingRecord: existing,
    nextRecord,
    mutate: async () => {
      updateWorkflowState(input.workflowId, "cancelled", {
        lastModifiedBy: input.actor.userId,
        lastModifiedAt: nextRecord.lastModifiedAt,
      });
      return nextRecord;
    },
  });
}
```

**Key Patterns to Match**:
- ✅ Actor identity validation before mutation
- ✅ Permission checks (role-based authorization)
- ✅ All routes through executeMutationCommand gateway
- ✅ Actor ID captured in command + event
- ✅ Reason/comment stored for audit trail
- ✅ Error messages actionable for API consumers

**Command Functions Created**:
- [ ] `transitionWorkflowCommand()` — generic state transition
- [ ] `approveWorkflowCommand()` — approver-only operation
- [ ] `rejectWorkflowCommand()` — approver-only operation
- [ ] `cancelWorkflowCommand()` — admin/submitter-only operation

---

### Phase 4: Route Wiring (45-60 min)

**Task**: Update workflow.ts routes to call command services and resolve actor identity

**Reference File**: [apps/api/src/modules/sales/return-order/return-order.ts](apps/api/src/modules/sales/return-order/return-order.ts)

**File to Modify**: [apps/api/src/routes/workflow.ts](apps/api/src/routes/workflow.ts)

**Key Changes**:

1. **Import command services** + types:
```typescript
import {
  transitionWorkflowCommand,
  approveWorkflowCommand,
  rejectWorkflowCommand,
  cancelWorkflowCommand,
} from "../workflow/workflow-command-service.js";
import type { WorkflowActorIdentity } from "@afenda/meta-types";
```

2. **Actor Resolution Function** (similar to tenant `resolveActorId`):
```typescript
function resolveWorkflowActor(req: Request): WorkflowActorIdentity {
  const session = req.session as { uid?: string; role?: string; tenantId?: string };
  
  const userId = typeof session.uid === "number" ? String(session.uid) : session.uid;
  if (!userId) {
    throw new Error("Actor ID not available in session");
  }

  const role = (session.role ?? "submitter") as "approver" | "submitter" | "admin";
  const tenantId = session.tenantId ?? "default";

  return {
    userId,
    role,
    tenantId,
    timestamp: Date.now(),
    source: "api",
  };
}
```

3. **Transition Endpoint** (POST /api/workflows/:id/transition):
```typescript
router.post("/:workflowId/transition", async (req: Request, res: Response) => {
  try {
    const { toState, reason } = req.body as { toState: string; reason?: string };

    if (!toState) {
      return res.status(400).json({ error: "toState is required" });
    }

    const actor = resolveWorkflowActor(req);
    const result = await transitionWorkflowCommand({
      workflowId: req.params.workflowId,
      toState,
      actor,
      reason,
    });

    res.json({
      data: result,
      meta: {
        mutationPolicy: result.mutationPolicy,
        policyId: result.policy?.id,
        actor: actor.userId,
        role: actor.role,
        eventType: result.event?.eventType,
        eventId: result.event?.id,
      },
    });
  } catch (err) {
    if (err instanceof MutationPolicyViolationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    const msg = err instanceof Error ? err.message : "Transition failed";
    res.status(400).json({ error: msg });
  }
});
```

4. **Approve Endpoint** (POST /api/workflows/:id/approve):
```typescript
router.post("/:workflowId/approve", async (req: Request, res: Response) => {
  try {
    const { comment } = req.body as { comment?: string };

    const actor = resolveWorkflowActor(req);
    const result = await approveWorkflowCommand({
      workflowId: req.params.workflowId,
      actor,
      comment,
    });

    res.json({
      data: result,
      meta: {
        mutationPolicy: result.mutationPolicy,
        actor: actor.userId,
        approverRole: actor.role,
        eventType: result.event?.eventType,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Approval failed";
    res.status(400).json({ error: msg });
  }
});
```

5. **Reject Endpoint** + **Cancel Endpoint** — follow same pattern

**Critical Elements**:
- ✅ Actor identity resolved from session
- ✅ Permission validation via command service
- ✅ Mutation metadata in response
- ✅ Error handling: authorization errors → 400/403
- ✅ Audit trail: actor + reason captured

---

### Phase 5: Test Creation (1-1.5 hours)

**Task**: Create workflow command tests with actor identity validation

**Reference File**: [apps/api/src/modules/sales/__test__/return-order-command-service.test.ts](apps/api/src/modules/sales/__test__/return-order-command-service.test.ts)

**File to Create**: [apps/api/src/workflow/__test__/workflow-command-service.test.ts](apps/api/src/workflow/__test__/workflow-command-service.test.ts)

**Test Suite Structure**:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  transitionWorkflowCommand,
  approveWorkflowCommand,
  rejectWorkflowCommand,
} from "../workflow-command-service.js";
import type { WorkflowActorIdentity } from "@afenda/meta-types";

describe("workflow command services", () => {
  const mockActor: WorkflowActorIdentity = {
    userId: "user-1",
    role: "approver",
    tenantId: "tenant-1",
  };

  const submitterActor: WorkflowActorIdentity = {
    userId: "user-2",
    role: "submitter",
    tenantId: "tenant-1",
  };

  describe("transitionWorkflowCommand", () => {
    it("allows valid state transitions for actor role", async () => {
      const result = await transitionWorkflowCommand({
        workflowId: "wf-1",
        toState: "approved",
        actor: mockActor,
      });

      expect(result.mutationPolicy).toBe("dual-write");
      expect(result).toHaveProperty("event");
    });

    it("rejects invalid transitions", async () => {
      await expect(
        transitionWorkflowCommand({
          workflowId: "wf-1",
          toState: "invalid-state",
          actor: mockActor,
        })
      ).rejects.toThrow("Invalid transition");
    });

    it("enforces role-based permissions", async () => {
      // Submitter trying to transition from approved state
      await expect(
        transitionWorkflowCommand({
          workflowId: "wf-1",
          toState: "rejected",
          actor: submitterActor,
        })
      ).rejects.toThrow("Submitter cannot");
    });
  });

  describe("approveWorkflowCommand", () => {
    it("allows approvers to approve workflows", async () => {
      const result = await approveWorkflowCommand({
        workflowId: "wf-1",
        actor: mockActor,
        comment: "Looks good",
      });

      expect(result.mutationPolicy).toBe("dual-write");
    });

    it("blocks non-approvers from approving", async () => {
      await expect(
        approveWorkflowCommand({
          workflowId: "wf-1",
          actor: submitterActor,
          comment: "Approve",
        })
      ).rejects.toThrow("Only approvers");
    });
  });

  describe("rejectWorkflowCommand", () => {
    it("allows approvers to reject workflows", async () => {
      const result = await rejectWorkflowCommand({
        workflowId: "wf-1",
        actor: mockActor,
        reason: "Incomplete documentation",
      });

      expect(result.mutationPolicy).toBe("dual-write");
    });

    it("blocks non-approvers from rejecting", async () => {
      await expect(
        rejectWorkflowCommand({
          workflowId: "wf-1",
          actor: submitterActor,
          reason: "Reject",
        })
      ).rejects.toThrow("Only approvers");
    });
  });
});
```

**Test Cases** (minimum 8):
- [ ] ✅ Valid transition allowed for actor role
- [ ] ✅ Invalid transition rejected
- [ ] ✅ Role-based permission enforcement (transition)
- [ ] ✅ Approvers can approve
- [ ] ✅ Non-approvers blocked from approving
- [ ] ✅ Approvers can reject
- [ ] ✅ Non-approvers blocked from rejecting
- [ ] ✅ Actor identity captured in command

---

### Phase 6: Full API Regression Test (30 min)

**Command**: Run full API test suite

```bash
pnpm --filter @afenda/api test --run
```

**Expected Output**:
```
Test Files: 52 passed | 1 skipped (53)
Tests: 772 passed | 6 skipped (778)
Duration: ~21-22s

Key Results:
  ✓ Tenant routes: 6/6 ✅
  ✓ Organization routes: 6/6 ✅ (Stream B parallel)
  ✓ Workflow command services: 8/8 ✅ (Stream C)
  ✓ Sales routes: 39/39 ✅
  ✓ Projection runtime: 5/5 ✅
```

**Validation Success Criteria**:
- ✅ 8 new workflow tests added
- ✅ Total test count: 766 → 778 (8 new + 4 from org routes)
- ✅ No regression: tenant + sales + projection tests unchanged
- ✅ Duration: ~21-22s

---

## Success Metrics (Day 3 Exit Criteria)

| Metric | Target | Validation |
|--------|--------|-----------|
| **Actor Identity Tracking** | 100% (4+ commands) | Command services: 4/4 created ✓ |
| **Workflow Command Tests** | 8 tests | workflow-command-service.test.ts: 8/8 ✓ |
| **Permission Enforcement** | Validated per role | Role checks in tests: passing ✓ |
| **API Baseline** | 766 + 8 → 774 (+8) | No regressions ✓ |
| **Audit Trail** | Actor + reason captured | Events include actor identity ✓ |

---

## Deliverables Checklist

- [ ] **File**: [apps/api/src/workflow/workflow-command-service.ts](apps/api/src/workflow/workflow-command-service.ts)
  - [ ] 4 command functions: transition, approve, reject, cancel
  - [ ] Actor identity validation + permission checks
  - [ ] All route through executeMutationCommand gateway
  - [ ] Audit trail fields (lastModifiedBy, reason, etc.)

- [ ] **Type Definition**: WorkflowActorIdentity added to @afenda/meta-types
  - [ ] userId: string
  - [ ] role: enum (approver | submitter | admin)
  - [ ] tenantId: string
  - [ ] Imported in workflow-command-service.ts

- [ ] **File**: [apps/api/src/routes/workflow.ts](apps/api/src/routes/workflow.ts) (modified)
  - [ ] Import command services
  - [ ] `resolveWorkflowActor()` function added
  - [ ] POST /api/workflows/:id/transition routed
  - [ ] POST /api/workflows/:id/approve routed
  - [ ] POST /api/workflows/:id/reject routed
  - [ ] PUT /api/workflows/:id (cancel) routed
  - [ ] Error handling: authorization → 400/403

- [ ] **File**: [apps/api/src/workflow/__test__/workflow-command-service.test.ts](apps/api/src/workflow/__test__/workflow-command-service.test.ts)
  - [ ] 8 test cases (transition, approve, reject, authorization)
  - [ ] Actor identity validation tested
  - [ ] Role-based permission checks tested
  - [ ] All tests passing

- [ ] **Verification**:
  - [ ] `pnpm --filter @afenda/api test --run src/workflow/__test__/workflow-command-service.test.ts` → 8/8 ✓
  - [ ] `pnpm --filter @afenda/api test --run` → 774+ tests passing ✓
  - [ ] `pnpm run build` → no errors ✓

---

## Key Differences: Stream C vs Stream B

| Aspect | Stream B (Platform) | Stream C (Workflow) |
|--------|-------------------|------------------|
| **Pattern** | Tenant (simple dual-write) | Sales (actor identity) |
| **Command Count** | 3 (create, update, delete) | 4 (transition, approve, reject, cancel) |
| **Permission Model** | Simple (authenticated user) | Role-based (approver, submitter, admin) |
| **Audit Trail** | Basic (actorId, source) | Extended (actor role, reason, comment) |
| **Event Content** | Aggregate change | Aggregate + actor + reason |
| **Tests** | 6 route tests | 8 command service tests |

---

## Parallel: Stream B (Platform) Running Today

While Stream C completes workflow actor identity implementation, Stream B simultaneously:
- Implements organization command services
- Validates 100% command ownership for organization writes
- Achieves 6/6 organization route tests passing

See: [WAVE4-DAY3-STREAM-B-KICKOFF.md](WAVE4-DAY3-STREAM-B-KICKOFF.md)

---

## Next: Day 4 Cross-Domain Alignment

Once Streams B & C complete:
1. Integrate platform (organization) + workflow (transitions) projections in shared registry
2. Validate replay determinism across domain boundaries
3. Add cross-domain tests (if org creation fails, can workflows safely rewind?)

See: [WAVE4-DAY4-CROSS-DOMAIN.md](WAVE4-DAY4-CROSS-DOMAIN.md) (to be created on Day 4)

---

**Status**: 🟢 Ready for Day 3 Execution
