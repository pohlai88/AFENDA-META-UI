/**
 * Metadata Schema Evolution System
 * =================================
 * Versioned metadata with migration pipelines and backward compatibility.
 * Enables 10-20 year metadata lifecycle management.
 */

/**
 * Metadata schema version type
 */
export type SchemaVersion = "1.0" | "1.1" | "2.0" | "2.1" | "2.2";

/**
 * Schema deprecation stage
 */
export type DeprecationStage = "active" | "deprecated" | "legacy" | "sunset";

/**
 * Base metadata structure
 */
export interface BaseMetadata {
  schemaVersion: SchemaVersion;
  model: string;
  [key: string]: unknown;
}

/**
 * Schema metadata tracking
 */
export interface SchemaMetadata {
  version: SchemaVersion;
  stage: DeprecationStage;
  introducedAt: string; // ISO date
  deprecatedAt?: string;
  sunsetAt?: string;
  breaking: boolean;
  description: string;
}

/**
 * Schema registry
 */
export const SchemaRegistry: Record<SchemaVersion, SchemaMetadata> = {
  "1.0": {
    version: "1.0",
    stage: "legacy",
    introducedAt: "2020-01-01",
    deprecatedAt: "2023-01-01",
    breaking: false,
    description: "Original metadata format with 'columns' field",
  },
  "1.1": {
    version: "1.1",
    stage: "deprecated",
    introducedAt: "2022-01-01",
    deprecatedAt: "2024-01-01",
    breaking: false,
    description: "Added basic filter support",
  },
  "2.0": {
    version: "2.0",
    stage: "active",
    introducedAt: "2024-01-01",
    breaking: true,
    description: "Renamed 'columns' to 'fields', added capability requirements",
  },
  "2.1": {
    version: "2.1",
    stage: "active",
    introducedAt: "2025-01-01",
    breaking: false,
    description: "Added bulk actions and permissions",
  },
  "2.2": {
    version: "2.2",
    stage: "active",
    introducedAt: "2026-01-01",
    breaking: false,
    description: "Added realtime sync configuration",
  },
};

/**
 * Migration function type
 */
export type MigrationFunction<From = unknown, To = unknown> = (meta: From) => To;

/**
 * Migration registry
 */
const migrations = new Map<string, MigrationFunction<BaseMetadata, BaseMetadata>>();

/**
 * Register a migration
 */
export function registerMigration(
  from: SchemaVersion,
  to: SchemaVersion,
  migrator: MigrationFunction<BaseMetadata, BaseMetadata>
): void {
  const key = `${from}→${to}`;
  migrations.set(key, migrator);
  console.log(`[Schema] Registered migration: ${key}`);
}

/**
 * Get migration path from one version to another
 */
export function getMigrationPath(from: SchemaVersion, to: SchemaVersion): SchemaVersion[] {
  const versions: SchemaVersion[] = ["1.0", "1.1", "2.0", "2.1", "2.2"];
  const fromIndex = versions.indexOf(from);
  const toIndex = versions.indexOf(to);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return [];
  }

  return versions.slice(fromIndex + 1, toIndex + 1);
}

/**
 * Run migrations to upgrade metadata
 */
export function runMigrations(
  meta: BaseMetadata,
  targetVersion: SchemaVersion = "2.2"
): BaseMetadata {
  const currentVersion = meta.schemaVersion || "1.0";

  if (currentVersion === targetVersion) {
    return meta;
  }

  const path = getMigrationPath(currentVersion, targetVersion);

  if (path.length === 0) {
    console.warn(`[Schema] No migration path from ${currentVersion} to ${targetVersion}`);
    return meta;
  }

  let migrated = meta;
  let currentStep = currentVersion;

  for (const nextVersion of path) {
    const key = `${currentStep}→${nextVersion}`;
    const migrator = migrations.get(key);

    if (!migrator) {
      console.error(`[Schema] Missing migration: ${key}`);
      throw new Error(`Migration not found: ${key}`);
    }

    migrated = migrator(migrated);
    migrated.schemaVersion = nextVersion;
    currentStep = nextVersion;

    console.log(`[Schema] Migrated: ${key}`);
  }

  return migrated;
}

/**
 * Upgrade metadata to latest schema
 */
export function upgradeToLatest(meta: BaseMetadata): BaseMetadata {
  return runMigrations(meta, "2.2");
}

/**
 * Check deprecation status
 */
export function checkDeprecation(version: SchemaVersion): {
  stage: DeprecationStage;
  warning?: string;
  error?: string;
} {
  const schema = SchemaRegistry[version];

  if (!schema) {
    return {
      stage: "sunset",
      error: `Unknown schema version: ${version}`,
    };
  }

  switch (schema.stage) {
    case "active":
      return { stage: "active" };

    case "deprecated":
      return {
        stage: "deprecated",
        warning: `Schema ${version} is deprecated. Consider upgrading to 2.2.`,
      };

    case "legacy":
      return {
        stage: "legacy",
        warning: `Schema ${version} is in legacy mode. Automatic migration will be applied.`,
      };

    case "sunset":
      return {
        stage: "sunset",
        error: `Schema ${version} has been sunset and is no longer supported.`,
      };
  }
}

/**
 * Schema diff result
 */
export interface SchemaDiff {
  from: SchemaVersion;
  to: SchemaVersion;
  breaking: boolean;
  changes: Array<{
    type: "added" | "removed" | "renamed" | "changed";
    field: string;
    description: string;
  }>;
}

/**
 * Compare two schema versions
 */
export function diffSchemas(from: SchemaVersion, to: SchemaVersion): SchemaDiff {
  // This would be implemented with actual schema definitions
  // For now, return a stub
  return {
    from,
    to,
    breaking: SchemaRegistry[to].breaking,
    changes: [],
  };
}

// Register all migrations
registerMigration("1.0", "1.1", (meta) => ({
  ...meta,
  filters: meta.filters || [],
}));

registerMigration("1.1", "2.0", (meta) => ({
  ...meta,
  fields: meta.columns || meta.fields,
  columns: undefined, // Remove old field
}));

registerMigration("2.0", "2.1", (meta) => ({
  ...meta,
  bulkActions: meta.bulkActions || [],
  permissions: meta.permissions || {},
}));

registerMigration("2.1", "2.2", (meta) => ({
  ...meta,
  realtimeSync: meta.realtimeSync || { enabled: false },
}));
