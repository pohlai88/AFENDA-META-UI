# HR Schema Upgrade Opportunities Report

**Generated:** 2024
**Source Analysis:** Odoo (39k★), Frappe ERPNext (32k★), Frappe HRMS (7.7k★), Horilla (1.1k★)
**Current AFENDA Schema:** 97 tables across 13 domain files

---

## Executive Summary

Analysis of 4 major open-source ERP/HRM systems reveals **23 high-value upgrade opportunities** for AFENDA's HR schema. The current schema covers ~75% of enterprise HR needs but lacks several features that competitors consider essential for modern workforce management.

### Key Findings

| Category | Current Coverage | Gap Analysis | Priority |
|----------|------------------|--------------|----------|
| Core HR | ✅ Strong | Minor enhancements | Low |
| Payroll | ✅ Good | Tax exemptions, arrears | Medium |
| Leave Management | ✅ Good | Compensatory leave, restrictions | Medium |
| Skills & Talent | ⚠️ Basic | Skill types, levels, resume lines | High |
| Attendance | ⚠️ Basic | Biometrics, GPS, overtime rules | High |
| Employee Experience | ❌ Missing | Bonus points, disciplinary actions | High |
| Expense Management | ❌ Missing | Full expense workflow | High |

---

## Part 1: Feature Extraction by Source

### 1.1 Odoo HR Modules (39k★)

**Core HR (`addons/hr/`)**
- `hr_employee.py` (93KB) - Comprehensive employee model
- `hr_department.py` - Hierarchical departments with color coding
- `hr_job.py` - Job positions with recruitment integration
- `hr_departure_reason.py` - Structured termination reasons
- `hr_work_location.py` - Work location management
- `hr_version.py` - Employee data versioning/history

**Skills Module (`addons/hr_skills/`)**
- `hr_skill.py` - Skill definitions
- `hr_skill_type.py` - Skill categorization (Languages, Technical, Soft)
- `hr_skill_level.py` - Proficiency levels with progress percentages
- `hr_employee_skill.py` - Employee-skill mapping
- `hr_job_skill.py` - Required skills per job position
- `hr_resume_line.py` - Work history/resume entries
- `hr_resume_line_type.py` - Resume entry categories (Experience, Education, Certification)

**Attendance (`addons/hr_attendance/`)**
- Check-in/check-out with timestamps
- Overtime calculation rules
- Attendance kiosk mode
- Badge/PIN authentication

**Holidays/Leave (`addons/hr_holidays/`)**
- Leave allocation with accrual
- Multi-level approval workflows
- Stress days (high-demand periods)
- Leave reports and analytics

**Recruitment (`addons/hr_recruitment/`)**
- Applicant tracking system
- Interview scheduling
- Recruitment stages/pipeline
- Job posting to multiple channels

**Expense (`addons/hr_expense/`)**
- Expense categories
- Receipt attachment
- Approval workflows
- Reimbursement tracking
- Accounting integration

---

### 1.2 Frappe HRMS (7.7k★)

**Payroll Doctypes (40+ entities)**

| Doctype | Description | AFENDA Gap |
|---------|-------------|------------|
| `additional_salary` | One-time salary additions | ⚠️ Partial |
| `arrear` | Salary arrears calculation | ❌ Missing |
| `employee_benefit_application` | Benefit enrollment | ✅ Exists |
| `employee_benefit_claim` | Benefit claims processing | ⚠️ Partial |
| `employee_benefit_ledger` | Benefit balance tracking | ❌ Missing |
| `employee_incentive` | Performance incentives | ❌ Missing |
| `employee_other_income` | Non-salary income | ❌ Missing |
| `employee_tax_exemption_category` | Tax exemption types | ❌ Missing |
| `employee_tax_exemption_declaration` | Annual tax declarations | ❌ Missing |
| `employee_tax_exemption_proof_submission` | Tax proof uploads | ❌ Missing |
| `income_tax_slab` | Progressive tax brackets | ⚠️ Partial |
| `payroll_correction` | Post-processing corrections | ❌ Missing |
| `payroll_period` | Fiscal periods | ✅ Exists |
| `retention_bonus` | Retention incentives | ❌ Missing |
| `salary_component` | Earnings/deductions | ✅ Exists |
| `salary_slip` | Payslip generation | ✅ Exists |
| `salary_slip_loan` | Loan deductions | ⚠️ Partial |
| `salary_structure` | Pay structures | ✅ Exists |
| `salary_structure_assignment` | Structure assignment | ✅ Exists |
| `salary_withholding` | Salary holds | ❌ Missing |
| `taxable_salary_slab` | Tax calculation slabs | ⚠️ Partial |

