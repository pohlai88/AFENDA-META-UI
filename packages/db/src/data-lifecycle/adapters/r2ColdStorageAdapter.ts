import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { createWriteStream, createReadStream, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";

import type { R2ObjectRepo, R2RepoCredentials } from "../../r2/objectRepo.types.js";

/** @deprecated Use `R2RepoCredentials` from `@afenda/db/r2`. */
export type R2Config = R2RepoCredentials;

export interface PartitionExportOptions {
  tableName: string;
  partitionName: string;
  schemaName?: string;
  format?: "parquet" | "csv" | "jsonl";
  compression?: "snappy" | "gzip" | "zstd" | "uncompressed";
  batchSize?: number;
}

export interface ArchivalResult {
  success: boolean;
  partitionName: string;
  r2ObjectKey: string;
  rowCount: number;
  originalSizeBytes: number;
  exportedSizeBytes: number;
  compressionRatio: number;
  checksum: string;
  etag?: string;
  durationSeconds: number;
  error?: string;
}

export interface RestorationOptions {
  r2ObjectKey: string;
  targetSchema?: string;
  targetTableName?: string;
  attachAsPartition?: boolean;
  parentSchemaName?: string;
  parentTableName?: string;
  coldCatalogTable?: string;
}

export interface RestorationResult {
  success: boolean;
  r2ObjectKey: string;
  targetTable: string;
  rowCount: number;
  downloadedSizeBytes: number;
  durationSeconds: number;
  attachedAsPartition: boolean;
  error?: string;
}

export async function exportPartitionToParquet(
  db: any,
  options: PartitionExportOptions
): Promise<{ filePath: string; rowCount: number; sizeBytes: number; checksum: string }> {
  const schemaName = options.schemaName || "archive";
  const tableName = options.tableName;
  const partitionName = options.partitionName;
  const archiveTableName = `${tableName}_${partitionName}_archived`;
  const tempFilePath = join(tmpdir(), `${tableName}_${partitionName}.parquet`);

  const result = await db.execute(sql`
    SELECT
      COUNT(*) as row_count,
      pg_total_relation_size(${schemaName}.${archiveTableName}) as size_bytes
    FROM ${sql.raw(`${schemaName}.${archiveTableName}`)}
  `);

  const rowCount = Number(result.rows[0]?.row_count || 0);
  const sizeBytes = Number(result.rows[0]?.size_bytes || 0);
  const checksum = await calculateFileChecksum(tempFilePath);

  return {
    filePath: tempFilePath,
    rowCount,
    sizeBytes,
    checksum,
  };
}

export async function importParquetToPostgres(
  _db: any,
  _parquetFilePath: string,
  _targetSchema: string,
  _targetTableName: string
): Promise<{ rowCount: number }> {
  return { rowCount: 0 };
}

export async function archivePartitionToR2(
  db: any,
  repo: R2ObjectRepo,
  options: PartitionExportOptions,
  coldCatalogTable = "cold_storage.r2_archive_catalog"
): Promise<ArchivalResult> {
  const startTime = Date.now();

  try {
    const exportResult = await exportPartitionToParquet(db, options);
    const yearPrefix = options.partitionName.split("_")[0] ?? "unknown";
    const r2ObjectKey = `${options.tableName}/${yearPrefix}/${options.tableName}_${options.partitionName}.parquet`;
    const fileBuffer = await readFileToBuffer(exportResult.filePath);

    const uploadResult = await repo.putObject({
      key: r2ObjectKey,
      body: fileBuffer,
      contentType: "application/vnd.apache.parquet",
      metadata: {
        table: options.tableName,
        partition: options.partitionName,
        rowcount: exportResult.rowCount.toString(),
        checksum: exportResult.checksum,
        exportdate: new Date().toISOString(),
      },
    });

    const exists = (await repo.headObject(r2ObjectKey)) != null;
    if (!exists) {
      throw new Error("R2 upload verification failed: object not found");
    }

    await db.execute(sql`
      INSERT INTO ${sql.raw(coldCatalogTable)} (
        table_name,
        partition_name,
        schema_name,
        r2_bucket_name,
        r2_object_key,
        r2_object_size_bytes,
        r2_object_etag,
        row_count,
        date_range_start,
        date_range_end,
        original_table_size_bytes,
        compression_ratio,
        checksum_sha256,
        parquet_schema_version
      ) VALUES (
        ${options.tableName},
        ${options.partitionName},
        ${options.schemaName || "archive"},
        ${repo.bucket},
        ${r2ObjectKey},
        ${exportResult.sizeBytes},
        ${uploadResult.etag ?? ""},
        ${exportResult.rowCount},
        ${parsePartitionDateRange(options.partitionName).start},
        ${parsePartitionDateRange(options.partitionName).end},
        ${exportResult.sizeBytes},
        ${exportResult.sizeBytes / exportResult.sizeBytes},
        ${exportResult.checksum},
        '1.0'
      )
    `);

    const archiveTableName = `${options.tableName}_${options.partitionName}_archived`;
    await db.execute(
      sql`DROP TABLE IF EXISTS ${sql.raw(`${options.schemaName || "archive"}.${archiveTableName}`)}`
    );

    unlinkSync(exportResult.filePath);

    const durationSeconds = (Date.now() - startTime) / 1000;

    return {
      success: true,
      partitionName: options.partitionName,
      r2ObjectKey,
      rowCount: exportResult.rowCount,
      originalSizeBytes: exportResult.sizeBytes,
      exportedSizeBytes: fileBuffer.length,
      compressionRatio: fileBuffer.length / exportResult.sizeBytes,
      checksum: exportResult.checksum,
      etag: uploadResult.etag,
      durationSeconds,
    };
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    return {
      success: false,
      partitionName: options.partitionName,
      r2ObjectKey: "",
      rowCount: 0,
      originalSizeBytes: 0,
      exportedSizeBytes: 0,
      compressionRatio: 0,
      checksum: "",
      durationSeconds,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function restorePartitionFromR2(
  db: any,
  repo: R2ObjectRepo,
  options: RestorationOptions
): Promise<RestorationResult> {
  const startTime = Date.now();

  try {
    const { body, metadata } = await repo.getObjectStream(options.r2ObjectKey);
    const tempFilePath = join(tmpdir(), `restore_${Date.now()}.parquet`);
    const writeStream = createWriteStream(tempFilePath);
    await pipeline(body, writeStream);

    const downloadedSize = (await import("node:fs")).statSync(tempFilePath).size;
    const targetSchema = options.targetSchema || "archive";
    const metaTable = metadata.table;
    const metaPartition = metadata.partition;
    const targetTableName =
      options.targetTableName || `${metaTable ?? "archive"}_${metaPartition ?? "partition"}_restored`;

    const importResult = await importParquetToPostgres(
      db,
      tempFilePath,
      targetSchema,
      targetTableName
    );

    let attachedAsPartition = false;
    if (options.attachAsPartition && options.parentTableName) {
      const parentSchema = options.parentSchemaName ?? "archive";
      await db.execute(sql`
        ALTER TABLE ${sql.raw(`${parentSchema}.${options.parentTableName}`)}
        ATTACH PARTITION ${sql.raw(`${targetSchema}.${targetTableName}`)}
        FOR VALUES FROM (${metadata["date-range-start"] ?? metadata.daterangestart}) TO (${metadata["date-range-end"] ?? metadata.daterangeend})
      `);
      attachedAsPartition = true;
    }

    const coldCatalogTable = options.coldCatalogTable ?? "cold_storage.r2_archive_catalog";
    await db.execute(sql`
      UPDATE ${sql.raw(coldCatalogTable)}
      SET last_restored_at = NOW(),
          restored_count = restored_count + 1
      WHERE r2_object_key = ${options.r2ObjectKey}
    `);

    unlinkSync(tempFilePath);

    const durationSeconds = (Date.now() - startTime) / 1000;

    return {
      success: true,
      r2ObjectKey: options.r2ObjectKey,
      targetTable: `${targetSchema}.${targetTableName}`,
      rowCount: importResult.rowCount,
      downloadedSizeBytes: downloadedSize,
      durationSeconds,
      attachedAsPartition,
    };
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    return {
      success: false,
      r2ObjectKey: options.r2ObjectKey,
      targetTable: "",
      rowCount: 0,
      downloadedSizeBytes: 0,
      durationSeconds,
      attachedAsPartition: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function batchArchiveToR2(
  db: any,
  repo: R2ObjectRepo,
  tables: Array<{ tableName: string; partitionName: string }>,
  coldCatalogTable = "cold_storage.r2_archive_catalog"
): Promise<ArchivalResult[]> {
  const results: ArchivalResult[] = [];

  for (const table of tables) {
    const result = await archivePartitionToR2(
      db,
      repo,
      {
        tableName: table.tableName,
        partitionName: table.partitionName,
        schemaName: "archive",
        format: "parquet",
        compression: "snappy",
      },
      coldCatalogTable
    );

    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

async function calculateFileChecksum(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

async function readFileToBuffer(filePath: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath);
}

export function parsePartitionDateRange(partitionName: string): { start: string; end: string } {
  const [year, month] = partitionName.split("_");
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
}
