/**
 * @module schema
 * @description Core metadata model: field contracts, model definitions, condition expressions, views, and permissions.
 * @layer truth-contract
 * @consumers api, web, db
 */

export type FieldType =
  | "string"
  | "text"
  | "integer"
  | "float"
  | "currency"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "time"
  | "email"
  | "url"
  | "phone"
  | "address"
  | "signature"
  | "password"
  | "uuid"
  | "json"
  | "enum"
  | "many2one"
  | "one2many"
  | "many2many"
  | "file"
  | "image"
  | "computed"
  | "tags"
  | "richtext"
  | "color"
  | "rating";

export interface OptionItem {
  value: string | number;
  label: string;
  color?: string;
  icon?: string;
  disabled?: boolean;
}

export interface RelationConfig {
  model: string;
  display_field?: string;
  value_field?: string;
  foreign_key?: string;
}

// ---------------------------------------------------------------------------
// Condition DSL
// ---------------------------------------------------------------------------

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";

export interface FieldCondition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  logic: "and" | "or";
  conditions: (FieldCondition | ConditionGroup)[];
}

export type ConditionExpression = FieldCondition | ConditionGroup;

// ---------------------------------------------------------------------------
// FieldConfig v2 — ERP-Grade Extensions
// ---------------------------------------------------------------------------

/**
 * Semantic meaning layer.
 * Lets validation engines, formatters, and compliance tools
 * understand WHAT a field represents, not just its storage type.
 */
export type BusinessType =
  | "email"
  | "phone"
  | "person_name"
  | "address"
  | "postal_code"
  | "city"
  | "country"
  | "country_code"
  | "currency_code"
  | "currency_amount"
  | "tax_id"
  | "company_id"
  | "company_name"
  | "status"
  | "document_ref"
  | "serial_number"
  | "url"
  | "ip_address"
  | "percentage"
  | "quantity"
  | "weight"
  | "dimensions"
  | "iban"
  | "swift_code"
  | "bank_account"
  | "vat_number"
  | "social_security"
  | "coordinates"
  | "timezone";

/** Computed field configuration — formula DSL + dependency tracking. */
export interface ComputeConfig {
  /** Expression in the form engine's DSL, e.g. `"price * qty"` */
  formula: string;
  /** Field names this computed value depends on */
  dependsOn: string[];
  /** Whether the result is persisted to DB or evaluated on-the-fly */
  stored: boolean;
}

/**
 * Consolidated validation constraints.
 * Replaces scattered required/unique booleans and per-renderer rules.
 */
export interface FieldConstraints {
  required?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** Regex pattern string (portable across languages) */
  pattern?: string;
  /** Human-readable message when pattern fails */
  patternMessage?: string;
}

/** Multi-language support for field labels and help text. */
export interface FieldI18n {
  label: Record<string, string>;
  helpText?: Record<string, string>;
  placeholder?: Record<string, string>;
}

/** Per-field audit tracking configuration. */
export interface FieldAuditConfig {
  trackChanges: boolean;
  sensitivityLevel: "low" | "medium" | "high";
}

export interface MetaField {
  name: string;
  type: FieldType;
  label: string;
  widget?: string;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  unique?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  options?: OptionItem[];
  relation?: RelationConfig;
  placeholder?: string;
  help_text?: string;
  order?: number;
  span?: 1 | 2 | 3 | 4;
  visibleIf?: ConditionExpression;
  requiredIf?: ConditionExpression;
  readonlyIf?: ConditionExpression;

  // --- FieldConfig v2 extensions (all optional for backward compat) ---

  /** Permanent identity — survives renames across schema versions */
  id?: string;
  /** Semantic meaning of this field (drives formatters, validators, compliance) */
  businessType?: BusinessType;
  /** Computed field configuration */
  compute?: ComputeConfig;
  /** Default value for new records */
  defaultValue?: unknown;
  /** Consolidated validation constraints (supplements required/unique above) */
  constraints?: FieldConstraints;
  /** Compliance & policy tags, e.g. ["financial", "pii", "regulated"] */
  policyTags?: string[];
  /** Multi-language labels and help text */
  i18n?: FieldI18n;
  /** Per-field audit tracking settings */
  audit?: FieldAuditConfig;
}

