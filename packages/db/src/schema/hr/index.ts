// ============================================================================
// HR DOMAIN EXPORTS
// Total: 146 tables in hr.* (see hr-docs/HR_SCHEMA_UPGRADE_GUIDE.md → P0 domain placement audit)
// ============================================================================
// Core schema infrastructure
export * from "./_schema.js";
export * from "./_enums.js";
export * from "./_zodShared.js";
export * from "./_relations.js";

// Core HR domains (Phases 0-5)
export * from "./people.js"; // 5 tables: org structure
export * from "./employment.js"; // 3 tables: employment contracts
export * from "./payroll.js"; // 10 tables: compensation
export * from "./attendance.js"; // 10 tables: leave & time
export * from "./talent.js"; // 5 tables: performance & certifications (skills → skills.ts)
export * from "./recruitment.js"; // 10 tables: hiring pipeline + pipeline analytics + resume parsing
export * from "./learning.js"; // 16 tables: LMS
export * from "./policyAcknowledgments.js"; // 2 tables: HR policies & employee attestations
export * from "./operations.js"; // 5 tables: documents, discipline, onboarding
export * from "./benefits.js"; // 5 tables: benefits & coverage

// Strategic HR domains (Phases 6-9)
export * from "./employeeExperience.js"; // 6 tables: employee self-service
export * from "./workforceStrategy.js"; // 6 tables: succession, talent pools, career paths
export * from "./peopleAnalytics.js"; // 6 tables: analytics & reporting
export * from "./globalWorkforce.js"; // 6 tables: global mobility

// Schema Upgrade Modules (Priority 1 & 2)
export * from "./skills.js"; // 7 tables: skills taxonomy, proficiency, and resume lines
export * from "./expenses.js"; // 6 tables: expense management
export * from "./engagement.js"; // 3 tables: rewards & recognition
export * from "./leaveEnhancements.js"; // 3 tables: compensatory leave & restrictions
export * from "./taxCompliance.js"; // 5 tables: tax exemption system
export * from "./attendanceEnhancements.js"; // 5 tables: requests, OT rules, biometric, shift swap
export * from "./lifecycle.js"; // 4 tables: employee lifecycle events
export * from "./travel.js"; // 4 tables: travel & vehicle management

// Schema Upgrade Modules (Priority 3)
export * from "./workforcePlanning.js"; // 2 tables: staffing plans & workforce planning
export * from "./appraisalTemplates.js"; // 3 tables: appraisal templates & KRAs

// Phase 7: Compensation Planning
export * from "./compensation.js"; // 5 tables: compensation planning, equity & benchmarks

// SWOT Proposals: Critical Gap Closures
export * from "./grievances.js"; // 2 tables: grievance categories & employee grievances
export * from "./loans.js"; // 2 tables: loan types & employee loans
// NOTE: onboarding.ts superseded — tables already exist in operations.ts (see onboarding.ts header)
