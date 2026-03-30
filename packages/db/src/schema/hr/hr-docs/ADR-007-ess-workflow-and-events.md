# ADR-007: Employee self-service workflow, SLA, events, and survey versioning

## Status

Accepted — schema and migration `20260330200000_hr_ess_enterprise_upgrade`; runtime/workflow engine remains application-owned.

## Context

ESS (`employeeExperience.ts`) previously modeled requests as a single approval pair (`approved_by` / `approved_at`) with unstructured JSONB and no first-class SLA, multi-step approvals, domain events, or immutable survey snapshots.

## Decision

1. **Aggregate root:** `employee_requests` carries `aggregate_version` (optimistic concurrency) and is the root for linked approval tasks and (when `aggregate_type = employee_request`) domain events.
2. **SLA:** `sla_status` enum plus timestamps (`sla_due_at`, `sla_breached_at`, `first_response_at`, `submitted_at`); evaluation and reminders are **not** in the database.
3. **Approvals:** `employee_request_approval_tasks` rows model parallel steps (`parallel_group_id`) with explicit `decision` / `decision_reason` and CHECK pairing for `pending` vs terminal states.
4. **History:** `employee_request_history` gains `correlation_id` and `transition_source` (`user` | `system` | `rule` | `migration`).
5. **Events:** `ess_event_types` is the **catalog** for allowed `event_code` values per tenant; `ess_domain_events` references it via FK. `ess_outbox` enforces **at-most-once per destination** (`UNIQUE(domain_event_id, destination)`) and optional **idempotency_key** per tenant.
6. **JSONB governance:** `request_data_schema_version`, `questions_schema_version`, `branching_schema_version`, `responses_schema_version`, `metadata_schema_version` with `CHECK (>= 1)`; shape evolution is documented in code (`_zodShared`) and this ADR — add new versions explicitly.
7. **Surveys:** `employee_survey_questionnaire_versions` stores immutable snapshots; trigger `employee_survey_questionnaire_versions_locked_questions` blocks changing `questions` when `is_locked` is true. `survey_responses.questionnaire_version_id` links answers to a version.
8. **OSS alignment:** `employee_notifications.reference_kind` + `reference_id`; `employee_requests.amended_from_request_id` (self-FK); `related_grievance_id` to `employee_grievances`; `survey_invitations`; `employee_push_endpoints`.
9. **Workflow templates:** `ess_workflow_definitions` / `ess_workflow_steps` hold optional configuration; the **execution engine** interprets `assignee_rule` JSONB.

## Consequences

- Migrations seed `ess_event_types` per existing tenant with baseline codes (`ess.request.submitted`, etc.); products may add rows but should not bypass the catalog for writes that must stay auditable.
- Application services must increment `aggregate_version` on state changes and emit matching `ess_domain_events` + outbox rows in one transaction when fan-out is required.
- Compliance analytics depend on `questionnaire_version_id` for responses created after this upgrade; legacy rows may keep `NULL` until backfilled.

## Links

- [`employeeExperience.ts`](../employeeExperience.ts)
- [`_enums.ts`](../_enums.ts) — ESS enum tuples
- Migration `packages/db/migrations/20260330200000_hr_ess_enterprise_upgrade/migration.sql`
- [HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md](./HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md) — scale notes for `ess_domain_events` / `ess_outbox`