**HR Doctypes (60+ entities)**

| Doctype | Description | AFENDA Gap |
|---------|-------------|------------|
| `appraisal` | Performance appraisals | ✅ Exists |
| `appraisal_cycle` | Review cycles | ✅ Exists |
| `appraisal_goal` | Goal tracking | ✅ Exists |
| `appraisal_kra` | Key Result Areas | ❌ Missing |
| `appraisal_template` | Review templates | ❌ Missing |
| `appointment_letter` | Offer letters | ✅ Exists |
| `attendance` | Daily attendance | ✅ Exists |
| `attendance_request` | Attendance corrections | ❌ Missing |
| `compensatory_leave_request` | Comp-off requests | ❌ Missing |
| `daily_work_summary` | Daily standup reports | ❌ Missing |
| `department_approver` | Approval hierarchies | ⚠️ Partial |
| `designation_skill` | Skills per designation | ❌ Missing |
| `earned_leave_schedule` | Leave accrual schedules | ⚠️ Partial |
| `employee_grievance` | Grievance management | ❌ Missing |
| `employee_promotion` | Promotion tracking | ❌ Missing |
| `employee_transfer` | Transfer management | ❌ Missing |
| `exit_interview` | Offboarding interviews | ❌ Missing |
| `full_and_final_statement` | Settlement calculation | ❌ Missing |
| `interview` | Interview scheduling | ✅ Exists |
| `interview_feedback` | Feedback collection | ✅ Exists |
| `job_opening` | Job requisitions | ✅ Exists |
| `leave_allocation` | Leave balances | ✅ Exists |
| `leave_application` | Leave requests | ✅ Exists |
| `leave_block_list` | Blocked leave periods | ❌ Missing |
| `leave_encashment` | Leave cash-out | ❌ Missing |
| `leave_policy` | Leave rules | ✅ Exists |
| `leave_policy_assignment` | Policy assignment | ⚠️ Partial |
| `shift_assignment` | Shift scheduling | ✅ Exists |
| `shift_request` | Shift change requests | ❌ Missing |
| `shift_schedule` | Recurring schedules | ⚠️ Partial |
| `shift_type` | Shift definitions | ✅ Exists |
| `skill` | Skill definitions | ✅ Exists |
| `skill_assessment` | Skill evaluations | ❌ Missing |
| `staffing_plan` | Workforce planning | ❌ Missing |
| `training_event` | Training sessions | ✅ Exists |
| `training_feedback` | Training evaluations | ⚠️ Partial |
| `training_program` | Training curricula | ✅ Exists |
| `training_result` | Training outcomes | ⚠️ Partial |
| `travel_request` | Travel approvals | ❌ Missing |
| `travel_itinerary` | Trip planning | ❌ Missing |
| `vehicle_log` | Company vehicle usage | ❌ Missing |

---

### 1.3 Horilla HRM (1.1k★)

**Employee Module**
```python
# Key models from horilla/employee/models.py
- Employee (comprehensive with XSS validation)
- EmployeeWorkInformation (job details, salary)
- EmployeeBankDetails (with uniqueness validation)
- EmployeeNote (internal notes)
- Policy (company policies acknowledgment)
- BonusPoint (gamification/rewards)
- DisciplinaryAction (warnings, suspensions)
- EmployeeGeneralSetting (per-employee settings)
- ProfileEditFeature (self-service permissions)
```

