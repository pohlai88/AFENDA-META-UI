# Role-Based Navigation Flow

This document describes the ERP access-control flow from startup to sidebar rendering.

## Flow Summary

1. App starts and mounts `PermissionsBootstrap` in `main.tsx`.
2. `PermissionsBootstrap` calls `GET /meta/bootstrap`.
3. Redux permissions slice transitions:
- `idle` -> `loading` on bootstrap start.
- `loading` -> `ready` on bootstrap success with role + permissions payload.
- `loading` -> `error` on bootstrap failure.
4. Sidebar reads bootstrap status + permission resources from Redux.
5. Sidebar renders module/model links only when bootstrap is `ready`.
6. Sidebar applies client-side search over the already authorized links.

## Permission Model Used By Sidebar

- Module resource: `moduleName` (example: `sales`)
- Model resource: `moduleName.modelName` (example: `sales.orders`)
- Action checked: `read`

Rules:

1. If bootstrap is not `ready`, hide module/model navigation.
2. If bootstrap is `ready` and permission list is empty, show no module/model links.
3. A module is included if:
- module `read` exists, or
- at least one model under the module has model-level `read`.
4. A model is included if:
- model-level `read` exists, or
- module-level `read` exists and no model-scoped permissions are defined for that module.

## Bootstrap API Contract

`GET /meta/bootstrap`

Response shape:

```json
{
  "role": "admin",
  "permissions": [
    { "resource": "sales", "actions": ["read"] },
    { "resource": "sales.orders", "actions": ["read"] }
  ]
}
```

## Notes For Multi-Tenant ERP

- Keep permission resources tenant-scoped on the server-side session.
- Return only effective permissions for current user + tenant in bootstrap response.
- Keep sidebar filtering purely presentational; never trust client-side filtering for API authorization.