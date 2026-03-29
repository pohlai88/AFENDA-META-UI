# HR Schema Diagrams

**Date:** 2026-03-29
**Version:** 2.0
**Domains:** 6 (People, Benefits, Learning, Payroll, Recruitment, Attendance)

---

## Overview

This document contains Entity Relationship Diagrams (ERDs) for all HR domains using Mermaid syntax. Each diagram shows the relationships between tables, primary keys (PK), foreign keys (FK), and important constraints.

---

## People Domain ERD

```mermaid
erDiagram
    TENANTS ||--o{ EMPLOYEES : "contains"
    DEPARTMENTS ||--o{ EMPLOYEES : "employs"
    JOB_POSITIONS ||--o{ EMPLOYEES : "holds"
    EMPLOYEES ||--o{ EMPLOYEES : "manages"
    EMPLOYEES ||--o{ EMPLOYEE_DEPENDENTS : "has"
    EMPLOYEES ||--o{ EMPLOYEE_EMERGENCY_CONTACTS : "has"
    EMPLOYEES ||--o{ EMPLOYEE_ADDRESSES : "resides at"
    EMPLOYEES ||--o{ SALARY_COMPONENTS : "defines"
    EMPLOYEES ||--o{ EMPLOYEE_SALARIES : "receives"

    TENANTS {
        int tenant_id PK
        string tenant_code UK
        string tenant_name
        jsonb metadata
    }

    DEPARTMENTS {
        uuid id PK
        int tenant_id FK
        string department_code UK
        string department_name
        uuid parent_department_id FK
        uuid manager_id FK
    }

    JOB_POSITIONS {
        uuid id PK
        int tenant_id FK
        string position_code UK
        string position_title
        string position_level
        string job_family
        string job_grade
    }

    EMPLOYEES {
        uuid id PK
        int tenant_id FK
        string employee_number UK
        string email UK
        string phone_number
        uuid department_id FK
        uuid job_position_id FK
        uuid manager_id FK
        date hire_date
        date termination_date
        string employment_status
        jsonb personal_info
    }

    EMPLOYEE_DEPENDENTS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        string dependent_name
        enum relationship
        date date_of_birth
        boolean is_student
    }

    EMPLOYEE_EMERGENCY_CONTACTS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        string contact_name
        string relationship
        string phone_number
        string email
        boolean is_primary
    }

    EMPLOYEE_ADDRESSES {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        enum address_type
        string address_line1
        string address_line2
        string city
        string state
        string postal_code
        string country
        boolean is_primary
    }

    SALARY_COMPONENTS {
        uuid id PK
        int tenant_id FK
        string component_code UK
        string component_name
        enum component_type
        boolean is_recurring
        boolean is_taxable
        boolean is_statutory
        string calculation_formula
    }

    EMPLOYEE_SALARIES {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        uuid salary_component_id FK
        decimal amount
        int currency_id FK
        date effective_date
        date end_date
    }
```

---

## Benefits Domain ERD

```mermaid
erDiagram
    BENEFIT_PROVIDERS ||--o{ BENEFIT_PLANS : "provides"
    BENEFIT_PLANS ||--o{ BENEFIT_ENROLLMENTS : "covers"
    EMPLOYEES ||--o{ BENEFIT_ENROLLMENTS : "enrolls"
    BENEFIT_ENROLLMENTS ||--o{ BENEFIT_DEPENDENT_COVERAGES : "covers"
    BENEFIT_ENROLLMENTS ||--o{ BENEFIT_CLAIMS : "generates"
    EMPLOYEES ||--o{ BENEFIT_CLAIMS : "files"

    BENEFIT_PROVIDERS {
        uuid id PK
        int tenant_id FK
        string provider_code UK
        string provider_name
        enum provider_type
        string contact_email
        string contact_phone
        string website
        jsonb provider_details
    }

    BENEFIT_PLANS {
        uuid id PK
        int tenant_id FK
        uuid provider_id FK
        string plan_code UK
        string plan_name
        enum plan_type
        enum coverage_level
        decimal monthly_cost
        decimal employer_contribution
        decimal employee_contribution
        jsonb plan_details
        boolean is_active
    }

    BENEFIT_ENROLLMENTS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        uuid benefit_plan_id FK
        date enrollment_date
        date effective_date
        date end_date
        enum enrollment_status
        enum coverage_level
        decimal monthly_premium
        jsonb enrollment_data
    }

    BENEFIT_DEPENDENT_COVERAGES {
        uuid id PK
        int tenant_id FK
        uuid enrollment_id FK
        string dependent_name
        enum relationship
        date date_of_birth
        enum coverage_level
        decimal additional_premium
    }

    BENEFIT_CLAIMS {
        uuid id PK
        int tenant_id FK
        string claim_number UK
        uuid enrollment_id FK
        uuid employee_id FK
        date claim_date
        enum claim_status
        enum claim_type
        decimal claim_amount
        decimal approved_amount
        date service_date
        string description
        jsonb claim_details
    }
```

