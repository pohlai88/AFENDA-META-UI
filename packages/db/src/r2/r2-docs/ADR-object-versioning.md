# ADR: Object versioning for immutable audit trails

## Status

Accepted

## Context

Enterprises need predictable behavior for overwrites vs retained history (compliance, HR documents).

## Decision

- **Default: immutable content** — each new version gets a new object key. Use `versionedObjectKey({ baseKey, version })` to append `/v{version}` (or use a new UUID in `objectId`).
- **Overwrite** — allowed only for explicit product cases (e.g. avatars); same `storage_key` points to replaced bytes in R2.
- **Hybrid** — teams document per-`kind` whether keys are immutable or overwrite.

## Consequences

- Audit and restore flows rely on key history discoverable via `listObjectsByPrefix` on the parent path when using immutable keys.
- DB rows should reference the **current** canonical key; prior versions may remain in R2 until lifecycle/GC rules delete them.
