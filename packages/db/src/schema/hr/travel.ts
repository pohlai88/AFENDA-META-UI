// ============================================================================
// HR DOMAIN: TRAVEL & VEHICLE MANAGEMENT (Upgrade Module)
// Handles travel requests, itineraries, vehicle logs, and expense interoperability.
// Tables: travel_requests, travel_itineraries, company_vehicles, vehicle_logs
//
// `distance_traveled` is a STORED generated column (end − start odometer).
// Zod reuses `_enums` schemas so labels stay aligned with PostgreSQL enums.
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  date,
  uuid,
  uniqueIndex,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../infra-utils/rls/index.js";
import {
  auditColumns,
  softDeleteColumns,
  timestampColumns,
} from "../../infra-utils/columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  travelRequestStatusEnum,
  travelSegmentTypeEnum,
  vehicleStatusEnum,
  fuelTypeEnum,
  TravelRequestStatusSchema,
  TravelSegmentTypeSchema,
  VehicleStatusSchema,
  FuelTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { expenseClaims } from "./expenses.js";
import { staffingPlans } from "./workforcePlanning.js";
import { z } from "zod/v4";
import {
  TravelRequestIdSchema,
  TravelItineraryIdSchema,
  CompanyVehicleIdSchema,
  VehicleLogIdSchema,
  EmployeeIdSchema,
  ExpenseClaimIdSchema,
  StaffingPlanIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
} from "./_zodShared.js";

// ============================================================================
// TRAVEL REQUESTS - Employee travel requests
// ============================================================================