**Leave Module (from leave/models.py)**
```python
- LeaveType (with reset cycles, carryforward rules)
- LeaveAllocation (with expiry tracking)
- LeaveRequest (with half-day support)
- AvailableLeave (real-time balance)
- CompensatoryLeaveRequest (comp-off)
- RestrictLeave (blackout periods)
- LeaveRequestConditionApproval (multi-level approval)
```

**Payroll Module**
```python
- PayrollSettings
- SalaryStructure
- PayrollEntry
- TaxModels (progressive brackets)
```

**Unique Horilla Features:**
1. **Bonus Points System** - Gamification for employee engagement
2. **Disciplinary Actions** - Formal warning/suspension tracking
3. **Leave Restrictions** - Department/position-based blackouts
4. **Compensatory Leave** - Automatic comp-off for overtime
5. **Multi-Condition Approvals** - Complex approval workflows
6. **Profile Edit Features** - Granular self-service permissions

---

## Part 2: Upgrade Opportunities

### Priority 1: HIGH (Immediate Business Value)

#### 2.1 Skills Taxonomy Enhancement
**Source:** Odoo `hr_skills`, Frappe HRMS
**Gap:** Current schema has basic skills; missing skill types, levels, and job requirements

**Proposed Tables:**
```typescript
// hr.skill_types - Categorize skills
{
  id, tenantId, typeCode, name, description,
  color, // For UI display
  isActive
}

// hr.skill_levels - Proficiency definitions
{
  id, tenantId, skillTypeId, levelCode, name,
  progressPercentage, // 0-100
  description, sortOrder
}

// hr.job_position_skills - Required skills per position
{
  id, tenantId, jobPositionId, skillId,
  requiredLevel, // FK to skill_levels
  isRequired, // vs preferred
  notes
}

// hr.resume_line_types - Resume entry categories
{
  id, tenantId, typeCode, name,
  category, // 'experience' | 'education' | 'certification' | 'project'
  sortOrder
}

// hr.employee_resume_lines - Work history
{
  id, tenantId, employeeId, resumeLineTypeId,
  title, organization, location,
  startDate, endDate, isCurrent,
  description, documentUrl
}
```

**Business Value:** Skills-based hiring, internal mobility, workforce planning

---

#### 2.2 Expense Management Module
**Source:** Odoo `hr_expense`
**Gap:** No expense tracking in current schema

**Proposed Tables:**
```typescript
// hr.expense_categories
{
  id, tenantId, categoryCode, name, description,
  maxAmount, // Per-expense limit
  requiresReceipt,
  accountCode, // GL integration
  isActive
}

// hr.expense_policies
{
  id, tenantId, policyCode, name,
  applicableTo, // 'all' | 'department' | 'position' | 'employee'
  dailyLimit, monthlyLimit,
  requiresPreApproval,
  effectiveFrom, effectiveTo
}

// hr.expense_reports
{
  id, tenantId, reportNumber, employeeId,
  reportDate, periodStart, periodEnd,
  totalAmount, currencyId,
  status, // 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
  submittedDate, approvedBy, approvedDate,
  paymentDate, paymentReference
}

// hr.expense_lines
{
  id, tenantId, expenseReportId, categoryId,
  expenseDate, description,
  amount, currencyId, exchangeRate,
  receiptUrl, merchantName,
  isBillable, projectId, // Optional project allocation
  notes
}

// hr.expense_approvals
{
  id, tenantId, expenseReportId, approverId,
  approvalLevel, status, comments,
  actionDate
}
```

**Business Value:** Cost control, policy compliance, audit trail

---

#### 2.3 Employee Experience & Engagement
**Source:** Horilla `BonusPoint`, `DisciplinaryAction`
**Gap:** No gamification or formal disciplinary tracking

