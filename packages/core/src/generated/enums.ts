// AUTO-GENERATED FILE. DO NOT EDIT.
// enums.ts

export const authorityStatusEnum = ["authoritative", "blocked"] as const;
export type AuthorityStatus = (typeof authorityStatusEnum)[number];

export const invariantSeverityEnum = ["critical", "warning"] as const;
export type InvariantSeverity = (typeof invariantSeverityEnum)[number];

export const invariantTimingEnum = ["pre-commit", "post-commit"] as const;
export type InvariantTiming = (typeof invariantTimingEnum)[number];

export const documentFlowStageEnum = ["sales_order", "inventory_reservation", "journal_posting"] as const;
export type DocumentFlowStage = (typeof documentFlowStageEnum)[number];