export const travelRequests = hrSchema.table(
  "travel_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestNumber: text("request_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    travelPurpose: text("travel_purpose").notNull(),
    destination: text("destination").notNull(),
    departureDate: date("departure_date", { mode: "string" }).notNull(),
    returnDate: date("return_date", { mode: "string" }).notNull(),
    estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    advanceRequired: boolean("advance_required").notNull().default(false),
    advanceAmount: numeric("advance_amount", { precision: 15, scale: 2 }),
    status: travelRequestStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    /** Optional link to a reimbursement claim once travel is expensed. */
    expenseClaimId: uuid("expense_claim_id"),
    /** Optional link to departmental workforce / travel budget context. */
    staffingPlanId: uuid("staffing_plan_id"),
    requestVersion: integer("request_version").notNull().default(1),
    /** Set when status is `cancelled` (audit trail). */
    cancelledDate: date("cancelled_date", { mode: "string" }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    foreignKey({
      columns: [table.tenantId, table.expenseClaimId],
      foreignColumns: [expenseClaims.tenantId, expenseClaims.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.staffingPlanId],
      foreignColumns: [staffingPlans.tenantId, staffingPlans.id],
    }),
    uniqueIndex("travel_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("travel_requests_tenant_idx").on(table.tenantId),
    index("travel_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("travel_requests_status_idx").on(table.tenantId, table.status),
    index("travel_requests_tenant_status_version_idx").on(
      table.tenantId,
      table.status,
      table.requestVersion
    ),
    index("travel_requests_departure_date_idx").on(table.tenantId, table.departureDate),
    index("travel_requests_date_range_idx").on(
      table.tenantId,
      table.departureDate,
      table.returnDate
    ),
    check("travel_requests_date_range", sql`${table.returnDate} >= ${table.departureDate}`),
    check(
      "travel_requests_approval_fields_match_status",
      sql`(
        (${table.status} = 'approved'::hr.travel_request_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)
        OR
        (${table.status} <> 'approved'::hr.travel_request_status AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)
      )`
    ),
    check(
      "travel_requests_advance_only_when_required",
      sql`${table.advanceAmount} IS NULL OR ${table.advanceRequired} = true`
    ),
    check(
      "travel_requests_currency_when_estimated_cost",
      sql`${table.estimatedCost} IS NULL OR ${table.currencyId} IS NOT NULL`
    ),
    check(
      "travel_requests_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "travel_requests_expense_claim_only_when_completed",
      sql`${table.expenseClaimId} IS NULL OR ${table.status} = 'completed'::hr.travel_request_status`
    ),
    check(
      "travel_requests_cancelled_date_matches_status",
      sql`(
        (${table.cancelledDate} IS NULL OR ${table.status} = 'cancelled'::hr.travel_request_status)
        AND
        (${table.status} <> 'cancelled'::hr.travel_request_status OR ${table.cancelledDate} IS NOT NULL)
      )`
    ),
    ...tenantIsolationPolicies("travel_requests"),
    serviceBypassPolicy("travel_requests"),
  ]
);

// ============================================================================
// TRAVEL ITINERARIES - Travel segments
// ============================================================================

export const travelItineraries = hrSchema.table(
  "travel_itineraries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    travelRequestId: uuid("travel_request_id").notNull(),
    segmentType: travelSegmentTypeEnum("segment_type").notNull(),
    fromLocation: text("from_location").notNull(),
    toLocation: text("to_location").notNull(),
    departureDateTime: timestamp("departure_date_time").notNull(),
    arrivalDateTime: timestamp("arrival_date_time"),
    bookingReference: text("booking_reference"),
    cost: numeric("cost", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.travelRequestId],
      foreignColumns: [travelRequests.tenantId, travelRequests.id],
      name: "travel_itineraries_travel_request_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    index("travel_itineraries_tenant_idx").on(table.tenantId),
    index("travel_itineraries_request_idx").on(table.tenantId, table.travelRequestId),
    index("travel_itineraries_request_sort_idx").on(
      table.tenantId,
      table.travelRequestId,
      table.sortOrder
    ),
    index("travel_itineraries_departure_idx").on(table.tenantId, table.departureDateTime),
    check(
      "travel_itineraries_currency_when_cost",
      sql`${table.cost} IS NULL OR ${table.currencyId} IS NOT NULL`
    ),
    check(
      "travel_itineraries_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    ...tenantIsolationPolicies("travel_itineraries"),
    serviceBypassPolicy("travel_itineraries"),
  ]
);

// ============================================================================
// COMPANY VEHICLES - Company vehicle registry
// ============================================================================

export const companyVehicles = hrSchema.table(
  "company_vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    vehicleCode: text("vehicle_code").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    registrationNumber: text("registration_number").notNull(),
    purchaseDate: date("purchase_date", { mode: "string" }),
    assignedEmployeeId: uuid("assigned_employee_id"), // Current assignment
    fuelType: fuelTypeEnum("fuel_type").notNull(),
    mileage: integer("mileage").notNull().default(0),
    insuranceExpiry: date("insurance_expiry", { mode: "string" }),
    lastServiceDate: date("last_service_date", { mode: "string" }),
    nextServiceDate: date("next_service_date", { mode: "string" }),
    status: vehicleStatusEnum("status").notNull().default("available"),
    retirementDate: date("retirement_date", { mode: "string" }),
    disposedDate: date("disposed_date", { mode: "string" }),
    vehicleVersion: integer("vehicle_version").notNull().default(1),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.assignedEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("company_vehicles_tenant_code_unique")
      .on(table.tenantId, table.vehicleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("company_vehicles_tenant_registration_unique")
      .on(table.tenantId, table.registrationNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("company_vehicles_tenant_idx").on(table.tenantId),
    index("company_vehicles_status_idx").on(table.tenantId, table.status),
    index("company_vehicles_tenant_status_version_idx").on(
      table.tenantId,
      table.status,
      table.vehicleVersion
    ),
    index("company_vehicles_assigned_idx").on(table.tenantId, table.assignedEmployeeId),
    sql`CONSTRAINT company_vehicles_mileage_non_negative CHECK (mileage >= 0)`,
    check(
      "company_vehicles_lifecycle_dates_match_status",
      sql`(
        (
          ${table.status} IN (
            'available'::hr.vehicle_status,
            'assigned'::hr.vehicle_status,
            'maintenance'::hr.vehicle_status
          )
          AND ${table.retirementDate} IS NULL
          AND ${table.disposedDate} IS NULL
        )
        OR
        (
          ${table.status} = 'retired'::hr.vehicle_status
          AND ${table.retirementDate} IS NOT NULL
          AND ${table.disposedDate} IS NULL
        )
        OR
        (
          ${table.status} = 'disposed'::hr.vehicle_status
          AND ${table.disposedDate} IS NOT NULL
        )
      )`
    ),
    check(
      "company_vehicles_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    ...tenantIsolationPolicies("company_vehicles"),
    serviceBypassPolicy("company_vehicles"),
  ]
);

// ============================================================================
// VEHICLE LOGS - Vehicle usage logs
// ============================================================================

export const vehicleLogs = hrSchema.table(
  "vehicle_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    vehicleId: uuid("vehicle_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    tripDate: date("trip_date", { mode: "string" }).notNull(),
    purpose: text("purpose").notNull(),
    startOdometer: integer("start_odometer").notNull(),
    endOdometer: integer("end_odometer").notNull(),
    distanceTraveled: integer("distance_traveled")
      .generatedAlwaysAs(sql`(end_odometer - start_odometer)`)
      .notNull(),
    fuelConsumed: numeric("fuel_consumed", { precision: 10, scale: 2 }),
    fuelCost: numeric("fuel_cost", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    expenseClaimId: uuid("expense_claim_id"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.vehicleId],
      foreignColumns: [companyVehicles.tenantId, companyVehicles.id],
      name: "vehicle_logs_vehicle_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    foreignKey({
      columns: [table.tenantId, table.expenseClaimId],
      foreignColumns: [expenseClaims.tenantId, expenseClaims.id],
    }),
    index("vehicle_logs_tenant_idx").on(table.tenantId),
    index("vehicle_logs_vehicle_idx").on(table.tenantId, table.vehicleId),
    index("vehicle_logs_employee_idx").on(table.tenantId, table.employeeId),
    index("vehicle_logs_date_idx").on(table.tenantId, table.tripDate),
    check("vehicle_logs_odometer_valid", sql`${table.endOdometer} >= ${table.startOdometer}`),
    check(
      "vehicle_logs_currency_when_fuel_cost",
      sql`${table.fuelCost} IS NULL OR ${table.currencyId} IS NOT NULL`
    ),
    check(
      "vehicle_logs_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    ...tenantIsolationPolicies("vehicle_logs"),
    serviceBypassPolicy("vehicle_logs"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

/** Aligns with `numeric(10, 2)`; inserts as a number for Drizzle/pg numeric. */
const optionalFuelConsumedLitersSchema = z
  .number()
  .nonnegative()
  .max(99_999_999.99)
  .refine((n) => {
    const scaled = n * 100;
    return Math.abs(scaled - Math.round(scaled)) < 1e-9;
  }, "At most 2 decimal places")
  .optional()
  .transform((n) => (n === undefined ? undefined : Math.round(n * 100) / 100));

export const insertTravelRequestSchema = z
  .object({
    id: TravelRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    travelPurpose: z.string().min(10).max(500),
    destination: z.string().min(2).max(200),
    departureDate: z.iso.date(),
    returnDate: z.iso.date(),
    estimatedCost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    advanceRequired: z.boolean().default(false),
    advanceAmount: currencyAmountSchema(2).optional(),
    status: TravelRequestStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.datetime().optional(),
    expenseClaimId: ExpenseClaimIdSchema.optional(),
    staffingPlanId: StaffingPlanIdSchema.optional(),
    requestVersion: z.number().int().min(1).default(1),
    cancelledDate: z.iso.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.departureDate && data.returnDate && data.departureDate > data.returnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure date cannot be after return date",
        path: ["departureDate"],
      });
    }
    if (data.estimatedCost != null && data.currencyId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currencyId is required when estimatedCost is set",
        path: ["currencyId"],
      });
    }
    if (data.advanceRequired && data.advanceAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advance amount is required when advance is requested",
        path: ["advanceAmount"],
      });
    }
    if (!data.advanceRequired && data.advanceAmount != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "advanceAmount is only allowed when advanceRequired is true",
        path: ["advanceAmount"],
      });
    }
    if (data.status === "cancelled") {
      if (data.cancelledDate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cancelledDate is required when status is cancelled",
          path: ["cancelledDate"],
        });
      }
    } else if (data.cancelledDate != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cancelledDate must be omitted unless status is cancelled",
        path: ["cancelledDate"],
      });
    }
    if (data.expenseClaimId != null && data.status !== "completed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expenseClaimId is only allowed when status is completed",
        path: ["expenseClaimId"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

export const insertTravelItinerarySchema = z
  .object({
    id: TravelItineraryIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    travelRequestId: TravelRequestIdSchema,
    segmentType: TravelSegmentTypeSchema,
    fromLocation: z.string().min(2).max(200),
    toLocation: z.string().min(2).max(200),
    departureDateTime: z.iso.datetime(),
    arrivalDateTime: z.iso.datetime().optional(),
    bookingReference: z.string().max(100).optional(),
    cost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    sortOrder: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.cost != null && data.currencyId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currencyId is required when cost is set",
        path: ["currencyId"],
      });
    }
    if (data.arrivalDateTime) {
      const dep = Date.parse(data.departureDateTime);
      const arr = Date.parse(data.arrivalDateTime);
      if (Number.isFinite(dep) && Number.isFinite(arr) && dep >= arr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Departure time must be before arrival time",
          path: ["departureDateTime"],
        });
      }
    }
  });

