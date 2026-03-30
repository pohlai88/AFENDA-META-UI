-- ESS enterprise upgrade: SLA/aggregate columns, approval tasks, events+outbox, survey versions,
-- notifications reference, invitations, push endpoints, workflow definition templates.
-- Drizzle: packages/db/src/schema/hr/employeeExperience.ts
-- ADR: packages/db/src/schema/hr/hr-docs/ADR-007-ess-workflow-and-events.md

-- ---------------------------------------------------------------------------
-- New enum types (idempotent)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_sla_status') THEN
    CREATE TYPE hr.ess_sla_status AS ENUM ('within_sla', 'approaching_breach', 'breached', 'paused');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_approval_task_status') THEN
    CREATE TYPE hr.ess_approval_task_status AS ENUM ('pending', 'approved', 'rejected', 'skipped', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_approval_task_decision') THEN
    CREATE TYPE hr.ess_approval_task_decision AS ENUM ('approve', 'reject', 'delegate', 'escalate');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_request_history_transition_source') THEN
    CREATE TYPE hr.ess_request_history_transition_source AS ENUM ('user', 'system', 'rule', 'migration');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'employee_notification_reference_kind') THEN
    CREATE TYPE hr.employee_notification_reference_kind AS ENUM ('employee_request', 'employee_survey', 'survey_response', 'employee_grievance', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_event_aggregate_type') THEN
    CREATE TYPE hr.ess_event_aggregate_type AS ENUM ('employee_request', 'employee_survey', 'survey_response', 'employee_notification');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_outbox_delivery_status') THEN
    CREATE TYPE hr.ess_outbox_delivery_status AS ENUM ('pending', 'delivered', 'failed', 'dead');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'survey_invitation_status') THEN
    CREATE TYPE hr.survey_invitation_status AS ENUM ('pending', 'completed', 'expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'employee_push_platform') THEN
    CREATE TYPE hr.employee_push_platform AS ENUM ('ios', 'android', 'web');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'hr' AND t.typname = 'ess_survey_scoring_model') THEN
    CREATE TYPE hr.ess_survey_scoring_model AS ENUM ('none', 'enps', 'likert_index', 'custom');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ess_escalation_policies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.ess_escalation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  policy_code text NOT NULL,
  name text NOT NULL,
  description text,
  response_sla_hours integer NOT NULL,
  escalation_rules jsonb,
  rules_schema_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer NOT NULL DEFAULT 1,
  updated_by integer NOT NULL DEFAULT 1,
  CONSTRAINT ess_escalation_policies_sla_hours_positive CHECK (response_sla_hours > 0),
  CONSTRAINT ess_escalation_policies_rules_schema_version CHECK (rules_schema_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ess_escalation_policies_tenant_code_unique ON hr.ess_escalation_policies (tenant_id, policy_code);
CREATE INDEX IF NOT EXISTS ess_escalation_policies_tenant_idx ON hr.ess_escalation_policies (tenant_id);

-- ---------------------------------------------------------------------------
-- employee_requests — additive columns + constraints (skip if column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employee_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'request_data_schema_version') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN request_data_schema_version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'aggregate_version') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN aggregate_version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'submitted_at') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN submitted_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'sla_due_at') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN sla_due_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'first_response_at') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN first_response_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'sla_breached_at') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN sla_breached_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'sla_status') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN sla_status hr.ess_sla_status NOT NULL DEFAULT 'within_sla';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'escalation_policy_id') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN escalation_policy_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'amended_from_request_id') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN amended_from_request_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'related_grievance_id') THEN
      ALTER TABLE hr.employee_requests ADD COLUMN related_grievance_id uuid;
    END IF;
  END IF;
END $$;

