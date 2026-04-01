# Data Lifecycle — Architecture

> **Status:** Production Governance Layer  
> **Package:** `@afenda/db` (`src/data-lifecycle`)  
> **Database:** PostgreSQL (Neon) + Cloudflare R2 mirror  
> **Runtime:** TypeScript CLI orchestration + policy governance  
> **Contract:** Governance audit artifact `1.1.0` (backward-compatible with `1.0.0`)

---

## The Design Philosophy

| Old approach                                 | New approach                                     |
| -------------------------------------------- | ------------------------------------------------ |
| Ad-hoc retention/partition scripts           | ❌ inconsistent operations                        |
| Domain-specific lifecycle code               | ❌ not platform-scalable                          |
| Mutable governance records without evidence  | ❌ weak auditability                              |
| **Policy + evidence + enforcement pipeline** | ✅ deterministic, auditable, enterprise-governed |

---

## Module Role

`src/data-lifecycle` is the **governed lifecycle control plane** for:

- Partition lifecycle planning and execution
- Retention lifecycle planning and execution
- Warm-to-cold archival (R2) and restore
- Governance audit evidence generation and persistence
- Baseline drift detection and mutation safety gates

### Boundary Position

```text
apps/api / ops / CI
        |
        v
packages/db/src/data-lifecycle  <-- policy + governance runner
        | \
        |  \--> packages/db/src/r2        (object store adapter boundary)
        |
        \----> packages/db/src/schema/meta (approvals + audit persistence)
```

---

## Module Structure

```text
src/data-lifecycle/
├── ARCHITECTURE.md
├── README.md
├── runner.ts                         # CLI commands + operational gates
├── partition/
│   └── partitionPlan.ts              # policy-driven partition action planner
├── retention/
│   └── retentionPlan.ts              # policy-driven retention action planner
├── adapters/
│   └── r2ColdStorageAdapter.ts       # cold tier bridge to R2
├── policies/
│   ├── types.ts                      # lifecycle policy contracts + SLO gates
│   ├── schema.ts                     # Zod policy validation + SQL ref safety
│   ├── defaultPolicy.ts              # built-in policy catalog
│   └── overrideResolver.ts           # base->global->industry->tenant resolution
├── governance/
│   ├── auditReport.ts                # 7W1H evidence + governance scoring
│   ├── persistence.ts                # append-only DB + mirror + digest/signature
│   └── artifactContract.ts           # v1.1 contract + v1.0 normalization + verification
└── __test__/
    ├── partitionPlan.test.ts
    ├── retentionPlan.test.ts
    ├── policyResolver.test.ts
    ├── overrideResolver.test.ts
    ├── auditReport.test.ts
    ├── artifactContract.test.ts
    └── r2ColdStorageAdapter.test.ts
```

---

## Core Architecture

### 1) Policy Resolution Engine

- Base policy selected by `--policy-id`
- Override stack: `base -> global -> industry -> tenant`
- Invalid or unapproved patches are skipped with reason tracking
- Maker-checker enforcement (`checker_id != maker_id`) for applied overrides

### 2) Planner Layer

- `partition-plan`: deterministic SQL action generation by policy targets
- `retention-plan`: deterministic SQL action generation by archive/purge rules
- Dry-run is default; `--apply` required for mutations

### 3) Cold-Tier Adapter Boundary

- Lifecycle module owns orchestration intent
- `r2ColdStorageAdapter` owns storage implementation details
- Keeps storage backend replaceable while governance remains stable

### 4) Governance Evidence Fabric

- `audit-policy` produces governance report with:
  - 7W1H
  - governance checks
  - governance score/rating
  - applied and skipped patch provenance
- Evidence persisted append-only to `lifecycle_audit_reports`
- Optional R2 mirror for immutable evidence copies
- SHA-256 digest + optional HMAC signature for tamper evidence

### 5) Artifact Contract + Verification

- Contract `1.1.0` is canonical
- Contract `1.0.0` is normalized into `1.1.0` for backward compatibility
- Verification checks:
  - score threshold
  - digest integrity
  - signature verification (optional/required)
  - freshness window (max age days)
  - legacy contract rejection and/or sunset enforcement

### 6) Mutation Safety Gates

- SLO gates (actions/failure thresholds) fail-safe mutation runs
- Approved artifact gate can be required before mutation commands
- Baseline drift guard validates current resolved policy hash against approved artifact

---

## Contract Stability Policy

1. Current artifact contract is `1.1.0`
2. Legacy `1.0.0` is accepted only through normalization paths
3. Legacy acceptance can be controlled by:
   - hard reject flag
   - sunset date policy
4. Breaking contract changes require new contract version + migration notes

---

## Operational Modes

- **Standard:** score threshold + digest check
- **Strict:** requires signature + freshness + no legacy contract
- **Reference:** strict mode + mutation approved-artifact gate

---

## Consistency With `@afenda/meta-types`

- Contract-first design: explicit schemas and typed structures
- Stable public contract and deprecation policy
- Minimal hidden behavior; checks are explicit and auditable
- Deterministic merge order and explicit runtime validation

---

## See Also

- [README.md](./README.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../r2/README.md](../r2/README.md)
- [../../../meta-types/ARCHITECTURE.md](../../../meta-types/ARCHITECTURE.md)
