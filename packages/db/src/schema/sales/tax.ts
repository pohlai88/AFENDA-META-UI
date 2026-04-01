import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
auditColumns,
nameColumn,
softDeleteColumns,
timestampColumns,
} from "../../column-kit/index.js";
import { serviceBypassPolicy,tenantIsolationPolicies } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { countries, states } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  TaxAmountTypeSchema,
  TaxComputationMethodSchema,
  TaxResolutionStrategySchema,
  TaxResolutionSubjectTypeSchema,
  TaxRoundingMethodSchema,
  TaxTypeUseSchema,
  taxAmountTypeEnum,
  taxComputationMethodEnum,
  taxResolutionStrategyEnum,
  taxResolutionSubjectTypeEnum,
  taxRoundingMethodEnum,
  taxTypeUseEnum,
  type TaxAmountType,
  type TaxComputationMethod,
  type TaxRoundingMethod,
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
  FiscalPositionAccountMapIdSchema,
  FiscalPositionIdSchema,
  FiscalPositionStateIdSchema,
  FiscalPositionTaxMapIdSchema,
  TaxGroupIdSchema,
  TaxRateChildIdSchema,
  TaxRateIdSchema,
  TaxResolutionIdSchema,
  taxNumericAmountStringSchema,
} from "./_zodShared.js";

/** One evaluated tax line in evaluation order (mirrors `tax_resolutions.applied_taxes[]`). */
export type TaxResolutionAppliedTaxLine = {
  taxId: string;
  /** Decimal rate string (e.g. percent as "15" for 15%, or fixed amount per engine rules). */
  rate: string;
  base: string;
  amount: string;
  computationMethod: TaxComputationMethod;
  /** Evaluation order within the resolution (stable under `tax_engine_version`). */
  sequence?: number;
};

/** Stamped on `sale_order_line_taxes.computation_snapshot` at line tax attach time. */
export type SaleOrderLineTaxComputationSnapshot = {
  amountType: TaxAmountType;
  amount: string;
  computationMethod: TaxComputationMethod;
  priceInclude: boolean;
  taxEngineVersion?: string;
  /** Must match the resolution row / engine contract for replay. */
  roundingMethod?: TaxRoundingMethod;
  roundingPrecision?: string;
};

export const taxGroups = salesSchema.table(
  "tax_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sequence: integer("sequence").notNull().default(10),
    countryId: integer("country_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_tax_groups_tenant").on(table.tenantId),
    index("idx_sales_tax_groups_country").on(table.tenantId, table.countryId),
    uniqueIndex("uq_sales_tax_groups_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_tax_groups_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_groups_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_tax_groups_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_groups"),
    serviceBypassPolicy("sales_tax_groups"),
  ]
);