-- FK escalation (tenant-aligned): recreate if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'escalation_policy_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_escalation_policy_fk') THEN
      ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_escalation_policy_fk
        FOREIGN KEY (tenant_id, escalation_policy_id) REFERENCES hr.ess_escalation_policies(tenant_id, id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_requests' AND column_name = 'related_grievance_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_related_grievance_fk') THEN
      ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_related_grievance_fk
        FOREIGN KEY (tenant_id, related_grievance_id) REFERENCES hr.employee_grievances(tenant_id, id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_amended_from_fk') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_amended_from_fk
      FOREIGN KEY (tenant_id, amended_from_request_id) REFERENCES hr.employee_requests(tenant_id, id);
  END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_request_data_schema_version') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_request_data_schema_version CHECK (request_data_schema_version >= 1);
  END IF;
EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_aggregate_version') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_aggregate_version CHECK (aggregate_version >= 1);
  END IF;
EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_sla_breach_requires_due') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_sla_breach_requires_due CHECK (sla_breached_at IS NULL OR sla_due_at IS NOT NULL);
  END IF;
EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_sla_breached_state') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_sla_breached_state CHECK (sla_status <> 'breached' OR sla_breached_at IS NOT NULL);
  END IF;
EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_requests_first_response_after_submit') THEN
    ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_first_response_after_submit CHECK (
      first_response_at IS NULL OR submitted_at IS NULL OR first_response_at >= submitted_at
    );
  END IF;
EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS employee_requests_sla_due_open_idx ON hr.employee_requests (tenant_id, sla_due_at)
  WHERE deleted_at IS NULL AND request_status IN ('draft', 'submitted');
CREATE INDEX IF NOT EXISTS employee_requests_submitted_idx ON hr.employee_requests (tenant_id, submitted_at);

-- ---------------------------------------------------------------------------
-- employee_request_approval_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.employee_request_approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  employee_request_id uuid NOT NULL,
  step_key text NOT NULL,
  sequence integer NOT NULL,
  parallel_group_id uuid,
  status hr.ess_approval_task_status NOT NULL DEFAULT 'pending',
  decision hr.ess_approval_task_decision,
  decision_reason text,
  assignee_employee_id uuid,
  delegated_from_employee_id uuid,
  due_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_request_approval_tasks_request_fk FOREIGN KEY (tenant_id, employee_request_id) REFERENCES hr.employee_requests(tenant_id, id),
  CONSTRAINT employee_request_approval_tasks_assignee_fk FOREIGN KEY (tenant_id, assignee_employee_id) REFERENCES hr.employees(tenant_id, id),
  CONSTRAINT employee_request_approval_tasks_delegated_fk FOREIGN KEY (tenant_id, delegated_from_employee_id) REFERENCES hr.employees(tenant_id, id),
  CONSTRAINT employee_request_approval_tasks_decided_by_fk FOREIGN KEY (tenant_id, decided_by) REFERENCES hr.employees(tenant_id, id),
  CONSTRAINT employee_request_approval_tasks_sequence_positive CHECK (sequence >= 0),
  CONSTRAINT employee_request_approval_tasks_pending_consistent CHECK (
    (status = 'pending' AND decision IS NULL AND decided_at IS NULL AND decided_by IS NULL) OR (status <> 'pending')
  ),
  CONSTRAINT employee_request_approval_tasks_approved_shape CHECK (
    status <> 'approved' OR (decision = 'approve' AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  ),
  CONSTRAINT employee_request_approval_tasks_rejected_shape CHECK (
    status <> 'rejected' OR (decision = 'reject' AND decided_at IS NOT NULL AND decided_by IS NOT NULL AND decision_reason IS NOT NULL)
  ),
  CONSTRAINT employee_request_approval_tasks_skipped_shape CHECK (status <> 'skipped' OR decided_at IS NOT NULL),
  CONSTRAINT employee_request_approval_tasks_cancelled_shape CHECK (status <> 'cancelled' OR decided_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS employee_request_approval_tasks_tenant_idx ON hr.employee_request_approval_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS employee_request_approval_tasks_request_idx ON hr.employee_request_approval_tasks (tenant_id, employee_request_id);
CREATE INDEX IF NOT EXISTS employee_request_approval_tasks_assignee_idx ON hr.employee_request_approval_tasks (tenant_id, assignee_employee_id);
CREATE INDEX IF NOT EXISTS employee_request_approval_tasks_due_idx ON hr.employee_request_approval_tasks (tenant_id, due_at) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- employee_request_history
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employee_request_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_request_history' AND column_name = 'correlation_id') THEN
      ALTER TABLE hr.employee_request_history ADD COLUMN correlation_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_request_history' AND column_name = 'transition_source') THEN
      ALTER TABLE hr.employee_request_history ADD COLUMN transition_source hr.ess_request_history_transition_source NOT NULL DEFAULT 'user';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employee_request_history_correlation_idx ON hr.employee_request_history (tenant_id, correlation_id) WHERE correlation_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- employee_notifications
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employee_notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_notifications' AND column_name = 'metadata_schema_version') THEN
      ALTER TABLE hr.employee_notifications ADD COLUMN metadata_schema_version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_notifications' AND column_name = 'reference_kind') THEN
      ALTER TABLE hr.employee_notifications ADD COLUMN reference_kind hr.employee_notification_reference_kind;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_notifications' AND column_name = 'reference_id') THEN
      ALTER TABLE hr.employee_notifications ADD COLUMN reference_id uuid;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_notifications_metadata_schema_version') THEN
    ALTER TABLE hr.employee_notifications ADD CONSTRAINT employee_notifications_metadata_schema_version CHECK (metadata_schema_version >= 1);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_notifications_reference_pairing') THEN
    ALTER TABLE hr.employee_notifications ADD CONSTRAINT employee_notifications_reference_pairing CHECK (
      (reference_kind IS NULL AND reference_id IS NULL) OR (reference_kind IS NOT NULL AND reference_id IS NOT NULL)
    );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS employee_notifications_reference_idx ON hr.employee_notifications (tenant_id, reference_kind, reference_id) WHERE reference_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- employee_surveys
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employee_surveys') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'questions_schema_version') THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN questions_schema_version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'branching_schema_version') THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN branching_schema_version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'scoring_model') THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN scoring_model hr.ess_survey_scoring_model NOT NULL DEFAULT 'none';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'computed_score') THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN computed_score numeric(10, 4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'score_components') THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN score_components jsonb;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_surveys_questions_schema_version') THEN
    ALTER TABLE hr.employee_surveys ADD CONSTRAINT employee_surveys_questions_schema_version CHECK (questions_schema_version >= 1);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_surveys_branching_schema_version') THEN
    ALTER TABLE hr.employee_surveys ADD CONSTRAINT employee_surveys_branching_schema_version CHECK (branching_schema_version >= 1);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- employee_survey_questionnaire_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.employee_survey_questionnaire_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  survey_id uuid NOT NULL,
  version integer NOT NULL,
  questions jsonb NOT NULL,
  questions_schema_version integer NOT NULL DEFAULT 1,
  is_locked boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer NOT NULL DEFAULT 1,
  updated_by integer NOT NULL DEFAULT 1,
  CONSTRAINT employee_survey_questionnaire_versions_survey_fk FOREIGN KEY (tenant_id, survey_id) REFERENCES hr.employee_surveys(tenant_id, id),
  CONSTRAINT employee_survey_questionnaire_versions_version_positive CHECK (version >= 1),
  CONSTRAINT employee_survey_questionnaire_versions_q_schema CHECK (questions_schema_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_survey_questionnaire_versions_survey_version_unique ON hr.employee_survey_questionnaire_versions (tenant_id, survey_id, version);
CREATE INDEX IF NOT EXISTS employee_survey_questionnaire_versions_tenant_idx ON hr.employee_survey_questionnaire_versions (tenant_id);
CREATE INDEX IF NOT EXISTS employee_survey_questionnaire_versions_survey_idx ON hr.employee_survey_questionnaire_versions (tenant_id, survey_id);

-- ---------------------------------------------------------------------------
-- survey_responses
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'survey_responses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'survey_responses' AND column_name = 'questionnaire_version_id') THEN
      ALTER TABLE hr.survey_responses ADD COLUMN questionnaire_version_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'survey_responses' AND column_name = 'responses_schema_version') THEN
      ALTER TABLE hr.survey_responses ADD COLUMN responses_schema_version integer NOT NULL DEFAULT 1;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_questionnaire_version_fk') THEN
    ALTER TABLE hr.survey_responses ADD CONSTRAINT survey_responses_questionnaire_version_fk
      FOREIGN KEY (tenant_id, questionnaire_version_id) REFERENCES hr.employee_survey_questionnaire_versions(tenant_id, id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_responses_schema_version') THEN
    ALTER TABLE hr.survey_responses ADD CONSTRAINT survey_responses_responses_schema_version CHECK (responses_schema_version >= 1);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS survey_responses_questionnaire_version_idx ON hr.survey_responses (tenant_id, questionnaire_version_id) WHERE questionnaire_version_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- survey_invitations, employee_push_endpoints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.survey_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  survey_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  status hr.survey_invitation_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_invitations_survey_fk FOREIGN KEY (tenant_id, survey_id) REFERENCES hr.employee_surveys(tenant_id, id),
  CONSTRAINT survey_invitations_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employees(tenant_id, id),
  CONSTRAINT survey_invitations_completed_consistency CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS survey_invitations_tenant_survey_employee_unique ON hr.survey_invitations (tenant_id, survey_id, employee_id);
CREATE INDEX IF NOT EXISTS survey_invitations_tenant_idx ON hr.survey_invitations (tenant_id);
CREATE INDEX IF NOT EXISTS survey_invitations_survey_idx ON hr.survey_invitations (tenant_id, survey_id);

CREATE TABLE IF NOT EXISTS hr.employee_push_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  employee_id uuid NOT NULL,
  platform hr.employee_push_platform NOT NULL,
  endpoint_token text NOT NULL,
  device_id text,
  last_registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_push_endpoints_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employees(tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_push_endpoints_tenant_employee_device_unique ON hr.employee_push_endpoints (tenant_id, employee_id, device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employee_push_endpoints_tenant_idx ON hr.employee_push_endpoints (tenant_id);
CREATE INDEX IF NOT EXISTS employee_push_endpoints_employee_idx ON hr.employee_push_endpoints (tenant_id, employee_id);

-- ---------------------------------------------------------------------------
-- ess_event_types, ess_domain_events, ess_outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.ess_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  event_code text NOT NULL,
  aggregate_type hr.ess_event_aggregate_type NOT NULL,
  payload_schema_version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ess_event_types_payload_schema_version CHECK (payload_schema_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ess_event_types_tenant_code_unique ON hr.ess_event_types (tenant_id, event_code);
CREATE INDEX IF NOT EXISTS ess_event_types_tenant_idx ON hr.ess_event_types (tenant_id);
CREATE INDEX IF NOT EXISTS ess_event_types_aggregate_idx ON hr.ess_event_types (tenant_id, aggregate_type);

CREATE TABLE IF NOT EXISTS hr.ess_domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  event_type_id uuid NOT NULL,
  aggregate_type hr.ess_event_aggregate_type NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  causation_id uuid,
  actor_employee_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ess_domain_events_event_type_fk FOREIGN KEY (tenant_id, event_type_id) REFERENCES hr.ess_event_types(tenant_id, id),
  CONSTRAINT ess_domain_events_actor_fk FOREIGN KEY (tenant_id, actor_employee_id) REFERENCES hr.employees(tenant_id, id)
);

CREATE INDEX IF NOT EXISTS ess_domain_events_tenant_idx ON hr.ess_domain_events (tenant_id);
CREATE INDEX IF NOT EXISTS ess_domain_events_aggregate_idx ON hr.ess_domain_events (tenant_id, aggregate_type, aggregate_id, occurred_at);
CREATE INDEX IF NOT EXISTS ess_domain_events_type_idx ON hr.ess_domain_events (tenant_id, event_type_id);

CREATE TABLE IF NOT EXISTS hr.ess_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  domain_event_id uuid NOT NULL,
  destination text NOT NULL,
  delivery_status hr.ess_outbox_delivery_status NOT NULL DEFAULT 'pending',
  idempotency_key text,
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ess_outbox_event_fk FOREIGN KEY (tenant_id, domain_event_id) REFERENCES hr.ess_domain_events(tenant_id, id),
  CONSTRAINT ess_outbox_attempt_count_nonnegative CHECK (attempt_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ess_outbox_event_destination_unique ON hr.ess_outbox (domain_event_id, destination);
CREATE UNIQUE INDEX IF NOT EXISTS ess_outbox_tenant_idempotency_unique ON hr.ess_outbox (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ess_outbox_pending_idx ON hr.ess_outbox (tenant_id, published_at) WHERE published_at IS NULL;

-- ---------------------------------------------------------------------------
-- ess_workflow_definitions / ess_workflow_steps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.ess_workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  definition_code text NOT NULL,
  name text NOT NULL,
  description text,
  request_type hr.request_type,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer NOT NULL DEFAULT 1,
  updated_by integer NOT NULL DEFAULT 1,
  CONSTRAINT ess_workflow_definitions_version_positive CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ess_workflow_definitions_tenant_code_version_unique ON hr.ess_workflow_definitions (tenant_id, definition_code, version);
CREATE INDEX IF NOT EXISTS ess_workflow_definitions_tenant_idx ON hr.ess_workflow_definitions (tenant_id);

CREATE TABLE IF NOT EXISTS hr.ess_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL REFERENCES core.tenants(tenant_id),
  workflow_definition_id uuid NOT NULL,
  step_key text NOT NULL,
  sequence integer NOT NULL,
  parallel_group_id uuid,
  assignee_rule jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ess_workflow_steps_definition_fk FOREIGN KEY (tenant_id, workflow_definition_id) REFERENCES hr.ess_workflow_definitions(tenant_id, id),
  CONSTRAINT ess_workflow_steps_sequence_nonnegative CHECK (sequence >= 0)
);

CREATE INDEX IF NOT EXISTS ess_workflow_steps_definition_idx ON hr.ess_workflow_steps (tenant_id, workflow_definition_id);

-- ---------------------------------------------------------------------------
-- Trigger: locked questionnaire versions cannot change questions JSON
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hr.trg_prevent_locked_questionnaire_questions_edit()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_locked IS TRUE
     AND NEW.questions IS DISTINCT FROM OLD.questions THEN
    RAISE EXCEPTION 'Cannot modify questions on locked employee_survey_questionnaire_versions row %', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_survey_questionnaire_versions_locked_questions ON hr.employee_survey_questionnaire_versions;
CREATE TRIGGER employee_survey_questionnaire_versions_locked_questions
  BEFORE UPDATE ON hr.employee_survey_questionnaire_versions
  FOR EACH ROW
  EXECUTE PROCEDURE hr.trg_prevent_locked_questionnaire_questions_edit();

-- ---------------------------------------------------------------------------
-- Seed default event types per tenant (idempotent insert)
-- ---------------------------------------------------------------------------
INSERT INTO hr.ess_event_types (tenant_id, event_code, aggregate_type, payload_schema_version, is_active, description, created_at, updated_at)
SELECT t.tenant_id, v.event_code, v.agg, 1, true, v.description, now(), now()
FROM core.tenants t
CROSS JOIN (
  VALUES
    ('ess.request.submitted', 'employee_request'::hr.ess_event_aggregate_type, 'Employee request entered submitted state'),
    ('ess.request.approved', 'employee_request'::hr.ess_event_aggregate_type, 'Employee request approved'),
    ('ess.request.rejected', 'employee_request'::hr.ess_event_aggregate_type, 'Employee request rejected'),
    ('ess.task.decided', 'employee_request'::hr.ess_event_aggregate_type, 'Approval task decided'),
    ('ess.survey.published', 'employee_survey'::hr.ess_event_aggregate_type, 'Survey published'),
    ('ess.survey.response_completed', 'survey_response'::hr.ess_event_aggregate_type, 'Survey response completed')
) AS v(event_code, agg, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hr.ess_event_types e WHERE e.tenant_id = t.tenant_id AND e.event_code = v.event_code
);
