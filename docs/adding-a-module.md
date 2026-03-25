# Adding a Module

This document describes the minimal path to add a new module end-to-end.

## 1. Register Metadata

- Define module metadata in the registry source used by the API.
- Add fields with explicit types and labels.
- Add relation config for `many2one`/`many2many` when needed.

## 2. API Surface

- Add module routes under `apps/api/src`.
- Implement list/detail/create/update endpoints.
- Ensure filters and RBAC hooks are connected.

## 3. UI Integration

- Ensure module appears in navigation/menu config.
- Add list and form rendering config.
- Validate field rendering with `FormFieldRenderer` and relation/upload fields if used.

## 4. Seed + Test Data

- Extend deterministic seeds under `packages/db/src/_seeds` when module requires baseline data.
- Keep IDs deterministic when used by tests.

## 5. Validation

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:contracts
pnpm ci:gate
```

## 6. Definition of Done

- Module is navigable from UI
- CRUD API works and is covered by tests
- CI gates pass
- Documentation updated (field behavior, deployment impact, module notes)