export const insertCompanyVehicleSchema = z
  .object({
    id: CompanyVehicleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    vehicleCode: z.string().min(2).max(50),
    make: z.string().min(2).max(100),
    model: z.string().min(2).max(100),
    year: z.number().int().min(1900).max(2100).optional(),
    registrationNumber: z.string().min(2).max(50),
    purchaseDate: z.iso.date().optional(),
    assignedEmployeeId: EmployeeIdSchema.optional(),
    fuelType: FuelTypeSchema,
    mileage: z.number().int().min(0).default(0),
    insuranceExpiry: z.iso.date().optional(),
    lastServiceDate: z.iso.date().optional(),
    nextServiceDate: z.iso.date().optional(),
    status: VehicleStatusSchema.default("available"),
    retirementDate: z.iso.date().optional(),
    disposedDate: z.iso.date().optional(),
    vehicleVersion: z.number().int().min(1).default(1),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const s = data.status;
    if (s === "available" || s === "assigned" || s === "maintenance") {
      if (data.retirementDate != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "retirementDate must be omitted unless status is retired or disposed",
          path: ["retirementDate"],
        });
      }
      if (data.disposedDate != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "disposedDate must be omitted unless status is disposed",
          path: ["disposedDate"],
        });
      }
    } else if (s === "retired") {
      if (data.retirementDate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "retirementDate is required when status is retired",
          path: ["retirementDate"],
        });
      }
      if (data.disposedDate != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "disposedDate must be omitted when status is retired",
          path: ["disposedDate"],
        });
      }
    } else if (s === "disposed") {
      if (data.disposedDate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "disposedDate is required when status is disposed",
          path: ["disposedDate"],
        });
      }
    }
  });

export const insertVehicleLogSchema = z
  .object({
    id: VehicleLogIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    vehicleId: CompanyVehicleIdSchema,
    employeeId: EmployeeIdSchema,
    tripDate: z.iso.date(),
    purpose: z.string().min(5).max(500),
    startOdometer: z.number().int().min(0),
    endOdometer: z.number().int().min(0),
    fuelConsumed: optionalFuelConsumedLitersSchema,
    fuelCost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    expenseClaimId: ExpenseClaimIdSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startOdometer > data.endOdometer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start odometer cannot be greater than end odometer",
        path: ["startOdometer"],
      });
    }
    if (data.fuelCost != null && data.currencyId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currencyId is required when fuelCost is set",
        path: ["currencyId"],
      });
    }
  });
