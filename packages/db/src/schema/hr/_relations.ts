// ============================================================================
// HR Relations Catalog
// Maintains an in-code registry of symbolic relationships between HR tables (for docs/reverse engineering).
// ============================================================================
export type HRRelationDefinition = {
  from: string;
  to: string;
  kind: "one-to-many" | "many-to-one" | "self-reference";
  fromField: string;
  toField: string;
};

export const hrRelations = {
  // Department relationships
  departmentHierarchy: {
    from: "departments",
    to: "departments",
    kind: "self-reference",
    fromField: "parent_department_id",
    toField: "id",
  },
  departmentToJobPositions: {
    from: "departments",
    to: "job_positions",
    kind: "one-to-many",
    fromField: "id",
    toField: "department_id",
  },
  departmentToEmployees: {
    from: "departments",
    to: "employees",
    kind: "one-to-many",
    fromField: "id",
    toField: "department_id",
  },

  // Job Title relationships
  jobTitleToDepartment: {
    from: "job_titles",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  jobTitleToPositions: {
    from: "job_titles",
    to: "job_positions",
    kind: "one-to-many",
    fromField: "id",
    toField: "job_title_id",
  },

  // Job Position relationships
  jobPositionHierarchy: {
    from: "job_positions",
    to: "job_positions",
    kind: "self-reference",
    fromField: "reports_to_position_id",
    toField: "id",
  },
  jobPositionToEmployees: {
    from: "job_positions",
    to: "employees",
    kind: "one-to-many",
    fromField: "id",
    toField: "job_position_id",
  },
  jobPositionToOpenings: {
    from: "job_positions",
    to: "job_openings",
    kind: "one-to-many",
    fromField: "id",
    toField: "job_position_id",
  },
  jobPositionToOffers: {
    from: "job_positions",
    to: "job_offers",
    kind: "one-to-many",
    fromField: "id",
    toField: "job_position_id",
  },

  // Employee relationships
  employeeManager: {
    from: "employees",
    to: "employees",
    kind: "self-reference",
    fromField: "manager_id",
    toField: "id",
  },
  employeeToContracts: {
    from: "employees",
    to: "employment_contracts",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToSalaries: {
    from: "employees",
    to: "employee_salaries",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToPayrollEntries: {
    from: "employees",
    to: "payroll_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToLeaveAllocations: {
    from: "employees",
    to: "leave_allocations",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToLeaveRequests: {
    from: "employees",
    to: "leave_requests",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToTimeSheets: {
    from: "employees",
    to: "time_sheets",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToAttendance: {
    from: "employees",
    to: "attendance_records",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToShiftAssignments: {
    from: "employees",
    to: "shift_assignments",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToBenefits: {
    from: "employees",
    to: "employee_benefits",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  /** Phase-1 benefits module (`benefits.ts`): provider-centric enrollments and claims */
  employeeToBenefitEnrollments: {
    from: "employees",
    to: "benefit_enrollments",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  benefitProviderToEnrollments: {
    from: "benefit_providers",
    to: "benefit_enrollments",
    kind: "one-to-many",
    fromField: "id",
    toField: "benefit_provider_id",
  },
  benefitEnrollmentToDependentCoverage: {
    from: "benefit_enrollments",
    to: "benefit_dependent_coverage",
    kind: "one-to-many",
    fromField: "id",
    toField: "benefit_enrollment_id",
  },
  benefitEnrollmentToBenefitClaims: {
    from: "benefit_enrollments",
    to: "benefit_claims",
    kind: "one-to-many",
    fromField: "id",
    toField: "benefit_enrollment_id",
  },
  employeeToBenefitClaimsReviewed: {
    from: "employees",
    to: "benefit_claims",
    kind: "one-to-many",
    fromField: "id",
    toField: "reviewed_by",
  },
  benefitProviderToBenefitPlanBenefits: {
    from: "benefit_providers",
    to: "benefit_plan_benefits",
    kind: "one-to-many",
    fromField: "id",
    toField: "benefit_provider_id",
  },
  employeeToReviews: {
    from: "employees",
    to: "performance_reviews",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToGoals: {
    from: "employees",
    to: "goals",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToSkills: {
    from: "employees",
    to: "employee_skills",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToCertifications: {
    from: "employees",
    to: "employee_certifications",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToDocuments: {
    from: "employees",
    to: "employee_documents",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToExpenseClaims: {
    from: "employees",
    to: "expense_claims",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  expenseClaimApprover: {
    from: "expense_claims",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  expenseReportToEmployee: {
    from: "expense_reports",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  expenseReportApprover: {
    from: "expense_reports",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  expenseLineToReport: {
    from: "expense_lines",
    to: "expense_reports",
    kind: "many-to-one",
    fromField: "expense_report_id",
    toField: "id",
  },
  expenseLineToCategory: {
    from: "expense_lines",
    to: "expense_categories",
    kind: "many-to-one",
    fromField: "category_id",
    toField: "id",
  },
  expenseApprovalToReport: {
    from: "expense_approvals",
    to: "expense_reports",
    kind: "many-to-one",
    fromField: "expense_report_id",
    toField: "id",
  },
  expenseApprovalToApprover: {
    from: "expense_approvals",
    to: "employees",
    kind: "many-to-one",
    fromField: "approver_id",
    toField: "id",
  },
  employeeToDisciplinaryActions: {
    from: "employees",
    to: "disciplinary_actions",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  disciplinaryActionIssuer: {
    from: "disciplinary_actions",
    to: "employees",
    kind: "many-to-one",
    fromField: "issued_by",
    toField: "id",
  },
  employeeToExitInterview: {
    from: "employees",
    to: "exit_interviews",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },
  employeeToOnboardingProgress: {
    from: "employees",
    to: "onboarding_progress",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
  },

  // Employment Contract relationships
  contractToEmployee: {
    from: "employment_contracts",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Salary Component relationships
  salaryComponentToEmployeeSalaries: {
    from: "salary_components",
    to: "employee_salaries",
    kind: "one-to-many",
    fromField: "id",
    toField: "salary_component_id",
  },
  salaryComponentToPayrollLines: {
    from: "salary_components",
    to: "payroll_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "salary_component_id",
  },

  // Employee Salary relationships
  employeeSalaryToComponent: {
    from: "employee_salaries",
    to: "salary_components",
    kind: "many-to-one",
    fromField: "salary_component_id",
    toField: "id",
  },

  // Payroll Period relationships
  payrollPeriodToEntries: {
    from: "payroll_periods",
    to: "payroll_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "payroll_period_id",
  },

  // Payroll Entry relationships
  payrollEntryToLines: {
    from: "payroll_entries",
    to: "payroll_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "payroll_entry_id",
  },

  // Compensation planning (compensation.ts)
  compensationBudgetToCycle: {
    from: "compensation_budgets",
    to: "compensation_cycles",
    kind: "many-to-one",
    fromField: "cycle_id",
    toField: "id",
  },
  compensationBudgetToDepartment: {
    from: "compensation_budgets",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  compensationBudgetToPosition: {
    from: "compensation_budgets",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "position_id",
    toField: "id",
  },
  equityGrantToEmployee: {
    from: "equity_grants",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  equityGrantToVestingSchedule: {
    from: "equity_grants",
    to: "vesting_schedules",
    kind: "many-to-one",
    fromField: "vesting_schedule_id",
    toField: "id",
  },
  marketBenchmarkToJobPosition: {
    from: "market_benchmarks",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "job_position_id",
    toField: "id",
  },

  // Leave Type relationships
  leaveTypeToAllocations: {
    from: "leave_type_configs",
    to: "leave_allocations",
    kind: "one-to-many",
    fromField: "id",
    toField: "leave_type_config_id",
  },
  leaveTypeToRequests: {
    from: "leave_type_configs",
    to: "leave_requests",
    kind: "one-to-many",
    fromField: "id",
    toField: "leave_type_config_id",
  },
  leaveRequestApprover: {
    from: "leave_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // Leave enhancements (leaveEnhancements.ts)
  compensatoryLeaveRequestToEmployee: {
    from: "compensatory_leave_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  compensatoryLeaveRequestToLeaveType: {
    from: "compensatory_leave_requests",
    to: "leave_type_configs",
    kind: "many-to-one",
    fromField: "leave_type_id",
    toField: "id",
  },
  compensatoryLeaveRequestToAttendanceRecord: {
    from: "compensatory_leave_requests",
    to: "attendance_records",
    kind: "many-to-one",
    fromField: "attendance_record_id",
    toField: "id",
  },
  compensatoryLeaveRequestApprover: {
    from: "compensatory_leave_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  leaveRestrictionToDepartment: {
    from: "leave_restrictions",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  leaveRestrictionToJobPosition: {
    from: "leave_restrictions",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "job_position_id",
    toField: "id",
  },
  leaveEncashmentToEmployee: {
    from: "leave_encashments",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  leaveEncashmentToLeaveType: {
    from: "leave_encashments",
    to: "leave_type_configs",
    kind: "many-to-one",
    fromField: "leave_type_id",
    toField: "id",
  },
  leaveEncashmentApprover: {
    from: "leave_encashments",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // Holiday Calendar relationships
  holidayCalendarToHolidays: {
    from: "holiday_calendars",
    to: "holidays",
    kind: "one-to-many",
    fromField: "id",
    toField: "holiday_calendar_id",
  },

  // Time Sheet relationships
  timeSheetToEmployee: {
    from: "time_sheets",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  timeSheetToLines: {
    from: "time_sheets",
    to: "time_sheet_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "time_sheet_id",
  },
  timeSheetApprover: {
    from: "time_sheets",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // Shift Schedule relationships
  shiftScheduleToAssignments: {
    from: "shift_schedules",
    to: "shift_assignments",
    kind: "one-to-many",
    fromField: "id",
    toField: "shift_schedule_id",
  },

  // Attendance enhancements (attendanceEnhancements.ts)
  attendanceRequestToEmployee: {
    from: "attendance_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  attendanceRequestApprover: {
    from: "attendance_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  biometricLogToDevice: {
    from: "biometric_logs",
    to: "biometric_devices",
    kind: "many-to-one",
    fromField: "device_id",
    toField: "id",
  },
  biometricLogToEmployee: {
    from: "biometric_logs",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  biometricLogToAttendanceRecord: {
    from: "biometric_logs",
    to: "attendance_records",
    kind: "many-to-one",
    fromField: "attendance_record_id",
    toField: "id",
  },

  // Benefit Plan relationships
  benefitPlanToEmployeeBenefits: {
    from: "benefit_plans",
    to: "employee_benefits",
    kind: "one-to-many",
    fromField: "id",
    toField: "benefit_plan_id",
  },

  // Performance Review Cycle relationships
  reviewCycleToReviews: {
    from: "performance_review_cycles",
    to: "performance_reviews",
    kind: "one-to-many",
    fromField: "id",
    toField: "cycle_id",
  },

  // Performance Review relationships
  reviewToEmployee: {
    from: "performance_reviews",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  reviewToReviewer: {
    from: "performance_reviews",
    to: "employees",
    kind: "many-to-one",
    fromField: "reviewer_id",
    toField: "id",
  },

  // Appraisal templates / KRAs
  appraisalTemplateKraToTemplate: {
    from: "appraisal_template_kras",
    to: "appraisal_templates",
    kind: "many-to-one",
    fromField: "template_id",
    toField: "id",
  },
  employeeKraToEmployee: {
    from: "employee_kras",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeKraToReview: {
    from: "employee_kras",
    to: "performance_reviews",
    kind: "many-to-one",
    fromField: "review_id",
    toField: "id",
  },
  employeeKraToTemplateKra: {
    from: "employee_kras",
    to: "appraisal_template_kras",
    kind: "many-to-one",
    fromField: "kra_id",
    toField: "id",
  },

  // Goal relationships
  goalToEmployee: {
    from: "goals",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Skill relationships
  skillToEmployeeSkills: {
    from: "skills",
    to: "employee_skills",
    kind: "one-to-many",
    fromField: "id",
    toField: "skill_id",
  },
  employeeSkillVerifier: {
    from: "employee_skills",
    to: "employees",
    kind: "many-to-one",
    fromField: "verified_by",
    toField: "id",
  },
  skillLevelToSkillType: {
    from: "skill_levels",
    to: "skill_types",
    kind: "many-to-one",
    fromField: "skill_type_id",
    toField: "id",
  },
  jobPositionSkillToPosition: {
    from: "job_position_skills",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "job_position_id",
    toField: "id",
  },
  jobPositionSkillToSkill: {
    from: "job_position_skills",
    to: "skills",
    kind: "many-to-one",
    fromField: "skill_id",
    toField: "id",
  },
  jobPositionSkillToRequiredLevel: {
    from: "job_position_skills",
    to: "skill_levels",
    kind: "many-to-one",
    fromField: "required_level_id",
    toField: "id",
  },
  employeeResumeLineToEmployee: {
    from: "employee_resume_lines",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeResumeLineToResumeLineType: {
    from: "employee_resume_lines",
    to: "resume_line_types",
    kind: "many-to-one",
    fromField: "resume_line_type_id",
    toField: "id",
  },

  // Certification relationships
  certificationToEmployeeCertifications: {
    from: "certifications",
    to: "employee_certifications",
    kind: "one-to-many",
    fromField: "id",
    toField: "certification_id",
  },

  // Job Opening relationships
  jobOpeningToApplications: {
    from: "job_openings",
    to: "job_applications",
    kind: "one-to-many",
    fromField: "id",
    toField: "job_opening_id",
  },
  jobOpeningHiringManager: {
    from: "job_openings",
    to: "employees",
    kind: "many-to-one",
    fromField: "hiring_manager_id",
    toField: "id",
  },
  jobOpeningToDepartment: {
    from: "job_openings",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  recruitmentPipelineStageToJobOpening: {
    from: "recruitment_pipeline_stages",
    to: "job_openings",
    kind: "many-to-one",
    fromField: "job_opening_id",
    toField: "id",
  },
  recruitmentAnalyticsToJobOpening: {
    from: "recruitment_analytics",
    to: "job_openings",
    kind: "many-to-one",
    fromField: "job_opening_id",
    toField: "id",
  },
  resumeParsedDataToApplication: {
    from: "resume_parsed_data",
    to: "job_applications",
    kind: "many-to-one",
    fromField: "application_id",
    toField: "id",
  },

  // Job Application relationships
  applicationToInterviews: {
    from: "job_applications",
    to: "interviews",
    kind: "one-to-many",
    fromField: "id",
    toField: "application_id",
  },
  applicationToOffers: {
    from: "job_applications",
    to: "job_offers",
    kind: "one-to-many",
    fromField: "id",
    toField: "application_id",
  },

  // Interview relationships
  interviewToApplication: {
    from: "interviews",
    to: "job_applications",
    kind: "many-to-one",
    fromField: "application_id",
    toField: "id",
  },
  interviewToInterviewer: {
    from: "interviews",
    to: "employees",
    kind: "many-to-one",
    fromField: "interviewer_id",
    toField: "id",
  },

  // Training Program relationships
  trainingProgramToSessions: {
    from: "training_programs",
    to: "training_sessions",
    kind: "one-to-many",
    fromField: "id",
    toField: "training_program_id",
  },

  // Training Session relationships
  trainingSessionToAttendance: {
    from: "training_sessions",
    to: "training_attendance",
    kind: "one-to-many",
    fromField: "id",
    toField: "training_session_id",
  },
  trainingSessionTrainer: {
    from: "training_sessions",
    to: "employees",
    kind: "many-to-one",
    fromField: "trainer_id",
    toField: "id",
  },

  // Onboarding Checklist relationships
  onboardingChecklistToTasks: {
    from: "onboarding_checklists",
    to: "onboarding_tasks",
    kind: "one-to-many",
    fromField: "id",
    toField: "checklist_id",
  },
  onboardingChecklistToDepartment: {
    from: "onboarding_checklists",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  onboardingChecklistToPosition: {
    from: "onboarding_checklists",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "job_position_id",
    toField: "id",
  },

  // Onboarding Task relationships
  onboardingTaskToProgress: {
    from: "onboarding_tasks",
    to: "onboarding_progress",
    kind: "one-to-many",
    fromField: "id",
    toField: "onboarding_task_id",
  },
  onboardingProgressCompletedBy: {
    from: "onboarding_progress",
    to: "employees",
    kind: "many-to-one",
    fromField: "completed_by",
    toField: "id",
  },

  // Cost Center relationships
  costCenterHierarchy: {
    from: "cost_centers",
    to: "cost_centers",
    kind: "self-reference",
    fromField: "parent_cost_center_id",
    toField: "id",
  },
  costCenterManager: {
    from: "cost_centers",
    to: "employees",
    kind: "many-to-one",
    fromField: "manager_id",
    toField: "id",
  },

  // Learning Domain Relations (Phase 2)
  // Course relationships
  courseToModules: {
    from: "courses",
    to: "course_modules",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_id",
  },
  courseToSessions: {
    from: "courses",
    to: "course_sessions",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_id",
  },
  courseToPrerequisites: {
    from: "courses",
    to: "course_prerequisites",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_id",
  },
  courseToMaterials: {
    from: "courses",
    to: "course_materials",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_id",
  },
  courseInstructor: {
    from: "courses",
    to: "employees",
    kind: "many-to-one",
    fromField: "instructor_id",
    toField: "id",
  },
  courseCategoryToDepartment: {
    from: "courses",
    to: "departments",
    kind: "many-to-one",
    fromField: "category_id",
    toField: "id",
  },
  learningPathCourseToCourse: {
    from: "learning_path_courses",
    to: "courses",
    kind: "many-to-one",
    fromField: "course_id",
    toField: "id",
  },
  assessmentAttemptToCourseEnrollment: {
    from: "assessment_attempts",
    to: "course_enrollments",
    kind: "many-to-one",
    fromField: "course_enrollment_id",
    toField: "id",
  },
  learningPathEnrollmentToEmployee: {
    from: "learning_path_enrollments",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  certificateToCourse: {
    from: "certificates",
    to: "courses",
    kind: "many-to-one",
    fromField: "course_id",
    toField: "id",
  },
  coursePrerequisiteToOwningCourse: {
    from: "course_prerequisites",
    to: "courses",
    kind: "many-to-one",
    fromField: "course_id",
    toField: "id",
  },
  coursePrerequisiteToPrerequisiteCourse: {
    from: "course_prerequisites",
    to: "courses",
    kind: "many-to-one",
    fromField: "prerequisite_course_id",
    toField: "id",
  },
  courseMaterialToCourseModule: {
    from: "course_materials",
    to: "course_modules",
    kind: "many-to-one",
    fromField: "course_module_id",
    toField: "id",
  },

  // Course Module relationships
  courseModuleToCourse: {
    from: "course_modules",
    to: "courses",
    kind: "many-to-one",
    fromField: "course_id",
    toField: "id",
  },
  courseModuleToAssessments: {
    from: "course_modules",
    to: "assessments",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_module_id",
  },
  courseModuleToProgress: {
    from: "course_modules",
    to: "learning_progress",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_module_id",
  },
  courseModulePrerequisite: {
    from: "course_modules",
    to: "course_modules",
    kind: "self-reference",
    fromField: "prerequisite_module_id",
    toField: "id",
  },

  // Learning Path relationships
  learningPathToCourses: {
    from: "learning_paths",
    to: "learning_path_courses",
    kind: "one-to-many",
    fromField: "id",
    toField: "learning_path_id",
  },
  learningPathToEnrollments: {
    from: "learning_paths",
    to: "learning_path_enrollments",
    kind: "one-to-many",
    fromField: "id",
    toField: "learning_path_id",
  },

  // Assessment relationships
  assessmentToQuestions: {
    from: "assessments",
    to: "assessment_questions",
    kind: "one-to-many",
    fromField: "id",
    toField: "assessment_id",
  },
  assessmentToAttempts: {
    from: "assessments",
    to: "assessment_attempts",
    kind: "one-to-many",
    fromField: "id",
    toField: "assessment_id",
  },

  // Course Session relationships
  courseSessionToEnrollments: {
    from: "course_sessions",
    to: "course_enrollments",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_session_id",
  },
  courseSessionToCosts: {
    from: "course_sessions",
    to: "training_costs",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_session_id",
  },
  courseSessionInstructor: {
    from: "course_sessions",
    to: "employees",
    kind: "many-to-one",
    fromField: "instructor_id",
    toField: "id",
  },

  // Course Enrollment relationships
  courseEnrollmentToProgress: {
    from: "course_enrollments",
    to: "learning_progress",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_enrollment_id",
  },
  courseEnrollmentToFeedback: {
    from: "course_enrollments",
    to: "training_feedback",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_enrollment_id",
  },
  courseEnrollmentToCertificates: {
    from: "course_enrollments",
    to: "certificates",
    kind: "one-to-many",
    fromField: "id",
    toField: "course_enrollment_id",
  },
  courseEnrollmentEmployee: {
    from: "course_enrollments",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Certificate relationships
  certificateToEnrollment: {
    from: "certificates",
    to: "course_enrollments",
    kind: "many-to-one",
    fromField: "course_enrollment_id",
    toField: "id",
  },
  certificateEmployee: {
    from: "certificates",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Payroll Enhancement Relations (Phase 3)
  // Tax Bracket relationships
  taxBracketToCountry: {
    from: "tax_brackets",
    to: "countries",
    kind: "many-to-one",
    fromField: "country",
    toField: "code",
  },

  // Statutory Deduction relationships
  statutoryDeductionToCountry: {
    from: "statutory_deductions",
    to: "countries",
    kind: "many-to-one",
    fromField: "country",
    toField: "code",
  },

  // Tax compliance (taxCompliance.ts)
  taxExemptionSubCategoryToCategory: {
    from: "tax_exemption_sub_categories",
    to: "tax_exemption_categories",
    kind: "many-to-one",
    fromField: "category_id",
    toField: "id",
  },
  employeeTaxDeclarationToEmployee: {
    from: "employee_tax_declarations",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeTaxDeclarationVerifier: {
    from: "employee_tax_declarations",
    to: "employees",
    kind: "many-to-one",
    fromField: "verified_by",
    toField: "id",
  },
  taxDeclarationItemToDeclaration: {
    from: "tax_declaration_items",
    to: "employee_tax_declarations",
    kind: "many-to-one",
    fromField: "declaration_id",
    toField: "id",
  },
  taxDeclarationItemToSubCategory: {
    from: "tax_declaration_items",
    to: "tax_exemption_sub_categories",
    kind: "many-to-one",
    fromField: "sub_category_id",
    toField: "id",
  },
  taxExemptionProofToDeclarationItem: {
    from: "tax_exemption_proofs",
    to: "tax_declaration_items",
    kind: "many-to-one",
    fromField: "declaration_item_id",
    toField: "id",
  },
  taxExemptionProofVerifier: {
    from: "tax_exemption_proofs",
    to: "employees",
    kind: "many-to-one",
    fromField: "verified_by",
    toField: "id",
  },

  // Payroll Adjustment relationships
  payrollAdjustmentToEntry: {
    from: "payroll_adjustments",
    to: "payroll_entries",
    kind: "many-to-one",
    fromField: "payroll_entry_id",
    toField: "id",
  },
  payrollAdjustmentApprover: {
    from: "payroll_adjustments",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // People analytics (peopleAnalytics.ts)
  analyticsDashboardToOwner: {
    from: "analytics_dashboards",
    to: "employees",
    kind: "many-to-one",
    fromField: "owner_id",
    toField: "id",
  },
  dataExportRequestedBy: {
    from: "data_exports",
    to: "employees",
    kind: "many-to-one",
    fromField: "requested_by",
    toField: "id",
  },

  // Payslip relationships
  payslipToEntry: {
    from: "payslips",
    to: "payroll_entries",
    kind: "many-to-one",
    fromField: "payroll_entry_id",
    toField: "id",
  },

  // Payment Distribution relationships
  paymentDistributionToEntry: {
    from: "payment_distributions",
    to: "payroll_entries",
    kind: "many-to-one",
    fromField: "payroll_entry_id",
    toField: "id",
  },
  paymentDistributionToCurrency: {
    from: "payment_distributions",
    to: "currencies",
    kind: "many-to-one",
    fromField: "currency_id",
    toField: "currency_id",
  },

  // Recruitment Enhancement Relations (Phase 4)
  // Applicant Document relationships
  applicantDocumentToApplication: {
    from: "applicant_documents",
    to: "job_applications",
    kind: "many-to-one",
    fromField: "application_id",
    toField: "id",
  },
  applicantDocumentUploader: {
    from: "applicant_documents",
    to: "employees",
    kind: "many-to-one",
    fromField: "uploaded_by",
    toField: "id",
  },
  applicantDocumentVerifier: {
    from: "applicant_documents",
    to: "employees",
    kind: "many-to-one",
    fromField: "verified_by",
    toField: "id",
  },

  // Interview Feedback relationships
  interviewFeedbackToInterview: {
    from: "interview_feedback",
    to: "interviews",
    kind: "many-to-one",
    fromField: "interview_id",
    toField: "id",
  },
  interviewFeedbackToInterviewer: {
    from: "interview_feedback",
    to: "employees",
    kind: "many-to-one",
    fromField: "interviewer_id",
    toField: "id",
  },

  // Offer Letter relationships
  offerLetterToJobOffer: {
    from: "offer_letters",
    to: "job_offers",
    kind: "many-to-one",
    fromField: "job_offer_id",
    toField: "id",
  },
  offerLetterGenerator: {
    from: "offer_letters",
    to: "employees",
    kind: "many-to-one",
    fromField: "generated_by",
    toField: "id",
  },
  offerLetterSender: {
    from: "offer_letters",
    to: "employees",
    kind: "many-to-one",
    fromField: "sent_by",
    toField: "id",
  },

  // Grievance Management (SWOT)
  grievanceCategoryHierarchy: {
    from: "grievance_categories",
    to: "grievance_categories",
    kind: "self-reference",
    fromField: "parent_category_id",
    toField: "id",
  },
  grievanceCategoryToGrievances: {
    from: "grievance_categories",
    to: "employee_grievances",
    kind: "one-to-many",
    fromField: "id",
    toField: "category_id",
  },
  grievanceToEmployee: {
    from: "employee_grievances",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  grievanceToDepartment: {
    from: "employee_grievances",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  grievanceAssignedToEmployee: {
    from: "employee_grievances",
    to: "employees",
    kind: "many-to-one",
    fromField: "assigned_to_id",
    toField: "id",
  },
  grievanceAgainstEmployee: {
    from: "employee_grievances",
    to: "employees",
    kind: "many-to-one",
    fromField: "against_employee_id",
    toField: "id",
  },
  grievanceEscalatedToEmployee: {
    from: "employee_grievances",
    to: "employees",
    kind: "many-to-one",
    fromField: "escalated_to_id",
    toField: "id",
  },

  // Global workforce (globalWorkforce.ts)
  internationalAssignmentToEmployee: {
    from: "international_assignments",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  assignmentAllowanceToAssignment: {
    from: "assignment_allowances",
    to: "international_assignments",
    kind: "many-to-one",
    fromField: "assignment_id",
    toField: "id",
  },
  workPermitToEmployee: {
    from: "work_permits",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  complianceTrackingReviewer: {
    from: "compliance_tracking",
    to: "employees",
    kind: "many-to-one",
    fromField: "reviewed_by",
    toField: "id",
  },
  relocationServiceToAssignment: {
    from: "relocation_services",
    to: "international_assignments",
    kind: "many-to-one",
    fromField: "assignment_id",
    toField: "id",
  },

  // Travel & vehicles (travel.ts)
  travelRequestToEmployee: {
    from: "travel_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  travelRequestApprover: {
    from: "travel_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  travelItineraryToRequest: {
    from: "travel_itineraries",
    to: "travel_requests",
    kind: "many-to-one",
    fromField: "travel_request_id",
    toField: "id",
  },
  companyVehicleToAssignedEmployee: {
    from: "company_vehicles",
    to: "employees",
    kind: "many-to-one",
    fromField: "assigned_employee_id",
    toField: "id",
  },
  vehicleLogToVehicle: {
    from: "vehicle_logs",
    to: "company_vehicles",
    kind: "many-to-one",
    fromField: "vehicle_id",
    toField: "id",
  },
  vehicleLogToEmployee: {
    from: "vehicle_logs",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Workforce planning (workforcePlanning.ts)
  staffingPlanToDepartment: {
    from: "staffing_plans",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  staffingPlanApprover: {
    from: "staffing_plans",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  staffingPlanDetailToPlan: {
    from: "staffing_plan_details",
    to: "staffing_plans",
    kind: "many-to-one",
    fromField: "staffing_plan_id",
    toField: "id",
  },
  staffingPlanDetailToJobPosition: {
    from: "staffing_plan_details",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "job_position_id",
    toField: "id",
  },

  // Succession & career paths (workforceStrategy.ts)
  successionPlanToCriticalPosition: {
    from: "succession_plans",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "critical_position_id",
    toField: "id",
  },
  successionPlanToSuccessorEmployee: {
    from: "succession_plans",
    to: "employees",
    kind: "many-to-one",
    fromField: "successor_employee_id",
    toField: "id",
  },
  talentPoolMemberToPool: {
    from: "talent_pool_members",
    to: "talent_pools",
    kind: "many-to-one",
    fromField: "pool_id",
    toField: "id",
  },
  talentPoolMemberToEmployee: {
    from: "talent_pool_members",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  careerPathToDepartment: {
    from: "career_paths",
    to: "departments",
    kind: "many-to-one",
    fromField: "department_id",
    toField: "id",
  },
  careerPathStepToPath: {
    from: "career_path_steps",
    to: "career_paths",
    kind: "many-to-one",
    fromField: "path_id",
    toField: "id",
  },
  careerPathStepToPosition: {
    from: "career_path_steps",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "position_id",
    toField: "id",
  },
  careerPathStepPrerequisite: {
    from: "career_path_steps",
    to: "career_path_steps",
    kind: "self-reference",
    fromField: "prerequisite_step_id",
    toField: "id",
  },
  careerAspirationToEmployee: {
    from: "career_aspirations",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  careerAspirationToTargetPosition: {
    from: "career_aspirations",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "target_position_id",
    toField: "id",
  },
  careerAspirationToTargetPath: {
    from: "career_aspirations",
    to: "career_paths",
    kind: "many-to-one",
    fromField: "target_path_id",
    toField: "id",
  },

  // Loan Management (SWOT)
  loanTypeToEmployeeLoans: {
    from: "loan_types",
    to: "employee_loans",
    kind: "one-to-many",
    fromField: "id",
    toField: "loan_type_id",
  },
  employeeLoanToEmployee: {
    from: "employee_loans",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeLoanApprover: {
    from: "employee_loans",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // Policy acknowledgments (upgrade guide)
  hrPolicyDocumentToAcknowledgments: {
    from: "hr_policy_documents",
    to: "employee_policy_acknowledgments",
    kind: "one-to-many",
    fromField: "id",
    toField: "policy_document_id",
  },
  employeePolicyAcknowledgmentToEmployee: {
    from: "employee_policy_acknowledgments",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  onboardingTaskToPolicyDocument: {
    from: "onboarding_tasks",
    to: "hr_policy_documents",
    kind: "many-to-one",
    fromField: "linked_policy_document_id",
    toField: "id",
  },

  // Shift swap workflow
  shiftSwapRequester: {
    from: "shift_swap_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "requester_employee_id",
    toField: "id",
  },
  shiftSwapCounterpart: {
    from: "shift_swap_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "counterpart_employee_id",
    toField: "id",
  },
  shiftSwapRequesterAssignment: {
    from: "shift_swap_requests",
    to: "shift_assignments",
    kind: "many-to-one",
    fromField: "requester_shift_assignment_id",
    toField: "id",
  },
  shiftSwapCounterpartAssignment: {
    from: "shift_swap_requests",
    to: "shift_assignments",
    kind: "many-to-one",
    fromField: "counterpart_shift_assignment_id",
    toField: "id",
  },
  shiftSwapManagerApprover: {
    from: "shift_swap_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "manager_approved_by",
    toField: "id",
  },

  // Employee experience (employeeExperience.ts)
  employeeSelfServiceProfileToEmployee: {
    from: "employee_self_service_profiles",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeRequestToEmployee: {
    from: "employee_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeRequestApprover: {
    from: "employee_requests",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  employeeNotificationToEmployee: {
    from: "employee_notifications",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeePreferenceToEmployee: {
    from: "employee_preferences",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  surveyResponseToSurvey: {
    from: "survey_responses",
    to: "employee_surveys",
    kind: "many-to-one",
    fromField: "survey_id",
    toField: "id",
  },
  surveyResponseToEmployee: {
    from: "survey_responses",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },

  // Employee lifecycle (lifecycle.ts)
  employeePromotionToEmployee: {
    from: "employee_promotions",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeePromotionFromJobPosition: {
    from: "employee_promotions",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "from_job_position_id",
    toField: "id",
  },
  employeePromotionToJobPosition: {
    from: "employee_promotions",
    to: "job_positions",
    kind: "many-to-one",
    fromField: "to_job_position_id",
    toField: "id",
  },
  employeePromotionFromDepartment: {
    from: "employee_promotions",
    to: "departments",
    kind: "many-to-one",
    fromField: "from_department_id",
    toField: "id",
  },
  employeePromotionToDepartment: {
    from: "employee_promotions",
    to: "departments",
    kind: "many-to-one",
    fromField: "to_department_id",
    toField: "id",
  },
  employeePromotionApprover: {
    from: "employee_promotions",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  employeeTransferToEmployee: {
    from: "employee_transfers",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  employeeTransferFromDepartment: {
    from: "employee_transfers",
    to: "departments",
    kind: "many-to-one",
    fromField: "from_department_id",
    toField: "id",
  },
  employeeTransferToDepartment: {
    from: "employee_transfers",
    to: "departments",
    kind: "many-to-one",
    fromField: "to_department_id",
    toField: "id",
  },
  employeeTransferApprover: {
    from: "employee_transfers",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },
  exitInterviewToInterviewer: {
    from: "exit_interviews",
    to: "employees",
    kind: "many-to-one",
    fromField: "interviewer_id",
    toField: "id",
  },
  fullFinalSettlementToEmployee: {
    from: "full_final_settlements",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  fullFinalSettlementApprover: {
    from: "full_final_settlements",
    to: "employees",
    kind: "many-to-one",
    fromField: "approved_by",
    toField: "id",
  },

  // Engagement / bonus points (engagement.ts)
  employeeBonusPointsToEmployee: {
    from: "employee_bonus_points",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  bonusPointTransactionToEmployee: {
    from: "bonus_point_transactions",
    to: "employees",
    kind: "many-to-one",
    fromField: "employee_id",
    toField: "id",
  },
  bonusPointTransactionToRule: {
    from: "bonus_point_transactions",
    to: "bonus_point_rules",
    kind: "many-to-one",
    fromField: "rule_id",
    toField: "id",
  },
} as const satisfies Record<string, HRRelationDefinition>;
