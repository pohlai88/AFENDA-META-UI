import { z } from "zod/v4";

import type { PartnerEventAccountingImpact, PartnerEventType } from "./_enums.js";
import { PartnerEventAccountingImpactSchema, PartnerEventTypeSchema } from "./_enums.js";

const emptyMetadataSchema = z.object({}).strict();

const creditLimitMetadataSchema = z
  .object({
    previousLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    newLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    reason: z.string().max(2000).optional(),
  })
  .strict();

const documentRefMetadataSchema = z
  .object({
    documentType: z.string().max(64).optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();

const paymentMetadataSchema = z
  .object({
    paymentInstrument: z.enum(["bank", "card", "cash", "other"]).optional(),
    bankReference: z.string().max(120).optional(),
  })
  .strict();

const reconciliationMetadataSchema = z
  .object({
    reason: z.string().max(2000).optional(),
    sourceSystem: z.string().max(120).optional(),
  })
  .strict();

const externalSyncMetadataSchema = z
  .object({
    externalId: z.string().max(200).optional(),
    payloadHash: z.string().max(128).optional(),
  })
  .strict();

/** Zod schemas for `partner_events.metadata` keyed by `event_type`. */
export const partnerEventMetadataByType: Record<PartnerEventType, z.ZodType<Record<string, unknown>>> = {
  partner_created: emptyMetadataSchema,
  partner_activated: emptyMetadataSchema,
  partner_deactivated: z
    .object({ reason: z.string().max(2000).optional() })
    .strict(),
  partner_blocked: z
    .object({ reason: z.string().max(2000).optional() })
    .strict(),
  partner_unblocked: emptyMetadataSchema,
  credit_limit_changed: creditLimitMetadataSchema,
  invoice_posted: documentRefMetadataSchema,
  invoice_voided: documentRefMetadataSchema,
  payment_received: paymentMetadataSchema,
  payment_applied: paymentMetadataSchema,
  credit_note_posted: documentRefMetadataSchema,
  refund_posted: paymentMetadataSchema,
  reconciliation_adjustment: reconciliationMetadataSchema,
  external_sync: externalSyncMetadataSchema,
};

/** Default accounting impact when writers omit it (DB still stores explicit value). */
export const defaultAccountingImpactByEventType: Record<PartnerEventType, PartnerEventAccountingImpact> = {
  partner_created: "none",
  partner_activated: "none",
  partner_deactivated: "none",
  partner_blocked: "none",
  partner_unblocked: "none",
  credit_limit_changed: "none",
  invoice_posted: "increase_receivable",
  invoice_voided: "decrease_receivable",
  payment_received: "decrease_receivable",
  payment_applied: "decrease_receivable",
  credit_note_posted: "decrease_receivable",
  refund_posted: "increase_receivable",
  reconciliation_adjustment: "increase_receivable",
  external_sync: "none",
};

export type PartnerEventInvariantIssue = {
  code: string;
  message: string;
  path?: string;
};

export type PartnerEventValidationResult =
  | { ok: true; eventType: PartnerEventType; metadata: Record<string, unknown> }
  | { ok: false; issues: PartnerEventInvariantIssue[] };

/** Parse and validate metadata JSON for a known event type. */
export function parsePartnerEventMetadata(
  eventType: PartnerEventType,
  metadata: Record<string, unknown> | null | undefined
): { ok: true; value: Record<string, unknown> } | { ok: false; issues: PartnerEventInvariantIssue[] } {
  const schema = partnerEventMetadataByType[eventType];
  const parsed = schema.safeParse(metadata ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        code: i.code,
        message: i.message,
        path: i.path.join("."),
      })),
    };
  }
  return { ok: true, value: parsed.data as Record<string, unknown> };
}

export type PartnerEventInvariantInput = {
  eventType: PartnerEventType;
  eventSchemaVersion: number;
  accountingImpact: PartnerEventAccountingImpact;
  truthBindingId: string | null | undefined;
  refId: string | null | undefined;
  amount: string | null | undefined;
  currencyId: number | null | undefined;
  metadata: Record<string, unknown> | null | undefined;
};

/**
 * Application-layer invariants on top of Postgres CHECKs: idempotency hints, truth/ref pairing, schema version.
 */
export function validatePartnerEventInvariants(row: PartnerEventInvariantInput): PartnerEventValidationResult {
  const issues: PartnerEventInvariantIssue[] = [];

  if (row.eventSchemaVersion < 1) {
    issues.push({ code: "schema_version", message: "eventSchemaVersion must be >= 1" });
  }

  const meta = parsePartnerEventMetadata(row.eventType, row.metadata);
  if (!meta.ok) {
    issues.push(...meta.issues.map((i) => ({ ...i, path: `metadata.${i.path ?? ""}` })));
  }

  const expectedImpact = defaultAccountingImpactByEventType[row.eventType];
  const flexibleImpact: PartnerEventType[] = ["reconciliation_adjustment", "external_sync"];
  if (!flexibleImpact.includes(row.eventType) && row.accountingImpact !== expectedImpact) {
    issues.push({
      code: "accounting_impact_mismatch",
      message: `eventType ${row.eventType} expects accountingImpact ${expectedImpact}, got ${row.accountingImpact}`,
      path: "accountingImpact",
    });
  }

  const needsRef = [
    "invoice_posted",
    "invoice_voided",
    "payment_received",
    "payment_applied",
    "credit_note_posted",
    "refund_posted",
    "external_sync",
  ] as const satisfies readonly PartnerEventType[];
  if ((needsRef as readonly string[]).includes(row.eventType) && !row.refId) {
    issues.push({
      code: "ref_id_required",
      message: `eventType ${row.eventType} requires refId for idempotency`,
      path: "refId",
    });
  }

  const needsTruth = ["invoice_posted", "invoice_voided", "credit_note_posted"] as const;
  if ((needsTruth as readonly string[]).includes(row.eventType) && !row.truthBindingId) {
    issues.push({
      code: "truth_binding_required",
      message: `eventType ${row.eventType} requires truthBindingId`,
      path: "truthBindingId",
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    eventType: row.eventType,
    metadata: meta.ok ? meta.value : {},
  };
}

export const PartnerEventRowShapeSchema = z.object({
  eventType: PartnerEventTypeSchema,
  eventSchemaVersion: z.number().int().min(1),
  accountingImpact: PartnerEventAccountingImpactSchema,
  truthBindingId: z.uuid().optional().nullable(),
  refId: z.uuid().optional().nullable(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