**Proposed Tables:**
```typescript
// hr.bonus_point_rules
{
  id, tenantId, ruleCode, name, description,
  triggerEvent, // 'attendance_streak' | 'goal_completion' | 'training' | 'referral'
  pointsAwarded,
  maxPerPeriod, periodType, // 'day' | 'week' | 'month' | 'year'
  isActive
}

// hr.employee_bonus_points
{
  id, tenantId, employeeId,
  totalPoints, redeemedPoints, availablePoints,
  lastEarnedDate, lastRedeemedDate
}

// hr.bonus_point_transactions
{
  id, tenantId, employeeId, ruleId,
  transactionType, // 'earned' | 'redeemed' | 'expired' | 'adjusted'
  points, balance,
  referenceType, referenceId, // e.g., 'goal', goal_id
  notes, transactionDate
}

// hr.disciplinary_action_types
{
  id, tenantId, typeCode, name, description,
  severity, // 1-5
  defaultDuration, // Days
  requiresHrApproval,
  isActive
}

// hr.disciplinary_actions
{
  id, tenantId, employeeId, actionTypeId,
  incidentDate, reportedDate, reportedBy,
  description, evidence, // JSON array of document URLs
  status, // 'pending' | 'under_review' | 'confirmed' | 'appealed' | 'closed'
  actionTaken, startDate, endDate,
  reviewedBy, reviewDate,
  appealNotes, appealDate, appealOutcome
}
```

**Business Value:** Employee motivation, compliance, legal protection

---

#### 2.4 Compensatory Leave & Leave Restrictions
**Source:** Horilla, Frappe HRMS
**Gap:** No comp-off or blackout period support

**Proposed Tables:**
```typescript
// hr.compensatory_leave_requests
{
  id, tenantId, requestNumber, employeeId,
  leaveTypeId, // Must be compensatory type
  workDate, // Date worked (overtime/holiday)
  attendanceRecordId, // Reference to attendance
  hoursWorked, daysRequested,
  reason, status,
  approvedBy, approvedDate,
  expiryDate // Comp-off validity
}

// hr.leave_restrictions
{
  id, tenantId, restrictionCode, name,
  startDate, endDate,
  departmentId, // Optional - restrict specific dept
  jobPositionId, // Optional - restrict specific position
  includeAllLeaveTypes,
  excludedLeaveTypes, // JSON array
  reason, isActive
}

// hr.leave_encashments
{
  id, tenantId, encashmentNumber, employeeId,
  leaveTypeId, daysEncashed,
  amountPerDay, totalAmount, currencyId,
  encashmentDate, status,
  approvedBy, approvedDate,
  paymentDate, paymentReference
}
```

**Business Value:** Fair overtime compensation, operational control

---

### Priority 2: MEDIUM (Strategic Enhancement)

#### 2.5 Tax Exemption & Declaration System
**Source:** Frappe HRMS
**Gap:** No employee tax declaration workflow

**Proposed Tables:**
```typescript
// hr.tax_exemption_categories
{
  id, tenantId, categoryCode, name, description,
  maxExemption, // Annual limit
  countryId, // Country-specific
  requiresProof,
  isActive
}

// hr.tax_exemption_sub_categories
{
  id, tenantId, categoryId, subCategoryCode, name,
  maxExemption, description
}

// hr.employee_tax_declarations
{
  id, tenantId, declarationNumber, employeeId,
  fiscalYear, declarationDate,
  totalDeclared, totalApproved,
  status, // 'draft' | 'submitted' | 'verified' | 'approved'
  verifiedBy, verifiedDate
}

// hr.tax_declaration_items
{
  id, tenantId, declarationId, subCategoryId,
  declaredAmount, approvedAmount,
  proofDocumentUrl, verificationNotes
}

// hr.tax_exemption_proofs
{
  id, tenantId, declarationItemId,
  documentType, documentNumber,
  documentUrl, uploadDate,
  verificationStatus, verifiedBy, verifiedDate
}
```

**Business Value:** Tax compliance, employee financial planning

