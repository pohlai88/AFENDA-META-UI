export {
	dateCoerceSchema,
	dateNullableOptionalSchema,
	dateOptionalSchema,
	dateStringSchema,
	dateValue,
	isoDateWireString,
	isParseableTimestamptzString,
	nullableOptional,
	parseUnknownToEpochMs,
	timestamptzNullableOptionalSchema,
	timestamptzOptionalSchema,
	timestamptzStringSchema,
	timestamptzWireNullableOptionalSchema,
	timestamptzWireSchema,
} from "./zodWire.js";
export {
	appendOnlyTimestampColumns,
	softDeleteColumns,
	timestampColumns,
	TIMESTAMP_FINGERPRINTS,
} from "./timestamps.js";
export { auditColumns, AUDIT_FINGERPRINTS } from "./auditColumns.js";
export { nameColumn, NAME_FINGERPRINTS } from "./nameColumns.js";

export const ALL_SHARED_FINGERPRINTS = {
	createdAt: "timestamp:withTimezone:notNull:defaultNow",
	updatedAt: "timestamp:withTimezone:notNull:defaultNow",
	deletedAt: "timestamp:withTimezone:nullable",
	createdBy: "integer:notNull",
	updatedBy: "integer:notNull",
} as const;

export const MANDATORY_SHARED_COLUMNS = ["createdAt", "updatedAt"] as const;

export const RECOMMENDED_SHARED_COLUMNS = ["deletedAt", "createdBy", "updatedBy"] as const;
