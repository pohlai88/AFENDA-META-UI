---
name: employeeExperience OSS DB refinement
overview: GitHub MCP-backed benchmark of active OSS HR/ESS projects, distilled into concrete database-first refinements for packages/db/src/schema/hr/employeeExperience.ts (features, constraints, optional new tables)—without copying foreign stacks.
todos:
  - id: oss-baseline-doc
    content: Keep short hr-docs note listing benchmark repos + which employeeExperience tables they inform (link to this plan).
    status: pending
  - id: notif-polymorphic-ref
    content: Design optional reference_type/reference_id (or document_type/document_id) on employee_notifications mirroring Frappe PWA Notification; Zod pairing + indexes.
    status: pending
  - id: request-amendment-chain
    content: Evaluate amended_from / superseded_by on employee_requests for correction workflow; DB CHECK + history integration.
    status: pending
  - id: survey-invite-audit
    content: Optional survey_invitations or response attempt table for one-response-per-employee non-anonymous surveys; align with industry survey tools.
    status: pending
  - id: push-subscriptions
    content: Optional employee_push_endpoints table for delivery_channel=push (tokens, platform enum); RLS + tenant FK.
    status: pending
isProject: false
---

# employeeExperience.ts — OSS benchmark and DB-first refinement plan

## GitHub MCP scope (what worked)

- **Used:** `search_repositories`, `get_file_contents` (directories + JSON).
- **Failed:** `search_code` — **requires GitHub auth** on this MCP; no inline code search was possible.
- **Reliability filter:** Prefer org-maintained repos with **recent `pushed_at`** (2025–2026) and real docs/CI (e.g. Frappe HR README badges).

## Primary OSS references (active / credible)

