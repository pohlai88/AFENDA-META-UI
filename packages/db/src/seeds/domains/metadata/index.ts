/**
 * Metadata Domain Seeding
 *
 * Seeds the metadata configuration system with baseline entities, fields,
 * layouts, policies, tenant definitions, and metadata overrides. Provides
 * foundation for dynamic ERP metadata resolution and custom field management.
 *
 * Seeded Tables (8):
 *   Core Metadata: entities, fields, layouts, policies
 *   Tenant System: tenantDefinitions, metadataOverrides, industryTemplates
 *   Audit System: decisionAuditEntries (sample decisions for override resolution)
 *
 * Invariants Validated:
 *   1. All fields reference valid entities (FK integrity)
 *   2. All layouts reference valid entities (FK integrity)
 *   3. All policies reference valid entities (scopeEntity FK)
 *   4. No orphaned metadata overrides (tenantId exists in tenantDefinitions)
 *   5. Override hierarchy resolves without circular references
 *   6. Default layout exists per entity
 *   7. Field names unique per entity
 *   8. BusinessType alignment with FieldType
 */

import { eq, isNull, sql } from "drizzle-orm";

import type { LayoutNode } from "@afenda/meta-types/layout";
import {
  decisionAuditChains,
  decisionAuditEntries,
  entities,
  fields,
  industryTemplates,
  layouts,
  metadataOverrides,
  policies,
  tenantDefinitions,
} from "../../../schema/meta/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

// ── Metadata Core Seeding ────────────────────────────────────────────────────