---

#### 2.6 Attendance Enhancement
**Source:** Odoo, Horilla
**Gap:** No attendance requests, overtime rules, or biometric support

**Proposed Tables:**
```typescript
// hr.attendance_requests
{
  id, tenantId, requestNumber, employeeId,
  requestType, // 'correction' | 'missing_punch' | 'work_from_home'
  attendanceDate,
  requestedCheckIn, requestedCheckOut,
  reason, status,
  approvedBy, approvedDate
}

// hr.overtime_rules
{
  id, tenantId, ruleCode, name,
  applicableTo, // 'all' | 'department' | 'shift'
  thresholdHours, // Daily hours before OT kicks in
  multiplier, // 1.5x, 2x, etc.
  maxDailyOvertimeHours,
  requiresPreApproval,
  effectiveFrom, effectiveTo
}

// hr.biometric_devices
{
  id, tenantId, deviceCode, name,
  deviceType, // 'fingerprint' | 'face' | 'card' | 'pin'
  locationId, ipAddress,
  isActive, lastSyncDate
}

// hr.biometric_logs
{
  id, tenantId, deviceId, employeeId,
  punchTime, punchType, // 'in' | 'out'
  rawData, // Device-specific payload
  processedToAttendance, // Boolean
  attendanceRecordId
}
```

**Business Value:** Accurate time tracking, fraud prevention

---

#### 2.7 Employee Lifecycle Events
**Source:** Frappe HRMS
**Gap:** No formal promotion, transfer, or exit tracking

**Proposed Tables:**
```typescript
// hr.employee_promotions
{
  id, tenantId, promotionNumber, employeeId,
  effectiveDate,
  fromJobPositionId, toJobPositionId,
  fromDepartmentId, toDepartmentId,
  fromSalary, toSalary, currencyId,
  reason, status,
  approvedBy, approvedDate
}

// hr.employee_transfers
{
  id, tenantId, transferNumber, employeeId,
  effectiveDate,
  fromDepartmentId, toDepartmentId,
  fromLocationId, toLocationId,
  transferType, // 'permanent' | 'temporary' | 'deputation'
  reason, status,
  approvedBy, approvedDate,
  returnDate // For temporary transfers
}

// hr.exit_interviews
{
  id, tenantId, employeeId,
  interviewDate, interviewerId,
  separationType, // 'resignation' | 'termination' | 'retirement' | 'layoff'
  reasonForLeaving,
  wouldRejoin, // Boolean
  feedback, // JSON structured feedback
  suggestions,
  confidentialNotes
}

// hr.full_final_settlements
{
  id, tenantId, settlementNumber, employeeId,
  separationDate, lastWorkingDate,
  pendingSalary, leaveEncashment,
  bonusPayable, deductions,
  netPayable, currencyId,
  status, // 'draft' | 'calculated' | 'approved' | 'paid'
  paymentDate, paymentReference
}
```

**Business Value:** Complete employee lifecycle tracking, compliance

---

#### 2.8 Travel & Vehicle Management
**Source:** Frappe HRMS
**Gap:** No travel request or company vehicle tracking

**Proposed Tables:**
```typescript
// hr.travel_requests
{
  id, tenantId, requestNumber, employeeId,
  travelPurpose, destination,
  departureDate, returnDate,
  estimatedCost, currencyId,
  advanceRequired, advanceAmount,
  status, approvedBy, approvedDate
}

// hr.travel_itineraries
{
  id, tenantId, travelRequestId,
  segmentType, // 'flight' | 'train' | 'hotel' | 'car'
  fromLocation, toLocation,
  departureDateTime, arrivalDateTime,
  bookingReference, cost,
  notes
}

// hr.company_vehicles
{
  id, tenantId, vehicleCode, make, model,
  registrationNumber, purchaseDate,
  assignedEmployeeId, // Current assignment
  fuelType, mileage,
  insuranceExpiry, serviceDate,
  status, // 'available' | 'assigned' | 'maintenance' | 'retired'
}

// hr.vehicle_logs
{
  id, tenantId, vehicleId, employeeId,
  tripDate, purpose,
  startOdometer, endOdometer,
  fuelConsumed, fuelCost,
  notes
}
```

