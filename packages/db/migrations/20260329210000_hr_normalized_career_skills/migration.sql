-- Normalized career skills: junction tables + drop legacy JSON columns on path steps / aspirations.
-- Drizzle: `packages/db/src/schema/hr/workforceStrategy.ts`, `skills.ts` (catalog + `employee_skills` unchanged).

DO $$ BEGIN
  CREATE TYPE hr.step_skill_importance AS ENUM ('mandatory', 'preferred');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr.career_aspiration_skill_gap_level AS ENUM ('minor', 'moderate', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hr.career_path_step_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  tenant_id integer NOT NULL REFERENCES core.tenants (tenant_id),
  step_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  importance hr.step_skill_importance NOT NULL DEFAULT 'mandatory'::hr.step_skill_importance,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer,
  updated_by integer,
  CONSTRAINT career_path_step_skills_step_fk FOREIGN KEY (tenant_id, step_id) REFERENCES hr.career_path_steps (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT career_path_step_skills_skill_fk FOREIGN KEY (tenant_id, skill_id) REFERENCES hr.skills (tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS career_path_step_skills_step_skill_unique
  ON hr.career_path_step_skills (tenant_id, step_id, skill_id);

CREATE INDEX IF NOT EXISTS career_path_step_skills_tenant_idx ON hr.career_path_step_skills (tenant_id);
CREATE INDEX IF NOT EXISTS career_path_step_skills_step_idx ON hr.career_path_step_skills (tenant_id, step_id);
CREATE INDEX IF NOT EXISTS career_path_step_skills_skill_idx ON hr.career_path_step_skills (tenant_id, skill_id);

CREATE TABLE IF NOT EXISTS hr.career_aspiration_skill_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  tenant_id integer NOT NULL REFERENCES core.tenants (tenant_id),
  aspiration_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  gap_level hr.career_aspiration_skill_gap_level NOT NULL,
  development_action text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer,
  updated_by integer,
  CONSTRAINT career_aspiration_skill_gaps_aspiration_fk FOREIGN KEY (tenant_id, aspiration_id) REFERENCES hr.career_aspirations (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT career_aspiration_skill_gaps_skill_fk FOREIGN KEY (tenant_id, skill_id) REFERENCES hr.skills (tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS career_aspiration_skill_gaps_aspiration_skill_unique
  ON hr.career_aspiration_skill_gaps (tenant_id, aspiration_id, skill_id);

CREATE INDEX IF NOT EXISTS career_aspiration_skill_gaps_tenant_idx ON hr.career_aspiration_skill_gaps (tenant_id);
CREATE INDEX IF NOT EXISTS career_aspiration_skill_gaps_aspiration_idx ON hr.career_aspiration_skill_gaps (tenant_id, aspiration_id);
CREATE INDEX IF NOT EXISTS career_aspiration_skill_gaps_skill_idx ON hr.career_aspiration_skill_gaps (tenant_id, skill_id);

-- RLS policies are managed by Drizzle push / separate RLS migrations where applicable.

ALTER TABLE hr.career_path_steps DROP COLUMN IF EXISTS required_skills;
ALTER TABLE hr.career_aspirations DROP COLUMN IF EXISTS current_skill_gaps;
ALTER TABLE hr.career_aspirations DROP COLUMN IF EXISTS development_actions;
