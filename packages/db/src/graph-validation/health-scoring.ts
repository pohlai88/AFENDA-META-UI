/**
 * Graph Health Scoring
 * =====================
 * Calculates overall graph health score based on:
 * - Orphan count (40% weight)
 * - Index coverage (25% weight)
 * - Tenant isolation (25% weight)
 * - Cascade behavior correctness (10% weight)
 */

import type { OrphanDetectionResults } from "./orphan-detection.js";
import type { TenantIsolationResults } from "./tenant-isolation.js";
import type { FkValidationCatalog } from "./fk-catalog.js";

export interface GraphHealthScore {
  overall: number; // 0-100
  dimensions: {
    orphanScore: number; // 0-40
    indexScore: number; // 0-25
    tenantScore: number; // 0-25
    cascadeScore: number; // 0-10
  };
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  recommendations: string[];
}

export interface ValidationInputs {
  orphans: OrphanDetectionResults;
  tenantLeaks: TenantIsolationResults;
  catalog: FkValidationCatalog;
  indexCoverage?: { covered: number; total: number }; // Optional, calculated separately
  cascadeErrors?: number; // Optional, calculated separately
}

/**
 * Calculate orphan dimension score (40 points max)
 */
function calculateOrphanScore(orphans: OrphanDetectionResults): number {
  const { total, criticalViolations } = orphans;

  // P0/P1 orphans are weighted heavily
  const criticalCount = criticalViolations.reduce((sum, v) => sum + v.orphanCount, 0);
  const nonCriticalCount = total - criticalCount;

  // Scoring: -1pt per critical orphan, -0.1pt per non-critical orphan
  const penalty = criticalCount * 1.0 + nonCriticalCount * 0.1;
  const score = Math.max(0, 40 - penalty);

  return Number(score.toFixed(2));
}

/**
 * Calculate tenant isolation score (25 points max)
 */
function calculateTenantScore(tenantLeaks: TenantIsolationResults): number {
  // Binary scoring: 0 leaks = 25pts, any leaks = 0pts (security incident)
  return tenantLeaks.isSecure ? 25 : 0;
}

/**
 * Calculate index coverage score (25 points max)
 */
function calculateIndexScore(indexCoverage?: { covered: number; total: number }): number {
  if (!indexCoverage || indexCoverage.total === 0) {
    return 25; // Assume perfect if not provided
  }

  const coverage = indexCoverage.covered / indexCoverage.total;
  return Number((coverage * 25).toFixed(2));
}

/**
 * Calculate cascade behavior score (10 points max)
 */
function calculateCascadeScore(cascadeErrors?: number): number {
  if (cascadeErrors === undefined) {
    return 10; // Assume perfect if not provided
  }

  // -2pts per incorrect CASCADE rule
  const score = Math.max(0, 10 - cascadeErrors * 2);
  return Number(score.toFixed(2));
}

/**
 * Assign letter grade based on overall score
 */
function assignGrade(overall: number): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (overall >= 98) return "A+";
  if (overall >= 90) return "A";
  if (overall >= 80) return "B";
  if (overall >= 70) return "C";
  if (overall >= 60) return "D";
  return "F";
}

/**
 * Assign status based on overall score
 */
function assignStatus(overall: number): "HEALTHY" | "WARNING" | "CRITICAL" {
  if (overall >= 95) return "HEALTHY";
  if (overall >= 70) return "WARNING";
  return "CRITICAL";
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(inputs: ValidationInputs, score: GraphHealthScore): string[] {
  const recommendations: string[] = [];

  // Orphan recommendations
  if (inputs.orphans.criticalViolations.length > 0) {
    recommendations.push(
      `🔴 CRITICAL: ${inputs.orphans.criticalViolations.length} P0/P1 FK violations detected. Run cleanup: pnpm --filter @afenda/db graph-validation clean --tier=P0`
    );
  }

  if (inputs.orphans.total > 0) {
    recommendations.push(
      `🟡 ${inputs.orphans.total} total orphaned records found. Review samples and schedule cleanup.`
    );
  }

  // Tenant isolation recommendations
  if (!inputs.tenantLeaks.isSecure) {
    recommendations.push(
      `🚨 SECURITY: ${inputs.tenantLeaks.totalLeaks} cross-tenant FK violations. THIS IS A SECURITY INCIDENT. Escalate immediately.`
    );
  }

  // Index coverage recommendations
  if (inputs.indexCoverage && inputs.indexCoverage.covered < inputs.indexCoverage.total) {
    const missing = inputs.indexCoverage.total - inputs.indexCoverage.covered;
    recommendations.push(
      `⚡ ${missing} FK columns lack indexes. Add indexes to improve query performance: pnpm graph-validation add-indexes`
    );
  }

  // Cascade behavior recommendations
  if (inputs.cascadeErrors && inputs.cascadeErrors > 0) {
    recommendations.push(
      `⚠️  ${inputs.cascadeErrors} FK constraints have incorrect CASCADE rules. Review and fix delete behavior.`
    );
  }

  // Overall health recommendations
  if (score.status === "CRITICAL") {
    recommendations.push(
      `❌ Overall health CRITICAL. Production deployment should be blocked until score > 70.`
    );
  } else if (score.status === "WARNING") {
    recommendations.push(
      `⚠️  Overall health WARNING. Schedule cleanup within 1 week to prevent degradation.`
    );
  } else {
    recommendations.push(
      `✅ Overall health HEALTHY. Continue routine monitoring and quarterly validation.`
    );
  }

  return recommendations;
}

/**
 * Calculate comprehensive graph health score
 */
export function calculateHealthScore(inputs: ValidationInputs): GraphHealthScore {
  const dimensions = {
    orphanScore: calculateOrphanScore(inputs.orphans),
    indexScore: calculateIndexScore(inputs.indexCoverage),
    tenantScore: calculateTenantScore(inputs.tenantLeaks),
    cascadeScore: calculateCascadeScore(inputs.cascadeErrors),
  };

  const overall = Object.values(dimensions).reduce((sum, score) => sum + score, 0);
  const grade = assignGrade(overall);
  const status = assignStatus(overall);
  const recommendations = generateRecommendations(inputs, {
    overall,
    dimensions,
    grade,
    status,
    recommendations: [],
  });

  return {
    overall: Number(overall.toFixed(2)),
    dimensions,
    grade,
    status,
    recommendations,
  };
}

/**
 * Format health score report for console output
 */
export function formatHealthReport(score: GraphHealthScore): string {
  const statusEmoji = score.status === "HEALTHY" ? "✅" : score.status === "WARNING" ? "⚠️" : "❌";
  const gradeColor =
    score.grade === "A+" || score.grade === "A" ? "green" : score.grade === "B" ? "yellow" : "red";

  let report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AFENDA Graph Validation Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Overall Health Score: ${score.overall}/100 (Grade: ${score.grade})
  Status: ${statusEmoji} ${score.status}

  Dimension Scores:
  ├─ Orphan Count:      ${score.dimensions.orphanScore}/40pts
  ├─ Index Coverage:    ${score.dimensions.indexScore}/25pts
  ├─ Tenant Isolation:  ${score.dimensions.tenantScore}/25pts
  └─ Cascade Behavior:  ${score.dimensions.cascadeScore}/10pts

  Recommendations:
`;

  for (const rec of score.recommendations) {
    report += `  ${rec}\n`;
  }

  report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return report.trim();
}
