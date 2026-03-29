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
    fromField: "parent_id",
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
  departmentToCostCenter: {
    from: "departments",
    to: "cost_centers",
    kind: "many-to-one",
    fromField: "cost_center_id",
    toField: "id",
  },
  departmentManager: {
    from: "departments",
    to: "employees",
    kind: "many-to-one",
    fromField: "manager_id",
    toField: "id",
  },

  // Job Title relationships
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
    toField: "position_id",
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
  employeeToDisciplinaryActions: {
    from: "employees",
    to: "disciplinary_actions",
    kind: "one-to-many",
    fromField: "id",
    toField: "employee_id",
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

  // Leave Type relationships
  leaveTypeToAllocations: {
    from: "leave_type_configs",
    to: "leave_allocations",
    kind: "one-to-many",
    fromField: "id",
    toField: "leave_type_id",
  },
  leaveTypeToRequests: {
    from: "leave_type_configs",
    to: "leave_requests",
    kind: "one-to-many",
    fromField: "id",
    toField: "leave_type_id",
  },

  // Leave Allocation relationships
  leaveAllocationToRequests: {
    from: "leave_allocations",
    to: "leave_requests",
    kind: "one-to-many",
    fromField: "id",
    toField: "leave_allocation_id",
  },

  // Holiday Calendar relationships
  holidayCalendarToHolidays: {
    from: "holiday_calendars",
    to: "holidays",
    kind: "one-to-many",
    fromField: "id",
    toField: "calendar_id",
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

  // Shift Schedule relationships
  shiftScheduleToAssignments: {
    from: "shift_schedules",
    to: "shift_assignments",
    kind: "one-to-many",
    fromField: "id",
    toField: "shift_id",
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
    toField: "review_cycle_id",
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
  jobOpeningRecruiter: {
    from: "job_openings",
    to: "employees",
    kind: "many-to-one",
    fromField: "recruiter_id",
    toField: "id",
  },
  jobOpeningHiringManager: {
    from: "job_openings",
    to: "employees",
    kind: "many-to-one",
    fromField: "hiring_manager_id",
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

  // Expense Claim relationships
  expenseClaimToLines: {
    from: "expense_claims",
    to: "expense_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "expense_claim_id",
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
    toField: "task_id",
  },

  // Cost Center relationships
  costCenterHierarchy: {
    from: "cost_centers",
    to: "cost_centers",
    kind: "self-reference",
    fromField: "parent_id",
    toField: "id",
  },
  costCenterManager: {
    from: "cost_centers",
    to: "employees",
    kind: "many-to-one",
    fromField: "manager_id",
    toField: "id",
  },
  costCenterToDepartments: {
    from: "cost_centers",
    to: "departments",
    kind: "one-to-many",
    fromField: "id",
    toField: "cost_center_id",
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
} as const satisfies Record<string, HRRelationDefinition>;
