# Organization Rollback Drill Evidence

- Generated at (UTC): 2026-03-27T23:11:36.020Z
- Aggregate: organization
- Execution context: local-rehearsal
- Rollback path validated: event-only -> dual-write

## Command Bundle Results

### Policy contract consistency gate

- Command: `pnpm ci:policy:contract-consistency`
- Exit code: 0

```text
> afenda-meta-ui@0.1.0 ci:policy:contract-consistency C:\NexusCanon\AFENDA-META-UI
> pnpm exec tsx tools/scripts/ci-policy-contract-consistency-check.ts

✅ Policy contract consistency check passed (9 mutation policies validated).
```

### Organization store and command-service tests

- Command: `pnpm --filter @afenda/api exec vitest run src/organization/__test__/index.test.ts src/organization/__test__/organization-command-service.test.ts`
- Exit code: 0

```text
[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/organization/__test__/organization-command-service.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/organization/__test__/index.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 48[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m   Start at [22m 06:11:06
[2m   Duration [22m 516ms[2m (transform 165ms, setup 71ms, import 301ms, tests 64ms, environment 0ms)[22m
```

### Organization route command-ownership tests

- Command: `pnpm --filter @afenda/api exec vitest run src/routes/__test__/organization.route.test.ts`
- Exit code: 0

```text
[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

[23:11:11] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations"
    [35mmethod[39m: "POST"
    [35muserId[39m: "31"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:79:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "create",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.create",
      "name": "MutationPolicyViolationError"
    }
[23:11:11] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations/org-1"
    [35mmethod[39m: "PUT"
    [35muserId[39m: "32"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:177:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.update",
      "name": "MutationPolicyViolationError"
    }
 [32m✓[39m src/routes/__test__/organization.route.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 96[2mms[22m[39m
[23:11:11] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations/org-1"
    [35mmethod[39m: "DELETE"
    [35muserId[39m: "99"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:246:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "delete",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.delete",
      "name": "MutationPolicyViolationError"
    }

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m   Start at [22m 06:11:08
[2m   Duration [22m 3.07s[2m (transform 572ms, setup 34ms, import 2.70s, tests 96ms, environment 0ms)[22m
```

### Workflow command-service tests

- Command: `pnpm --filter @afenda/api exec vitest run src/workflow/__test__/workflow-command-service.test.ts`
- Exit code: 0

```text
[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/workflow/__test__/workflow-command-service.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 06:11:13
[2m   Duration [22m 406ms[2m (transform 74ms, setup 32ms, import 118ms, tests 14ms, environment 0ms)[22m
```

### Workflow route actor and command tests

- Command: `pnpm --filter @afenda/api exec vitest run src/routes/__test__/workflow.route.test.ts`
- Exit code: 0

```text
[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

[23:11:18] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows"
    [35mmethod[39m: "POST"
    [35muserId[39m: "52"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:114:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "create",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.create",
      "name": "MutationPolicyViolationError"
    }
[23:11:18] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/workflow-1"
    [35mmethod[39m: "PUT"
    [35muserId[39m: "53"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:207:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.update",
      "name": "MutationPolicyViolationError"
    }
[23:11:18] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/workflow-1"
    [35mmethod[39m: "DELETE"
    [35muserId[39m: "77"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:266:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "delete",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.delete",
      "name": "MutationPolicyViolationError"
    }
[23:11:18] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/instances/wf_1/advance"
    [35mmethod[39m: "POST"
    [35muserId[39m: "91"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow instance mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow instance mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:327:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow_instance",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow_instance.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow_instance"
        ]
      },
      "source": "api.workflows.instances.advance",
      "name": "MutationPolicyViolationError"
    }
[23:11:18] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/instances/wf_1/approve"
    [35mmethod[39m: "POST"
    [35muserId[39m: "92"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow instance mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow instance mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:391:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow_instance",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow_instance.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow_instance"
        ]
      },
      "source": "api.workflows.instances.approve",
      "name": "MutationPolicyViolationError"
    }
 [32m✓[39m src/routes/__test__/workflow.route.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 124[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m   Start at [22m 06:11:15
[2m   Duration [22m 3.11s[2m (transform 619ms, setup 32ms, import 2.72s, tests 124ms, environment 0ms)[22m
```

### Projection replay checks

- Command: `pnpm ci:api:projection-replay`
- Exit code: 0

```text
> afenda-meta-ui@0.1.0 ci:api:projection-replay C:\NexusCanon\AFENDA-META-UI
> pnpm --filter @afenda/api test:projection-replay


> @afenda/api@0.1.0 test:projection-replay C:\NexusCanon\AFENDA-META-UI\apps\api
> vitest run src/events/__test__/projectionRuntime.test.ts src/events/__test__/cross-context-drift-fixture.test.ts src/events/__test__/workflow-replay-concurrency-fixture.test.ts


[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/events/__test__/workflow-replay-concurrency-fixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/events/__test__/cross-context-drift-fixture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/events/__test__/projectionRuntime.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m   Start at [22m 06:11:20
[2m   Duration [22m 393ms[2m (transform 170ms, setup 95ms, import 285ms, tests 27ms, environment 0ms)[22m
```

### Non-sales parity execution checks

- Command: `pnpm ci:parity:non-sales`
- Exit code: 0

