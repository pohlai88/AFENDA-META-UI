-- Truth-locked GL: accounting_decisions + gl_accounts, required truth/decision on journal_entries,
-- deferred balance check, posted immutability. Hand-authored (triggers + multi-step backfill).

CREATE TABLE "sales"."gl_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"account_code" varchar(64) NOT NULL,
	"name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_gl_accounts_code_nonempty" CHECK (length(trim("account_code")) >= 1)
);
--> statement-breakpoint
ALTER TABLE "sales"."gl_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."gl_accounts" ADD CONSTRAINT "fk_sales_gl_accounts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."gl_accounts" ADD CONSTRAINT "fk_sales_gl_accounts_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."gl_accounts" ADD CONSTRAINT "fk_sales_gl_accounts_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_gl_accounts_tenant_code" ON "sales"."gl_accounts" ("tenant_id","account_code") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_gl_accounts_tenant" ON "sales"."gl_accounts" ("tenant_id");--> statement-breakpoint
CREATE POLICY "sales_gl_accounts_tenant_select" ON "sales"."gl_accounts" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_gl_accounts_tenant_insert" ON "sales"."gl_accounts" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_gl_accounts_tenant_update" ON "sales"."gl_accounts" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_gl_accounts_tenant_delete" ON "sales"."gl_accounts" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_gl_accounts_service_bypass" ON "sales"."gl_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

CREATE TABLE "sales"."accounting_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"truth_binding_id" uuid NOT NULL,
	"accounting_engine_version" varchar(64) DEFAULT 'v1' NOT NULL,
	"decision_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"document_inputs_digest" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_accounting_decisions_engine_version" CHECK (length("accounting_engine_version") >= 1)
);
--> statement-breakpoint
ALTER TABLE "sales"."accounting_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."accounting_decisions" ADD CONSTRAINT "fk_sales_accounting_decisions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."accounting_decisions" ADD CONSTRAINT "fk_sales_accounting_decisions_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."accounting_decisions" ADD CONSTRAINT "fk_sales_accounting_decisions_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."accounting_decisions" ADD CONSTRAINT "fk_sales_accounting_decisions_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_decisions_tenant" ON "sales"."accounting_decisions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_decisions_truth_binding" ON "sales"."accounting_decisions" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE POLICY "sales_accounting_decisions_tenant_select" ON "sales"."accounting_decisions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_decisions_tenant_insert" ON "sales"."accounting_decisions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_decisions_tenant_update" ON "sales"."accounting_decisions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_decisions_tenant_delete" ON "sales"."accounting_decisions" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_decisions_service_bypass" ON "sales"."accounting_decisions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

ALTER TABLE "sales"."journal_lines" ADD COLUMN "gl_account_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD COLUMN "line_currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD COLUMN "line_exchange_rate_to_book" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD COLUMN "cost_center_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD COLUMN "project_id" uuid;--> statement-breakpoint

INSERT INTO "sales"."gl_accounts" ("tenant_id", "account_code", "name", "is_active", "created_at", "updated_at", "created_by", "updated_by")
SELECT DISTINCT ON (jl."tenant_id", jl."account_code")
	jl."tenant_id",
	jl."account_code",
	NULL,
	true,
	NOW(),
	NOW(),
	jl."created_by",
	jl."updated_by"
FROM "sales"."journal_lines" jl
WHERE NOT EXISTS (
	SELECT 1 FROM "sales"."gl_accounts" ga
	WHERE ga."tenant_id" = jl."tenant_id" AND ga."account_code" = jl."account_code" AND ga."deleted_at" IS NULL
)
ORDER BY jl."tenant_id", jl."account_code", jl."created_at" ASC;--> statement-breakpoint

UPDATE "sales"."journal_lines" jl
SET "gl_account_id" = ga."id"
FROM "sales"."gl_accounts" ga
WHERE ga."tenant_id" = jl."tenant_id" AND ga."account_code" = jl."account_code" AND ga."deleted_at" IS NULL;--> statement-breakpoint

DELETE FROM "sales"."journal_lines" WHERE "journal_entry_id" IN (SELECT "id" FROM "sales"."journal_entries" WHERE "truth_binding_id" IS NULL);--> statement-breakpoint
DELETE FROM "sales"."journal_entries" WHERE "truth_binding_id" IS NULL;--> statement-breakpoint

