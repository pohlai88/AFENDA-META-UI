// ============================================================================
// HR DOMAIN EXPORTS
// Total: 97 tables across 13 domain files
// ============================================================================

// Core schema infrastructure
export * from "./_schema.js";
export * from "./_enums.js";
export * from "./_zodShared.js";
export * from "./_relations.js";

// Core HR domains (Phases 0-5)
export * from "./people.js"; // 5 tables: org structure
export * from "./employment.js"; // 3 tables: contracts & benefits
export * from "./payroll.js"; // 10 tables: compensation
export * from "./attendance.js"; // 10 tables: leave & time
export * from "./talent.js"; // 7 tables: performance & skills
export * from "./recruitment.js"; // 7 tables: hiring pipeline
export * from "./learning.js"; // 16 tables: LMS
export * from "./operations.js"; // 8 tables: ops & compliance
export * from "./benefits.js"; // 5 tables: benefits management

// Strategic HR domains (Phases 6-9)
export * from "./employeeExperience.js"; // 6 tables: self-service & engagement
export * from "./workforceStrategy.js"; // 8 tables: succession & career planning
export * from "./peopleAnalytics.js"; // 6 tables: analytics & reporting
export * from "./globalWorkforce.js"; // 6 tables: global mobility & compliance