```text
> afenda-meta-ui@0.1.0 ci:parity:non-sales C:\NexusCanon\AFENDA-META-UI
> node tools/scripts/ci-non-sales-parity-check.mjs


▶ Policy contract consistency gate (local-rehearsal)

> afenda-meta-ui@0.1.0 ci:policy:contract-consistency C:\NexusCanon\AFENDA-META-UI
> pnpm exec tsx tools/scripts/ci-policy-contract-consistency-check.ts

✅ Policy contract consistency check passed (9 mutation policies validated).
✅ Passed: Policy contract consistency gate

▶ Organization store and command-service tests (local-rehearsal)

[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/organization/__test__/index.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/organization/__test__/organization-command-service.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 15[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m   Start at [22m 06:11:23
[2m   Duration [22m 462ms[2m (transform 158ms, setup 69ms, import 224ms, tests 33ms, environment 0ms)[22m

✅ Passed: Organization store and command-service tests

▶ Organization route command-ownership tests (local-rehearsal)

[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

[23:11:28] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations"
    [35mmethod[39m: "POST"
    [35muserId[39m: "31"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:79:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "create",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.create",
      "name": "MutationPolicyViolationError"
    }
[23:11:28] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations/org-1"
    [35mmethod[39m: "PUT"
    [35muserId[39m: "32"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:177:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.update",
      "name": "MutationPolicyViolationError"
    }
[23:11:28] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/organizations/org-1"
    [35mmethod[39m: "DELETE"
    [35muserId[39m: "99"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct organization mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct organization mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/organization.route.test.ts:246:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "organization",
      "operation": "delete",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.organization.command_event_only",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "organization"
        ]
      },
      "source": "api.organizations.delete",
      "name": "MutationPolicyViolationError"
    }
 [32m✓[39m src/routes/__test__/organization.route.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 95[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m   Start at [22m 06:11:25
[2m   Duration [22m 3.00s[2m (transform 609ms, setup 32ms, import 2.64s, tests 95ms, environment 0ms)[22m

✅ Passed: Organization route command-ownership tests

▶ Workflow command-service tests (local-rehearsal)

[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/workflow/__test__/workflow-command-service.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 06:11:29
[2m   Duration [22m 406ms[2m (transform 74ms, setup 32ms, import 119ms, tests 14ms, environment 0ms)[22m

✅ Passed: Workflow command-service tests

▶ Workflow route actor and command tests (local-rehearsal)

[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

[23:11:34] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows"
    [35mmethod[39m: "POST"
    [35muserId[39m: "52"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:114:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "create",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.create",
      "name": "MutationPolicyViolationError"
    }
[23:11:34] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/workflow-1"
    [35mmethod[39m: "PUT"
    [35muserId[39m: "53"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:207:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.update",
      "name": "MutationPolicyViolationError"
    }
[23:11:34] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/workflow-1"
    [35mmethod[39m: "DELETE"
    [35muserId[39m: "77"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:266:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow",
      "operation": "delete",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow"
        ]
      },
      "source": "api.workflows.delete",
      "name": "MutationPolicyViolationError"
    }
[23:11:34] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/instances/wf_1/advance"
    [35mmethod[39m: "POST"
    [35muserId[39m: "91"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow instance mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow instance mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:327:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow_instance",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow_instance.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow_instance"
        ]
      },
      "source": "api.workflows.instances.advance",
      "name": "MutationPolicyViolationError"
    }
[23:11:34] [31mERROR[39m: [36mError caught by global handler[39m
    [35mservice[39m: "afenda-api"
    [35menv[39m: "test"
    [35murl[39m: "/api/workflows/instances/wf_1/approve"
    [35mmethod[39m: "POST"
    [35muserId[39m: "92"
    err: {
      "type": "MutationPolicyViolationError",
      "message": "Direct workflow instance mutation blocked",
      "stack":
          MutationPolicyViolationError: Direct workflow instance mutation blocked
              at C:/NexusCanon/AFENDA-META-UI/apps/api/src/routes/__test__/workflow.route.test.ts:391:7
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:1893:26
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2316:20
              at new Promise (<anonymous>)
              at runWithCancel (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2313:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2295:20
              at new Promise (<anonymous>)
              at runWithTimeout (file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2262:10)
              at file:///C:/NexusCanon/AFENDA-META-UI/node_modules/.pnpm/@vitest+runner@4.1.1/node_modules/@vitest/runner/dist/chunk-artifact.js:2945:64
      "code": "MUTATION_POLICY_VIOLATION",
      "statusCode": 409,
      "model": "workflow_instance",
      "operation": "update",
      "mutationPolicy": "event-only",
      "policy": {
        "id": "platform.workflow_instance.command_dual_write",
        "mutationPolicy": "event-only",
        "appliesTo": [
          "workflow_instance"
        ]
      },
      "source": "api.workflows.instances.approve",
      "name": "MutationPolicyViolationError"
    }
 [32m✓[39m src/routes/__test__/workflow.route.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 121[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m   Start at [22m 06:11:31
[2m   Duration [22m 3.07s[2m (transform 608ms, setup 30ms, import 2.70s, tests 121ms, environment 0ms)[22m

✅ Passed: Workflow route actor and command tests

▶ Projection replay checks (local-rehearsal)

> afenda-meta-ui@0.1.0 ci:api:projection-replay C:\NexusCanon\AFENDA-META-UI
> pnpm --filter @afenda/api test:projection-replay


> @afenda/api@0.1.0 test:projection-replay C:\NexusCanon\AFENDA-META-UI\apps\api
> vitest run src/events/__test__/projectionRuntime.test.ts src/events/__test__/cross-context-drift-fixture.test.ts src/events/__test__/workflow-replay-concurrency-fixture.test.ts


[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/NexusCanon/AFENDA-META-UI/apps/api[39m

 [32m✓[39m src/events/__test__/workflow-replay-concurrency-fixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/events/__test__/projectionRuntime.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/events/__test__/cross-context-drift-fixture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m   Start at [22m 06:11:35
[2m   Duration [22m 387ms[2m (transform 156ms, setup 79ms, import 290ms, tests 28ms, environment 1ms)[22m

✅ Passed: Projection replay checks

✅ Non-sales parity execution checks passed (local-rehearsal).
```

