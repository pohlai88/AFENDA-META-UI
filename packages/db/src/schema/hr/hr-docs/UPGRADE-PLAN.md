# HR Domain Upgrade Plan — Beyond Legacy

**Status:** ACTIVE IMPLEMENTATION
**Goal:** Exceed legacy afenda-hybrid capabilities with modern type safety, validation, and architectural patterns
**Timeline:** 3-4 weeks
**Risk:** Low (incremental implementation)

---

## 🎯 Strategic Objectives

### 1. **Type Safety Excellence**
- ✅ Integrate `@afenda/meta-types` for business type validation
- ✅ Leverage branded types from meta-types/core
- ✅ Use field-type schemas for consistent validation
- ✅ Add runtime type guards for all entities

### 2. **Feature Completeness**
- ✅ Implement 24 missing tables from legacy
- ✅ Add comprehensive Zod validation (30KB+ schemas)
- ✅ Create domain-specific business rules
- ✅ Build reusable validation primitives

### 3. **Architectural Superiority**
- ✅ Maintain current governance docs (SCHEMA_LOCKDOWN, CUSTOM_SQL_REGISTRY, ADRs)
- ✅ Add Mermaid ERD diagrams
- ✅ Create per-domain validation layers
- ✅ Implement workflow state machines using meta-types/workflow

### 4. **Developer Experience**
- ✅ Strong TypeScript inference across all schemas
- ✅ Comprehensive JSDoc for all schemas
- ✅ Reusable validation building blocks
- ✅ Clear separation of concerns

---

## 📦 meta-types Integration Strategy

### Phase 0: Import Foundation Types

**File:** `_zodShared.ts`

```typescript
// Core utilities
import { isJsonObject, assertNever } from "@afenda/meta-types/core";
import type { Brand, NonEmptyArray, MaybePromise } from "@afenda/meta-types/core";

// Schema validation
import {
  FieldTypeSchema,
  BusinessTypeSchema,
  ConditionOperatorSchema,
  FieldConstraintsSchema,
} from "@afenda/meta-types/schema";

// Workflow state machines
import {
  type WorkflowDefinition,
  type WorkflowState,
  WorkflowDefinitionSchema,
} from "@afenda/meta-types/workflow";

// Platform types
import {
  type TenantConfig,
  type OrganizationHierarchy,
  TenantConfigSchema,
} from "@afenda/meta-types/platform";

// RBAC context
import {
  type SessionContext,
  type PermissionCheck,
  SessionContextSchema,
} from "@afenda/meta-types/rbac";
```

**Benefits:**
- ✅ Consistent business type validation (email, phone, tax_id, currency_amount, etc.)
- ✅ Runtime type guards (isJsonObject for metadata fields)
- ✅ Workflow state machine definitions (for approval flows, hiring pipeline, etc.)
- ✅ Branded types for nominal typing (prevents ID misuse)

---

### Enhanced Branded IDs

**Leverage meta-types branded ID patterns:**

```typescript
import type { Brand } from "@afenda/meta-types/core";

// Enhanced branded IDs with metadata
export type EmployeeId = Brand<string, "EmployeeId"> & {
  readonly __entityType: "Employee";
  readonly __domain: "HR";
};

export type BenefitProviderId = Brand<string, "BenefitProviderId"> & {
  readonly __entityType: "BenefitProvider";
  readonly __domain: "Benefits";
};

// Zod schemas with enhanced validation
export const EmployeeIdSchema = z
  .string()
  .uuid("Employee ID must be a valid UUID")
  .brand<"EmployeeId">()
  .describe("Unique identifier for an employee entity");

export const BenefitProviderIdSchema = z
  .string()
  .uuid("Provider ID must be a valid UUID")
  .brand<"BenefitProviderId">()
  .describe("Unique identifier for a benefit provider");
```

---

### Business Type Validators

**Leverage BusinessTypeSchema from meta-types:**

