# Data Lifecycle

Policy-driven data lifecycle governance for `@afenda/db` — partitioning, retention, archive/restore, and enterprise audit evidence.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full design details.

---

## Quick Start

```bash
# Plan mode
pnpm --filter @afenda/db data:lifecycle partition-plan --dry-run
pnpm --filter @afenda/db data:lifecycle retention-plan --dry-run --tenant=1 --actor=1

# Apply mode
pnpm --filter @afenda/db data:lifecycle partition-plan --apply
pnpm --filter @afenda/db data:lifecycle retention-plan --apply --tenant=1 --actor=1

# Operations
pnpm --filter @afenda/db data:lifecycle promote --dry-run
pnpm --filter @afenda/db data:lifecycle archive --dry-run
pnpm --filter @afenda/db data:lifecycle restore --key=<object-key>
pnpm --filter @afenda/db data:lifecycle health
pnpm --filter @afenda/db data:lifecycle list --tier=warm
```

---

## Governance Workflow

```bash
# 1) Build governance artifact
pnpm --filter @afenda/db data:lifecycle audit-policy --policy-id=sales-default --json --persist-audit=false > .reports/dl-audit.json

# 2) Verify contract quality
pnpm --filter @afenda/db data:lifecycle verify-artifact --artifact-path=.reports/dl-audit.json --min-score=85

# 3) Verify policy baseline drift
pnpm --filter @afenda/db data:lifecycle verify-baseline --artifact-path=.reports/dl-audit.json --policy-id=sales-default

# 4) Enforce approved artifact gate before mutation
pnpm --filter @afenda/db data:lifecycle retention-plan --apply --tenant=1 --actor=1 --enforce-approved-artifact --approved-artifact-path=.reports/dl-audit.json
```

---

## Artifact Contract and Compatibility

- Canonical contract: `1.1.0`
- Backward compatible: `1.0.0` normalized into `1.1.0`
- Verification checks:
  - governance score threshold
  - digest and signature verification
  - freshness window
  - legacy contract reject policy
  - legacy contract sunset policy

### Deprecation Controls

```bash
--reject-legacy-contract
--legacy-contract-sunset-date=2026-12-31T23:59:59.000Z
--max-artifact-age-days=30
```

Mutation-specific controls:

```bash
--artifact-reject-legacy-contract
--artifact-legacy-contract-sunset-date=2026-12-31T23:59:59.000Z
--artifact-max-age-days=30
```

---

## Built-In Policies

- `sales-default`
- `hr-attendance-default`
- `finance-accounting-default`

Override precedence:

- `base -> global -> industry -> tenant`
- model key: `data-lifecycle.policy.<policyId>`
- maker-checker enforced via `lifecycle_override_approvals`

---

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `LIFECYCLE_AUDIT_SIGNING_KEY` | HMAC signing/verifying for artifact evidence |
| `LIFECYCLE_LEGACY_CONTRACT_SUNSET_DATE` | Default verify/baseline legacy sunset date |
| `LIFECYCLE_ARTIFACT_LEGACY_CONTRACT_SUNSET_DATE` | Default mutation-gate legacy sunset date |

---

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm --filter @afenda/db data:lifecycle` | Lifecycle CLI entrypoint |
| `pnpm --filter @afenda/db data:lifecycle:audit:json` | Emit governance artifact JSON |
| `pnpm --filter @afenda/db data:lifecycle:audit:verify` | Verify governance artifact |
| `pnpm --filter @afenda/db data:lifecycle:audit:baseline` | Verify baseline drift |
| `pnpm --filter @afenda/db data:lifecycle:audit:render` | Render markdown evidence report |

---

## Boundaries

- `src/data-lifecycle/` owns orchestration + governance logic.
- `src/r2/` owns object store implementation.
- `migrations/generated/truth-v1.sql` (with `truth-compiler/sql/*` fragments) remains the domain transition / integrity trigger bundle.

---

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../r2/README.md](../r2/README.md)
- [../../../meta-types/README.md](../../../meta-types/README.md)