**Business Value:** Travel cost control, asset management

---

### Priority 3: LOW (Future Enhancement)

#### 2.9 Staffing Plan & Workforce Planning
**Source:** Frappe HRMS
**Gap:** No formal headcount planning

**Proposed Tables:**
```typescript
// hr.staffing_plans
{
  id, tenantId, planCode, name,
  fiscalYear, departmentId,
  status, // 'draft' | 'approved' | 'active' | 'closed'
  approvedBy, approvedDate
}

// hr.staffing_plan_details
{
  id, tenantId, staffingPlanId, jobPositionId,
  currentHeadcount, plannedHeadcount,
  vacancies, // Calculated
  estimatedCostPerHead, totalBudget,
  justification, priority
}
```

---

#### 2.10 Appraisal Templates & KRAs
**Source:** Frappe HRMS
**Gap:** No reusable review templates

**Proposed Tables:**
```typescript
// hr.appraisal_templates
{
  id, tenantId, templateCode, name,
  applicableTo, // 'all' | 'department' | 'position'
  isActive
}

// hr.appraisal_template_kras
{
  id, tenantId, templateId,
  kraCode, name, description,
  weightage, // Percentage
  sortOrder
}

// hr.employee_kras
{
  id, tenantId, employeeId, reviewId,
  kraId, targetValue, achievedValue,
  score, comments
}
```

---

## Part 3: Implementation Roadmap

### Phase 6A: Skills & Expense (4 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Skill types, levels, job position skills |
| 2 | Resume lines, employee resume entries |
| 3 | Expense categories, policies, reports |
| 4 | Expense lines, approvals, testing |

### Phase 6B: Employee Experience (3 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Bonus point rules, employee points |
| 2 | Point transactions, disciplinary types |
| 3 | Disciplinary actions, testing |

### Phase 6C: Leave Enhancements (2 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Compensatory leave, restrictions |
| 2 | Leave encashments, testing |

### Phase 7: Tax & Attendance (4 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Tax exemption categories, declarations |
| 2 | Declaration items, proofs |
| 3 | Attendance requests, overtime rules |
| 4 | Biometric integration, testing |

### Phase 8: Lifecycle & Travel (3 weeks)
| Week | Deliverable |
|------|-------------|
| 1 | Promotions, transfers |
| 2 | Exit interviews, settlements |
| 3 | Travel requests, vehicle management |

---

## Part 4: Schema Comparison Matrix

