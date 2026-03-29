---
"@afenda/db": minor
---

Add Grievance Management and Loan Management schemas based on HR SWOT analysis

**Grievance Management (P0 — Legal/Compliance Critical):**
- `grievance_categories` — Configurable taxonomy (harassment, discrimination, workplace safety, etc.) with escalation rules and self-referencing parent hierarchy
- `employee_grievances` — Full lifecycle tracking with investigation, resolution, escalation, appeal, anonymous filing, satisfaction scoring, and 6 CHECK constraints for date sequencing

**Loan Management (P1 — APAC/MEA Market Requirement):**
- `loan_types` — Configurable loan products (salary advance, housing, vehicle, education, medical, emergency) with eligibility rules
- `employee_loans` — EMI tracking, repayment schedules, disbursement workflow, installment counters, currency FK, and 12 CHECK constraints for financial integrity

**Supporting infrastructure:**
- 8 new pgEnums: grievance_category_type, grievance_status, grievance_priority, loan_category, loan_status, loan_repayment_frequency, onboarding_task_status, onboarding_task_category
- 4 new branded ID schemas: GrievanceCategoryId, GrievanceId, LoanTypeId, EmployeeLoanId
- 2 new workflow state machines: grievanceWorkflow, loanWorkflow
- ERDs and state diagrams added to SCHEMA_DIAGRAM.md
- Full SWOT analysis report at .reports/hr-schema-swot-analysis.md
