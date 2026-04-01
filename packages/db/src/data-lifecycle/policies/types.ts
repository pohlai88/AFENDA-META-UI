export type SqlAction = {
  id: string;
  description: string;
  statement: string;
};

export type LifecycleFunctionRefs = {
  promoteToWarm?: string;
  identifyColdCandidates?: string;
  checkLifecycleHealth?: string;
  listWarmInventory?: string;
  coldCatalogTable?: string;
};

export type LifecycleSloGates = {
  maxPartitionActionsPerRun?: number;
  maxRetentionActionsPerRun?: number;
  maxArchiveFailures?: number;
  maxArchiveFailureRatePct?: number;
};

export type PartitionTargetPolicy = {
  schemaName: string;
  parentTable: string;
  partitionColumn: string;
  yearsAhead?: number;
};

export type RetentionArchiveRule = {
  id: string;
  type: "archive-and-soft-delete";
  sourceSchema: string;
  sourceTable: string;
  archiveSchema: string;
  archiveTable: string;
  tenantColumn: string;
  dateColumn: string;
  retentionYears: number;
  softDeleteColumn: string;
  updatedAtColumn?: string;
  updatedByColumn?: string;
  dedupeKeyColumn: string;
};

export type RetentionPurgeRule = {
  id: string;
  type: "purge";
  schemaName: string;
  tableName: string;
  tenantColumn: string;
  dateColumn: string;
  retentionYears: number;
};

export type RetentionRule = RetentionArchiveRule | RetentionPurgeRule;

export type LifecyclePolicy = {
  id: string;
  description: string;
  partitionTargets: PartitionTargetPolicy[];
  retentionRules: RetentionRule[];
  functions: LifecycleFunctionRefs;
  sloGates?: LifecycleSloGates;
};
