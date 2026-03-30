# ADR: R2 Data Catalog (Apache Iceberg)

## Status

Proposed / evaluation only

## Context

[Cloudflare R2 Data Catalog](https://developers.cloudflare.com/r2/data-catalog/) exposes a managed Iceberg REST catalog over objects in a bucket. It targets analytics / lakehouse workloads (Spark, DuckDB, Snowflake, etc.).

## Decision (interim)

- **Not required** for the core transactional R2 abstraction (`createR2ObjectRepo`) or `reference.document_attachments`.
- **Evaluate** when cold-archive Parquet volumes warrant query-in-place without restoring to Postgres.

## Consequences

If adopted later: separate runbooks for catalog auth, engine connectivity, and **no** coupling of HR/reference Drizzle schema to Iceberg table names.