---

## Learning Domain ERD

```mermaid
erDiagram
    COURSES ||--o{ COURSE_SESSIONS : "has"
    COURSES ||--o{ COURSE_ENROLLMENTS : "enrolled in"
    COURSE_SESSIONS ||--o{ COURSE_ENROLLMENTS : "attends"
    COURSES ||--o{ COURSE_PREREQUISITES : "requires"
    COURSES ||--o{ COURSE_MATERIALS : "contains"
    COURSE_ENROLLMENTS ||--o{ ASSESSMENT_ATTEMPTS : "takes"
    COURSE_ENROLLMENTS ||--|| CERTIFICATES : "earns"
    EMPLOYEES ||--o{ COURSE_ENROLLMENTS : "enrolls"
    EMPLOYEES ||--o{ CERTIFICATES : "awarded to"

    COURSES {
        uuid id PK
        int tenant_id FK
        string course_code UK
        string course_title
        string course_description
        string course_level
        string delivery_method
        int duration_hours
        decimal cost
        string currency
        uuid instructor_id FK
        boolean is_active
        jsonb course_metadata
    }

    COURSE_SESSIONS {
        uuid id PK
        int tenant_id FK
        uuid course_id FK
        string session_code UK
        string session_title
        date start_date
        date end_date
        string location
        string meeting_link
        int max_capacity
        int enrolled_count
        enum session_status
        uuid instructor_id FK
    }

    COURSE_ENROLLMENTS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        uuid course_id FK
        uuid session_id FK
        date enrollment_date
        enum enrollment_status
        date completion_date
        decimal score
        boolean passed
        boolean certificate_issued
        jsonb enrollment_data
    }

    COURSE_PREREQUISITES {
        uuid id PK
        int tenant_id FK
        uuid course_id FK
        uuid prerequisite_course_id FK
        enum prerequisite_type
        boolean is_mandatory
    }

    COURSE_MATERIALS {
        uuid id PK
        int tenant_id FK
        uuid course_id FK
        string material_name
        enum material_type
        string material_url
        int file_size
        string mime_type
        boolean is_required
        int display_order
    }

    ASSESSMENT_ATTEMPTS {
        uuid id PK
        int tenant_id FK
        uuid enrollment_id FK
        string assessment_name
        enum assessment_type
        date attempt_date
        decimal score
        decimal max_score
        boolean passed
        string feedback
        jsonb attempt_data
    }

    CERTIFICATES {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        uuid course_id FK
        string certificate_number UK
        date issued_date
        date expiry_date
        string certificate_url
        string certificate_hash
        boolean is_verified
        jsonb certificate_data
    }
```

---

## Payroll Domain ERD