ALTER TABLE "sales"."journal_lines" ALTER COLUMN "gl_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "fk_sales_journal_lines_gl_account" FOREIGN KEY ("gl_account_id") REFERENCES "sales"."gl_accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "chk_sales_journal_lines_line_fx_pair" CHECK ("line_exchange_rate_to_book" IS NULL OR "line_exchange_rate_to_book" > 0);--> statement-breakpoint

ALTER TABLE "sales"."journal_entries" DROP CONSTRAINT "fk_sales_journal_entries_truth_binding";--> statement-breakpoint

ALTER TABLE "sales"."journal_entries" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD COLUMN "base_currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD COLUMN "book_exchange_rate" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD COLUMN "book_exchange_rate_source" text;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD COLUMN "accounting_decision_id" uuid;--> statement-breakpoint

INSERT INTO "sales"."accounting_decisions" ("tenant_id", "truth_binding_id", "decision_snapshot", "created_at", "updated_at", "created_by", "updated_by")
SELECT DISTINCT ON (je."tenant_id", je."truth_binding_id")
	je."tenant_id",
	je."truth_binding_id",
	'{"legacyMigration": true}'::jsonb,
	NOW(),
	NOW(),
	je."created_by",
	je."updated_by"
FROM "sales"."journal_entries" je
ORDER BY je."tenant_id", je."truth_binding_id", je."created_at" ASC;--> statement-breakpoint

UPDATE "sales"."journal_entries" je
SET "accounting_decision_id" = ad."id"
FROM "sales"."accounting_decisions" ad
WHERE je."tenant_id" = ad."tenant_id" AND je."truth_binding_id" = ad."truth_binding_id";--> statement-breakpoint

UPDATE "sales"."journal_entries" SET "base_currency_code" = "currency_code" WHERE "base_currency_code" IS NULL;--> statement-breakpoint
UPDATE "sales"."journal_entries" SET "posted_at" = "updated_at" WHERE "status" = 'posted' AND "posted_at" IS NULL;--> statement-breakpoint

