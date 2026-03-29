/**
 * Truth Coverage Metrics
 * =======================
 * Tracks and reports truth-test coverage across the codebase.
 *
 * **Purpose:**
 * CI enforcement to ensure mutations go through the truth engine and
 * invariants are properly tested.
 *
 * **Metrics Tracked:**
 * - % of invariants with test coverage
 * - % of mutations using truth harness vs direct DB writes
 * - % of state machines exercised in tests
 * - Direct DB write violations (should be 0)
 */
export interface TruthCoverageMetrics {
    /** Number of invariants defined in truth-config */
    invariantsTotal: number;
    /** Number of invariants with at least one test */
    invariantsCovered: number;
    /** % of invariants with test coverage */
    invariantCoveragePercent: number;
    /** Number of state machines defined */
    stateMachinesTotal: number;
    /** Number of state machines with transition tests */
    stateMachinesCovered: number;
    /** % of state machines exercised */
    stateMachineCoveragePercent: number;
    /** Number of truth harness test files */
    truthTestFiles: number;
    /** Total test count in truth test files */
    truthTestCount: number;
    /** Number of direct DB writes detected (outside harness) */
    directDbWrites: number;
    /** Files with direct DB write violations */
    violatingFiles: string[];
}
/**
 * Scan truth-test test files to count coverage.
 */
export declare function calculateTruthCoverage(rootDir: string): TruthCoverageMetrics;
/**
 * Format truth coverage metrics for console output.
 */
export declare function formatCoverageReport(metrics: TruthCoverageMetrics): string;
/**
 * Check if truth coverage meets minimum thresholds.
 * Throws error if thresholds not met (for CI enforcement).
 */
export declare function enforceCoverageThresholds(metrics: TruthCoverageMetrics, thresholds: {
    minInvariantCoverage: number;
    minStateMachineCoverage: number;
    maxDirectDbWrites: number;
}): void;
//# sourceMappingURL=index.d.ts.map