```mermaid
erDiagram
    PAYROLL_PERIODS ||--o{ PAYROLL_ENTRIES : "covers"
    EMPLOYEES ||--o{ PAYROLL_ENTRIES : "paid in"
    PAYROLL_ENTRIES ||--o{ PAYROLL_LINES : "contains"
    SALARY_COMPONENTS ||--o{ PAYROLL_LINES : "defines"
    PAYROLL_ENTRIES ||--o{ PAYROLL_ADJUSTMENTS : "adjusted by"
    PAYROLL_ENTRIES ||--|| PAYSLIPS : "generates"
    PAYROLL_ENTRIES ||--o{ PAYMENT_DISTRIBUTIONS : "paid via"
    CURRENCIES ||--o{ PAYROLL_ENTRIES : "uses"
    CURRENCIES ||--o{ PAYMENT_DISTRIBUTIONS : "uses"

    PAYROLL_PERIODS {
        uuid id PK
        int tenant_id FK
        string period_code UK
        string period_name
        date start_date
        date end_date
        date payment_date
        enum payroll_status
        string notes
    }

    PAYROLL_ENTRIES {
        uuid id PK
        int tenant_id FK
        uuid payroll_period_id FK
        uuid employee_id FK
        decimal gross_pay
        decimal total_deductions
        decimal net_pay
        int currency_id FK
        enum payment_method
        string payment_reference
        date payment_date
        string notes
    }

    PAYROLL_LINES {
        uuid id PK
        int tenant_id FK
        uuid payroll_entry_id FK
        uuid salary_component_id FK
        decimal amount
        int quantity
        string notes
    }

    PAYROLL_ADJUSTMENTS {
        uuid id PK
        int tenant_id FK
        uuid payroll_entry_id FK
        enum adjustment_type
        decimal amount
        string reason
        uuid approved_by FK
        date approved_at
        boolean is_taxable
        boolean is_recurring
        date applies_to_period
        string notes
    }

    PAYSLIPS {
        uuid id PK
        int tenant_id FK
        uuid payroll_entry_id FK
        string payslip_number UK
        string payslip_period
        date pay_date
        string document_url
        string document_hash
        boolean is_accessible
        string access_code
        date emailed_at
        date viewed_at
    }

    PAYMENT_DISTRIBUTIONS {
        uuid id PK
        int tenant_id FK
        uuid payroll_entry_id FK
        string batch_id
        string transaction_id
        enum payment_method
        string bank_name
        string bank_code
        string account_number
        string account_name
        decimal amount
        int currency_id FK
        enum status
        date processed_at
        date settled_at
        string failure_reason
        string reference
        jsonb metadata
    }

    TAX_BRACKETS {
        uuid id PK
        int tenant_id FK
        string country
        enum tax_type
        date effective_from
        date effective_to
        decimal min_income
        decimal max_income
        decimal rate
        decimal base_amount
        string description
        boolean is_active
    }

    STATUTORY_DEDUCTIONS {
        uuid id PK
        int tenant_id FK
        string country
        enum deduction_type
        date effective_from
        date effective_to
        decimal employee_rate
        decimal employer_rate
        decimal max_monthly_salary
        decimal max_monthly_contribution
        int min_age
        int max_age
        string description
        boolean is_active
    }
```

---

## Recruitment Domain ERD

```mermaid
erDiagram
    JOB_OPENINGS ||--o{ JOB_APPLICATIONS : "receives"
    JOB_OPENINGS ||--|| JOB_POSITIONS : "for"
    JOB_OPENINGS ||--|| DEPARTMENTS : "in"
    EMPLOYEES ||--o{ JOB_OPENINGS : "manages"
    JOB_APPLICATIONS ||--o{ INTERVIEWS : "has"
    JOB_APPLICATIONS ||--|| JOB_OFFERS : "results in"
    INTERVIEWS ||--o{ INTERVIEW_FEEDBACK : "evaluated by"
    EMPLOYEES ||--o{ INTERVIEWS : "conducts"
    EMPLOYEES ||--o{ INTERVIEW_FEEDBACK : "provides"
    JOB_OFFERS ||--o{ OFFER_LETTERS : "generates"
    JOB_APPLICATIONS ||--o{ APPLICANT_DOCUMENTS : "includes"

    JOB_OPENINGS {
        uuid id PK
        int tenant_id FK
        string opening_code UK
        string name
        string description
        uuid job_position_id FK
        uuid department_id FK
        int number_of_openings
        enum recruitment_status
        date posted_date
        date closing_date
        uuid hiring_manager_id FK
        string requirements
        string responsibilities
    }

    JOB_APPLICATIONS {
        uuid id PK
        int tenant_id FK
        string application_number UK
        uuid job_opening_id FK
        string applicant_name
        string applicant_email
        string applicant_phone
        string resume_url
        string cover_letter
        date application_date
        enum application_status
        decimal current_ctc
        decimal expected_ctc
        int notice_period_days
        string notes
    }

    INTERVIEWS {
        uuid id PK
        int tenant_id FK
        uuid application_id FK
        enum interview_stage
        timestamp interview_date
        uuid interviewer_id FK
        string location
        string meeting_link
        enum interview_result
        string feedback
        int rating
        string notes
    }

    INTERVIEW_FEEDBACK {
        uuid id PK
        int tenant_id FK
        uuid interview_id FK
        uuid interviewer_id FK
        enum feedback_criteria
        int rating
        string comments
        string strengths
        string weaknesses
        string recommendation
        boolean is_completed
        timestamp submitted_at
    }

    JOB_OFFERS {
        uuid id PK
        int tenant_id FK
        string offer_number UK
        uuid application_id FK
        uuid job_position_id FK
        date offer_date
        enum offer_status
        decimal offer_salary
        int currency_id FK
        date joining_date
        date offer_valid_until
        string offer_letter_url
        date accepted_date
        date rejected_date
        string notes
    }

    OFFER_LETTERS {
        uuid id PK
        int tenant_id FK
        uuid job_offer_id FK
        string template_id
        string offer_letter_number UK
        timestamp generated_at
        uuid generated_by FK
        string document_url
        string document_hash
        enum status
        timestamp sent_at
        uuid sent_by FK
        timestamp viewed_at
        timestamp accepted_at
        timestamp rejected_at
        string rejection_reason
        timestamp expires_at
        int version
        string notes
    }

    APPLICANT_DOCUMENTS {
        uuid id PK
        int tenant_id FK
        uuid application_id FK
        enum document_type
        string document_name
        string document_url
        int document_size
        string mime_type
        timestamp uploaded_at
        uuid uploaded_by FK
        boolean is_verified
        timestamp verified_at
        uuid verified_by FK
        string notes
    }
```

