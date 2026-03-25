# Dependency Governance Policy

## Purpose

This policy defines how dependencies are selected, approved, upgraded, and monitored across the workspace. The goal is to ensure long-term stability, predictable upgrades, security, and architectural integrity for a mission-critical platform.

---

## 1. Guiding Principles

### 1.1 Stability Over Novelty

Dependencies must be chosen for reliability and long-term maintenance rather than trend value.

### 1.2 Intentional Evolution

All major upgrades are treated as planned engineering initiatives, not routine maintenance.

### 1.3 System Integrity

The monorepo is treated as a unified system. Dependency decisions must consider cross-package impact.

### 1.4 Auditability

Every dependency change must be traceable to a clear reason:

- Security
- Bug fix
- Performance
- Required feature
- Ecosystem compatibility

---

## 2. Dependency Classification

### 2.1 Runtime Dependencies

Packages required for production execution.

Examples: framework libraries, database clients, validation libraries.

Rules:

- Must have strong maintenance history
- Must not be abandoned or experimental
- Major upgrades require migration planning

### 2.2 Development Dependencies

Tooling used only during development.

Examples: linters, formatters, testing frameworks, build tools.

Rules:

- Can be updated more frequently
- Must not affect production behavior
- Should remain aligned across workspace

### 2.3 Infrastructure Dependencies

Packages that define platform behavior.

Examples: build systems, compilers, framework runtimes.

Rules:

- Version pinned deliberately
- Upgraded only in scheduled platform migration waves
- Changes must be validated across all apps

---

## 3. Versioning Strategy

### 3.1 Allowed Update Types

| Update Type | Policy | Approval |
|---|---|---|
| Patch | Auto-approve | Not required |
| Minor | Allowed after CI passes | Not required |
| Major | Planned migration only | Required |

### 3.2 Version Pinning Rules

Must pin exact versions:

- Core frameworks
- Database layer
- Build tools
- Type system

Allow ranges:

- UI utilities
- Non-critical helpers
- Dev tools

---

## 4. Upgrade Governance

### 4.1 Immediate Upgrades

Allowed when all are true:

- Patch or minor version
- No breaking changes
- No config changes
- CI passes

### 4.2 Scheduled Upgrade Waves

Required when any are true:

- Major version change
- API surface changes
- Build pipeline impact
- Runtime behavior changes

Upgrade waves must:

1. Occur in isolated branches
2. Include migration documentation
3. Include rollback plan
4. Pass full regression testing

---

## 5. Workspace Consistency Rules

### 5.1 Single Version Policy

Shared libraries must use the same version across all packages.

### 5.2 Centralized Version Control

Workspace dependency catalogs must define canonical versions.

### 5.3 Duplicate Dependency Prevention

Multiple versions of the same runtime dependency are not allowed unless technically required.

---

## 6. Dependency Admission Rules

New dependencies may only be added if:

1. The feature cannot be reasonably built in-house
2. The package is actively maintained
3. Weekly downloads and ecosystem usage indicate stability
4. License is compatible
5. Bundle size impact is acceptable
6. Security history shows no repeated critical issues

All new runtime dependencies require architectural review.

---

## 7. Removal Policy

Dependencies should be removed when:

- No longer used
- Replaced by platform capability
- Causes security or maintenance risk
- Redundant with existing library

Quarterly audits should prune unused packages.

---

## 8. Security Governance

### 8.1 Continuous Monitoring

Security audits must run in CI.

### 8.2 Mandatory Patching

High-severity vulnerabilities must be patched immediately.

### 8.3 Supply Chain Risk Reduction

Avoid packages that:

- Have many transitive dependencies
- Are maintained by single individuals
- Show inconsistent release patterns

---

## 9. Architectural Protection Rules

### 9.1 Server-Client Separation

Server-only packages must never appear in frontend bundles.

### 9.2 Framework Boundary Respect

Framework plugins must not introduce hidden runtime coupling.

### 9.3 Core Layer Protection

Changes affecting the following require architecture review:

- Rendering model
- Routing
- State management
- Database contracts
- Build pipeline

---

## 10. Operational Procedures

### 10.1 Monthly Maintenance

- Run outdated checks
- Apply safe updates
- Review security alerts

### 10.2 Quarterly Review

- Remove dead dependencies
- Evaluate ecosystem shifts
- Assess upgrade candidates

### 10.3 Annual Platform Review

