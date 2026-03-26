# Actual Completion Status

**Date**: March 25, 2026  
**Audited by**: Code inspection of source files  
**Previous Status Doc**: `ACTUAL_GAPS_CORRECTED.md` (March 25)

---

## ✅ What Has Been Implemented (Since Initial Docs)

Many features previously flagged as "NOT IMPLEMENTED" in `IMPLEMENTATION_STATUS.md` are now complete. This document reflects the **true current state** as of this audit.

### Routing & App Shell — ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| React Router v6 routes | ✅ Done | `Apps.tsx` imports `AppRouter` from `./routes` |
| AppShell layout | ✅ Done | `apps/web/src/components/layout/app-shell.tsx` |
| Collapsible sidebar | ✅ Done | `apps/web/src/components/layout/sidebar.tsx` |
| Top bar (search, user menu) | ✅ Done | `apps/web/src/components/layout/top-bar.tsx` |
| Command palette (Ctrl+K) | ✅ Done | `apps/web/src/components/command-palette.tsx` |
| Error boundary | ✅ Done | `apps/web/src/components/error-boundary.tsx` |

### Module Architecture — ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| Module Registry implementation | ✅ Done | `apps/api/src/meta/moduleRegistry.ts` (full scanner + loader) |
| Dependency resolution (topological sort) | ✅ Done | Implemented in registry |
| Registry API endpoints | ✅ Done | Via `meta.ts` route |
| RBAC expression evaluator | ✅ Done | Uses `filtrex` (safe sandbox, no `eval`) |

### API Hardening — ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| Filter operators (eq, gt, like, in, …) | ✅ Done | `apps/api/src/utils/queryBuilder.ts` — `parseFilters` + `buildWhereClause` |
| Pagination with filters | ✅ Done | Integrated in `apps/api/src/routes/api.ts` |
| File upload endpoint | ✅ Done | `apps/api/src/routes/uploads.ts` (multer, mime-type validation, 10 MB limit) |
| Audit log | ✅ Done | `apps/api/src/audit/auditLogger.ts` |

### Renderer — ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| Unsaved changes warning | ✅ Done | `MetaFormV2` uses `useUnsavedChangesWarning` hook + `isDirty` |
| Field-level dirty tracking | ✅ Done | `extractDirtyValues` in `MetaFormV2.tsx` |
| Row actions with execution | ✅ Done | `RowActionsMenu` uses `useActions` hook — permission-checked |
| MetaListV2 row selection | ✅ Done | `meta-list-selection.ts` — `toggleRowSelection`, `selectAllMatchingQuery` |
| MetaListV2 bulk delete | ✅ Done | `createBulkDeleteAction` wired in `MetaListV2.tsx` |
| MetaListV2 CSV export | ✅ Done | `exportToCsv` from `~/lib/csv-export` |
| One2ManyField (full editor) | ✅ Done | 400-line component with dialogs, add/edit/delete |
| MetaKanban (drag-drop) | ✅ Done | HTML5 DnD API, `PATCH` on drop (563 lines) |
| MetaDashboard (charts) | ✅ Done | Recharts integration (688 lines) |
| FileField (basic) | ✅ Done | `input type="file"` with clear button, readonly URL link |
| ImageField (with preview) | ✅ Done | URL/File object preview, object URL cleanup |

### Field Types Implemented — ✅ COMPLETE

| Field | Component | Status |
|-------|-----------|--------|
| currency | `CurrencyField.tsx` | ✅ Done |
| color | `ColorField.tsx` | ✅ Done |
| rating | `RatingField.tsx` | ✅ Done |
| richtext | `RichTextField.tsx` | ✅ Done |
| json | `JsonField.tsx` | ✅ Done |
| tags | `TagsField.tsx` | ✅ Done |
| boolean | `BooleanField.tsx` | ✅ Done |
| enum/selection | `EnumField.tsx` | ✅ Done |
| many2one | `RelationField.tsx` | ✅ Done |
| one2many | `One2ManyField.tsx` | ✅ Done |
| date/datetime | `DateField.tsx` | ✅ Done |
| file | `FileField.tsx` | ✅ Basic (no drag-drop) |
| image | `ImageField.tsx` | ✅ Basic (no crop) |