---

## Attendance Domain ERD

```mermaid
erDiagram
    EMPLOYEES ||--o{ ATTENDANCE_RECORDS : "has"
    ATTENDANCE_RECORDS ||--o{ ATTENDANCE_ADJUSTMENTS : "adjusted by"
    SHIFTS ||--o{ ATTENDANCE_RECORDS : "scheduled in"
    LEAVE_REQUESTS ||--o{ ATTENDANCE_RECORDS : "affects"
    EMPLOYEES ||--o{ LEAVE_REQUESTS : "requests"
    LEAVE_TYPES ||--o{ LEAVE_REQUESTS : "categorizes"

    ATTENDANCE_RECORDS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        date attendance_date
        time clock_in
        time clock_out
        time break_start
        time break_end
        decimal total_hours
        decimal overtime_hours
        enum attendance_status
        uuid shift_id FK
        string notes
        jsonb attendance_data
    }

    ATTENDANCE_ADJUSTMENTS {
        uuid id PK
        int tenant_id FK
        uuid attendance_record_id FK
        enum adjustment_type
        decimal original_hours
        decimal adjusted_hours
        string reason
        uuid approved_by FK
        date approved_at
        string notes
    }

    SHIFTS {
        uuid id PK
        int tenant_id FK
        string shift_code UK
        string shift_name
        time start_time
        time end_time
        time break_duration
        enum shift_type
        decimal total_hours
        boolean is_active
        jsonb shift_settings
    }

    LEAVE_REQUESTS {
        uuid id PK
        int tenant_id FK
        uuid employee_id FK
        uuid leave_type_id FK
        date start_date
        date end_date
        decimal days_requested
        string reason
        enum leave_status
        date applied_date
        uuid approved_by FK
        date approved_date
        string approver_notes
        jsonb leave_data
    }

    LEAVE_TYPES {
        uuid id PK
        int tenant_id FK
        string leave_type_code UK
        string leave_type_name
        string description
        decimal max_days_per_year
        boolean requires_approval
        boolean is_paid
        boolean accrual_enabled
        decimal accrual_rate
        jsonb leave_settings
    }
```

---

## Cross-Domain Relationships

```mermaid
erDiagram
    TENANTS ||--o{ ALL_TABLES : "owns"
    EMPLOYEES ||--o{ BENEFIT_ENROLLMENTS : "enrolls"
    EMPLOYEES ||--o{ COURSE_ENROLLMENTS : "learns"
    EMPLOYEES ||--o{ PAYROLL_ENTRIES : "paid"
    EMPLOYEES ||--o{ ATTENDANCE_RECORDS : "attends"
    EMPLOYEES ||--o{ LEAVE_REQUESTS : "requests"
    EMPLOYEES ||--o{ JOB_APPLICATIONS : "applies"
    EMPLOYEES ||--o{ INTERVIEWS : "interviews"
    EMPLOYEES ||--o{ CERTIFICATES : "earned"
    CURRENCIES ||--o{ SALARY_COMPONENTS : "uses"
    CURRENCIES ||--o{ COURSES : "priced in"
    CURRENCIES ||--o{ PAYROLL_ENTRIES : "paid in"
```

---

## Legend