```typescript
import { BusinessTypeSchema } from "@afenda/meta-types/schema";

// Email validation with business semantics
export const businessEmailSchema = z
  .string()
  .email("Must be a valid email address")
  .toLowerCase()
  .refine(
    (email) => !email.endsWith("@example.com"),
    "Test emails not allowed in production"
  )
  .describe("Business email address (no disposable domains)");

// Phone with international format
export const internationalPhoneSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Phone must be in E.164 format (e.g., +6212345678)"
  )
  .describe("International phone number in E.164 format");

// Tax ID with country-specific validation
export const taxIdSchemaFactory = (countryCode: string) => {
  const patterns: Record<string, RegExp> = {
    US: /^\d{2}-\d{7}$/,  // EIN format
    MY: /^\d{12}$/,        // Malaysian tax ID
    SG: /^[A-Z]\d{7}[A-Z]$/,  // Singapore NRIC
    ID: /^\d{15}$/,        // Indonesian NPWP
  };

  return z
    .string()
    .regex(patterns[countryCode] || /^[A-Z0-9-]+$/, `Invalid tax ID for ${countryCode}`)
    .describe(`Tax identification number for ${countryCode}`);
};

// Currency amount with precision validation
export const currencyAmountSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, "Must be a valid currency amount")
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num);
    },
    "Must be a finite number"
  )
  .describe("Monetary amount with up to 4 decimal places");
```

---

## 🏗️ Implementation Phases

### Phase 1: Foundation Enhancement (Week 1, Days 1-2)

#### 1.1 Upgrade `_zodShared.ts`

**Goal:** Create comprehensive validation library

**Tasks:**
- [x] Import meta-types utilities
- [ ] Add business type validators (email, phone, tax ID, currency)
- [ ] Create domain-specific refinement functions
- [ ] Add workflow state validators
- [ ] Add comprehensive JSDoc

**New Validators:**

```typescript
// ============================================================================
// BUSINESS TYPE VALIDATORS (meta-types integration)
// ============================================================================

/**
 * Email validator with business rules
 * - Lowercase normalization
 * - No disposable domains
 * - RFC 5322 compliant
 */
export const businessEmailSchema = z
  .string()
  .email()
  .toLowerCase()
  .refine(
    (email) => {
      const disposableDomains = ["tempmail.com", "guerrillamail.com", "10minutemail.com"];
      return !disposableDomains.some((domain) => email.endsWith(`@${domain}`));
    },
    "Disposable email domains not allowed"
  );

/**
 * Phone number validator with international format support
 * Supports: E.164 format (+country_code + number)
 */
export const internationalPhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format");

/**
 * Currency amount with precision control
 * Supports: Negative values, up to 4 decimal places, finite numbers
 */
export const currencyAmountSchema = (maxDecimals = 2) =>
  z
    .string()
    .regex(
      new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`),
      `Must be a valid currency amount with up to ${maxDecimals} decimals`
    )
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num);
    }, "Must be a finite number");

/**
 * Percentage validator (0-100, up to 2 decimals)
 */
export const boundedPercentageSchema = z
  .number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100")
  .refine(
    (val) => {
      // Check if it has at most 2 decimal places
      const decimalPart = (val.toString().split(".")[1] || "").length;
      return decimalPart <= 2;
    },
    "Percentage can have at most 2 decimal places"
  );

/**
 * Tax ID validator factory (country-specific patterns)
 */
export const taxIdSchemaFactory = (countryCode: string) => {
  const patterns: Record<string, { pattern: RegExp; description: string }> = {
    US: { pattern: /^\d{2}-\d{7}$/, description: "EIN (12-3456789)" },
    MY: { pattern: /^\d{12}$/, description: "12-digit tax number" },
    SG: { pattern: /^[A-Z]\d{7}[A-Z]$/, description: "NRIC (S1234567D)" },
    ID: { pattern: /^\d{15}$/, description: "NPWP 15-digit" },
    GB: { pattern: /^\d{10}$/, description: "UTR 10-digit" },
    AU: { pattern: /^\d{9}$/, description: "TFN 9-digit" },
  };

  const config = patterns[countryCode] || {
    pattern: /^[A-Z0-9-]+$/,
    description: "Alphanumeric tax ID",
  };

  return z
    .string()
    .regex(config.pattern, `Invalid tax ID format. Expected: ${config.description}`)
    .describe(`Tax ID for ${countryCode}`);
};

