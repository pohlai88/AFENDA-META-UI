// ============================================================================
// HR DOMAIN: TRAVEL & VEHICLE MANAGEMENT (Upgrade Module)
// Handles travel requests, itineraries, vehicle logs, and expense interoperability.
// Tables: travel_requests, travel_itineraries, company_vehicles, vehicle_logs
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
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

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  travelRequestStatusEnum,
  travelSegmentTypeEnum,
  vehicleStatusEnum,
  fuelTypeEnum,
} from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  TravelRequestIdSchema,
  TravelItineraryIdSchema,
  CompanyVehicleIdSchema,
  VehicleLogIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
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
    approvedDate: timestamp("approved_date"),
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
    uniqueIndex("travel_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("travel_requests_tenant_idx").on(table.tenantId),
    index("travel_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("travel_requests_status_idx").on(table.tenantId, table.status),
    index("travel_requests_departure_date_idx").on(table.tenantId, table.departureDate),
    sql`CONSTRAINT travel_requests_date_range CHECK (return_date >= departure_date)`,
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
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    index("travel_itineraries_tenant_idx").on(table.tenantId),
    index("travel_itineraries_request_idx").on(table.tenantId, table.travelRequestId),
    index("travel_itineraries_departure_idx").on(table.tenantId, table.departureDateTime),
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
    index("company_vehicles_assigned_idx").on(table.tenantId, table.assignedEmployeeId),
    sql`CONSTRAINT company_vehicles_mileage_non_negative CHECK (mileage >= 0)`,
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
    distanceTraveled: integer("distance_traveled").notNull(), // Calculated
    fuelConsumed: numeric("fuel_consumed", { precision: 10, scale: 2 }),
    fuelCost: numeric("fuel_cost", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
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
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    index("vehicle_logs_tenant_idx").on(table.tenantId),
    index("vehicle_logs_vehicle_idx").on(table.tenantId, table.vehicleId),
    index("vehicle_logs_employee_idx").on(table.tenantId, table.employeeId),
    index("vehicle_logs_date_idx").on(table.tenantId, table.tripDate),
    sql`CONSTRAINT vehicle_logs_odometer_valid CHECK (end_odometer >= start_odometer)`,
    sql`CONSTRAINT vehicle_logs_distance_positive CHECK (distance_traveled >= 0)`,
    ...tenantIsolationPolicies("vehicle_logs"),
    serviceBypassPolicy("vehicle_logs"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertTravelRequestSchema = z
  .object({
    id: TravelRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    travelPurpose: z.string().min(10).max(500),
    destination: z.string().min(2).max(200),
    departureDate: z.string().date(),
    returnDate: z.string().date(),
    estimatedCost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    advanceRequired: z.boolean().default(false),
    advanceAmount: currencyAmountSchema(2).optional(),
    status: z
      .enum(["draft", "submitted", "approved", "rejected", "completed", "cancelled"])
      .default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
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
    if (data.advanceRequired && !data.advanceAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advance amount is required when advance is requested",
        path: ["advanceAmount"],
      });
    }
  });

export const insertTravelItinerarySchema = z
  .object({
    id: TravelItineraryIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    travelRequestId: TravelRequestIdSchema,
    segmentType: z.enum(["flight", "train", "bus", "car", "hotel", "other"]),
    fromLocation: z.string().min(2).max(200),
    toLocation: z.string().min(2).max(200),
    departureDateTime: z.date(),
    arrivalDateTime: z.date().optional(),
    bookingReference: z.string().max(100).optional(),
    cost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    notes: z.string().max(1000).optional(),
    sortOrder: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    if (
      data.departureDateTime &&
      data.arrivalDateTime &&
      data.departureDateTime >= data.arrivalDateTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure time must be before arrival time",
        path: ["departureDateTime"],
      });
    }
  });

export const insertCompanyVehicleSchema = z.object({
  id: CompanyVehicleIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  vehicleCode: z.string().min(2).max(50),
  make: z.string().min(2).max(100),
  model: z.string().min(2).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  registrationNumber: z.string().min(2).max(50),
  purchaseDate: z.string().date().optional(),
  assignedEmployeeId: EmployeeIdSchema.optional(),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid", "cng", "other"]),
  mileage: z.number().int().min(0).default(0),
  insuranceExpiry: z.string().date().optional(),
  lastServiceDate: z.string().date().optional(),
  nextServiceDate: z.string().date().optional(),
  status: z
    .enum(["available", "assigned", "maintenance", "retired", "disposed"])
    .default("available"),
  notes: z.string().max(2000).optional(),
});

export const insertVehicleLogSchema = z
  .object({
    id: VehicleLogIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    vehicleId: CompanyVehicleIdSchema,
    employeeId: EmployeeIdSchema,
    tripDate: z.string().date(),
    purpose: z.string().min(5).max(500),
    startOdometer: z.number().int().min(0),
    endOdometer: z.number().int().min(0),
    distanceTraveled: z.number().int().min(0),
    fuelConsumed: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    fuelCost: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startOdometer && data.endOdometer && data.startOdometer > data.endOdometer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start odometer cannot be greater than end odometer",
        path: ["startOdometer"],
      });
    }
    const calculatedDistance = data.endOdometer - data.startOdometer;
    if (data.distanceTraveled !== calculatedDistance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Distance traveled must equal end odometer minus start odometer (${calculatedDistance})`,
        path: ["distanceTraveled"],
      });
    }
  });
