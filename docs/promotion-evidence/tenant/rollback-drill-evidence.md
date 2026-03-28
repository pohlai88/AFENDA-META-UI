# Tenant Rollback Drill Evidence

- Generated at (UTC): 2026-03-27T23:09:03.686Z
- Aggregate: tenant
- Execution context: production-candidate
- Rollback path validated: event-only -> dual-write

## Command Bundle Results

### Policy contract consistency gate

- Command: `pnpm ci:policy:contract-consistency`
- Exit code: 0

```text
(skipped)
```

### Organization store and command-service tests

- Command: `pnpm --filter @afenda/api exec vitest run src/organization/__test__/index.test.ts src/organization/__test__/organization-command-service.test.ts`
- Exit code: 0

```text
(skipped)
```

### Organization route command-ownership tests

- Command: `pnpm --filter @afenda/api exec vitest run src/routes/__test__/organization.route.test.ts`
- Exit code: 0

```text
(skipped)
```

### Workflow command-service tests

- Command: `pnpm --filter @afenda/api exec vitest run src/workflow/__test__/workflow-command-service.test.ts`
- Exit code: 0

```text
(skipped)
```

### Workflow route actor and command tests

- Command: `pnpm --filter @afenda/api exec vitest run src/routes/__test__/workflow.route.test.ts`
- Exit code: 0

```text
(skipped)
```

### Projection replay checks

- Command: `pnpm ci:api:projection-replay`
- Exit code: 0

```text
(skipped)
```

### Non-sales parity execution checks

- Command: `pnpm ci:parity:non-sales`
- Exit code: 0

```text
(skipped)
```

### Cross-context cascade validation (tenant -> workflow)

- Command: `pnpm --filter @afenda/api test -- --run src/events/__test__/cross-context-drift-fixture.test.ts`
- Exit code: 0

```text
(skipped)
```

### Platform replay parity check

- Command: `pnpm --filter @afenda/api test -- --run src/routes/__test__/tenant.route.test.ts`
- Exit code: 0

```text
(skipped)
```

