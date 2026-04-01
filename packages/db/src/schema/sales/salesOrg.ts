import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  timestamp,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { dateOnlyWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { countries, states } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  SalesTeamMemberRoleSchema,
  TerritoryResolutionStrategySchema,
  TerritoryResolutionSubjectTypeSchema,
  TerritoryRuleMatchTypeSchema,
  salesTeamMemberRoleEnum,
  territoryResolutionStrategyEnum,
  territoryResolutionSubjectTypeEnum,
  territoryRuleMatchTypeEnum,
} from "./_enums.js";
import {
  SalesTeamIdSchema,
  SalesTeamMemberIdSchema,
  TerritoryIdSchema,
  TerritoryResolutionIdSchema,
  TerritoryRuleIdSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";


export const salesTeams = salesSchema.table(
  "sales_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    code: text("code").notNull(),
    managerId: integer("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sales_teams_tenant").on(table.tenantId),
    index("idx_sales_sales_teams_manager").on(table.tenantId, table.managerId),
    index("idx_sales_sales_teams_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_sales_teams_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_sales_teams_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sales_teams_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.managerId],
      foreignColumns: [users.userId],
      name: "fk_sales_sales_teams_manager",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sales_teams"),
    serviceBypassPolicy("sales_sales_teams"),
  ]
);

export const salesTeamMembers = salesSchema.table(
  "sales_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    teamId: uuid("team_id").notNull(),
    userId: integer("user_id").notNull(),
    role: salesTeamMemberRoleEnum("role").notNull().default("member"),
    isLeader: boolean("is_leader").notNull().default(false),
    startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sales_team_members_tenant").on(table.tenantId),
    index("idx_sales_sales_team_members_team").on(table.tenantId, table.teamId),
    index("idx_sales_sales_team_members_user").on(table.tenantId, table.userId),
    index("idx_sales_sales_team_members_tenant_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_sales_team_members_unique")
      .on(table.tenantId, table.teamId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_sales_team_members_one_leader_per_team")
      .on(table.tenantId, table.teamId)
      .where(sql`${table.isLeader} = true AND ${table.deletedAt} IS NULL`),
    check(
      "chk_sales_sales_team_members_end_after_start",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sales_team_members_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [salesTeams.id],
      name: "fk_sales_sales_team_members_team",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "fk_sales_sales_team_members_user",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sales_team_members"),
    serviceBypassPolicy("sales_sales_team_members"),
  ]
);

export const territories = salesSchema.table(
  "territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    code: text("code").notNull(),
    parentId: uuid("parent_id"),
    defaultSalespersonId: integer("default_salesperson_id"),
    teamId: uuid("team_id"),
    /** At most one per tenant (partial unique index): used when no `territory_rules` row matches. */
    isDefaultFallback: boolean("is_default_fallback").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_territories_tenant").on(table.tenantId),
    index("idx_sales_territories_parent").on(table.tenantId, table.parentId),
    index("idx_sales_territories_team").on(table.tenantId, table.teamId),
    index("idx_sales_territories_salesperson").on(table.tenantId, table.defaultSalespersonId),
    uniqueIndex("uq_sales_territories_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_territories_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_territories_default_fallback_per_tenant")
      .on(table.tenantId)
      .where(
        sql`${table.isDefaultFallback} = true AND ${table.deletedAt} IS NULL`
      ),
    check(
      "chk_sales_territories_parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_territories_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_sales_territories_parent",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.defaultSalespersonId],
      foreignColumns: [users.userId],
      name: "fk_sales_territories_default_salesperson",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [salesTeams.id],
      name: "fk_sales_territories_team",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_territories"),
    serviceBypassPolicy("sales_territories"),
  ]
);

export type TerritoryResolutionTrace = {
  sortOrder: string;
  candidatesOrdered: Array<{
    ruleId: string;
    priority: number;
    specificity: number;
    createdAt: string;
  }>;
  steps: Array<{ ruleId: string; matched: boolean; reason: string }>;
};

export const territoryRules = salesSchema.table(
  "territory_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    countryId: integer("country_id"),
    stateId: integer("state_id"),
    /** Inclusive numeric postal bucket (no string ordering bugs). Null with `zip_to` null = any ZIP. */
    zipFrom: integer("zip_from"),
    zipTo: integer("zip_to"),
    matchType: territoryRuleMatchTypeEnum("match_type").notNull().default("wildcard"),
    priority: integer("priority").notNull().default(10),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_territory_rules_tenant").on(table.tenantId),
    index("idx_sales_territory_rules_territory").on(table.tenantId, table.territoryId),
    index("idx_sales_territory_rules_geo").on(
      table.tenantId,
      table.countryId,
      table.stateId,
      table.zipFrom,
      table.zipTo
    ),
    index("idx_sales_territory_rules_priority").on(table.tenantId, table.priority),
    index("idx_sales_territory_rules_effective").on(
      table.tenantId,
      table.effectiveFrom,
      table.effectiveTo
    ),
    check("chk_sales_territory_rules_priority_non_negative", sql`${table.priority} >= 0`),
    check(
      "chk_sales_territory_rules_effective_window",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "chk_sales_territory_rules_zip_bounds_pair",
      sql`(${table.zipFrom} IS NULL AND ${table.zipTo} IS NULL) OR (${table.zipFrom} IS NOT NULL AND ${table.zipTo} IS NOT NULL AND ${table.zipTo} >= ${table.zipFrom})`
    ),
    check(
      "chk_sales_territory_rules_match_range_zip",
      sql`${table.matchType} <> 'range' OR (${table.zipFrom} IS NOT NULL AND ${table.zipTo} IS NOT NULL)`
    ),
    check(
      "chk_sales_territory_rules_match_exact_zip",
      sql`${table.matchType} <> 'exact' OR (${table.zipFrom} IS NOT NULL AND ${table.zipTo} IS NOT NULL AND ${table.zipFrom} = ${table.zipTo})`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_territory_rules_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.territoryId],
      foreignColumns: [territories.id],
      name: "fk_sales_territory_rules_territory",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_territory_rules_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_territory_rules_state",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_territory_rules"),
    serviceBypassPolicy("sales_territory_rules"),
  ]
);