ALTER TABLE "sales"."journal_entries" ALTER COLUMN "truth_binding_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ALTER COLUMN "accounting_decision_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ALTER COLUMN "base_currency_code" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_accounting_decision" FOREIGN KEY ("accounting_decision_id") REFERENCES "sales"."accounting_decisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint

ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "chk_sales_journal_entries_posted_has_posted_at" CHECK ("status" <> 'posted' OR "posted_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "chk_sales_journal_entries_reversed_has_reversal" CHECK ("status" <> 'reversed' OR "reversal_journal_entry_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "chk_sales_journal_entries_book_fx_pair" CHECK (("currency_code" = "base_currency_code" AND "book_exchange_rate" IS NULL AND "book_exchange_rate_source" IS NULL) OR ("currency_code" <> "base_currency_code" AND "book_exchange_rate" IS NOT NULL AND "book_exchange_rate_source" IS NOT NULL AND "book_exchange_rate" > 0));--> statement-breakpoint

CREATE INDEX "idx_sales_journal_entries_accounting_decision" ON "sales"."journal_entries" ("tenant_id","accounting_decision_id");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_entries_posted_at" ON "sales"."journal_entries" ("tenant_id","posted_at");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_lines_gl_account" ON "sales"."journal_lines" ("tenant_id","gl_account_id");--> statement-breakpoint

CREATE OR REPLACE FUNCTION sales.tf_journal_entry_set_posted_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = 'posted'::sales.journal_entry_status AND NEW."posted_at" IS NULL THEN
    NEW."posted_at" := NOW();
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER trg_je_01_set_posted_at
BEFORE INSERT OR UPDATE ON sales.journal_entries
FOR EACH ROW
EXECUTE FUNCTION sales.tf_journal_entry_set_posted_at();--> statement-breakpoint

CREATE OR REPLACE FUNCTION sales.tf_journal_entries_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('posted', 'reversed') THEN
      RAISE EXCEPTION 'cannot delete posted or reversed journal entry';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'reversed' THEN
    IF NEW."entry_date" IS DISTINCT FROM OLD."entry_date"
       OR NEW."description" IS DISTINCT FROM OLD."description"
       OR NEW."reference" IS DISTINCT FROM OLD."reference"
       OR NEW."currency_code" IS DISTINCT FROM OLD."currency_code"
       OR NEW."base_currency_code" IS DISTINCT FROM OLD."base_currency_code"
       OR NEW."book_exchange_rate" IS DISTINCT FROM OLD."book_exchange_rate"
       OR NEW."book_exchange_rate_source" IS DISTINCT FROM OLD."book_exchange_rate_source"
       OR NEW."truth_binding_id" IS DISTINCT FROM OLD."truth_binding_id"
       OR NEW."accounting_decision_id" IS DISTINCT FROM OLD."accounting_decision_id"
       OR NEW."posted_at" IS DISTINCT FROM OLD."posted_at"
       OR NEW."status" IS DISTINCT FROM OLD."status"
       OR NEW."reversal_journal_entry_id" IS DISTINCT FROM OLD."reversal_journal_entry_id"
       OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
       OR NEW."created_by" IS DISTINCT FROM OLD."created_by"
       OR NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."tenant_id" IS DISTINCT FROM OLD."tenant_id"
    THEN
      RAISE EXCEPTION 'reversed journal entry is immutable';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."status" = 'posted' THEN
    IF NEW."entry_date" IS DISTINCT FROM OLD."entry_date"
       OR NEW."description" IS DISTINCT FROM OLD."description"
       OR NEW."reference" IS DISTINCT FROM OLD."reference"
       OR NEW."currency_code" IS DISTINCT FROM OLD."currency_code"
       OR NEW."base_currency_code" IS DISTINCT FROM OLD."base_currency_code"
       OR NEW."book_exchange_rate" IS DISTINCT FROM OLD."book_exchange_rate"
       OR NEW."book_exchange_rate_source" IS DISTINCT FROM OLD."book_exchange_rate_source"
       OR NEW."truth_binding_id" IS DISTINCT FROM OLD."truth_binding_id"
       OR NEW."accounting_decision_id" IS DISTINCT FROM OLD."accounting_decision_id"
       OR NEW."posted_at" IS DISTINCT FROM OLD."posted_at"
       OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
       OR NEW."created_by" IS DISTINCT FROM OLD."created_by"
       OR NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."tenant_id" IS DISTINCT FROM OLD."tenant_id"
    THEN
      RAISE EXCEPTION 'posted journal entry: core fields are immutable';
    END IF;
    IF NEW."status" NOT IN ('posted', 'reversed') THEN
      RAISE EXCEPTION 'posted journal entry may only transition to reversed';
    END IF;
    IF NEW."status" = 'reversed' AND NEW."reversal_journal_entry_id" IS NULL THEN
      RAISE EXCEPTION 'reversed status requires reversal_journal_entry_id';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER trg_je_02_immutability
BEFORE UPDATE OR DELETE ON sales.journal_entries
FOR EACH ROW
EXECUTE FUNCTION sales.tf_journal_entries_immutability();--> statement-breakpoint

CREATE OR REPLACE FUNCTION sales.tf_journal_lines_lock_when_posted()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  st sales.journal_entry_status;
  eid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    eid := OLD."journal_entry_id";
  ELSE
    eid := NEW."journal_entry_id";
  END IF;

  SELECT "status" INTO st FROM sales.journal_entries WHERE "id" = eid;
  IF FOUND AND st IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'journal_lines are immutable when journal entry is posted or reversed (status=%)', st;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER trg_sales_journal_lines_lock_when_posted
BEFORE INSERT OR UPDATE OR DELETE ON sales.journal_lines
FOR EACH ROW
EXECUTE FUNCTION sales.tf_journal_lines_lock_when_posted();--> statement-breakpoint

CREATE OR REPLACE FUNCTION sales.tf_journal_lines_balance_deferred()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  st sales.journal_entry_status;
  eid uuid;
  td numeric(24, 2);
  tc numeric(24, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    eid := OLD."journal_entry_id";
  ELSE
    eid := NEW."journal_entry_id";
  END IF;

  SELECT "status" INTO st FROM sales.journal_entries WHERE "id" = eid;
  IF NOT FOUND OR st = 'draft' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM("debit_amount"), 0), COALESCE(SUM("credit_amount"), 0)
  INTO td, tc
  FROM sales.journal_lines
  WHERE "journal_entry_id" = eid;

  IF td <> tc THEN
    RAISE EXCEPTION 'journal entry % is not balanced (debit % vs credit %)', eid, td, tc
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER trg_sales_journal_lines_balance_deferred
AFTER INSERT OR UPDATE OR DELETE ON sales.journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION sales.tf_journal_lines_balance_deferred();--> statement-breakpoint
