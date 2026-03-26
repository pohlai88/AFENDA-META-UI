/**
 * Meta Compiler
 * =============
 * Transforms the output of GraphQL introspection (via drizzle-graphql) into
 * a ModelMeta document that the schema registry stores and the /meta route
 * serves.
 *
 * Pipeline:
 *   GraphQL introspection → IntrospectedModel[] → ModelMeta
 *
 * The compiler is intentionally conservative: it builds a sensible default
 * ModelMeta that developers can then override by patching specific keys via
 * the schema registry UI or migration scripts.
 */

import {
  type FieldType,
  type MetaAction,
  type MetaField,
  type MetaListView,
  type MetaFormView,
  type ModelMeta,
  type IntrospectedModel,
  type IntrospectedField,
} from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// GraphQL scalar → FieldType mapping
// ---------------------------------------------------------------------------

const SCALAR_MAP: Record<string, FieldType> = {
  String: "string",
  Int: "integer",
  Float: "float",
  Boolean: "boolean",
  ID: "string",
  // Custom scalars emitted by drizzle-graphql
  Date: "date",
  DateTime: "datetime",
  JSON: "json",
  UUID: "string",
};

/** Derive a FieldType from a drizzle-graphql introspection type name. */
function resolveFieldType(introspectedField: IntrospectedField): FieldType {
  const { typeName, isRelation, isEnum } = introspectedField;
  if (isRelation) {
    // drizzle-graphql expresses *-to-many as list wrappers
    return introspectedField.isList ? "one2many" : "many2one";
  }
  if (isEnum) return "enum";
  return SCALAR_MAP[typeName] ?? "string";
}

/** Map an IntrospectedField to a MetaField with sensible defaults. */
function compileField(f: IntrospectedField): MetaField {
  const fieldType = resolveFieldType(f);

  const base: MetaField = {
    name: f.name,
    label: humanise(f.name),
    type: fieldType,
    required: f.isRequired && !f.hasDefault,
    readonly: f.name === "id" || f.name === "createdAt",
    sortable: !f.isRelation,
    filterable: !f.isRelation || fieldType === "many2one",
  };

  if (fieldType === "enum" && f.enumValues?.length) {
    base.options = f.enumValues.map((v) => ({ value: v, label: humanise(v) }));
  }

  if (fieldType === "many2one" && f.relationModel) {
    base.relation = {
      model: camelToSnake(f.relationModel),
      display_field: "name",
      value_field: "id",
    };
  }

  if (fieldType === "one2many" && f.relationModel) {
    base.relation = {
      model: camelToSnake(f.relationModel),
      // FK back-reference is guessed; devs should patch for accuracy
      foreign_key: camelToSnake(f.name) + "_id",
      display_field: "name",
      value_field: "id",
    };
  }

  return base;
}

/** Build a default MetaFormView — all non-id+timestamp fields in one group. */
function buildFormView(fields: MetaField[]): MetaFormView {
  const visible = fields.filter((f) => !["createdAt", "updatedAt"].includes(f.name));
  return {
    type: "form",
    groups: [
      {
        name: "general",
        label: "General Information",
        fields: visible.map((f) => f.name),
        columns: 2,
      },
    ],
  };
}

/** Build a default MetaListView — scalar + many2one fields, max 8 columns. */
function buildListView(fields: MetaField[]): MetaListView {
  const columns = fields
    .filter((f) => f.type !== "one2many" && f.type !== "json")
    .slice(0, 8)
    .map((f) => f.name);

  return {
    type: "list",
    columns,
    default_order: [{ field: "id", direction: "desc" }],
    create_inline: false,
  };
}

/** Compile an IntrospectedModel into a ModelMeta. */
export function compileModel(model: IntrospectedModel): ModelMeta {
  const fields: MetaField[] = model.fields.map(compileField);
  const modelName = camelToSnake(model.name);

  return {
    model: modelName,
    label: humanise(model.name),
    label_plural: humanise(model.name) + "s",
    fields,
    views: {
      form: buildFormView(fields),
      list: buildListView(fields),
    },
    actions: buildDefaultActions(modelName),
    permissions: {
      default_role_permissions: {
        admin: { can_create: true, can_read: true, can_update: true, can_delete: true },
        user: { can_create: true, can_read: true, can_update: true, can_delete: false },
        viewer: { can_create: false, can_read: true, can_update: false, can_delete: false },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "salesOrderLine" → "sales_order_line" */
function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase()).replace(/^_/, "");
}

/** "sales_order_line" | "salesOrderLine" → "Sales Order Line" */
function humanise(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function buildDefaultActions(model: string): MetaAction[] {
  if (model === "sales_order") {
    return [
      {
        id: "generate_commission",
        label: "Generate Commission",
        method: "POST",
        url: "/api/sales/commissions/generate",
        style: "secondary",
        icon: "BadgePercent",
        allowed_roles: ["admin", "sales_manager", "sales_ops"],
        confirm_message: "Generate or refresh commission entries for this sales order?",
      },
    ];
  }

  if (model === "consignment_stock_report") {
    return [
      {
        id: "validate_consignment_report",
        label: "Validate Stock Report",
        method: "POST",
        url: "/api/sales/consignment/reports/validate",
        style: "secondary",
        icon: "ClipboardCheck",
        allowed_roles: ["admin", "sales_manager", "sales_ops"],
        confirm_message: "Validate stock balances and pricing totals for this report?",
      },
      {
        id: "generate_consignment_invoice_draft",
        label: "Generate Invoice Draft",
        method: "POST",
        url: "/api/sales/consignment/reports/invoice-draft",
        style: "secondary",
        icon: "FileSpreadsheet",
        allowed_roles: ["admin", "sales_manager", "sales_ops"],
        confirm_message: "Generate an invoice draft from sold quantities in this report?",
      },
    ];
  }

  if (model === "consignment_agreement") {
    return [
      {
        id: "evaluate_consignment_expiry",
        label: "Evaluate Expiry",
        method: "POST",
        url: "/api/sales/consignment/agreements/expire",
        style: "secondary",
        icon: "CalendarClock",
        allowed_roles: ["admin", "sales_manager", "sales_ops"],
        confirm_message: "Evaluate expiry and update agreement status if the agreement is past end date?",
      },
    ];
  }

  return [];
}