/**
 * Bank account number validator
 * International format support (IBAN or country-specific)
 */
export const bankAccountSchema = z
  .string()
  .regex(
    /^([A-Z]{2}\d{2}[A-Z0-9]+|[0-9]{8,18})$/,
    "Must be valid IBAN or account number (8-18 digits)"
  )
  .describe("Bank account number or IBAN");

/**
 * Social Security Number (country-agnostic)
 */
export const ssnSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, "Invalid SSN format")
  .min(9, "SSN too short")
  .max(20, "SSN too long")
  .describe("Social security or national ID number");

// ============================================================================
// CROSS-FIELD REFINEMENTS (enhanced from current)
// ============================================================================

/**
 * Date range validator: ensures end >= start
 * Generic version supporting any date field names
 */
export function refineDateRange<T extends Record<string, Date | null | undefined>>(
  startField: keyof T,
  endField: keyof T,
  message?: string
) {
  return (data: T) => {
    const start = data[startField];
    const end = data[endField];
    if (!start || !end) return true; // Allow nullable dates
    return end >= start;
  };
}

/**
 * Amount range validator: ensures amount is within min/max bounds
 */
export function refineAmountRange(
  field: string,
  min: number = 0,
  max?: number,
  message?: string
) {
  return (data: Record<string, any>) => {
    const value = parseFloat(data[field]);
    if (isNaN(value)) return false;
    if (value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  };
}

/**
 * Conditional required: field is required if condition is met
 */
export function refineConditionalRequired<T extends Record<string, any>>(
  field: keyof T,
  condition: (data: T) => boolean,
  message?: string
) {
  return (data: T) => {
    if (condition(data)) {
      return data[field] !== null && data[field] !== undefined && data[field] !== "";
    }
    return true;
  };
}

/**
 * Enum validation against a list of allowed values
 */
export function refineEnumValue<T>(allowedValues: readonly T[], message?: string) {
  return (value: T) => {
    return (allowedValues as readonly any[]).includes(value);
  };
}

// ============================================================================
// WORKFLOW STATE VALIDATORS (meta-types/workflow integration)
// ============================================================================

/**
 * Workflow state transition validator
 * Ensures state transitions follow defined workflow rules
 */
export function createWorkflowStateSchema<S extends string>(
  workflowDef: { states: readonly S[]; transitions: Record<S, readonly S[]> }
) {
  return z.object({
    currentState: z.enum(workflowDef.states as [S, ...S[]]),
    nextState: z.enum(workflowDef.states as [S, ...S[]]),
  }).refine(
    (data) => {
      const allowedTransitions = workflowDef.transitions[data.currentState] || [];
      return allowedTransitions.includes(data.nextState);
    },
    (data) => ({
      message: `Invalid transition: ${data.currentState} → ${data.nextState}`,
    })
  );
}

/**
 * Leave request workflow states
 */
export const leaveRequestWorkflow = {
  states: ["draft", "pending", "approved", "rejected", "cancelled", "completed"] as const,
  transitions: {
    draft: ["pending", "cancelled"],
    pending: ["approved", "rejected", "cancelled"],
    approved: ["completed", "cancelled"],
    rejected: [],
    cancelled: [],
    completed: [],
  },
};

export const leaveRequestStateSchema = createWorkflowStateSchema(leaveRequestWorkflow);

/**
 * Recruitment workflow states
 */
export const recruitmentWorkflow = {
  states: [
    "applied",
    "screening",
    "interview",
    "offer_pending",
    "offer_accepted",
    "offer_declined",
    "rejected",
    "withdrawn",
  ] as const,
  transitions: {
    applied: ["screening", "rejected", "withdrawn"],
    screening: ["interview", "rejected", "withdrawn"],
    interview: ["offer_pending", "rejected", "withdrawn"],
    offer_pending: ["offer_accepted", "offer_declined", "withdrawn"],
    offer_accepted: [],
    offer_declined: [],
    rejected: [],
    withdrawn: [],
  },
};

export const recruitmentStateSchema = createWorkflowStateSchema(recruitmentWorkflow);

/**
 * Payroll status workflow
 */
export const payrollWorkflow = {
  states: ["draft", "calculating", "review", "approved", "processing", "completed", "cancelled"] as const,
  transitions: {
    draft: ["calculating", "cancelled"],
    calculating: ["review", "draft", "cancelled"],
    review: ["approved", "draft", "cancelled"],
    approved: ["processing", "cancelled"],
    processing: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  },
};

export const payrollStateSchema = createWorkflowStateSchema(payrollWorkflow);
```

---

### Phase 2: Benefits Domain Implementation (Week 1, Days 3-5)

**New File:** `benefits.ts`

**Tables:** 5 new tables
1. `benefitProviders` — Insurance/benefit providers
2. `benefitEnrollments` — Employee enrollment records
3. `benefitDependentCoverages` — Dependent coverage
4. `benefitClaims` — Claims processing

**Enhanced vs Legacy:**
- ✅ Workflow state machines for enrollment and claims
- ✅ Business type validation (currency, dates)
- ✅ Conditional required fields (dependent coverage rules)
- ✅ Comprehensive JSDoc

**Sample Implementation:**

```typescript
/**
 * Benefit Enrollments — Employee benefit plan enrollment with workflow
 *
 * Lifecycle: pending → active → (cancelled | expired)
 *
 * Business Rules:
 * - effectiveDate must be >= enrollmentDate
 * - terminationDate must be > effectiveDate (if set)
 * - employeeContribution + employerContribution = totalCost (if all provided)
 * - coverageLevel determines dependent coverage requirements
 *
 * @see meta-types/workflow for state machine definitions
 */
export const benefitEnrollments = hrSchema.table(
  "benefit_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    benefitPlanId: uuid("benefit_plan_id").notNull(),
    enrollmentDate: date("enrollment_date").notNull(),
    effectiveDate: date("effective_date").notNull(),
    terminationDate: date("termination_date"),
    enrollmentStatus: enrollmentStatusEnum("enrollment_status").notNull(),
    coverageLevel: coverageLevelEnum("coverage_level").notNull(),
    employeeContribution: numeric("employee_contribution", { precision: 12, scale: 2 }),
    employerContribution: numeric("employer_contribution", { precision: 12, scale: 2 }),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
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
      columns: [table.tenantId, table.benefitPlanId],
      foreignColumns: [benefitPlans.tenantId, benefitPlans.id],
    }),
    check(
      "benefit_enrollments_effective_after_enrollment",
      sql`${table.effectiveDate} >= ${table.enrollmentDate}`
    ),
    check(
      "benefit_enrollments_termination_after_effective",
      sql`${table.terminationDate} IS NULL OR ${table.terminationDate} > ${table.effectiveDate}`
    ),
    check(
      "benefit_enrollments_costs_positive",
      sql`
        (${table.employeeContribution} IS NULL OR ${table.employeeContribution} >= 0) AND
        (${table.employerContribution} IS NULL OR ${table.employerContribution} >= 0) AND
        (${table.totalCost} IS NULL OR ${table.totalCost} >= 0)
      `
    ),
    index("benefit_enrollments_tenant_idx").on(table.tenantId),
    index("benefit_enrollments_employee_idx").on(table.tenantId, table.employeeId),
    index("benefit_enrollments_status_idx").on(table.tenantId, table.enrollmentStatus),
    index("benefit_enrollments_effective_date_idx").on(table.tenantId, table.effectiveDate),
    ...tenantIsolationPolicies("benefit_enrollments"),
    serviceBypassPolicy("benefit_enrollments"),
  ]
);

