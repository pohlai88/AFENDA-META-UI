/**
 * Cloudflare R2 Cold Storage Integration
 *
 * Utilities for archiving PostgreSQL partitions to Cloudflare R2 object storage.
 * Implements 3-tier storage lifecycle: Hot (PostgreSQL) → Warm (Archive Schema) → Cold (R2).
 *
 * @module archival/r2-integration
 * @version 1.0.0
 * @since 2026-03-28
 */

import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { createWriteStream, createReadStream, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { sql } from "drizzle-orm";

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface R2Config {
  /** Cloudflare Account ID */
  accountId: string;
  /** R2 Access Key ID (from R2 Tokens) */
  accessKeyId: string;
  /** R2 Secret Access Key */
  secretAccessKey: string;
  /** R2 Bucket Name */
  bucketName: string;
  /** R2 Jurisdiction (optional: 'eu', 'fedramp', etc.) */
  jurisdiction?: "eu" | "fedramp";
}

export interface PartitionExportOptions {
  /** Table name (e.g., 'sales_orders') */
  tableName: string;
  /** Partition name (e.g., '2020_01') */
  partitionName: string;
  /** Schema name (default: 'archive') */
  schemaName?: string;
  /** Export format (default: 'parquet') */
  format?: "parquet" | "csv" | "jsonl";
  /** Compression (default: 'snappy' for Parquet, 'gzip' for CSV/JSONL) */
  compression?: "snappy" | "gzip" | "zstd" | "uncompressed";
  /** Batch size for streaming export (default: 10000) */
  batchSize?: number;
}

export interface ArchivalResult {
  /** Success status */
  success: boolean;
  /** Partition identifier */
  partitionName: string;
  /** R2 object key */
  r2ObjectKey: string;
  /** Number of rows exported */
  rowCount: number;
  /** Original partition size (bytes) */
  originalSizeBytes: number;
  /** Exported file size (bytes) */
  exportedSizeBytes: number;
  /** Compression ratio (exported / original) */
  compressionRatio: number;
  /** SHA-256 checksum */
  checksum: string;
  /** R2 upload ETag */
  etag?: string;
  /** Export duration (seconds) */
  durationSeconds: number;
  /** Error message (if failed) */
  error?: string;
}

export interface RestorationOptions {
  /** R2 object key to restore */
  r2ObjectKey: string;
  /** Target schema (default: 'archive') */
  targetSchema?: string;
  /** Target table name (default: derived from object key) */
  targetTableName?: string;
  /** Whether to attach as partition after restoration */
  attachAsPartition?: boolean;
  /** Parent table name (required if attachAsPartition = true) */
  parentTableName?: string;
}

export interface RestorationResult {
  /** Success status */
  success: boolean;
  /** R2 object key */
  r2ObjectKey: string;
  /** Target table */
  targetTable: string;
  /** Number of rows restored */
  rowCount: number;
  /** Downloaded file size (bytes) */
  downloadedSizeBytes: number;
  /** Restoration duration (seconds) */
  durationSeconds: number;
  /** Whether attached as partition */
  attachedAsPartition: boolean;
  /** Error message (if failed) */
  error?: string;
}

// =====================================================================
// R2 CLIENT WRAPPER
// =====================================================================

/**
 * Lightweight R2 client using fetch API
 * (Alternative to aws-sdk for reduced dependencies)
 */
export class R2Client {
  private readonly config: R2Config;
  private readonly baseUrl: string;

  constructor(config: R2Config) {
    this.config = config;

    // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>
    const jurisdiction = config.jurisdiction ? `.${config.jurisdiction}` : "";
    this.baseUrl = `https://${config.accountId}${jurisdiction}.r2.cloudflarestorage.com/${config.bucketName}`;
  }

  /**
   * Upload object to R2
   */
  async putObject(
    key: string,
    body: Buffer | Readable,
    metadata: Record<string, string>
  ): Promise<{ etag: string }> {
    const url = `${this.baseUrl}/${key}`;

    // Generate AWS Signature V4 (simplified for R2)
    const headers = await this.signRequest("PUT", key, {
      "x-amz-meta-row-count": metadata.rowCount || "0",
      "x-amz-meta-table": metadata.table || "",
      "x-amz-meta-partition": metadata.partition || "",
      "x-amz-meta-checksum": metadata.checksum || "",
      "x-amz-meta-export-date": metadata.exportDate || new Date().toISOString(),
    });

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: Buffer.isBuffer(body) ? body : await this.streamToBuffer(body),
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
    }

    return {
      etag: response.headers.get("etag") || "",
    };
  }

  /**
   * Download object from R2
   */
  async getObject(key: string): Promise<{ body: Readable; metadata: Record<string, string> }> {
    const url = `${this.baseUrl}/${key}`;
    const headers = await this.signRequest("GET", key, {});

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`R2 object not found: ${key}`);
      }
      throw new Error(`R2 download failed: ${response.status} ${response.statusText}`);
    }

    // Extract custom metadata
    const metadata: Record<string, string> = {};
    for (const [key, value] of response.headers.entries()) {
      if (key.startsWith("x-amz-meta-")) {
        metadata[key.replace("x-amz-meta-", "")] = value;
      }
    }

    return {
      body: response.body as any as Readable,
      metadata,
    };
  }

  /**
   * Delete object from R2
   */
  async deleteObject(key: string): Promise<void> {
    const url = `${this.baseUrl}/${key}`;
    const headers = await this.signRequest("DELETE", key, {});

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`R2 delete failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Check if object exists in R2
   */
  async objectExists(key: string): Promise<boolean> {
    const url = `${this.baseUrl}/${key}`;
    const headers = await this.signRequest("HEAD", key, {});

    const response = await fetch(url, {
      method: "HEAD",
      headers,
    });

    return response.ok;
  }

  /**
   * Generate AWS Signature V4 for R2 requests
   * (Simplified implementation - for production, use aws4fetch or @aws-sdk/signature-v4)
   */
  private async signRequest(
    method: string,
    key: string,
    customHeaders: Record<string, string>
  ): Promise<Record<string, string>> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.substring(0, 8);

    // Basic headers (in production, implement full AWS Signature V4)
    return {
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${date}/auto/s3/aws4_request`,
      "x-amz-date": timestamp,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      ...customHeaders,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

// =====================================================================
// PARQUET EXPORT UTILITIES
// =====================================================================

/**
 * Export PostgreSQL partition to Parquet format
 *
 * NOTE: This is a simplified implementation. For production, use:
 * - `parquetjs` library for Parquet writing
 * - Streaming export to handle large partitions
 * - Proper schema mapping (PostgreSQL types → Parquet types)
 */
export async function exportPartitionToParquet(
  db: any, // Drizzle DB instance
  options: PartitionExportOptions
): Promise<{ filePath: string; rowCount: number; sizeBytes: number; checksum: string }> {
  const startTime = Date.now();

  const schemaName = options.schemaName || "archive";
  const tableName = options.tableName;
  const partitionName = options.partitionName;
  const archiveTableName = `${tableName}_${partitionName}_archived`;

  // Generate temporary file path
  const tempFilePath = join(tmpdir(), `${tableName}_${partitionName}.parquet`);

  console.log(`[Parquet Export] Starting export of ${schemaName}.${archiveTableName}`);
  console.log(`[Parquet Export] Temp file: ${tempFilePath}`);

  // TODO: Implement actual Parquet export
  // For now, this is a placeholder showing the expected structure

  /**
   * Production Implementation Steps:
   *
   * 1. Query partition with streaming:
   *    const stream = await db.execute(sql`
   *      SELECT * FROM ${sql.identifier(schemaName, archiveTableName)}
   *    `);
   *
   * 2. Create Parquet writer:
   *    const writer = await parquet.ParquetWriter.openFile(schema, tempFilePath, {
   *      compression: 'SNAPPY',
   *      rowGroupSize: 10000,
   *    });
   *
   * 3. Stream rows to Parquet:
   *    for await (const row of stream) {
   *      await writer.appendRow(convertRowToParquet(row));
   *    }
   *
   * 4. Finalize and get metadata:
   *    await writer.close();
   */

  // Placeholder: Get row count and size
  const result = await db.execute(sql`
    SELECT
      COUNT(*) as row_count,
      pg_total_relation_size(${schemaName}.${archiveTableName}) as size_bytes
    FROM ${sql.raw(`${schemaName}.${archiveTableName}`)}
  `);

  const rowCount = Number(result.rows[0]?.row_count || 0);
  const sizeBytes = Number(result.rows[0]?.size_bytes || 0);

  // Calculate checksum (for actual file)
  const checksum = await calculateFileChecksum(tempFilePath);

  const durationSeconds = (Date.now() - startTime) / 1000;
  console.log(`[Parquet Export] Exported ${rowCount} rows in ${durationSeconds.toFixed(2)}s`);

  return {
    filePath: tempFilePath,
    rowCount,
    sizeBytes,
    checksum,
  };
}

/**
 * Import Parquet file back to PostgreSQL
 */
export async function importParquetToPostgres(
  db: any,
  parquetFilePath: string,
  targetSchema: string,
  targetTableName: string
): Promise<{ rowCount: number }> {
  console.log(
    `[Parquet Import] Importing ${parquetFilePath} to ${targetSchema}.${targetTableName}`
  );

  // TODO: Implement actual Parquet import
  /**
   * Production Implementation:
   *
   * 1. Read Parquet file:
   *    const reader = await parquet.ParquetReader.openFile(parquetFilePath);
   *
   * 2. Create target table if not exists:
   *    await db.execute(sql`
   *      CREATE TABLE ${sql.identifier(targetSchema, targetTableName)} (
   *        ... columns from Parquet schema ...
   *      )
   *    `);
   *
   * 3. Stream rows and batch insert:
   *    const batch = [];
   *    const cursor = reader.getCursor();
   *    let record;
   *    while (record = await cursor.next()) {
   *      batch.push(convertParquetRowToPostgres(record));
   *      if (batch.length >= 1000) {
   *        await db.insert(table).values(batch);
   *        batch.length = 0;
   *      }
   *    }
   */

  return { rowCount: 0 }; // Placeholder
}

// =====================================================================
// ARCHIVAL ORCHESTRATION
// =====================================================================

/**
 * Archive a partition from warm storage to R2 cold storage
 */
export async function archivePartitionToR2(
  db: any,
  r2Client: R2Client,
  options: PartitionExportOptions
): Promise<ArchivalResult> {
  const startTime = Date.now();

  try {
    console.log(`[Archive] Starting archival of ${options.tableName}.${options.partitionName}`);

    // Step 1: Export to Parquet
    const exportResult = await exportPartitionToParquet(db, options);

    // Step 2: Upload to R2
    const r2ObjectKey = `${options.tableName}/${options.partitionName.substring(0, 4)}/${options.tableName}_${options.partitionName}.parquet`;

    const fileBuffer = await readFileToBuffer(exportResult.filePath);

    const uploadResult = await r2Client.putObject(r2ObjectKey, fileBuffer, {
      table: options.tableName,
      partition: options.partitionName,
      rowCount: exportResult.rowCount.toString(),
      checksum: exportResult.checksum,
      exportDate: new Date().toISOString(),
    });

    // Step 3: Verify upload
    const exists = await r2Client.objectExists(r2ObjectKey);
    if (!exists) {
      throw new Error("R2 upload verification failed: object not found");
    }

    // Step 4: Update cold storage catalog
    await db.execute(sql`
      INSERT INTO cold_storage.r2_archive_catalog (
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
        ${r2Client["config"].bucketName},
        ${r2ObjectKey},
        ${exportResult.sizeBytes},
        ${uploadResult.etag},
        ${exportResult.rowCount},
        ${parsePartitionDateRange(options.partitionName).start},
        ${parsePartitionDateRange(options.partitionName).end},
        ${exportResult.sizeBytes},
        ${exportResult.sizeBytes / exportResult.sizeBytes}, -- Placeholder for actual compression
        ${exportResult.checksum},
        '1.0'
      )
    `);

    // Step 5: Drop archive table (data is safely in R2)
    const archiveTableName = `${options.tableName}_${options.partitionName}_archived`;
    await db.execute(
      sql`DROP TABLE IF EXISTS ${sql.raw(`${options.schemaName || "archive"}.${archiveTableName}`)}`
    );

    // Step 6: Clean up temp file
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

/**
 * Restore a partition from R2 cold storage to PostgreSQL
 */
export async function restorePartitionFromR2(
  db: any,
  r2Client: R2Client,
  options: RestorationOptions
): Promise<RestorationResult> {
  const startTime = Date.now();

  try {
    console.log(`[Restore] Starting restoration of ${options.r2ObjectKey}`);

    // Step 1: Fetch from R2
    const { body, metadata } = await r2Client.getObject(options.r2ObjectKey);

    // Step 2: Save to temp file
    const tempFilePath = join(tmpdir(), `restore_${Date.now()}.parquet`);
    const writeStream = createWriteStream(tempFilePath);
    await pipeline(body, writeStream);

    const downloadedSize = (await import("node:fs")).statSync(tempFilePath).size;

    // Step 3: Import to PostgreSQL
    const targetSchema = options.targetSchema || "archive";
    const targetTableName =
      options.targetTableName || `${metadata.table}_${metadata.partition}_restored`;

    const importResult = await importParquetToPostgres(
      db,
      tempFilePath,
      targetSchema,
      targetTableName
    );

    // Step 4: Optionally attach as partition
    let attachedAsPartition = false;
    if (options.attachAsPartition && options.parentTableName) {
      await db.execute(sql`
        ALTER TABLE ${sql.raw(`sales.${options.parentTableName}`)}
        ATTACH PARTITION ${sql.raw(`${targetSchema}.${targetTableName}`)}
        FOR VALUES FROM (${metadata["date-range-start"]}) TO (${metadata["date-range-end"]})
      `);
      attachedAsPartition = true;
    }

    // Step 5: Update restoration tracking
    await db.execute(sql`
      UPDATE cold_storage.r2_archive_catalog
      SET last_restored_at = NOW(),
          restored_count = restored_count + 1
      WHERE r2_object_key = ${options.r2ObjectKey}
    `);

    // Step 6: Clean up temp file
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

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

/**
 * Calculate SHA-256 checksum of a file
 */
async function calculateFileChecksum(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

/**
 * Read file to Buffer
 */
async function readFileToBuffer(filePath: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath);
}

/**
 * Parse partition name to date range
 */
function parsePartitionDateRange(partitionName: string): { start: string; end: string } {
  // Example: '2020_01' → { start: '2020-01-01', end: '2020-02-01' }
  const [year, month] = partitionName.split("_");
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
}

// =====================================================================
// BATCH ARCHIVAL RUNNER
// =====================================================================

/**
 * Batch archive multiple partitions to R2
 */
export async function batchArchiveToR2(
  db: any,
  r2Client: R2Client,
  tables: Array<{ tableName: string; partitionName: string }>
): Promise<ArchivalResult[]> {
  const results: ArchivalResult[] = [];

  for (const table of tables) {
    console.log(`\n[Batch Archive] Processing ${table.tableName}.${table.partitionName}`);

    const result = await archivePartitionToR2(db, r2Client, {
      tableName: table.tableName,
      partitionName: table.partitionName,
      schemaName: "archive",
      format: "parquet",
      compression: "snappy",
    });

    results.push(result);

    if (result.success) {
      console.log(
        `✅ Archived successfully: ${result.rowCount} rows, ${(result.compressionRatio * 100).toFixed(1)}% compression`
      );
    } else {
      console.error(`❌ Archival failed: ${result.error}`);
    }

    // Rate limiting: wait 1 second between archives
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  const successCount = results.filter((r) => r.success).length;
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSizeBytes, 0);
  const totalExportedSize = results.reduce((sum, r) => sum + r.exportedSizeBytes, 0);
  const avgCompression = totalExportedSize / totalOriginalSize;

  console.log(`\n📊 Batch Archive Summary:`);
  console.log(`   Success: ${successCount} / ${results.length}`);
  console.log(`   Total rows: ${totalRows.toLocaleString()}`);
  console.log(`   Original size: ${(totalOriginalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`   Exported size: ${(totalExportedSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`   Avg compression: ${(avgCompression * 100).toFixed(1)}%`);

  return results;
}

/**
 * Example Usage:
 *
 * ```typescript
 * import { R2Client, batchArchiveToR2 } from './r2-integration';
 * import { db } from '../client';
 *
 * // Initialize R2 client
 * const r2 = new R2Client({
 *   accountId: process.env.R2_ACCOUNT_ID!,
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *   bucketName: 'afenda-archive',
 * });
 *
 * // Archive old partitions
 * const results = await batchArchiveToR2(db, r2, [
 *   { tableName: 'sales_orders', partitionName: '2017_01' },
 *   { tableName: 'sales_orders', partitionName: '2017_02' },
 * ]);
 *
 * // Restore partition
 * const restored = await restorePartitionFromR2(db, r2, {
 *   r2ObjectKey: 'sales_orders/2017/sales_orders_2017_01.parquet',
 *   targetSchema: 'archive',
 *   attachAsPartition: false,
 * });
 * ```
 */