| Feature | AFENDA | Odoo | Frappe | Horilla | Recommendation |
|---------|--------|------|--------|---------|----------------|
| **Core HR** |
| Employee Master | ✅ | ✅ | ✅ | ✅ | - |
| Departments | ✅ | ✅ | ✅ | ✅ | - |
| Job Positions | ✅ | ✅ | ✅ | ✅ | - |
| Work Locations | ⚠️ | ✅ | ✅ | ✅ | Add dedicated table |
| Departure Reasons | ❌ | ✅ | ✅ | ⚠️ | Add enum + table |
| **Skills & Talent** |
| Skills | ✅ | ✅ | ✅ | ✅ | - |
| Skill Types | ❌ | ✅ | ⚠️ | ❌ | **Add** |
| Skill Levels | ❌ | ✅ | ⚠️ | ❌ | **Add** |
| Job Skills | ❌ | ✅ | ✅ | ❌ | **Add** |
| Resume Lines | ❌ | ✅ | ⚠️ | ❌ | **Add** |
| **Leave Management** |
| Leave Types | ✅ | ✅ | ✅ | ✅ | - |
| Leave Requests | ✅ | ✅ | ✅ | ✅ | - |
| Compensatory Leave | ❌ | ⚠️ | ✅ | ✅ | **Add** |
| Leave Restrictions | ❌ | ⚠️ | ⚠️ | ✅ | **Add** |
| Leave Encashment | ❌ | ⚠️ | ✅ | ✅ | **Add** |
| **Attendance** |
| Attendance Records | ✅ | ✅ | ✅ | ✅ | - |
| Attendance Requests | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| Overtime Rules | ❌ | ✅ | ⚠️ | ⚠️ | **Add** |
| Biometric Integration | ❌ | ✅ | ⚠️ | ⚠️ | **Add** |
| **Payroll** |
| Salary Structure | ✅ | ✅ | ✅ | ✅ | - |
| Payroll Entries | ✅ | ✅ | ✅ | ✅ | - |
| Tax Declarations | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| Arrears | ❌ | ⚠️ | ✅ | ⚠️ | Consider |
| **Expenses** |
| Expense Reports | ❌ | ✅ | ⚠️ | ❌ | **Add** |
| Expense Categories | ❌ | ✅ | ⚠️ | ❌ | **Add** |
| **Employee Experience** |
| Bonus Points | ❌ | ❌ | ❌ | ✅ | **Add** |
| Disciplinary Actions | ❌ | ❌ | ⚠️ | ✅ | **Add** |
| **Lifecycle** |
| Promotions | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| Transfers | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| Exit Interviews | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| F&F Settlement | ❌ | ⚠️ | ✅ | ⚠️ | **Add** |
| **Travel** |
| Travel Requests | ❌ | ⚠️ | ✅ | ❌ | **Add** |
| Vehicle Management | ❌ | ⚠️ | ✅ | ❌ | **Add** |

---

## Part 5: Quick Wins (Minimal Effort, High Value)

### 5.1 Add Missing Enums
```typescript
// In _enums.ts
export const departureReasonEnum = pgEnum("departure_reason", [
  "resignation", "termination", "retirement", "layoff",
  "contract_end", "mutual_agreement", "death", "other"
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "draft", "submitted", "approved", "rejected", "paid", "cancelled"
]);

export const disciplinaryActionStatusEnum = pgEnum("disciplinary_action_status", [
  "pending", "under_review", "confirmed", "appealed", "closed", "withdrawn"
]);

export const transferTypeEnum = pgEnum("transfer_type", [
  "permanent", "temporary", "deputation", "secondment"
]);
```

### 5.2 Enhance Existing Tables

**employees table:**
```typescript
// Add fields
departureReasonId: uuid("departure_reason_id"),
departureDate: date("departure_date", { mode: "string" }),
rehireEligible: boolean("rehire_eligible"),
lastPromotionDate: date("last_promotion_date", { mode: "string" }),
```

**skills table:**
```typescript
// Add fields
skillTypeId: uuid("skill_type_id"),
defaultLevelId: uuid("default_level_id"),
```

**leaveTypeConfigs table:**
```typescript
// Add fields
isEncashable: boolean("is_encashable").default(false),
encashmentRate: numeric("encashment_rate", { precision: 5, scale: 2 }),
isCompensatory: boolean("is_compensatory").default(false),
```

---

## Conclusion

The AFENDA HR schema has a solid foundation but can be significantly enhanced by adopting proven patterns from Odoo, Frappe HRMS, and Horilla. The recommended upgrades focus on:

1. **Skills Taxonomy** - Enable skills-based workforce planning
2. **Expense Management** - Complete employee reimbursement workflow
3. **Employee Experience** - Gamification and formal disciplinary tracking
4. **Leave Enhancements** - Compensatory leave and restrictions
5. **Tax Compliance** - Employee tax declaration workflow
6. **Attendance** - Corrections, overtime rules, biometrics
7. **Lifecycle Events** - Promotions, transfers, exits

**Estimated Total New Tables:** 35-40
**Estimated Implementation Time:** 12-16 weeks
**Priority Focus:** Skills, Expenses, Employee Experience (Phase 6)