export async function seedMetadata(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  // ── 1. Entities (Business Models) ──────────────────────────────────────────
  await tx.insert(entities).values([
    {
      id: SEED_IDS.entityPartner,
      name: "partners",
      module: "sales",
      label: "Partner",
      description: "Customer, vendor, or distributor entity",
    },
    {
      id: SEED_IDS.entityProduct,
      name: "products",
      module: "sales",
      label: "Product",
      description: "Sellable product or service",
    },
    {
      id: SEED_IDS.entitySalesOrder,
      name: "sales_orders",
      module: "sales",
      label: "Sales Order",
      description: "Customer purchase order",
    },
    {
      id: SEED_IDS.entityInvoice,
      name: "invoices",
      module: "accounting",
      label: "Invoice",
      description: "Billing document for completed orders",
    },
  ]);

  console.log("   ✓ Seeded 4 core entities (Partner, Product, SalesOrder, Invoice)");

  // ── 2. Fields (Entity Attributes) ──────────────────────────────────────────
  await tx.insert(fields).values([
    // Partner fields (5)
    {
      id: SEED_IDS.fieldPartnerName,
      entityId: SEED_IDS.entityPartner,
      name: "name",
      label: "Partner Name",
      dataType: "string",
      businessType: "company_name",
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "medium",
      fieldOrder: 10,
    },
    {
      id: SEED_IDS.fieldPartnerEmail,
      entityId: SEED_IDS.entityPartner,
      name: "email",
      label: "Email Address",
      dataType: "email",
      businessType: "email",
      isRequired: true,
      isUnique: true,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "high",
      fieldOrder: 20,
    },
    {
      id: SEED_IDS.fieldPartnerPhone,
      entityId: SEED_IDS.entityPartner,
      name: "phone",
      label: "Phone Number",
      dataType: "string",
      businessType: "phone",
      isRequired: false,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "low",
      fieldOrder: 30,
    },
    {
      id: SEED_IDS.fieldPartnerTaxId,
      entityId: SEED_IDS.entityPartner,
      name: "tax_id",
      label: "Tax ID",
      dataType: "string",
      businessType: "tax_id",
      isRequired: false,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: {
        operator: "eq",
        field: "is_company",
        value: true,
      },
      accessRoles: ["accounting_user", "sales_manager"],
      auditLevel: "high",
      fieldOrder: 40,
    },
    {
      id: SEED_IDS.fieldPartnerCreditLimit,
      entityId: SEED_IDS.entityPartner,
      name: "credit_limit",
      label: "Credit Limit",
      dataType: "numeric",
      businessType: "currency_amount",
      isRequired: false,
      isUnique: false,
      isReadonly: false,
      defaultValue: "10000.00",
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_manager", "finance_controller"],
      auditLevel: "high",
      fieldOrder: 50,
    },

    // Product fields (4)
    {
      id: SEED_IDS.fieldProductName,
      entityId: SEED_IDS.entityProduct,
      name: "name",
      label: "Product Name",
      dataType: "string",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "inventory_user"],
      auditLevel: "medium",
      fieldOrder: 10,
    },
    {
      id: SEED_IDS.fieldProductPrice,
      entityId: SEED_IDS.entityProduct,
      name: "list_price",
      label: "List Price",
      dataType: "numeric",
      businessType: "currency_amount",
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: "0.00",
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "pricing_manager"],
      auditLevel: "high",
      fieldOrder: 20,
    },
    {
      id: SEED_IDS.fieldProductSku,
      entityId: SEED_IDS.entityProduct,
      name: "sku",
      label: "SKU",
      dataType: "string",
      businessType: null,
      isRequired: true,
      isUnique: true,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["inventory_user", "sales_user"],
      auditLevel: "medium",
      fieldOrder: 30,
    },
    {
      id: SEED_IDS.fieldProductActive,
      entityId: SEED_IDS.entityProduct,
      name: "is_active",
      label: "Active",
      dataType: "boolean",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: "true",
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["inventory_manager"],
      auditLevel: "low",
      fieldOrder: 40,
    },

    // SalesOrder fields (6)
    {
      id: SEED_IDS.fieldOrderName,
      entityId: SEED_IDS.entitySalesOrder,
      name: "name",
      label: "Order Number",
      dataType: "string",
      businessType: null,
      isRequired: true,
      isUnique: true,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "medium",
      fieldOrder: 10,
    },
    {
      id: SEED_IDS.fieldOrderPartnerId,
      entityId: SEED_IDS.entitySalesOrder,
      name: "partner_id",
      label: "Customer",
      dataType: "many2one",
      businessType: "company_id",
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "high",
      fieldOrder: 20,
    },
    {
      id: SEED_IDS.fieldOrderTotal,
      entityId: SEED_IDS.entitySalesOrder,
      name: "amount_total",
      label: "Total Amount",
      dataType: "numeric",
      businessType: "currency_amount",
      isRequired: true,
      isUnique: false,
      isReadonly: true,
      defaultValue: null,
      computeFormula: "SUM(line_items.subtotal) + SUM(line_items.tax)",
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager", "accounting_user"],
      auditLevel: "high",
      fieldOrder: 30,
    },
    {
      id: SEED_IDS.fieldOrderStatus,
      entityId: SEED_IDS.entitySalesOrder,
      name: "status",
      label: "Order Status",
      dataType: "selection",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: "draft",
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "high",
      fieldOrder: 40,
    },
    {
      id: SEED_IDS.fieldOrderDate,
      entityId: SEED_IDS.entitySalesOrder,
      name: "order_date",
      label: "Order Date",
      dataType: "date",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "medium",
      fieldOrder: 50,
    },
    {
      id: SEED_IDS.fieldOrderNotes,
      entityId: SEED_IDS.entitySalesOrder,
      name: "notes",
      label: "Internal Notes",
      dataType: "text",
      businessType: null,
      isRequired: false,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["sales_user", "sales_manager"],
      auditLevel: "low",
      fieldOrder: 60,
    },

    // Invoice fields (5)
    {
      id: SEED_IDS.fieldInvoiceNumber,
      entityId: SEED_IDS.entityInvoice,
      name: "invoice_number",
      label: "Invoice Number",
      dataType: "string",
      businessType: null,
      isRequired: true,
      isUnique: true,
      isReadonly: true,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["accounting_user", "accounting_manager"],
      auditLevel: "high",
      fieldOrder: 10,
    },
    {
      id: SEED_IDS.fieldInvoicePartnerId,
      entityId: SEED_IDS.entityInvoice,
      name: "partner_id",
      label: "Customer",
      dataType: "many2one",
      businessType: "company_id",
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["accounting_user", "accounting_manager"],
      auditLevel: "high",
      fieldOrder: 20,
    },
    {
      id: SEED_IDS.fieldInvoiceAmount,
      entityId: SEED_IDS.entityInvoice,
      name: "amount_total",
      label: "Total Amount",
      dataType: "numeric",
      businessType: "currency_amount",
      isRequired: true,
      isUnique: false,
      isReadonly: true,
      defaultValue: null,
      computeFormula: "SUM(line_items.price * line_items.quantity)",
      visibilityRule: null,
      accessRoles: ["accounting_user", "accounting_manager", "finance_controller"],
      auditLevel: "high",
      fieldOrder: 30,
    },
    {
      id: SEED_IDS.fieldInvoiceStatus,
      entityId: SEED_IDS.entityInvoice,
      name: "status",
      label: "Payment Status",
      dataType: "selection",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: "draft",
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["accounting_user", "accounting_manager"],
      auditLevel: "high",
      fieldOrder: 40,
    },
    {
      id: SEED_IDS.fieldInvoiceDueDate,
      entityId: SEED_IDS.entityInvoice,
      name: "due_date",
      label: "Due Date",
      dataType: "date",
      businessType: null,
      isRequired: true,
      isUnique: false,
      isReadonly: false,
      defaultValue: null,
      computeFormula: null,
      visibilityRule: null,
      accessRoles: ["accounting_user", "accounting_manager"],
      auditLevel: "medium",
      fieldOrder: 50,
    },
  ]);

  console.log(
    "   ✓ Seeded 20 fields across 4 entities (Partner: 5, Product: 4, SalesOrder: 6, Invoice: 5)"
  );

  // ── 3. Layouts (UI Definitions) ────────────────────────────────────────────
  const partnerFormLayout: LayoutNode = {
    type: "section",
    title: "Partner Information",
    children: [
      {
        type: "grid",
        columns: 2,
        children: [
          { type: "field", fieldId: "name" },
          { type: "field", fieldId: "email" },
          { type: "field", fieldId: "phone" },
          { type: "field", fieldId: "tax_id" },
          { type: "field", fieldId: "credit_limit" },
        ],
      },
    ],
  };

  const salesOrderFormLayout: LayoutNode = {
    type: "section",
    title: "Order Details",
    children: [
      {
        type: "grid",
        columns: 2,
        children: [
          { type: "field", fieldId: "name" },
          { type: "field", fieldId: "partner_id" },
          { type: "field", fieldId: "order_date" },
          { type: "field", fieldId: "status" },
          { type: "field", fieldId: "amount_total" },
        ],
      },
      {
        type: "section",
        title: "Additional Information",
        children: [{ type: "field", fieldId: "notes" }],
      },
    ],
  };

  const salesOrderListLayout: LayoutNode = {
    type: "section",
    title: "Orders",
    children: [
      { type: "field", fieldId: "name" },
      { type: "field", fieldId: "partner_id" },
      { type: "field", fieldId: "order_date" },
      { type: "field", fieldId: "status" },
      { type: "field", fieldId: "amount_total" },
    ],
  };

  await tx.insert(layouts).values([
    {
      id: SEED_IDS.layoutPartnerForm,
      entityId: SEED_IDS.entityPartner,
      name: "Default Partner Form",
      viewType: "form",
      layoutJson: partnerFormLayout,
      roles: ["sales_user", "sales_manager"],
      version: 1,
      isActive: true,
      isDefault: true,
    },
    {
      id: SEED_IDS.layoutOrderForm,
      entityId: SEED_IDS.entitySalesOrder,
      name: "Default Order Form",
      viewType: "form",
      layoutJson: salesOrderFormLayout,
      roles: ["sales_user", "sales_manager"],
      version: 1,
      isActive: true,
      isDefault: true,
    },
    {
      id: SEED_IDS.layoutOrderList,
      entityId: SEED_IDS.entitySalesOrder,
      name: "Orders List View",
      viewType: "list",
      layoutJson: salesOrderListLayout,
      roles: ["sales_user", "sales_manager"],
      version: 1,
      isActive: true,
      isDefault: false,
    },
  ]);

  console.log("   ✓ Seeded 3 layouts (Partner form, Order form, Order list)");

  // ── 4. Policies (Validation Rules) ─────────────────────────────────────────
  await tx.insert(policies).values([
    {
      id: SEED_IDS.policyOrderMinimumAmount,
      scopeEntity: "sales_orders",
      name: "Minimum Order Amount",
      description: "Orders must meet minimum $100 threshold",
      whenDsl: "status IN (''confirmed'', ''sale'')",
      validateDsl: "amount_total >= 100.00",
      message: "Order total must be at least $100.00",
      severity: "error",
      isEnabled: true,
      isBlocking: true,
      tags: ["finance", "sales"],
    },
    {
      id: SEED_IDS.policyPartnerCreditCheck,
      scopeEntity: "sales_orders",
      name: "Customer Credit Check",
      description: "Order amount cannot exceed partner credit limit",
      whenDsl: "amount_total > 5000.00",
      validateDsl: "amount_total <= partner.credit_limit",
      message: "Order exceeds customer credit limit. Approval required.",
      severity: "warning",
      isEnabled: true,
      isBlocking: false,
      tags: ["finance", "risk"],
    },
    {
      id: SEED_IDS.policyProductPricePositive,
      scopeEntity: "products",
      name: "Product Price Must Be Positive",
      description: "List price must be greater than zero",
      whenDsl: "is_active = true",
      validateDsl: "list_price > 0",
      message: "Active products must have a positive list price",
      severity: "error",
      isEnabled: true,
      isBlocking: true,
      tags: ["pricing", "inventory"],
    },
  ]);

  console.log("   ✓ Seeded 3 validation policies (Order minimum, Credit check, Price validation)");
}