// Zod schema with enhanced validation
export const insertBenefitEnrollmentSchema = z
  .object({
    tenantId: z.number().int().positive(),
    employeeId: EmployeeIdSchema,
    benefitPlanId: BenefitPlanIdSchema,
    enrollmentDate: z.date(),
    effectiveDate: z.date(),
    terminationDate: z.date().optional(),
    enrollmentStatus: enrollmentStatusEnumSchema,
    coverageLevel: coverageLevelEnumSchema,
    employeeContribution: currencyAmountSchema(2).optional(),
    employerContribution: currencyAmountSchema(2).optional(),
    totalCost: currencyAmountSchema(2).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine(refineDateRange("enrollmentDate", "effectiveDate"), {
    message: "Effective date must be on or after enrollment date",
  })
  .refine(refineDateRange("effectiveDate", "terminantionDate"), {
    message: "Termination date must be after effective date",
  })
  .refine(
    (data) => {
      // If all cost fields provided, validate total
      if (data.employeeContribution && data.employerContribution && data.totalCost) {
        const sum =
          parseFloat(data.employeeContribution) + parseFloat(data.employerContribution);
        const total = parseFloat(data.totalCost);
        return Math.abs(sum - total) < 0.01; // Allow 1 cent rounding difference
      }
      return true;
    },
    {
      message: "Total cost must equal sum of employee and employer contributions",
    }
  );
```

---

### Phase 3: Learning Domain Enhancement (Week 2, Days 1-4)

**File:** Rename `training.ts` → `learning.ts`

**Tables:** 11 new tables (vs current 3)

**Enhanced Features:**
- ✅ Full LMS with course modules and learning paths
- ✅ Assessment system with scoring
- ✅ Progress tracking per course
- ✅ Feedback system
- ✅ Cost tracking
- ✅ Certification awards linked to talent domain

**Sample: Course Enrollments with Progress Tracking**

```typescript
/**
 * Course Enrollments — Student enrollment in courses with progress tracking
 *
 * Supports:
 * - Session-based enrollments (sessionId NOT NULL)
 * - Sessionless enrollments (self-paced, recorded content)
 * - Progress tracking via completionDate and score
 * - Certificate issuance upon passing
 *
 * Business Rules:
 * - If passed = true, completionDate is required
 * - If certificateIssued = true, passed must be true
 * - Score range: 0-100 (if provided)
 */
export const courseEnrollments = hrSchema.table(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    courseId: uuid("course_id").notNull(),
    sessionId: uuid("session_id"), // NULL = sessionless
    enrollmentDate: date("enrollment_date").notNull(),
    enrollmentStatus: enrollmentStatusEnum("enrollment_status").notNull(),
    completionDate: date("completion_date"),
    score: numeric("score", { precision: 5, scale: 2 }),
    passed: boolean("passed"),
    certificateIssued: boolean("certificate_issued").notNull().default(false),
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
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    // sessionId FK added dynamically when courseSessions table created
    check(
      "course_enrollments_score_range",
      sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= 100)`
    ),
    check(
      "course_enrollments_passed_requires_completion",
      sql`${table.passed} IS NULL OR ${table.passed} = false OR ${table.completionDate} IS NOT NULL`
    ),
    check(
      "course_enrollments_certificate_requires_passed",
      sql`${table.certificateIssued} = false OR ${table.passed} = true`
    ),
    index("course_enrollments_tenant_idx").on(table.tenantId),
    index("course_enrollments_employee_idx").on(table.tenantId, table.employeeId),
    index("course_enrollments_course_idx").on(table.tenantId, table.courseId),
    index("course_enrollments_session_idx")
      .on(table.tenantId, table.sessionId)
      .where(sql`${table.sessionId} IS NOT NULL`),
    index("course_enrollments_status_idx").on(table.tenantId, table.enrollmentStatus),
    ...tenantIsolationPolicies("course_enrollments"),
    serviceBypassPolicy("course_enrollments"),
  ]
);

// Zod schema with business rules
export const insertCourseEnrollmentSchema = z
  .object({
    tenantId: z.number().int().positive(),
    employeeId: EmployeeIdSchema,
    courseId: CourseIdSchema,
    sessionId: CourseSessionIdSchema.optional(),
    enrollment Date: z.date(),
    enrollmentStatus: enrollmentStatusEnumSchema,
    completionDate: z.date().optional(),
    score: boundedPercentageSchema.optional(),
    passed: z.boolean().optional(),
    certificateIssued: z.boolean().default(false),
  })
  .refine(
    refineConditionalRequired(
      "completionDate",
      (data) => data.passed === true,
      "Completion date required when passed = true"
    )
  )
  .refine(
    (data) => {
      if (data.certificateIssued) {
        return data.passed === true;
      }
      return true;
    },
    { message: "Certificate can only be issued if passed = true" }
  );
```

---

### Phase 4: Payroll & Recruitment Enhancement (Week 2-3)

**Payroll Tables:** 5 additional tables
- `taxBrackets`
- `statutoryDeductions`
- `payrollAdjustments`
- `payslips`
- `paymentDistributions`

**Recruitment Tables:** 3 additional tables
- `applicantDocuments`
- `interviewFeedback`
- `offerLetters`

---

### Phase 5: Documentation & Schema Diagrams (Week 3)

**Create:** `SCHEMA_DIAGRAM.md`

**Mermaid ERDs for each domain:**

```markdown
## Benefits Domain ERD

\`\`\`mermaid
erDiagram
    EMPLOYEES ||--o{ BENEFIT_ENROLLMENTS : "enrolls"
    BENEFIT_PLANS ||--o{ BENEFIT_ENROLLMENTS : "offers"
    BENEFIT_PROVIDERS ||--o{ BENEFIT_PLANS : "provides"
    BENEFIT_ENROLLMENTS ||--o{ BENEFIT_DEPENDENT_COVERAGES : "covers"
    BENEFIT_ENROLLMENTS ||--o{ BENEFIT_CLAIMS : "generates"
    EMPLOYEES ||--o{ BENEFIT_CLAIMS : "files"

    EMPLOYEES {
        uuid id PK
        int tenant_id
        string employee_number UK
        string email UK
    }

    BENEFIT_PROVIDERS {
        uuid id PK
        int tenant_id
        string provider_code UK
        string provider_name
        enum provider_type
        string contact_email
    }

    BENEFIT_PLANS {
        uuid id PK
        int tenant_id
        uuid provider_id FK
        string plan_code UK
        string plan_name
        enum plan_type
        decimal monthly_cost
    }

    BENEFIT_ENROLLMENTS {
        uuid id PK
        int tenant_id
        uuid employee_id FK
        uuid benefit_plan_id FK
        date enrollment_date
        date effective_date
        enum enrollment_status
        enum coverage_level
    }

    BENEFIT_DEPENDENT_COVERAGES {
        uuid id PK
        int tenant_id
        uuid enrollment_id FK
        string dependent_name
        enum relationship
        date date_of_birth
    }

    BENEFIT_CLAIMS {
        uuid id PK
        int tenant_id
        string claim_number UK
        uuid enrollment_id FK
        date claim_date
        enum claim_status
        decimal claim_amount
    }
\`\`\`
```

---

## 🎯 Success Metrics

### Type Safety Improvements
- ✅ 100% of IDs use branded types
- ✅ All business fields use appropriate validators (email, phone, currency, etc.)
- ✅ Workflow states use meta-types/workflow schemas
- ✅ Zero `any` types in schema definitions

### Feature Completeness
- ✅ 24 new tables implemented (Benefits: 5, Learning: 11, Payroll: 5, Recruitment: 3)
- ✅ 30KB+ of Zod validation schemas
- ✅ 15+ workflow state machines defined
- ✅ 50+ business rule checks (CHECK constraints + Zod refinements)

### Documentation Quality
- ✅ Mermaid ERD for each domain
- ✅ JSDoc for every table, column, and schema
- ✅ Workflow diagrams for approval flows
- ✅ Updated README with complete table catalog

### Developer Experience
- ✅ Strong TypeScript inference (no verbose type annotations needed)
- ✅ Comprehensive error messages in Zod validation
- ✅ Reusable validation building blocks
- ✅ Clear separation of concerns

---

## 🚀 Advantages Over Legacy

### 1. Type Safety
| Feature | Legacy | Current + Upgrade | Winner |
|---------|--------|-------------------|--------|
| Branded IDs | ✅ Basic | ✅ Enhanced with entity metadata | 🏆 Current |
| Business Type Validation | ⚠️ Inline regex | ✅ meta-types/schema integration | 🏆 Current |
| Workflow State Machines | ❌ Manual string checks | ✅ meta-types/workflow schemas | 🏆 Current |
| Runtime Guards | ❌ None | ✅ meta-types/core guards | 🏆 Current |

### 2. Architecture
| Feature | Legacy | Current + Upgrade | Winner |
|---------|--------|-------------------|--------|
| Schema Separation | ✅ 6 pgSchemas | ⚠️ 1 consolidated | 🏆 Legacy (but defer) |
| Governance Docs | ❌ None | ✅ SCHEMA_LOCKDOWN, ADRs, CUSTOM_SQL_REGISTRY | 🏆 Current |
| Mermaid Diagrams | ✅ SCHEMA_DIAGRAM.md | ✅ Will add (Phase 5) | 🤝 Tie |
| fundamentals/operations | ✅ Subdirs | ⚠️ Flat | 🏆 Legacy (low priority) |

### 3. Validation Richness
| Feature | Legacy | Current + Upgrade | Winner |
|---------|--------|-------------------|--------|
| Zod Schema Size | ⚠️ 29KB (learning) | ✅ 30KB+ (enhanced) | 🏆 Current |
| Cross-Field Validation | ✅ Good | ✅ Better (generic refinements) | 🏆 Current |
| Workflow Validators | ❌ None | ✅ State machine schemas | 🏆 Current |
| Business Type Schemas | ⚠️ Inline | ✅ Reusable factory functions | 🏆 Current |

---

## 📋 Implementation Checklist

### Week 1
- [ ] Phase 0: Import meta-types utilities (Day 1)
  - [ ] Update `_zodShared.ts` with meta-types imports
  - [ ] Add business type validators
  - [ ] Create workflow state schemas
  - [ ] Add enhanced refinement functions
  - [ ] Add comprehensive JSDoc

- [ ] Phase 1: Foundation Enhancement (Day 2)
  - [ ] Enhanced branded IDs with entity metadata
  - [ ] Tax ID factory (country-specific)
  - [ ] Currency amount validator
  - [ ] Phone/email validators
  - [ ] Bank account validator

- [ ] Phase 2: Benefits Domain (Days 3-5)
  - [ ] Create `benefits.ts`
  - [ ] Add 5 benefits tables
  - [ ] Add benefits enums (6 new)
  - [ ] Add benefits Zod schemas
  - [ ] Update `_relations.ts`
  - [ ] Generate migration
  - [ ] Run tests

### Week 2
- [ ] Phase 3: Learning Enhancement (Days 1-4)
  - [ ] Rename `training.ts` → `learning.ts`
  - [ ] Add 11 learning tables
  - [ ] Add learning enums
  - [ ] Add comprehensive Zod schemas (30KB target)
  - [ ] Update relations
  - [ ] Generate migration
  - [ ] Run tests

- [ ] Phase 4: Payroll Enhancement (Day 5)
  - [ ] Add 5 payroll tables
  - [ ] Add payroll workflow states
  - [ ] Add Zod schemas
  - [ ] Generate migration

### Week 3
- [ ] Phase 4: Recruitment Enhancement (Days 1-2)
  - [ ] Add 3 recruitment tables
  - [ ] Add recruitment workflow
  - [ ] Add Zod schemas
  - [ ] Generate migration

- [ ] Phase 5: Documentation (Days 3-5)
  - [ ] Create SCHEMA_DIAGRAM.md with Mermaid ERDs
  - [ ] Add JSDoc to all tables
  - [ ] Update README with new tables
  - [ ] Create ADR-003 (meta-types integration rationale)
  - [ ] Update CIRCULAR_FKS.md if needed

---

## Next Steps

1. **Review & Approve** this upgrade plan
2. **Allocate Resources** — 1-2 senior developers
3. **Begin Phase 0** — meta-types integration (1-2 days)
4. **Iterate Quickly** — Ship each phase independently
5. **Maintain Quality** — Full test coverage for each phase

---

**Questions?** Tag @database-team or @architecture in Slack