### DevX & CI/CD — ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| Docker Compose | ✅ Done | `docker-compose.yml` in root |
| CI/CD GitHub Actions | ✅ Done | `.github/workflows/ci.yml`, `react-quality-gate.yml` |
| Dependabot | ✅ Done | `.github/dependabot.yml` |
| E2E test suites | ✅ Done | `features.e2e.ts` (356 lines), `routes-smoke.e2e.ts` |
| docs/field-types.md | ✅ Done | Exists |
| docs/deployment.md | ✅ Done | Exists |
| docs/adding-a-module.md | ✅ Done | Exists |

---

## 🔴 Remaining Tasks

### P1 — High Priority (Core Gaps)

#### 1. File Upload: Cloud Storage Integration
**Status**: Backend multer upload exists, but no cloud storage wiring  
**Missing**:
- [ ] Presigned URL generation (S3 / Cloudflare R2)  
- [ ] `persistUploadFile` actually stores to cloud (currently local buffer only)  
- [ ] `FileField.tsx` drag-and-drop zone (currently `<input type="file">` only)  
- [ ] `ImageField.tsx` crop dialog before upload  
- [ ] Stored metadata: `{url, filename, size, mime}` in JSONB

**Files to update**:
- `apps/api/src/uploads/storage.ts` — wire real storage backend  
- `apps/web/src/renderers/fields/FileField.tsx` — add drag-drop zone  
- `apps/web/src/renderers/fields/ImageField.tsx` — add crop dialog  

**Effort**: 4-6 hours

---

#### 2. API Field Selection & Relation Expansion
**Status**: Not implemented  
**Missing**:
- [ ] `?fields=id,name,status` — sparse fieldset projection  
- [ ] `?expand=partner,lines` — fetch related records in one request  
- [ ] `?cursor=` — cursor-based pagination (currently offset-only)

**File to update**: `apps/api/src/routes/api.ts` + `queryBuilder.ts`  
**Effort**: 3-4 hours

---

#### 3. Soft Delete
**Status**: Not implemented in DB schema or API  
**Missing**:
- [ ] `deleted_at TIMESTAMPTZ` column in base schema  
- [ ] DELETE routes use soft delete by default  
- [ ] List queries exclude `deleted_at IS NOT NULL` rows  
- [ ] `?include_deleted=true` query param  

**Files to update**: `packages/db/src/schema/` + `apps/api/src/routes/api.ts`  
**Effort**: 2-3 hours

---

#### 4. Global Search API
**Status**: Frontend command palette exists; no backend search endpoint  
**Missing**:
- [ ] `GET /api/search?q=term&models=partner,product` endpoint  
- [ ] Cross-model text search using `ILIKE` or full-text search  
- [ ] Fuzzy matching and result grouping by model  
- [ ] Connect command palette search to backend  

**Files to create/update**:
- `apps/api/src/routes/search.ts` (new)  
- `apps/web/src/components/command-palette.tsx` (wire to API)  

**Effort**: 4-5 hours

---

### P2 — Medium Priority (Power User / Production Polish)

#### 5. MetaListV2 Advanced Table Features
**Status**: Core table implemented; power user features missing  
**Missing**:
- [ ] Column resizing (drag column border)  
- [ ] Column reordering (drag-and-drop columns)  
- [ ] Faceted filters per column (type-aware filter popover)  
- [ ] Inline cell editing (click cell to edit)  
- [ ] Sticky header on scroll  

**File to update**: `apps/web/src/renderers/MetaListV2.tsx`  
**Effort**: 6-8 hours

---

#### 6. Missing Field Types
**Status**: 3 field types not yet implemented  
**Missing**:
- [ ] `PhoneField.tsx` — international phone input (libphonenumber-js)  
- [ ] `AddressField.tsx` — structured multi-field (street, city, state, zip, country)  
- [ ] `SignatureField.tsx` — canvas signature pad  

**Directory**: `apps/web/src/renderers/fields/`  
**Effort**: 4-6 hours

---

#### 7. Widget Override Plugin Registry
**Status**: `field.widget` dispatch works; dynamic plugin registry missing  
**Missing**:
- [ ] `registerWidget(name, component)` API  
- [ ] `widget_props` pass-through to custom widgets  
- [ ] Plugin registry store accessible from `FieldRenderer`  

**File to update/create**: `apps/web/src/renderers/fields/index.tsx`  
**Effort**: 2-3 hours

---

#### 8. Redis Cache for Schema Registry
**Status**: Resolution cache module exists (`cachedResolution.ts`), no Redis backend  
**Missing**:
- [ ] `ioredis` client setup  
- [ ] Cache schema lookups with TTL  
- [ ] ETags for `/meta/:model` (304 Not Modified support)  
- [ ] Invalidation on model change  

