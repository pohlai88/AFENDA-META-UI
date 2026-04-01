# PR: feat(core) — truth specs and deterministic generator foundation

Use this as the GitHub PR title and description when opening the change set.

## Title

```
feat(core): add truth specs and deterministic generator foundation
```

## Body

Adds six hand-authored truth spec modules (identities, enums, relations, doctrines, resolutions, invariants) under `packages/core/src/truth/`, plus a deterministic code generator that emits `packages/core/src/generated/` (including `manifest.json`).

Validates doctrine and resolution linkage (and related invariants) via `validateSpecs` before emit.

Commits generated artifacts and keeps them reproducible: root `pnpm generate` runs `@afenda/core` generation; CI runs `pnpm generate && git diff --exit-code` so any drift fails the build.

Note: CI also runs `ci:gate:truth-schema-drift` (`@afenda/db` truth schema compare). That gate is about database truth compilation, not the core truth spec bundle. This PR does not need to conflate the two, but reviewers should know both exist.

Intentionally excludes runtime wiring, projection, replay, and API surfaces so the handoff stays bounded: specs + generator + validation + manifest + deterministic CI must land before runtime work begins.

---

**Why this PR first:** downstream work needs stable spec sources, a single generator entrypoint, validation that invariants reference real doctrines and resolutions, a manifest for consumers, and CI that fails on uncommitted generator output—otherwise runtime layers would bake against moving targets.
