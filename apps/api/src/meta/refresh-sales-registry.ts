#!/usr/bin/env node

import { getTableColumns } from "drizzle-orm";

import type { MetaAction, MetaField, ModelMeta } from "@afenda/meta-types/schema";
import {
  commissionEntries,
  commissionPlans,
  commissionPlanTiers,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  returnOrderLines,
  returnOrders,
  returnReasonCodes,
  salesOrders,
  salesOrderLines,
  salesTeamMembers,
  salesTeams,
  subscriptionLines,
  subscriptions,
  territories,
  territoryRules,
} from "../db/schema/index.js";
import { upsertSchema } from "./registry.js";
import { logger } from '../logging/logger.js';

const SALES_MODELS: Record<string, unknown> = {
  sales_order: salesOrders,
  sales_order_line: salesOrderLines,
  commission_plan: commissionPlans,
  commission_plan_tier: commissionPlanTiers,
  commission_entry: commissionEntries,
  sales_team: salesTeams,
  sales_team_member: salesTeamMembers,
  territory: territories,
  territory_rule: territoryRules,
  return_reason_code: returnReasonCodes,
  return_order: returnOrders,
  return_order_line: returnOrderLines,
  consignment_agreement: consignmentAgreements,
  consignment_agreement_line: consignmentAgreementLines,
  consignment_stock_report: consignmentStockReports,
  consignment_stock_report_line: consignmentStockReportLines,
  subscription: subscriptions,
  subscription_line: subscriptionLines,
};

async function main() {
  let refreshed = 0;

  for (const [model, table] of Object.entries(SALES_MODELS)) {
    const fields = compileFields(table);

    const meta: ModelMeta = {
      model,
      label: humanize(model),
      label_plural: `${humanize(model)}s`,
      fields,
      views: {
        form: {
          type: "form",
          groups: [
            {
              name: "general",
              label: "General Information",
              columns: 2,
              fields: fields
                .map((field) => field.name)
                .filter((name) => name !== "deletedAt" && name !== "deleted_at"),
            },
          ],
        },
        list: {
          type: "list",
          columns: fields
            .map((field) => field.name)
            .filter((name) => !name.endsWith("Json") && name !== "deletedAt" && name !== "deleted_at")
            .slice(0, 10),
          default_order: [{ field: "id", direction: "desc" }],
          create_inline: false,
        },
      },
      actions:
        model === "sales_order"
          ? salesOrderActions()
          : model === "consignment_stock_report"
            ? consignmentStockReportActions()
            : model === "consignment_agreement"
              ? consignmentAgreementActions()
              : [],
      permissions: {
        default_role_permissions: {
          admin: { can_create: true, can_read: true, can_update: true, can_delete: true },
          user: { can_create: true, can_read: true, can_update: true, can_delete: false },
          viewer: { can_create: false, can_read: true, can_update: false, can_delete: false },
        },
      },
      module: "sales",
      updated_at: new Date().toISOString(),
    };

    await upsertSchema(model, meta);
    refreshed += 1;
    logger.info({ model }, 'Refreshed schema metadata');
  }

  logger.info({ refreshed }, 'Refreshed sales model metadata entries');
}

function compileFields(table: unknown): MetaField[] {
  const columns = getTableColumns(table as Parameters<typeof getTableColumns>[0]);

  return Object.keys(columns).map((name) => {
    const lower = name.toLowerCase();
    const isRelation = lower.endsWith("id") && lower !== "id";

    return {
      name,
      label: humanize(name),
      type: inferType(name),
      required: !(name === "id" || name.startsWith("created") || name.startsWith("updated")),
      readonly: name === "id" || name === "createdAt" || name === "updatedAt",
      sortable: true,
      filterable: true,
      relation: isRelation
        ? {
            model: name.replace(/Id$/u, "").replace(/_id$/u, ""),
            display_field: "name",
            value_field: "id",
          }
        : undefined,
    } as MetaField;
  });
}

function inferType(name: string): MetaField["type"] {
  if (name === "id" || name.endsWith("Id") || name.endsWith("_id")) return "many2one";
  if (name.startsWith("is") || name.startsWith("has")) return "boolean";
  if (name.endsWith("Date") || name.endsWith("_date") || name.endsWith("At")) return "datetime";
  if (name.includes("amount") || name.includes("price") || name.includes("cost") || name.includes("margin") || name.includes("total")) {
    return "currency";
  }
  if (name.includes("qty") || name.includes("quantity") || name.includes("rate") || name.includes("percent")) {
    return "decimal";
  }
  if (name === "tenantId" || name === "createdBy" || name === "updatedBy" || name === "sequence") {
    return "integer";
  }
  return "string";
}

function salesOrderActions(): MetaAction[] {
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

function consignmentStockReportActions(): MetaAction[] {
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

function consignmentAgreementActions(): MetaAction[] {
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

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/u, (char) => char.toUpperCase());
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to refresh sales registry');
  process.exit(1);
});