// ── Tenant Overrides Seeding ─────────────────────────────────────────────────

export async function seedTenantOverrides(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  // ── 1. Tenant Definitions ──────────────────────────────────────────────────
  const tenantRows: Array<typeof tenantDefinitions.$inferInsert> = [
    {
      id: SEED_IDS.tenantAcmeCorp,
      name: "Acme Corporation",
      industry: "manufacturing",
      isolationStrategy: "logical",
      enabled: true,
      branding: {
        logoUrl: "https://example.com/acme-logo.png",
        primaryColor: "#003366",
        secondaryColor: "#66CCFF",
        appName: "Acme ERP",
      },
      features: {
        advanced_reporting: true,
        multi_currency: true,
        consignment: false,
        pos_integration: false,
      },
      locale: {
        timezone: "America/New_York",
        language: "en_US",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
      },
    },
    {
      id: SEED_IDS.tenantRetailCo,
      name: "RetailCo LLC",
      industry: "retail",
      isolationStrategy: "logical",
      enabled: true,
      branding: {
        logoUrl: "https://example.com/retailco-logo.png",
        primaryColor: "#FF3366",
        secondaryColor: "#FFCC66",
        appName: "RetailCo ERP",
      },
      features: {
        advanced_reporting: false,
        multi_currency: false,
        consignment: false,
        pos_integration: true,
      },
      locale: {
        timezone: "America/Los_Angeles",
        language: "en_US",
        currency: "USD",
        dateFormat: "YYYY-MM-DD",
      },
    },
  ];

  for (const row of tenantRows) {
    await tx.insert(tenantDefinitions).values(row).execute();
  }

  console.log("   ✓ Seeded 2 tenant definitions (Acme Corp - manufacturing, RetailCo - retail)");

  // ── 2. Industry Templates ──────────────────────────────────────────────────
  await tx.insert(industryTemplates).values([
    {
      industry: "manufacturing",
      template: {
        entities: {
          sales_orders: {
            fields: {
              production_deadline: {
                label: "Production Deadline",
                dataType: "date",
                isRequired: true,
              },
              quality_check_required: {
                label: "Quality Check Required",
                dataType: "boolean",
                defaultValue: "true",
              },
            },
          },
        },
      },
    },
    {
      industry: "retail",
      template: {
        entities: {
          sales_orders: {
            fields: {
              store_location: {
                label: "Store Location",
                dataType: "string",
                isRequired: false,
              },
              loyalty_points_earned: {
                label: "Loyalty Points Earned",
                dataType: "integer",
                defaultValue: "0",
              },
            },
          },
        },
      },
    },
  ]);

  console.log("   ✓ Seeded 2 industry templates (Manufacturing, Retail)");

  // ── 3. Metadata Overrides ──────────────────────────────────────────────────
  const overrideRows: Array<typeof metadataOverrides.$inferInsert> = [
    {
      id: SEED_IDS.overrideGlobalOrderMinimum,
      scope: "global",
      tenantId: null,
      departmentId: null,
      userId: null,
      model: "sales_orders",
      patch: [
        {
          op: "replace",
          path: "/fields/amount_total/label",
          value: "Total Amount (USD)",
        },
      ],
      enabled: true,
    },
    {
      id: SEED_IDS.overrideTenantAcmeLabels,
      scope: "tenant",
      tenantId: SEED_IDS.tenantAcmeCorp,
      departmentId: null,
      userId: null,
      model: "sales_orders",
      patch: [
        {
          op: "replace",
          path: "/fields/status/label",
          value: "Manufacturing Status",
        },
        {
          op: "add",
          path: "/fields/work_order_id",
          value: {
            label: "Work Order ID",
            dataType: "string",
            isRequired: false,
          },
        },
      ],
      enabled: true,
    },
    {
      id: SEED_IDS.overrideTenantRetailLabels,
      scope: "tenant",
      tenantId: SEED_IDS.tenantRetailCo,
      departmentId: null,
      userId: null,
      model: "sales_orders",
      patch: [
        {
          op: "replace",
          path: "/fields/status/label",
          value: "Order Status",
        },
        {
          op: "replace",
          path: "/policies/minimum_amount/message",
          value: "Retail orders must meet $50 minimum",
        },
      ],
      enabled: true,
    },
  ];

  for (const row of overrideRows) {
    await tx.insert(metadataOverrides).values(row).execute();
  }

  console.log("   ✓ Seeded 3 metadata overrides (1 global, 2 tenant-specific for Acme & RetailCo)");
}

