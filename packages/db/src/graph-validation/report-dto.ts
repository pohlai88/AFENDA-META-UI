/**
 * JSON-safe DTO mappers (no Map in output).
 */

import type { FkValidationCatalog } from "./fk-catalog.js";
import type { OrphanDetectionResults, OrphanQueryResult } from "./orphan-detection.js";
import type { TenantIsolationResults } from "./tenant-isolation.js";
import type { MissingIndexDetectionResults } from "./index-remediation.js";
import type {
  CatalogSummaryDto,
  GraphValidationIndexCoverageDto,
  OrphanViolationDto,
  OrphansReportDto,
  TenantLeakViolationDto,
  TenantLeaksReportDto,
} from "./types.js";

export function orphanRowToDto(r: OrphanQueryResult): OrphanViolationDto {
  return {
    childTableSchema: r.childTableSchema,
    childTableName: r.childTableName,
    parentTableSchema: r.parentTableSchema,
    parentTableName: r.parentTableName,
    childTable: r.childTable,
    parentTable: r.parentTable,
    fkColumn: r.fkColumn,
    parentColumn: r.parentColumn,
    orphanCount: r.orphanCount,
    sampleIds: [...r.sampleIds],
  };
}

export function orphansToReportDto(results: OrphanDetectionResults): OrphansReportDto {
  const details = [...results.byTable.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([table, violations]) => ({
      table,
      violations: violations.map(orphanRowToDto),
    }));

  return {
    total: results.total,
    byPriority: {
      P0: results.byPriority.P0.length,
      P1: results.byPriority.P1.length,
      P2: results.byPriority.P2.length,
      P3: results.byPriority.P3.length,
    },
    details,
  };
}

export function tenantLeaksToReportDto(results: TenantIsolationResults): TenantLeaksReportDto {
  const details: TenantLeakViolationDto[] = results.allViolations.map((v) => ({
    childTable: v.childTable,
    parentTable: v.parentTable,
    fkColumn: v.fkColumn,
    leakCount: v.leakCount,
    sampleViolations: v.sampleViolations.map((s) => ({
      childKey: s.childKey,
      childTenantId: s.childTenantId,
      parentKey: s.parentKey,
      parentTenantId: s.parentTenantId,
    })),
  }));

  return {
    totalLeaks: results.totalLeaks,
    isSecure: results.isSecure,
    details,
  };
}

export function catalogToSummaryDto(catalog: FkValidationCatalog): CatalogSummaryDto {
  return {
    schemasCovered: [...catalog.schemasCovered],
    totalRelationships: catalog.relationships.length,
    byPriority: {
      P0: catalog.byPriority.P0.length,
      P1: catalog.byPriority.P1.length,
      P2: catalog.byPriority.P2.length,
      P3: catalog.byPriority.P3.length,
    },
  };
}

export function indexDetectionToCoverageDto(
  detection: MissingIndexDetectionResults
): GraphValidationIndexCoverageDto {
  const missing = detection.missing;
  const total = detection.total;
  const covered = Math.max(0, total - missing);
  return { covered, total, missing };
}

/**
 * Deterministic JSON stringify: sort object keys recursively for stable diffs / golden tests.
 */
export function stringifyReportDeterministic(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2);
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}