| Source        | URL                                                                                  | Relevance to `employeeExperience`                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frappe HR** | [frappe/hrms](https://github.com/frappe/hrms)                                        | HR module **DocTypes** under `hrms/hr/doctype/` — workflow, notifications, grievance, requests. **CI + codecov** in README.                                                                                             |
| **ERPNext**   | [frappe/erpnext](https://github.com/frappe/erpnext)                                  | Broader ERP patterns (submittable docs, accounting links); use for **cross-domain references**, not ESS-only tables.                                                                                                    |
| **Headcount** | [bluewave-labs/Headcount](https://github.com/bluewave-labs/Headcount)                | React + Postgres HRM; README modules (time off, onboarding, **surveys**, logs). Root `package.json` is **frontend-only**; relational detail is in **Entity Relationship Diagram.png** (compare entities, not ORM code). |
| **Ecosystem** | e.g. [bitbetterde/erpnext-workplan](https://github.com/bitbetterde/erpnext-workplan) | Shows **active Frappe extension** pattern (leave/workplan) — useful for thinking about **tenant plugins** vs core schema.                                                                                               |

## OSS patterns mapped to your current tables

Current surface (from [employeeExperience.ts](d:/AFENDA-META-UI/packages/db/src/schema/hr/employeeExperience.ts)): `employee_self_service_profiles`, `employee_requests`, `employee_request_history`, `employee_notifications`, `employee_preferences`, `employee_surveys`, `survey_responses`.

### 1. Notifications — Frappe `PWA Notification` DocType

Fetched: [pwa_notification.json](https://github.com/frappe/hrms/blob/develop/hrms/hr/doctype/pwa_notification/pwa_notification.json).

**Observed fields:** `from_user`, `to_user`, `message`, `read`, `**reference_document_type`**, `**reference_document_name` (polymorphic pointer to source document).

**Gap vs `employee_notifications`:** You have `metadata` JSONB and `action_url` / `action_label`, but no **first-class polymorphic reference** (type + id) for indexing, joins, and “jump to source” UX.

**DB-first refinement (recommended):**

- Add nullable `reference_doctype` / `reference_id` (text + uuid) _or_ reuse a small enum `notification_reference_kind` + `reference_id` if you want stricter invariants.
- **CHECK** pairing: both null or both non-null (same pattern as `bonus_point_transactions`).
- **Index** `(tenant_id, reference_kind, reference_id)` partial where not null.
- Keep `metadata` for extensibility; Zod mirrors pairing.

### 2. Generic requests vs Frappe’s many DocTypes

Frappe splits workflows (`shift_request`, `travel_request`, `attendance_request`, etc.). You correctly use `**request_type` + `request_data` JSONB** — good for a **db-first meta-model.

**Refinements inspired by Frappe `Employee Grievance` / submittable docs:**

- **Optional `amended_from_request_id`** (self-FK on `employee_requests`) for “supersede / correction” chains (Frappe `amended_from` pattern).
- **Optional `submitted_at`** timestamp when status moves from `draft` → `submitted` (audit + reporting).
- **Do not** fold `employee_grievance` into ESS: you already have [grievances.ts](d:/AFENDA-META-UI/packages/db/src/schema/hr/grievances.ts); instead add `**request_data` convention** or nullable `**related_grievance_id` FK only if product needs ESS entry points.

### 3. Request history

You already have `**employee_request_history` (append-only). OSS alignment:

- Add optional `**correlation_id` (uuid or text) on history rows if you batch multi-step approvals.
- Optional `**source` enum (`user`, `system`, `migration`, `rule`) for analytics.

### 4. Surveys — Headcount + Frappe feedback adjacent

Headcount lists **Surveys** as a product module; Frappe has separate **feedback** DocTypes (`employee_performance_feedback`, etc.) — different from pulse surveys.

**DB-first gaps to consider:**

- `**published_at` / `closed_at`** — already in schema; ensure product uses them for eligibility CHECKs (optional DB: `CHECK (closed_at IS NULL OR closed_at >= published_at)` already present; consider `**CHECK`that active surveys have`published_at`when`status = published`** if you add a `published` enum value).
- **Response uniqueness (non-anonymous):** optional partial unique index on `(tenant_id, survey_id, employee_id)` where `employee_id IS NOT NULL` and `is_anonymous = false` to prevent duplicate submissions (if business rule requires one response per employee).
- **Survey invitation / reminder** (optional new table): `employee_survey_invites` (`survey_id`, `employee_id`, `invited_at`, `reminder_sent_at`) — common in SaaS survey tools; only add if product needs it.

### 5. `survey_responses` integrity

You added `geo_location`, `response_hash`. OSS/security benchmark:

- Optional `**user_agent_hash` (if storing raw UA is discouraged).
- **Retention:** document archival policy (align with [HR_JSONB runbook](d:/AFENDA-META-UI/packages/db/src/schema/hr/hr-docs/HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md)).

### 6. Preferences + profiles

- **Profiles:** optional `**mfa_enabled`**, `**last_password_change_at` (if IAM lives partly in HR ESS).
- **Preferences:** you support text + JSONB; consider **version column** (`preference_version int`) for optimistic concurrency on hot keys.

### 7. Push / PWA delivery

Frappe’s PWA notification is user-centric; your model is **employee-centric** + `delivery_channel` including `push`.

**Optional new table:** `employee_push_subscriptions` (`tenant_id`, `employee_id`, `endpoint`/`token`, `platform` enum, `created_at`, unique per device) — avoids bloating `employee_notifications` and matches how **web-push** and mobile SDKs work.

## Implementation order (DB-first)

1. **Low risk, high value:** polymorphic reference columns on `employee_notifications` + CHECK + indexes + Zod.
2. **Workflow clarity:** `submitted_at` on `employee_requests`; optional `amended_from_request_id` + CHECK (no self-loop).
3. **Survey rules:** partial unique index for one response per employee (non-anonymous) if product confirms.
4. **Push:** new subscription table when `delivery_channel = push` is actually implemented.
5. **Docs:** one `hr-docs` ADR linking benchmarks ([frappe/hrms](https://github.com/frappe/hrms), [Headcount](https://github.com/bluewave-labs/Headcount)) to these columns.

## Explicit non-goals

- Porting Frappe DocType / MariaDB semantics into Postgres verbatim.
- Merging grievance or travel modules into `employeeExperience.ts` when they already belong in [grievances.ts](d:/AFENDA-META-UI/packages/db/src/schema/hr/grievances.ts) / [travel.ts](d:/AFENDA-META-UI/packages/db/src/schema/hr/travel.ts).

## Follow-up (when GitHub code search is available)

Re-run `**search_code`** with auth for queries like `repo:frappe/hrms survey` or `repo:bluewave-labs/Headcount schema` to extract **exact column names from migrations — then diff against Drizzle for parity.