export const taxRates = salesSchema.table(
  "tax_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    typeTaxUse: taxTypeUseEnum("type_tax_use").notNull().default("sale"),
    amountType: taxAmountTypeEnum("amount_type").notNull().default("percent"),
    /**
     * Engine semantics for this rate row. Must pair with `amount_type` / `price_include`
     * (see table checks). Group parents use `group`; leaf rates use `flat` | `compound` | `included`.
     */
    computationMethod: taxComputationMethodEnum("computation_method").notNull().default("flat"),
    amount: numeric("amount", { precision: 9, scale: 4 }).notNull().default("0"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    taxGroupId: uuid("tax_group_id"),
    priceInclude: boolean("price_include").notNull().default(false),
    sequence: integer("sequence").notNull().default(10),
    countryId: integer("country_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_tax_rates_tenant").on(table.tenantId),
    index("idx_sales_tax_rates_type").on(table.tenantId, table.typeTaxUse, table.amountType),
    index("idx_sales_tax_rates_group").on(table.tenantId, table.taxGroupId),
    index("idx_sales_tax_rates_tenant_effective").on(table.tenantId, table.effectiveFrom),
    index("idx_sales_tax_rates_replaced_by").on(table.tenantId, table.replacedBy),
    uniqueIndex("uq_sales_tax_rates_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_tax_rates_amount_non_negative", sql`${table.amount} >= 0`),
    check(
      "chk_sales_tax_rates_percent_range",
      sql`${table.amountType} <> 'percent' OR ${table.amount} <= 100`
    ),
    check(
      "chk_sales_tax_rates_effective_order",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check("chk_sales_tax_rates_sequence_non_negative", sql`${table.sequence} >= 0`),
    check(
      "chk_sales_tax_rates_group_computation",
      sql`(${table.amountType} = 'group' AND ${table.computationMethod} = 'group') OR (${table.amountType} <> 'group' AND ${table.computationMethod} <> 'group')`
    ),
    check(
      "chk_sales_tax_rates_included_price_flag",
      sql`(${table.computationMethod} = 'included' AND ${table.priceInclude}) OR (${table.computationMethod} <> 'included' AND NOT ${table.priceInclude})`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_rates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxGroupId],
      foreignColumns: [taxGroups.id],
      name: "fk_sales_tax_rates_group",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_tax_rates_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.replacedBy],
      foreignColumns: [table.id],
      name: "fk_sales_tax_rates_replaced_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_rates"),
    serviceBypassPolicy("sales_tax_rates"),
  ]
);

export const taxRateChildren = salesSchema.table(
  "tax_rate_children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    parentTaxId: uuid("parent_tax_id").notNull(),
    childTaxId: uuid("child_tax_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_tax_rate_children_tenant").on(table.tenantId),
    index("idx_sales_tax_rate_children_parent").on(
      table.tenantId,
      table.parentTaxId,
      table.sequence
    ),
    uniqueIndex("uq_sales_tax_rate_children_unique").on(
      table.tenantId,
      table.parentTaxId,
      table.childTaxId
    ),
    uniqueIndex("uq_sales_tax_rate_children_parent_sequence").on(
      table.tenantId,
      table.parentTaxId,
      table.sequence
    ),
    check("chk_sales_tax_rate_children_sequence_non_negative", sql`${table.sequence} >= 0`),
    check("chk_sales_tax_rate_children_distinct", sql`${table.parentTaxId} <> ${table.childTaxId}`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_rate_children_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentTaxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_tax_rate_children_parent",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.childTaxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_tax_rate_children_child",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_rate_children"),
    serviceBypassPolicy("sales_tax_rate_children"),
  ]
);

export const fiscalPositions = salesSchema.table(
  "fiscal_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    countryId: integer("country_id"),
    /** Inclusive numeric postal bound (null = any); pair with `zip_to` or leave both null. */
    zipFrom: integer("zip_from"),
    zipTo: integer("zip_to"),
    autoApply: boolean("auto_apply").notNull().default(false),
    vatRequired: boolean("vat_required").notNull().default(false),
    /** Lower sequence = higher precedence when multiple positions match (deterministic resolver). */
    sequence: integer("sequence").notNull().default(10),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_fiscal_positions_tenant").on(table.tenantId),
    index("idx_sales_fiscal_positions_country").on(
      table.tenantId,
      table.countryId,
      table.autoApply
    ),
    index("idx_sales_fiscal_positions_effective").on(
      table.tenantId,
      table.effectiveFrom,
      table.effectiveTo
    ),
    check(
      "chk_sales_fiscal_positions_effective_window",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "chk_sales_fiscal_positions_zip_bounds",
      sql`(${table.zipFrom} IS NULL AND ${table.zipTo} IS NULL) OR (${table.zipFrom} IS NOT NULL AND ${table.zipTo} IS NOT NULL AND ${table.zipTo} >= ${table.zipFrom})`
    ),
    uniqueIndex("uq_sales_fiscal_positions_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_positions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_fiscal_positions_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_positions"),
    serviceBypassPolicy("sales_fiscal_positions"),
  ]
);