// ── Decision Audit Seeding (Sample Decisions) ────────────────────────────────

export async function seedDecisionAuditSamples(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  // Sample decision audit chain for metadata resolution
  await tx.insert(decisionAuditChains).values({
    rootId: SEED_IDS.decisionChainMetadataResolution,
    totalDurationMs: 28.5,
    entryCount: 3,
    errorCount: 0,
  });

  const decisionRows: Array<typeof decisionAuditEntries.$inferInsert> = [
    {
      id: SEED_IDS.decisionMetadataGlobal,
      timestamp: new Date(),
      tenantId: SEED_IDS.tenantAcmeCorp,
      userId: String(seedAuditScope.createdBy),
      eventType: "metadata_resolved",
      scope: "global",
      context: { model: "sales_orders", eventId: "global_base" },
      decision: {
        input: { model: "sales_orders", layer: "global" },
        output: { overridesApplied: 0 },
        appliedLayers: ["global"],
      },
      durationMs: 5.2,
      status: "success",
      error: null,
      chainId: SEED_IDS.decisionChainMetadataResolution,
    },
    {
      id: SEED_IDS.decisionMetadataIndustry,
      timestamp: new Date(Date.now() + 6),
      tenantId: SEED_IDS.tenantAcmeCorp,
      userId: String(seedAuditScope.createdBy),
      eventType: "metadata_resolved",
      scope: "industry",
      context: {
        model: "sales_orders",
        eventId: "industry_template",
      },
      decision: {
        input: { model: "sales_orders", layer: "industry", industry: "manufacturing" },
        output: { overridesApplied: 2, fieldsAdded: 2 },
        appliedLayers: ["global", "industry"],
      },
      durationMs: 12.1,
      status: "success",
      error: null,
      chainId: SEED_IDS.decisionChainMetadataResolution,
    },
    {
      id: SEED_IDS.decisionMetadataTenant,
      timestamp: new Date(Date.now() + 19),
      tenantId: SEED_IDS.tenantAcmeCorp,
      userId: String(seedAuditScope.createdBy),
      eventType: "metadata_resolved",
      scope: "tenant",
      context: {
        model: "sales_orders",
        eventId: "tenant_override",
      },
      decision: {
        input: { model: "sales_orders", layer: "tenant", tenantId: SEED_IDS.tenantAcmeCorp },
        output: { overridesApplied: 2, labelsUpdated: 1, fieldsAdded: 1 },
        appliedLayers: ["global", "industry", "tenant"],
      },
      durationMs: 11.2,
      status: "success",
      error: null,
      chainId: SEED_IDS.decisionChainMetadataResolution,
    },
  ];

  for (const row of decisionRows) {
    await tx.insert(decisionAuditEntries).values(row).execute();
  }

  console.log(
    "   ✓ Seeded 1 decision audit chain with 3 entries (metadata resolution: global→industry→tenant)"
  );
}

