export type RetentionAction = {
  id: string;
  description: string;
  statement: string;
};

export type SalesRetentionPlan = {
  generatedAt: string;
  tenantId: number;
  actorId: number;
  cutoffs: {
    salesOrdersBefore: string;
    approvalLogsBefore: string;
    attachmentsBefore: string;
  };
  actions: RetentionAction[];
};

export type SalesRetentionPlanOptions = {
  tenantId: number;
  actorId: number;
  now?: Date;
  legalOrderRetentionYears?: number;
  approvalLogRetentionYears?: number;
  attachmentRetentionYears?: number;
};

function subtractYears(from: Date, years: number): Date {
  const next = new Date(from);
  next.setUTCFullYear(next.getUTCFullYear() - years);
  return next;
}

function quoteTimestamp(date: Date): string {
  return `'${date.toISOString()}'::timestamptz`;
}

export function buildSalesRetentionPlan(options: SalesRetentionPlanOptions): SalesRetentionPlan {
  const now = options.now ?? new Date();
  const legalOrderRetentionYears = options.legalOrderRetentionYears ?? 7;
  const approvalLogRetentionYears = options.approvalLogRetentionYears ?? 7;
  const attachmentRetentionYears = options.attachmentRetentionYears ?? 2;

  const orderCutoff = subtractYears(now, legalOrderRetentionYears);
  const approvalCutoff = subtractYears(now, approvalLogRetentionYears);
  const attachmentCutoff = subtractYears(now, attachmentRetentionYears);

  const orderCutoffSql = quoteTimestamp(orderCutoff);
  const approvalCutoffSql = quoteTimestamp(approvalCutoff);
  const attachmentCutoffSql = quoteTimestamp(attachmentCutoff);

  const tenant = options.tenantId;
  const actor = options.actorId;

  const actions: RetentionAction[] = [
    {
      id: "ensure-archive-schema",
      description: "Ensure archive schema exists before archival copy operations.",
      statement: "CREATE SCHEMA IF NOT EXISTS archive;",
    },
    {
      id: "ensure-archive-sales-orders",
      description: "Ensure archive.sales_orders structure exists for long-term legal retention.",
      statement:
        "CREATE TABLE IF NOT EXISTS archive.sales_orders (LIKE sales.sales_orders INCLUDING ALL);",
    },
    {
      id: "archive-aged-sales-orders",
      description:
        "Copy tenant sales orders older than retention cutoff into archive before soft deletion.",
      statement: `
INSERT INTO archive.sales_orders
SELECT s.*
FROM sales.sales_orders AS s
WHERE s.tenant_id = ${tenant}
  AND s.order_date < ${orderCutoffSql}
  AND s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM archive.sales_orders AS a
    WHERE a.id = s.id
  );`.trim(),
    },
    {
      id: "soft-delete-aged-sales-orders",
      description:
        "Soft-delete aged sales orders in primary table after archival copy to keep OLTP tables lean.",
      statement: `
UPDATE sales.sales_orders
SET deleted_at = now(),
    updated_at = now(),
    updated_by = ${actor}
WHERE tenant_id = ${tenant}
  AND order_date < ${orderCutoffSql}
  AND deleted_at IS NULL;`.trim(),
    },
    {
      id: "purge-aged-approval-logs",
      description: "Purge approval logs older than retention cutoff.",
      statement: `
DELETE FROM reference.approval_logs
WHERE tenant_id = ${tenant}
  AND created_at < ${approvalCutoffSql};`.trim(),
    },
    {
      id: "purge-aged-document-attachments",
      description:
        "Purge document attachment metadata older than retention cutoff. Coordinate with object-store deletion workflow.",
      statement: `
DELETE FROM reference.document_attachments
WHERE tenant_id = ${tenant}
  AND created_at < ${attachmentCutoffSql};`.trim(),
    },
  ];

  return {
    generatedAt: now.toISOString(),
    tenantId: tenant,
    actorId: actor,
    cutoffs: {
      salesOrdersBefore: orderCutoff.toISOString(),
      approvalLogsBefore: approvalCutoff.toISOString(),
      attachmentsBefore: attachmentCutoff.toISOString(),
    },
    actions,
  };
}
