/**
 * Typed graph validation report builder for CLI, CI, and programmatic consumers.
 */

import type { GraphValidationDb } from "./db-types.js";
import { buildFkCatalog, DEFAULT_ERP_SCHEMAS } from "./fk-catalog.js";
import { detectAllOrphans } from "./orphan-detection.js";
import { detectTenantLeaks } from "./tenant-isolation.js";
import { detectMissingFkIndexes } from "./index-remediation.js";
import { calculateHealthScore, deriveGraphValidationPolicy } from "./health-scoring.js";
import {
  catalogToSummaryDto,
  indexDetectionToCoverageDto,
  orphansToReportDto,
  tenantLeaksToReportDto,
} from "./report-dto.js";
import { runGraphValidationAdjuncts } from "./adjuncts.js";
import { GRAPH_VALIDATION_REPORT_VERSION } from "./types.js";
import type { GraphValidationReportJson } from "./types.js";

export interface BuildGraphValidationReportOptions {
  /** Schemas to scan; default DEFAULT_ERP_SCHEMAS */
  schemas?: string[];
  /** Repo root for adjunct paths (migrations, etc.) */
  repoRoot?: string;
  /** Run OSS-inspired adjunct checks */
  includeAdjuncts?: boolean;
}

function resolveRepoRoot(explicit?: string): string {
  if (explicit) return explicit;
  return process.cwd();
}

/**
 * Run full validation pipeline and return versioned JSON report DTO.
 */
/** Drizzle DB instance (`drizzle-orm/node-postgres` — same as graph-validation CLI). */
export async function buildGraphValidationReport(
  db: GraphValidationDb,
  options: BuildGraphValidationReportOptions = {}
): Promise<GraphValidationReportJson> {
  const schemas =
    options.schemas && options.schemas.length > 0 ? options.schemas : [...DEFAULT_ERP_SCHEMAS];

  const pgdb = db;
  const catalog = await buildFkCatalog(pgdb, schemas);
  const orphans = await detectAllOrphans(pgdb, catalog.relationships);
  const tenantLeaks = await detectTenantLeaks(pgdb, catalog.relationships);
  const indexDetection = await detectMissingFkIndexes(pgdb, catalog.relationships);
  const indexCoverageDto = indexDetectionToCoverageDto(indexDetection);

  const validationInputs = {
    orphans,
    tenantLeaks,
    catalog,
    indexCoverage: {
      covered: indexCoverageDto.covered,
      total: indexCoverageDto.total,
    },
    cascadeErrors: undefined as number | undefined,
  };

  const healthScore = calculateHealthScore(validationInputs);
  const generatedAt = new Date().toISOString();
  const policy = {
    ...deriveGraphValidationPolicy(validationInputs, healthScore),
    policyGeneratedAt: generatedAt,
  };

  const report: GraphValidationReportJson = {
    reportVersion: GRAPH_VALIDATION_REPORT_VERSION,
    generatedAt,
    schemasCovered: [...catalog.schemasCovered],
    policy,
    healthScore,
    indexCoverage: indexCoverageDto,
    orphans: orphansToReportDto(orphans),
    tenantLeaks: tenantLeaksToReportDto(tenantLeaks),
    catalog: catalogToSummaryDto(catalog),
  };

  if (options.includeAdjuncts) {
    report.adjuncts = runGraphValidationAdjuncts({
      repoRoot: resolveRepoRoot(options.repoRoot),
      catalog,
    });
  }

  return report;
}

export { DEFAULT_ERP_SCHEMAS };