export const fiscalPositionStates = salesSchema.table(
  "fiscal_position_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    fiscalPositionId: uuid("fiscal_position_id").notNull(),
    stateId: integer("state_id").notNull(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_fiscal_position_states_tenant").on(table.tenantId),
    index("idx_sales_fiscal_position_states_position").on(table.tenantId, table.fiscalPositionId),
    index("idx_sales_fiscal_position_states_state").on(table.tenantId, table.stateId),
    uniqueIndex("uq_sales_fiscal_position_states_unique").on(
      table.tenantId,
      table.fiscalPositionId,
      table.stateId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_position_states_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_fiscal_position_states_position",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_fiscal_position_states_state",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_position_states"),
    serviceBypassPolicy("sales_fiscal_position_states"),
  ]
);

export const fiscalPositionTaxMaps = salesSchema.table(
  "fiscal_position_tax_maps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    fiscalPositionId: uuid("fiscal_position_id").notNull(),
    taxSrcId: uuid("tax_src_id").notNull(),
    taxDestId: uuid("tax_dest_id"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_fiscal_position_tax_maps_tenant").on(table.tenantId),
    index("idx_sales_fiscal_position_tax_maps_position").on(table.tenantId, table.fiscalPositionId),
    uniqueIndex("uq_sales_fiscal_position_tax_maps_unique").on(
      table.tenantId,
      table.fiscalPositionId,
      table.taxSrcId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_position_tax_maps_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_fiscal_position_tax_maps_position",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxSrcId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_fiscal_position_tax_maps_src",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxDestId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_fiscal_position_tax_maps_dest",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_position_tax_maps"),
    serviceBypassPolicy("sales_fiscal_position_tax_maps"),
  ]
);

export const fiscalPositionAccountMaps = salesSchema.table(
  "fiscal_position_account_maps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    fiscalPositionId: uuid("fiscal_position_id").notNull(),
    accountSrcId: text("account_src_id").notNull(),
    accountDestId: text("account_dest_id").notNull(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_fiscal_position_account_maps_tenant").on(table.tenantId),
    index("idx_sales_fiscal_position_account_maps_position").on(
      table.tenantId,
      table.fiscalPositionId
    ),
    uniqueIndex("uq_sales_fiscal_position_account_maps_unique").on(
      table.tenantId,
      table.fiscalPositionId,
      table.accountSrcId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_position_account_maps_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_fiscal_position_account_maps_position",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_position_account_maps"),
    serviceBypassPolicy("sales_fiscal_position_account_maps"),
  ]
);

/**
 * Append-only outcome of tax resolution for a document/line (inputs, fiscal position, applied taxes, trace).
 * Insert a new row when recomputing; do not mutate locked / posted anchors.
 */
export const taxResolutions = salesSchema.table(
  "tax_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subjectType: taxResolutionSubjectTypeEnum("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    inputSnapshot: jsonb("input_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    fiscalPositionId: uuid("fiscal_position_id"),
    appliedTaxIds: uuid("applied_tax_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Ordered tax lines with base/amount/rate/method — canonical for reconstruction (ids alone are insufficient). */
    appliedTaxes: jsonb("applied_taxes")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<TaxResolutionAppliedTaxLine[]>(),
    computationTrace: jsonb("computation_trace")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    totalTaxAmount: numeric("total_tax_amount", { precision: 14, scale: 2 }).notNull(),
    roundingMethod: taxRoundingMethodEnum("rounding_method").notNull().default("per_line"),
    roundingPrecision: numeric("rounding_precision", { precision: 5, scale: 4 })
      .notNull()
      .default("0.01"),
    resolutionStrategy: taxResolutionStrategyEnum("resolution_strategy").notNull(),
    /** Business instant rules/rates were evaluated against. */
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
    taxEngineVersion: varchar("tax_engine_version", { length: 64 }).notNull().default("v2"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_tax_resolutions_tenant").on(table.tenantId),
    index("idx_sales_tax_resolutions_subject").on(
      table.tenantId,
      table.subjectType,
      table.subjectId
    ),
    index("idx_sales_tax_resolutions_position").on(table.tenantId, table.fiscalPositionId),
    index("idx_sales_tax_resolutions_resolved").on(table.tenantId, table.resolvedAt),
    check("chk_sales_tax_resolutions_total_non_negative", sql`${table.totalTaxAmount} >= 0`),
    check("chk_sales_tax_resolutions_rounding_precision_positive", sql`${table.roundingPrecision} > 0`),
    check(
      "chk_sales_tax_resolutions_strategy_integrity",
      sql`(
        (${table.resolutionStrategy} = 'priority' AND ${table.fiscalPositionId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'default' AND ${table.fiscalPositionId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'fallback' AND ${table.fiscalPositionId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'ambiguous' AND ${table.fiscalPositionId} IS NOT NULL)
        OR (${table.resolutionStrategy} = 'none' AND ${table.fiscalPositionId} IS NULL)
      )`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_resolutions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_tax_resolutions_fiscal_position",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_resolutions"),
    serviceBypassPolicy("sales_tax_resolutions"),
  ]
);

export const taxGroupSelectSchema = createSelectSchema(taxGroups);
export const taxRateSelectSchema = createSelectSchema(taxRates);
export const taxRateChildSelectSchema = createSelectSchema(taxRateChildren);
export const fiscalPositionSelectSchema = createSelectSchema(fiscalPositions);
export const fiscalPositionStateSelectSchema = createSelectSchema(fiscalPositionStates);
export const fiscalPositionTaxMapSelectSchema = createSelectSchema(fiscalPositionTaxMaps);
export const fiscalPositionAccountMapSelectSchema = createSelectSchema(fiscalPositionAccountMaps);
export const taxResolutionSelectSchema = createSelectSchema(taxResolutions);

export const taxGroupInsertSchema = createInsertSchema(taxGroups, {
  id: TaxGroupIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sequence: z.number().int().min(0).optional(),
  countryId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const taxRateInsertSchema = createInsertSchema(taxRates, {
  id: TaxRateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  typeTaxUse: TaxTypeUseSchema.optional(),
  amountType: TaxAmountTypeSchema.optional(),
  computationMethod: TaxComputationMethodSchema.optional(),
  amount: taxNumericAmountStringSchema.optional(),
  taxGroupId: TaxGroupIdSchema.optional().nullable(),
  priceInclude: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  countryId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((data, ctx) => {
  const amountType = data.amountType ?? "percent";
  const computationMethod = data.computationMethod ?? "flat";
  const priceInclude = data.priceInclude ?? false;
  if ((amountType === "group") !== (computationMethod === "group")) {
    ctx.addIssue({
      code: "custom",
      message: "amount_type 'group' requires computation_method 'group', and non-group rates cannot use 'group'",
      path: ["computationMethod"],
    });
  }
  if (priceInclude !== (computationMethod === "included")) {
    ctx.addIssue({
      code: "custom",
      message: "price_include must be true iff computation_method is 'included'",
      path: ["priceInclude"],
    });
  }
  const amount = data.amount;
  if (amount === undefined) return;
  const n = Number(amount);
  if (amountType === "percent" && n > 100) {
    ctx.addIssue({
      code: "custom",
      message: "Percentage amount must be between 0 and 100",
      path: ["amount"],
    });
  }
});

export const taxRateChildInsertSchema = createInsertSchema(taxRateChildren, {
  id: TaxRateChildIdSchema.optional(),
  tenantId: z.number().int().positive(),
  parentTaxId: TaxRateIdSchema,
  childTaxId: TaxRateIdSchema,
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionInsertSchema = createInsertSchema(fiscalPositions, {
  id: FiscalPositionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  countryId: z.number().int().positive().optional().nullable(),
  zipFrom: z.number().int().optional().nullable(),
  zipTo: z.number().int().optional().nullable(),
  autoApply: z.boolean().optional(),
  vatRequired: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionStateInsertSchema = createInsertSchema(fiscalPositionStates, {
  id: FiscalPositionStateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  fiscalPositionId: FiscalPositionIdSchema,
  stateId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionTaxMapInsertSchema = createInsertSchema(fiscalPositionTaxMaps, {
  id: FiscalPositionTaxMapIdSchema.optional(),
  tenantId: z.number().int().positive(),
  fiscalPositionId: FiscalPositionIdSchema,
  taxSrcId: TaxRateIdSchema,
  taxDestId: TaxRateIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionAccountMapInsertSchema = createInsertSchema(fiscalPositionAccountMaps, {
  id: FiscalPositionAccountMapIdSchema.optional(),
  tenantId: z.number().int().positive(),
  fiscalPositionId: FiscalPositionIdSchema,
  accountSrcId: z.string().min(1).max(120),
  accountDestId: z.string().min(1).max(120),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

const taxResolutionAppliedTaxLineSchema = z.object({
  taxId: z.uuid(),
  rate: z.string(),
  base: z.string(),
  amount: z.string(),
  computationMethod: TaxComputationMethodSchema,
  sequence: z.number().int().min(0).optional(),
});

export const taxResolutionInsertSchema = createInsertSchema(taxResolutions, {
  id: TaxResolutionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subjectType: TaxResolutionSubjectTypeSchema,
  subjectId: z.uuid().optional().nullable(),
  fiscalPositionId: FiscalPositionIdSchema.optional().nullable(),
  appliedTaxes: z.array(taxResolutionAppliedTaxLineSchema).optional(),
  totalTaxAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((v) => Number(v) >= 0, "total_tax_amount must be >= 0"),
  roundingMethod: TaxRoundingMethodSchema.optional(),
  roundingPrecision: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/)
    .refine((v) => Number(v) > 0, "rounding_precision must be > 0")
    .optional(),
  resolutionStrategy: TaxResolutionStrategySchema,
  evaluatedAt: z.coerce.date(),
  taxEngineVersion: z.string().min(1).max(64).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const taxGroupUpdateSchema = createUpdateSchema(taxGroups);
export const taxRateUpdateSchema = createUpdateSchema(taxRates);
export const taxRateChildUpdateSchema = createUpdateSchema(taxRateChildren);
export const fiscalPositionUpdateSchema = createUpdateSchema(fiscalPositions);
export const fiscalPositionStateUpdateSchema = createUpdateSchema(fiscalPositionStates);
export const fiscalPositionTaxMapUpdateSchema = createUpdateSchema(fiscalPositionTaxMaps);
export const fiscalPositionAccountMapUpdateSchema = createUpdateSchema(fiscalPositionAccountMaps);
export const taxResolutionUpdateSchema = createUpdateSchema(taxResolutions);

export type TaxGroup = typeof taxGroups.$inferSelect;
export type NewTaxGroup = typeof taxGroups.$inferInsert;
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;
export type TaxRateChild = typeof taxRateChildren.$inferSelect;
export type NewTaxRateChild = typeof taxRateChildren.$inferInsert;
export type FiscalPosition = typeof fiscalPositions.$inferSelect;
export type NewFiscalPosition = typeof fiscalPositions.$inferInsert;
export type FiscalPositionTaxMap = typeof fiscalPositionTaxMaps.$inferSelect;
export type NewFiscalPositionTaxMap = typeof fiscalPositionTaxMaps.$inferInsert;
export type FiscalPositionAccountMap = typeof fiscalPositionAccountMaps.$inferSelect;
export type NewFiscalPositionAccountMap = typeof fiscalPositionAccountMaps.$inferInsert;
export type FiscalPositionState = typeof fiscalPositionStates.$inferSelect;
export type NewFiscalPositionState = typeof fiscalPositionStates.$inferInsert;
export type TaxResolution = typeof taxResolutions.$inferSelect;
export type NewTaxResolution = typeof taxResolutions.$inferInsert;