export const territoryResolutions = salesSchema.table(
  "territory_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subjectType: territoryResolutionSubjectTypeEnum("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    inputAddress: jsonb("input_address")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    resolvedTerritoryId: uuid("resolved_territory_id"),
    matchedRuleId: uuid("matched_rule_id"),
    resolutionStrategy: territoryResolutionStrategyEnum("resolution_strategy").notNull(),
    resolutionTrace: jsonb("resolution_trace")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<TerritoryResolutionTrace & Record<string, unknown>>(),
    /** Business instant rules were evaluated against (`effective_from` / `effective_to` on rules). */
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_territory_resolutions_tenant").on(table.tenantId),
    index("idx_sales_territory_resolutions_subject").on(
      table.tenantId,
      table.subjectType,
      table.subjectId
    ),
    index("idx_sales_territory_resolutions_territory").on(table.tenantId, table.resolvedTerritoryId),
    index("idx_sales_territory_resolutions_rule").on(table.tenantId, table.matchedRuleId),
    check(
      "chk_sales_territory_resolutions_strategy_integrity",
      sql`(
        (${table.resolutionStrategy} = 'priority' AND ${table.matchedRuleId} IS NOT NULL AND ${table.resolvedTerritoryId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'default' AND ${table.matchedRuleId} IS NULL AND ${table.resolvedTerritoryId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'fallback' AND ${table.matchedRuleId} IS NULL AND ${table.resolvedTerritoryId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'none' AND ${table.resolvedTerritoryId} IS NULL)
      )`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_territory_resolutions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.resolvedTerritoryId],
      foreignColumns: [territories.id],
      name: "fk_sales_territory_resolutions_territory",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.matchedRuleId],
      foreignColumns: [territoryRules.id],
      name: "fk_sales_territory_resolutions_rule",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_territory_resolutions"),
    serviceBypassPolicy("sales_territory_resolutions"),
  ]
);

