# Phase 4 Gap Report (Authoritative)

Date: 2026-03-25
Reference: PHASE_4_STRATEGIC_ROADMAP.md
Scope: Verified against actual code, tests, and routes in this repository.

## Status Summary

| Pillar | Status | Notes |
|---|---|---|
| Audit Fabric | Partial+ | Decision audit types, logger, routes, and capture hooks are implemented for metadata, rules, policy, workflow, and event mesh. Still in-memory and not yet DB-backed. |
| Resolution Caching Layer | Partial | Cache engine and cached resolution service exist, with tests. Mainline usage still needs full rollout confirmation across all metadata resolution call sites. |
| Admin Control Plane | Missing | No admin API/UI surface for tenant override editing, workflow/rule authoring, or control-plane operations. |
| GraphQL Surface Layer | Partial | GraphQL server/schema exists, but roadmap-level business-domain resolvers and audit-aware resolution surface are incomplete. |

## Verified Evidence

### 1) Audit Fabric

Implemented:
- Types: packages/meta-types/src/audit.ts
- Logger: apps/api/src/audit/decisionAuditLogger.ts
- Routes: apps/api/src/routes/audit.ts
- Metadata hook: apps/api/src/tenant/index.ts
- Rule hook: apps/api/src/rules/index.ts
- Policy hook: apps/api/src/policy/policyEvaluator.ts
- Workflow hook: apps/api/src/workflow/index.ts
- Event mesh hook: apps/api/src/mesh/index.ts

Current limitation:
- Persistence is in-memory only (development-grade retention, not production-grade storage).

### 2) Resolution Caching Layer

Implemented:
- Cache type/engine: packages/meta-types/src/resolutionCache.ts
- Cached resolution service: apps/api/src/tenant/cachedResolution.ts
- Tests: apps/api/src/tenant/resolutionCache.test.ts, apps/api/src/tenant/decisionChainIntegration.test.ts

Current limitation:
- Needs strict rollout verification so all production metadata resolution paths use cache consistently.

### 3) Admin Control Plane

Missing:
- No admin route/controller set aligned with roadmap control-plane endpoints.
- No web admin UI for tenant metadata overrides, workflow definitions, or rule control.

### 4) GraphQL Surface Layer

Implemented baseline:
- Server: apps/api/src/graphql/server.ts
- Schema bootstrap: apps/api/src/graphql/schema.ts

Current limitation:
- Missing roadmap-targeted domain surface (tenant-aware resolved metadata, workflow-centric operations, and audit-chain exposure).

## Additional Implemented Work This Pass

- File and image field renderer support added in web UI:
  - Non-RHF dispatcher: apps/web/src/renderers/fields/FieldRenderer.tsx
  - New components: apps/web/src/renderers/fields/FileField.tsx, apps/web/src/renderers/fields/ImageField.tsx
  - RHF path: apps/web/src/renderers/fields/FormFieldRenderer.tsx
  - Upload client: apps/web/src/api/uploads.ts
  - Tests: apps/web/src/renderers/fields/FormFieldRenderer.test.tsx

- File/image persistence pipeline now implemented end to end:
  - Upload route: apps/api/src/routes/uploads.ts
  - Static file serving: apps/api/src/index.ts (`/uploads`)
  - Storage utility: apps/api/src/uploads/storage.ts
  - Storage tests: apps/api/src/uploads/storage.test.ts
  - HTTP contract tests (supertest): apps/api/src/routes/uploads.route.test.ts

- Upload storage now supports Cloudflare R2 behind the same response contract:
  - R2 adapter: apps/api/src/uploads/r2Storage.ts
  - Provider switch (`UPLOAD_STORAGE_PROVIDER=local|r2`) in apps/api/src/uploads/storage.ts

- Orphaned upload cleanup/retention job added:
  - Cleanup scheduler: apps/api/src/uploads/cleanup.ts
  - Server lifecycle wiring: apps/api/src/index.ts

- Duplicate unsaved-changes implementation removed:
  - Deleted: apps/web/src/components/unsaved-changes-dialog.tsx
  - Canonical flow remains in existing unsaved-change warning hook and MetaFormV2 integration.

## Real Remaining Gaps (Actionable)

1. Admin Control Plane implementation (API + UI) is still the largest missing deliverable.
2. GraphQL domain surface needs roadmap-aligned resolvers (tenant/context aware, not only baseline schema wiring).
3. Audit Fabric storage backend upgrade (DB-backed retention/query) is required for production compliance.
4. Resolution cache rollout verification should be completed and enforced for all metadata resolve entry points.
