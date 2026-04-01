# GraphQL boundary: `drizzle-graphql` vs graph validation

## Purpose

This note records the architectural split between:

1. **`packages/db/src/graph-validation`** — ERP-wide **integrity and security** engine: FK catalog from `information_schema`, orphan detection, tenant leak checks, FK index coverage signals, and health scoring.
2. **[Drizzle GraphQL](https://orm.drizzle.team/docs/graphql) (`drizzle-graphql`)** — Optional **read/query API accelerator**: schema-driven GraphQL exposure, resolver customization, and generated query surface over Drizzle models.

## Decision

- **Source of truth** for FK health, tenant isolation, and remediation-oriented SQL remains **graph-validation** (and the live database constraints), not GraphQL.
- **`drizzle-graphql`** may be adopted later to speed up **entity query exposure**, **read-model composition**, or **API prototyping**. It must **not** be treated as:
  - a substitute for orphan or tenant-leak detection,
  - a validator of RLS or tenant boundaries,
  - or the authority for “fix” / cleanup semantics.

## When to use each

| Concern | Use |
| ------- | --- |
| CI gates, health scores, security audits | `graph-validation` CLI + tests |
| Exposing typed queries to clients | GraphQL layer (e.g. `drizzle-graphql`) + app auth |
| Ensuring no cross-tenant FK mismatches | `graph-validation` tenant isolation checks |

## References

- Drizzle GraphQL documentation: <https://orm.drizzle.team/docs/graphql>