| Symbol | Meaning     |
| ------ | ----------- | ---- | ----------- | --- | ---------- |
| PK     | Primary Key |
| FK     | Foreign Key |
| UK     | Unique Key  |
|        |             | --o{ | One to Many |
|        |             | --   |             |     | One to One |
| }o--   |             |      | Many to One |

---

## Notes

1. **Tenant Isolation**: All tables include `tenant_id` for multi-tenancy
2. **Audit Columns**: Most tables include `created_at`, `updated_at`, `created_by`, `updated_by`
3. **Soft Delete**: Many tables include `deleted_at` for soft deletion
4. **JSONB Fields**: Used for flexible metadata and extensible data storage
5. **Enums**: Used for controlled vocabularies and status tracking

---

## Workflow State Diagrams

### 1. Recruitment Workflow

```mermaid
stateDiagram-v2
    [*] --> JobOpening
    JobOpening --> Open : Post Job
    Open --> InProgress : Start Screening
    InProgress --> OnHold : Pause Hiring
    InProgress --> Filled : Hire Candidate
    OnHold --> InProgress : Resume
    Open --> Cancelled : Cancel Opening
    InProgress --> Cancelled : Cancel Opening
    Filled --> [*]
    Cancelled --> [*]

    state ApplicationFlow {
        [*] --> Received
        Received --> Screening : Review
        Screening --> Shortlisted : Pass
        Screening --> Rejected : Fail
        Shortlisted --> InterviewScheduled : Schedule
        InterviewScheduled --> Interviewed : Complete
        Interviewed --> OfferExtended : Select
        Interviewed --> Rejected : Reject
        OfferExtended --> OfferAccepted : Accept
        OfferExtended --> OfferRejected : Decline
        OfferAccepted --> [*]
        OfferRejected --> [*]
        Rejected --> [*]
    }

    state OfferLetterFlow {
        [*] --> Draft
        Draft --> Sent : Send
        Sent --> Viewed : Open
        Viewed --> Accepted : Sign
        Viewed --> Rejected : Decline
        Sent --> Expired : Timeout
        Sent --> Withdrawn : Withdraw
        Accepted --> [*]
        Rejected --> [*]
        Expired --> [*]
        Withdrawn --> [*]
    }
```

### 2. Benefits Enrollment Workflow

```mermaid
stateDiagram-v2
    [*] --> EligibilityCheck
    EligibilityCheck --> Eligible : Pass
    EligibilityCheck --> Ineligible : Fail
    Ineligible --> [*]

    Eligible --> EnrollmentPeriod
    EnrollmentPeriod --> PendingEnrollment : Employee Applies
    PendingEnrollment --> Approved : Manager Approves
    PendingEnrollment --> Rejected : Manager Rejects
    Rejected --> [*]

    Approved --> Active : Effective Date
    Active --> UnderReview : Changes Requested
    UnderReview --> Active : Approved
    UnderReview --> Terminated : Cancelled

    Active --> Terminated : Employee Leaves
    Terminated --> [*]

    state ClaimProcess {
        [*] --> Submitted
        Submitted --> UnderReview : Review
        UnderReview --> Approved : Approve
        UnderReview --> Rejected : Deny
        UnderReview --> MoreInfo : Request Docs
        MoreInfo --> UnderReview : Provide
        Approved --> Paid : Pay
        Rejected --> [*]
        Paid --> [*]
    }
```

### 3. Payroll Processing Workflow

```mermaid
stateDiagram-v2
    [*] --> CreatePeriod
    CreatePeriod --> Draft : Initialize
    Draft --> Computed : Calculate
    Computed --> UnderReview : Review
    UnderReview --> Approved : Approve
    UnderReview --> Draft : Corrections
    Approved --> Paid : Process Payments
    Paid --> [*]

    state PaymentFlow {
        [*] --> Pending
        Pending --> Processing : Initiate
        Processing --> Completed : Success
        Processing --> Failed : Error
        Failed --> Processing : Retry
        Failed --> Returned : Return
        Completed --> [*]
        Returned --> [*]
    }

    state PayslipGeneration {
        [*] --> Generating
        Generating --> Generated : Create PDF
        Generated --> Emailed : Send
        Generated --> Accessible : Generate Code
        Emailed --> Viewed : Open
        Accessible --> Viewed : Login
        Viewed --> [*]
    }
```

---

## Generated On

**Date:** 2026-03-29
**Tool:** Manual generation based on schema definitions
**Version:** HR Schema v2.0
