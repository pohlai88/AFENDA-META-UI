// ============================================================================
// HR DOMAIN: ONBOARDING MODULE — SUPERSEDED AS STANDALONE TABLES
// ============================================================================
// Onboarding tables live in `operations.ts` (`onboardingChecklists`, `onboardingTasks`,
// `onboardingProgress`). v2.2 wired SWOT enums and constraints there:
//   - `onboardingTaskCategoryEnum`, `onboardingTaskStatusEnum` on tasks/progress
//   - `requiresDocument`, `requiresAcknowledgment`, optional `linkedPolicyDocumentId` → `hr_policy_documents`
//   - `detailedTaskStatus`, `submittedDocumentUrl`, `taskAcknowledgedAt` on progress
//   - Zod insert schemas: `insertOnboardingTaskSchema`, `insertOnboardingProgressSchema`, etc.
//
// Company-wide policy attestation uses `policyAcknowledgments.ts` (`hrPolicyDocuments`,
// `employeePolicyAcknowledgments`). This file remains as a pointer for imports and search.
// ============================================================================

export {};
