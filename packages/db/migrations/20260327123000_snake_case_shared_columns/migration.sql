-- Normalize shared audit/timestamp column names to snake_case.
-- This migration is idempotent and only renames camelCase physical columns when
-- their snake_case counterparts do not already exist on the same table.

DO $$
DECLARE
  col record;
BEGIN
  -- createdBy -> created_by
  FOR col IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'createdBy'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = c.table_schema
          AND c2.table_name = c.table_name
          AND c2.column_name = 'created_by'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
      col.table_schema,
      col.table_name,
      'createdBy',
      'created_by'
    );
  END LOOP;

  -- updatedBy -> updated_by
  FOR col IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'updatedBy'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = c.table_schema
          AND c2.table_name = c.table_name
          AND c2.column_name = 'updated_by'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
      col.table_schema,
      col.table_name,
      'updatedBy',
      'updated_by'
    );
  END LOOP;

  -- deletedAt -> deleted_at
  FOR col IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'deletedAt'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = c.table_schema
          AND c2.table_name = c.table_name
          AND c2.column_name = 'deleted_at'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
      col.table_schema,
      col.table_name,
      'deletedAt',
      'deleted_at'
    );
  END LOOP;

  -- createdAt -> created_at
  FOR col IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'createdAt'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = c.table_schema
          AND c2.table_name = c.table_name
          AND c2.column_name = 'created_at'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
      col.table_schema,
      col.table_name,
      'createdAt',
      'created_at'
    );
  END LOOP;

  -- updatedAt -> updated_at
  FOR col IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'updatedAt'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = c.table_schema
          AND c2.table_name = c.table_name
          AND c2.column_name = 'updated_at'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
      col.table_schema,
      col.table_name,
      'updatedAt',
      'updated_at'
    );
  END LOOP;
END
$$;