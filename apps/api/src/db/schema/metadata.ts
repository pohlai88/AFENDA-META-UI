// ─────────────────────────────────────────────────────────────────────────────
// Metadata Platform Tables — Business Truth Engine persistence
//
// entities         → every registered model
// fields           → field-level metadata per entity
// layouts          → composable layout trees (JSONB)
// policies         → business rule DSL definitions
// audit_logs       → compliance-grade change history
// events           → event-sourced business event store
// ─────────────────────────────────────────────────────────────────────────────

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import type { FieldChange } from "@afenda/meta-types/audit";
import type { LayoutNode } from "@afenda/meta-types/layout";
import type { BusinessType } from "@afenda/meta-types/schema";
// ── Enums ────────────────────────────────────────────────────────────────────

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

// ── Entities ─────────────────────────────────────────────────────────────────

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  module: text("module").notNull().default("core"),
  label: text("label"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Fields ───────────────────────────────────────────────────────────────────

export const fields = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull(), // FieldType string
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
  (t) => ({
    entityIdx: index("fields_entity_idx").on(t.entityId),
  })
);

// ── Layouts ──────────────────────────────────────────────────────────────────

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
  (t) => ({
    entityIdx: index("layouts_entity_idx").on(t.entityId),
  })
);

// ── Policies ─────────────────────────────────────────────────────────────────

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
  (t) => ({
    scopeIdx: index("policies_scope_idx").on(t.scopeEntity),
  })
);

// ── Audit Logs ───────────────────────────────────────────────────────────────

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
  (t) => ({
    entityIdx: index("audit_entity_idx").on(t.entity),
    entityRecordIdx: index("audit_entity_record_idx").on(t.entity, t.recordId),
    actorIdx: index("audit_actor_idx").on(t.actor),
    timestampIdx: index("audit_timestamp_idx").on(t.timestamp),
  })
);

// ── Event Store ──────────────────────────────────────────────────────────────

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
  (t) => ({
    aggregateIdx: index("events_aggregate_idx").on(t.aggregateType, t.aggregateId),
    typeIdx: index("events_type_idx").on(t.eventType),
    timestampIdx: index("events_timestamp_idx").on(t.timestamp),
  })
);
