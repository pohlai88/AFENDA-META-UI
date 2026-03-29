import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AuditOperation, AuditSource, FieldChange } from "@afenda/meta-types/audit";
import type { LayoutNode, LayoutViewType } from "@afenda/meta-types/layout";
import type { PolicySeverity } from "@afenda/meta-types/policy";
import type { BusinessType } from "@afenda/meta-types/schema";
export const policySeverityEnum = pgEnum("policy_severity", ["error", "warning", "info"]);

export const auditOperationEnum = pgEnum("audit_operation", ["create", "update", "delete"]);

export const auditSourceEnum = pgEnum("audit_source", [
  "ui",
  "api",
  "import",
  "system",
  "migration",
]);

export const layoutViewTypeEnum = pgEnum("layout_view_type", [
  "form",
  "list",
  "kanban",
  "dashboard",
  "wizard",
]);

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  module: text("module").notNull().default("core"),
  label: text("label"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fields = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull(),
    businessType: text("business_type").$type<BusinessType>(),
    isRequired: boolean("is_required").notNull().default(false),
    isUnique: boolean("is_unique").notNull().default(false),
    isReadonly: boolean("is_readonly").notNull().default(false),
    defaultValue: text("default_value"),
    computeFormula: text("compute_formula"),
    visibilityRule: jsonb("visibility_rule"),
    accessRoles: jsonb("access_roles").$type<string[]>().default([]),
    auditLevel: text("audit_level").$type<"low" | "medium" | "high">().default("low"),
    fieldOrder: integer("field_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("fields_entity_idx").on(table.entityId),
  })
);

export const layouts = pgTable(
  "layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    viewType: layoutViewTypeEnum("view_type").notNull().default("form"),
    layoutJson: jsonb("layout_json").$type<LayoutNode>().notNull(),
    roles: jsonb("roles").$type<string[]>().default([]),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("layouts_entity_idx").on(table.entityId),
  })
);

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeEntity: text("scope_entity").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    whenDsl: text("when_dsl"),
    validateDsl: text("validate_dsl").notNull(),
    message: text("message").notNull(),
    severity: policySeverityEnum("severity").notNull().default("error"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    isBlocking: boolean("is_blocking").notNull().default(true),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    scopeIdx: index("policies_scope_idx").on(table.scopeEntity),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity: text("entity").notNull(),
    recordId: text("record_id").notNull(),
    actor: text("actor").notNull(),
    operation: auditOperationEnum("operation").notNull(),
    source: auditSourceEnum("source").notNull().default("api"),
    diffJson: jsonb("diff_json").$type<FieldChange[]>().notNull().default([]),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("audit_entity_idx").on(table.entity),
    entityRecordIdx: index("audit_entity_record_idx").on(table.entity, table.recordId),
    actorIdx: index("audit_actor_idx").on(table.actor),
    timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
  })
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    eventPayload: jsonb("event_payload").$type<Record<string, unknown>>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    version: integer("version").notNull().default(1),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    aggregateIdx: index("events_aggregate_idx").on(table.aggregateType, table.aggregateId),
    typeIdx: index("events_type_idx").on(table.eventType),
    timestampIdx: index("events_timestamp_idx").on(table.timestamp),
  })
);

export type MetaLayoutViewType = LayoutViewType;
export type MetaPolicySeverity = PolicySeverity;
export type MetaAuditSource = AuditSource;
export type MetaAuditOperation = AuditOperation;