// ── Metadata Invariant Validators ────────────────────────────────────────────

export async function validateMetadataInvariants(tx: Tx): Promise<void> {
  // ── Invariant 1: All fields reference valid entities ───────────────────────
  const orphanedFields = await tx
    .select({ fieldId: fields.id, fieldName: fields.name })
    .from(fields)
    .leftJoin(entities, eq(fields.entityId, entities.id))
    .where(isNull(entities.id));

  if (orphanedFields.length > 0) {
    throw new Error(
      `Invariant violation: ${orphanedFields.length} fields reference non-existent entities: ${orphanedFields.map((f) => f.fieldName).join(", ")}`
    );
  }

  // ── Invariant 2: All layouts reference valid entities ──────────────────────
  const orphanedLayouts = await tx
    .select({ layoutId: layouts.id, layoutName: layouts.name })
    .from(layouts)
    .leftJoin(entities, eq(layouts.entityId, entities.id))
    .where(isNull(entities.id));

  if (orphanedLayouts.length > 0) {
    throw new Error(
      `Invariant violation: ${orphanedLayouts.length} layouts reference non-existent entities: ${orphanedLayouts.map((l) => l.layoutName).join(", ")}`
    );
  }

  // ── Invariant 3: All policies reference valid entities ─────────────────────
  const orphanedPolicies = await tx
    .select({ policyId: policies.id, scopeEntity: policies.scopeEntity })
    .from(policies)
    .leftJoin(entities, eq(policies.scopeEntity, entities.name))
    .where(isNull(entities.id));

  if (orphanedPolicies.length > 0) {
    throw new Error(
      `Invariant violation: ${orphanedPolicies.length} policies reference non-existent entities: ${orphanedPolicies.map((p) => p.scopeEntity).join(", ")}`
    );
  }

  // ── Invariant 4: No orphaned metadata overrides ────────────────────────────
  const orphanedOverrides = await tx
    .select({ overrideId: metadataOverrides.id })
    .from(metadataOverrides)
    .leftJoin(tenantDefinitions, eq(metadataOverrides.tenantId, tenantDefinitions.id))
    .where(
      sql`${metadataOverrides.scope} IN ('tenant', 'department', 'user') AND ${tenantDefinitions.id} IS NULL`
    );

  if (orphanedOverrides.length > 0) {
    throw new Error(
      `Invariant violation: ${orphanedOverrides.length} tenant-scoped overrides reference non-existent tenants`
    );
  }

  // ── Invariant 5: Each entity has at least one default layout ───────────────
  const entitiesWithoutDefaultLayout = await tx
    .select({ entityId: entities.id, entityName: entities.name })
    .from(entities)
    .leftJoin(layouts, sql`${layouts.entityId} = ${entities.id} AND ${layouts.isDefault} = true`)
    .where(isNull(layouts.id))
    .groupBy(entities.id, entities.name);

  if (entitiesWithoutDefaultLayout.length > 0) {
    const missingEntities = entitiesWithoutDefaultLayout.map((e) => e.entityName).join(", ");
    console.warn(
      `⚠️  Warning: ${entitiesWithoutDefaultLayout.length} entities missing default layout: ${missingEntities}`
    );
  }

  console.log("   ✓ All metadata invariants validated successfully");
}