- Plan major framework migrations
- Evaluate long-term tooling viability
- Reassess architectural alignment

---

## 11. Documentation Requirements

Each major upgrade must include:

- Upgrade rationale
- Risk assessment
- Migration steps
- Test plan
- Rollback procedure

---

## 12. Decision Framework

Upgrade immediately if:

- Security risk exists
- Bug affects production
- Performance gains are significant

Defer if:

- Upgrade is cosmetic
- Ecosystem still stabilizing
- Migration cost exceeds benefit

Avoid if:

- Project is stable
- Library is mature
- No strategic value gained

---

## 13. Policy Outcome

Following this policy ensures:

- Predictable system evolution
- Reduced upgrade risk
- Long-term maintainability
- Clean architectural boundaries
- Enterprise-grade reliability

---

## Appendix A — Workspace Catalog

The `catalog:` section in `pnpm-workspace.yaml` is the **single source of truth** for governed package versions across all workspace members. All workspace `package.json` files reference these as `"catalog:"` — resolving to the catalog version at install time.

| Package | Catalog Version | Reason |
|---------|----------------|--------|
| `drizzle-orm` | `1.0.0-beta.19` | Exact pin — beta API surface |
| `drizzle-kit` | `1.0.0-beta.19` | Must match drizzle-orm exactly |
| `zod` | `^4.3.6` | Shared validation layer |
| `vitest` | `^4.1.1` | Test framework alignment |
| `@vitest/coverage-v8` | `^4.1.1` | Must align with vitest |
| `@vitest/ui` | `^4.1.1` | Must align with vitest |
| `tsx` | `^4.21.0` | Script runner alignment |
| `pg` | `^8.20.0` | DB driver alignment |
| `@types/pg` | `^8.20.0` | Driver types alignment |
| `@types/node` | `^22.0.0` | Node 22 LTS target |
| `typescript` | `^5.9.0` | Cross-workspace type system alignment |

> **Governance mechanism**: pnpm catalog (`pnpm-workspace.yaml` > `catalog:`) requires pnpm ≥ 9.5. This workspace uses pnpm 10.33.0.

> **Transitive overrides** (not direct deps — no `catalog:` entry needed): `flatted: "^3.4.2"` stays in root `package.json` > `pnpm.overrides`.

> To update a governed version: change the value in `pnpm-workspace.yaml` catalog section, then run `pnpm install`.

---

## Appendix B — Enforcement Commands

The CI gate enforces governance rules automatically. Run these commands during development and in CI.

```bash
# Full dependency gate (audit + outdated + version alignment + anti-patterns)
pnpm ci:deps

# Security audit only (fails on high/critical)
pnpm ci:deps:audit

# Outdated check (informational, does not fail)
pnpm ci:deps:outdated

# Dependency governance rule check (version alignment, server-client boundary)
pnpm ci:gate:dependencies

# Verbose output for debugging violations
pnpm ci:gate:verbose
```

The gate validates:
1. Critical packages (`drizzle-orm`, `drizzle-kit`, `zod`, `vitest`) are version-aligned across workspace
2. Server-only packages (`express`, `pg`, `drizzle-orm`, `jose`, etc.) do not appear in frontend bundles
3. Internal packages use `workspace:*` protocol
4. No `file:` references in non-root packages

---

## Appendix C — Upgrade Wave Schedule

Major dependency upgrades are planned in waves to isolate risk. The following schedule reflects the current backlog.

### Wave 2 — Planned (next quarter)

| Package | Current | Target | Effort | Notes |
|---------|---------|--------|--------|-------|
| React | 18 | 19 | High | RSC assessment required, hook migration |
| Express | 4 | 5 | Medium | Middleware signature changes, async error handling |
| Turbo | 1 | 2 | Medium | `pipeline` → `tasks` config migration |
| Redux + Zustand | dual | unified | High | Architecture refactor — separate risk domain |
| 11 duplicate table defs | — | unified | High | Data layer consolidation — high blast radius |

### Wave 3 — Future

| Package | Current | Target | Effort | Notes |
|---------|---------|--------|--------|-------|
| TypeScript | 5 | 6 | High | New resolution semantics |
| `@rjsf` | v5 | v6 | High | Form engine rewrite risk |
| `date-fns` | 2 | 4 | Medium | Tree-shaking import changes |

No Wave 3 item may be pulled forward without a formal architecture review.