export const salesTeamSelectSchema = createSelectSchema(salesTeams);
export const salesTeamMemberSelectSchema = createSelectSchema(salesTeamMembers);
export const territorySelectSchema = createSelectSchema(territories);
export const territoryRuleSelectSchema = createSelectSchema(territoryRules);
export const territoryResolutionSelectSchema = createSelectSchema(territoryResolutions);

export const salesTeamInsertSchema = createInsertSchema(salesTeams, {
  id: SalesTeamIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(80),
  managerId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesTeamMemberInsertSchema = createInsertSchema(salesTeamMembers, {
  id: SalesTeamMemberIdSchema.optional(),
  tenantId: z.number().int().positive(),
  teamId: SalesTeamIdSchema,
  userId: z.number().int().positive(),
  role: SalesTeamMemberRoleSchema.optional().default("member"),
  isLeader: z.boolean().optional().default(false),
  startDate: dateOnlyWire.optional(),
  endDate: dateOnlyWire.optional().nullable(),
  isActive: z.boolean().optional().default(true),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const territoryInsertSchema = createInsertSchema(territories, {
  id: TerritoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(80),
  parentId: TerritoryIdSchema.optional().nullable(),
  defaultSalespersonId: z.number().int().positive().optional().nullable(),
  teamId: SalesTeamIdSchema.optional().nullable(),
  isDefaultFallback: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

const territoryResolutionTraceZod = z
  .object({
    sortOrder: z.string(),
    candidatesOrdered: z.array(
      z.object({
        ruleId: z.string(),
        priority: z.number(),
        specificity: z.number(),
        createdAt: z.string(),
      })
    ),
    steps: z.array(
      z.object({
        ruleId: z.string(),
        matched: z.boolean(),
        reason: z.string(),
      })
    ),
  })
  .strict();

export const territoryRuleInsertSchema = createInsertSchema(territoryRules, {
  id: TerritoryRuleIdSchema.optional(),
  tenantId: z.number().int().positive(),
  territoryId: TerritoryIdSchema,
  countryId: z.number().int().positive().optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  zipFrom: z.number().int().optional().nullable(),
  zipTo: z.number().int().optional().nullable(),
  matchType: TerritoryRuleMatchTypeSchema.optional().default("wildcard"),
  priority: z.number().int().min(0).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const territoryResolutionInsertSchema = createInsertSchema(territoryResolutions, {
  id: TerritoryResolutionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subjectType: TerritoryResolutionSubjectTypeSchema,
  subjectId: z.uuid().optional().nullable(),
  inputAddress: z.record(z.string(), z.unknown()),
  resolvedTerritoryId: TerritoryIdSchema.optional().nullable(),
  matchedRuleId: TerritoryRuleIdSchema.optional().nullable(),
  resolutionStrategy: TerritoryResolutionStrategySchema,
  resolutionTrace: territoryResolutionTraceZod.optional(),
  evaluatedAt: z.coerce.date(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesTeamUpdateSchema = createUpdateSchema(salesTeams);
export const salesTeamMemberUpdateSchema = createUpdateSchema(salesTeamMembers);
export const territoryUpdateSchema = createUpdateSchema(territories);
export const territoryRuleUpdateSchema = createUpdateSchema(territoryRules);
export const territoryResolutionUpdateSchema = createUpdateSchema(territoryResolutions);

export type SalesTeam = typeof salesTeams.$inferSelect;
export type NewSalesTeam = typeof salesTeams.$inferInsert;
export type SalesTeamMember = typeof salesTeamMembers.$inferSelect;
export type NewSalesTeamMember = typeof salesTeamMembers.$inferInsert;
export type Territory = typeof territories.$inferSelect;
export type NewTerritory = typeof territories.$inferInsert;
export type TerritoryRule = typeof territoryRules.$inferSelect;
export type NewTerritoryRule = typeof territoryRules.$inferInsert;
export type TerritoryResolution = typeof territoryResolutions.$inferSelect;
export type NewTerritoryResolution = typeof territoryResolutions.$inferInsert;