export interface MetaTab {
  name: string;
  label?: string;
  groups: MetaGroup[];
}

export interface MetaGroup {
  name: string;
  label?: string;
  columns?: 1 | 2 | 3 | 4;
  fields: string[];
  tabs?: MetaTab[];
}

export interface MetaFormView {
  type?: "form";
  groups: MetaGroup[];
}

export interface MetaListSort {
  field: string;
  direction: "asc" | "desc";
}

export interface MetaListView {
  type?: "list";
  columns: string[];
  default_order?: MetaListSort[];
  create_inline?: boolean;
}

export interface MetaKanbanView {
  type?: "kanban";
  group_by?: string;
  group_by_field?: string;
  card_title_field?: string;
  card_fields: string[];
}

export interface MetaDashboardDataSource {
  model?: string;
  aggregate?: "count" | "sum" | "avg";
}

export interface MetaDashboardChartSeries {
  key: string;
  label?: string;
  color?: string;
  stacked?: boolean;
}

export interface MetaDashboardChartConfig {
  x_key?: string;
  y_key?: string;
  color?: string;
  palette?: string[];
  x_axis_label?: string;
  y_axis_label?: string;
  show_grid?: boolean;
  pie_outer_radius?: number;
  max_points?: number;
  series?: MetaDashboardChartSeries[];
}

export interface MetaDashboardWidget {
  id: string;
  type: "stat" | "chart" | "list";
  title: string;
  subtitle?: string;
  data_source?: MetaDashboardDataSource;
  chart_type?: "bar" | "line" | "pie";
  chart_config?: MetaDashboardChartConfig;
}

export interface MetaDashboardView {
  type?: "dashboard";
  widgets: MetaDashboardWidget[];
}

export interface MetaViews {
  form?: MetaFormView;
  list?: MetaListView;
  kanban?: MetaKanbanView;
  dashboard?: MetaDashboardView;
}

export interface CrudPermissions {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface RolePermissionMap {
  [role: string]: CrudPermissions;
}

export interface MetaFieldPermissionRule {
  visible_to?: string[];
  writable_by?: string[];
}

export interface MetaFieldPermission {
  field: string;
  readable_by?: string[];
  writable_by?: string[];
}

export interface MetaPermissions {
  default_role_permissions?: RolePermissionMap;
  field_permissions?: Record<string, MetaFieldPermissionRule>;
}

export interface MetaAction {
  id: string;
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  style?: "primary" | "secondary" | "danger" | "warning" | "ghost";
  icon?: string;
  visible_when?: string;
  allowed_roles?: string[];
  confirm_message?: string;
}

export interface ModelMeta {
  model: string;
  label: string;
  label_plural?: string;
  icon?: string;
  title_field?: string;
  fields: MetaField[];
  views: MetaViews;
  actions: MetaAction[];
  permissions?: MetaPermissions;
  module?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetaResponse {
  meta: ModelMeta;
  effective_role: string;
  permissions: CrudPermissions;
  record_id?: string | number;
}

export interface SchemaRegistryEntry {
  model: string;
  module: string;
  version: number;
  meta: ModelMeta;
  permissions: MetaPermissions;
  field_permissions?: MetaFieldPermission[];
  created_at: Date;
  updated_at: Date;
}

export interface IntrospectedField {
  name: string;
  typeName: string;
  kind: string;
  isList: boolean;
  isRequired: boolean;
  hasDefault: boolean;
  isEnum: boolean;
  isRelation: boolean;
  relationModel?: string;
  enumValues?: string[];
}

export interface IntrospectedModel {
  name: string;
  fields: IntrospectedField[];
}