**Effort**: 3-4 hours

---

#### 9. Error Pages (404 / 403 / 500)
**Status**: `error-boundary.tsx` exists at component level; no route-level error pages  
**Missing**:
- [ ] `apps/web/src/pages/not-found.tsx` — 404 page  
- [ ] `apps/web/src/pages/forbidden.tsx` — 403 page  
- [ ] `apps/web/src/pages/server-error.tsx` — 500 page  
- [ ] Error boundary at route level in AppRouter  

**Effort**: 1-2 hours

---

#### 10. Offline Detection Banner
**Status**: Not implemented  
**Missing**:
- [ ] `navigator.onLine` + `online`/`offline` event listeners  
- [ ] Banner/toast shown when offline  
- [ ] Retry queue for failed mutations  

**Effort**: 1-2 hours

---

### P3 — Low Priority (Enterprise Extras)

#### 11. Internationalization (i18n)
**Status**: Not started  
**Missing**:
- [ ] `react-i18next` + `i18next` + `i18next-http-backend`  
- [ ] Translation keys for all UI strings  
- [ ] `Intl` for date/number formatting  
- [ ] RTL layout support  

**Effort**: 8-12 hours

---

#### 12. Storybook Component Library
**Status**: Not started  
**Missing**:
- [ ] Storybook setup for `packages/ui` and field renderers  
- [ ] Stories for all 25+ shadcn components  
- [ ] Stories for all field types  
- [ ] Visual regression snapshots  

**Effort**: 6-10 hours

---

#### 13. Request Tracing & Error Monitoring
**Status**: Winston logging exists; distributed tracing missing  
**Missing**:
- [ ] OpenTelemetry SDK (`@opentelemetry/sdk-node`)  
- [ ] Sentry integration (`@sentry/node`, `@sentry/react`)  
- [ ] Trace propagation across API requests  

**Effort**: 3-4 hours

---

### Phase 4 Strategic Roadmap (Future Architecture)

These items are documented in `PHASE_4_STRATEGIC_ROADMAP.md`:

| Feature | Description | Priority |
|---------|-------------|----------|
| Audit Fabric | Deterministic decision capture (every workflow/rule/metadata decision logged) | P1 (compliance) |
| Resolution Cache | 99%-hit cache layer for tenant metadata resolution | P2 (scale) |
| Admin Control Plane | Non-technical UI for tenant overrides, workflow definitions, rules | P2 (enterprise) |
| GraphQL Surface | Unified GraphQL layer over REST + Business Truth Engine | P3 (API unification) |

---

## Summary Table

| Phase | Feature | Status | Priority | Effort |
|-------|---------|--------|----------|--------|
| File Upload | Cloud storage + drag-drop + crop | ❌ Missing | P1 | 4-6h |
| API | Field selection + relation expansion | ❌ Missing | P1 | 3-4h |
| API | Soft delete | ❌ Missing | P1 | 2-3h |
| API | Global search endpoint | ❌ Missing | P1 | 4-5h |
| MetaList | Column resize / reorder / facets / inline edit | ❌ Missing | P2 | 6-8h |
| Fields | Phone, Address, Signature | ❌ Missing | P2 | 4-6h |
| Fields | Widget plugin registry | ❌ Missing | P2 | 2-3h |
| API | Redis schema cache + ETags | ❌ Missing | P2 | 3-4h |
| UX | Error pages (404/403/500) | ❌ Missing | P2 | 1-2h |
| UX | Offline detection banner | ❌ Missing | P2 | 1-2h |
| i18n | react-i18next full setup | ❌ Missing | P3 | 8-12h |
| DX | Storybook | ❌ Missing | P3 | 6-10h |
| Observability | OTel + Sentry | ❌ Missing | P3 | 3-4h |
| Future | Audit Fabric | 📋 Planned | P1 (Phase 4) | TBD |
| Future | Resolution Cache | 📋 Planned | P2 (Phase 4) | TBD |
| Future | Admin Control Plane | 📋 Planned | P2 (Phase 4) | TBD |
| Future | GraphQL Layer | 📋 Planned | P3 (Phase 4) | TBD |

**Estimated remaining dev effort (P1+P2)**: ~32–43 hours  
**Estimated remaining dev effort (P3)**: ~17–26 hours  
**Phase 4 strategic items**: To be scoped separately
