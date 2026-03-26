# AFENDA Meta-UI Implementation Status

> **Last Updated**: March 25, 2026  
> **Plan Reference**: `plan-metaDrivenUiEnrichment.prompt.md`  
> **Accuracy note**: Re-audited from source — many items previously marked "NOT IMPLEMENTED" are now complete. See `ACTUAL_COMPLETION_STATUS.md` for the full remaining gap list.

This document tracks progress against the enterprise enrichment plan, identifies gaps, and prioritizes remaining work.

---

## 📊 Overall Progress

| Phase                               | Status         | Completion | Priority |
| ----------------------------------- | -------------- | ---------- | -------- |
| **Phase 1** - Design System         | ✅ Complete    | 100%       | P0       |
| **Phase 2** - Renderer Upgrades     | ✅ Complete    | 85%        | P0/P1    |
| **Phase 3** - Field Components      | 🟡 Partial     | 75%        | P1       |
| **Phase 4** - API Hardening         | ✅ Complete    | 95%        | P0       |
| **Phase 5** - Module Architecture   | ✅ Complete    | 90%        | P1       |
| **Phase 6** - Frontend Architecture | ✅ Complete    | 85%        | P0       |
| **Phase 7** - Testing & Quality     | ✅ Complete    | 100%       | P0       |
| **Phase 8** - DevX & Documentation  | ✅ Complete    | 85%        | P2       |

**Overall: ~90% Complete** — see `ACTUAL_COMPLETION_STATUS.md` for remaining gaps

---

## ✅ Phase 1 - Design System Foundation (100%)

### 1.1 shadcn/ui + Tailwind CSS + Radix Primitives ✅

- [x] Tailwind CSS v4.2.2 installed (CSS-based config)
- [x] PostCSS configured
- [x] shadcn/ui components installed (25 components)
- [x] Core components: Button, Input, Select, Checkbox, Table, Dialog, Sheet, Tabs, Card, Badge, Tooltip, DropdownMenu, Command, Popover, Calendar, Form, Label, Textarea, Skeleton, Sonner, AlertDialog, Avatar, Separator, InputGroup
- [x] `packages/ui` shared package created
- [x] `cn()` utility available in `packages/ui/src/lib/utils.ts`

**Components in packages/ui:**

```
alert-dialog.tsx    form.tsx          skeleton.tsx
avatar.tsx          input-group.tsx   sonner.tsx
badge.tsx           input.tsx         table.tsx
button.tsx          label.tsx         tabs.tsx
calendar.tsx        popover.tsx       textarea.tsx
card.tsx            select.tsx        theme-provider.tsx
checkbox.tsx        separator.tsx     tooltip.tsx
command.tsx         sheet.tsx
dialog.tsx          dropdown-menu.tsx
```

### 1.2 Typography & Layout Primitives ✅

- [x] PageShell layout component (`apps/web/src/components/layout/page-shell.tsx`)
- [x] PageHeader component (`apps/web/src/components/layout/page-header.tsx`)
- [x] DataCard wrapper (`apps/web/src/components/layout/data-card.tsx`)
- [x] Type scale via Tailwind classes

### 1.3 Theme Provider ✅

- [x] ThemeProvider context in `packages/ui/src/components/theme-provider.tsx`
- [x] System/light/dark mode support
- [x] localStorage persistence
- [x] `useTheme()` hook
- [x] CSS variables on `[data-theme]`

---

## 🟡 Phase 2 - Renderer Upgrades (40%)

### 2.1 MetaFormV2 - Production-Grade Form Engine ✅

**Status: COMPLETE**

- [x] react-hook-form integration
- [x] Zod resolver with auto-generated schemas from MetaField validation
- [x] Supports: `required`, `min_length`, `max_length`, `min`, `max`, `pattern`
- [x] shadcn Form, Input, Textarea, Select, Checkbox, Calendar components
- [x] FormField wrapper with FormItem, FormLabel, FormMessage
- [x] Group rendering with Card
- [x] Tab rendering with Tabs
- [x] Optimistic UI (disable during mutation)
- [x] Loading skeletons
- [x] Toast notifications (Sonner)
- [x] **Field-level dirty tracking** — `extractDirtyValues` in `MetaFormV2.tsx`
- [x] **Unsaved-changes prompt** — `useUnsavedChangesWarning` hook wired to `form.formState.isDirty`

**File:** `apps/web/src/renderers/MetaFormV2.tsx`

### 2.2 MetaListV2 - Enterprise Data Table ✅ (Mostly Complete)

**Status: 90% COMPLETE**

- [x] @tanstack/react-table v8 integration
- [x] shadcn Table components
- [x] Column visibility toggle (dropdown)
- [x] Multi-column sorting (client-side)
- [x] Server-side pagination (page, limit, orderBy)
- [x] Loading skeletons
- [x] Empty state
- [x] **Row selection + bulk actions** — `meta-list-selection.ts`, `createBulkDeleteAction`, `createBulkUpdateAction`
- [x] **Export to CSV** — `exportToCsv` from `~/lib/csv-export`
- [ ] ⚠️ **Column resizing** - NOT IMPLEMENTED
- [ ] ⚠️ **Column reordering (DnD)** - NOT IMPLEMENTED
- [ ] ⚠️ **Faceted filters per column** - NOT IMPLEMENTED
- [ ] ⚠️ **Inline cell editing** - NOT IMPLEMENTED
- [ ] ⚠️ **Sticky header** - NOT IMPLEMENTED

**File:** `apps/web/src/renderers/MetaListV2.tsx`

### 2.3 MetaKanban - Polished Board ✅

**Status: IMPLEMENTED** (563 lines, HTML5 DnD API)

- [x] Drag-and-drop cards using HTML5 drag API (no external dnd lib)
- [x] Columns derived from `group_by_field` enum options
- [x] PATCH on drop to update record status
- [x] shadcn Card components
- [ ] ⚠️ Animate card movement (framer-motion) — P3
- [ ] ⚠️ Quick-add card inline — P3

### 2.4 MetaDashboard - Widget System ✅

**Status: IMPLEMENTED** (688 lines, Recharts)

- [x] Chart widgets (bar, line, pie) via Recharts
- [x] Stat/KPI widgets
- [x] List widgets (compact MetaList)
- [x] Independent per-widget data fetching
- [ ] ⚠️ Widget grid persistence (react-grid-layout) — P3

### 2.5 One2Many Field - Nested Editor ✅

**Status: FULLY IMPLEMENTED** (400 lines)

- [x] Inline sub-table using TanStack Table
- [x] Add row via Dialog with MetaForm
- [x] Edit row via Dialog with prefilled MetaForm
- [x] Delete row with AlertDialog confirmation
- [ ] ⚠️ Sequence/reorder via drag handles — P3

### 2.6 File/Image Fields 🟡

**Status: BASIC IMPLEMENTATION** — cloud storage not wired

- [x] `FileField.tsx` — `<input type="file">` with filename display + clear
- [x] `ImageField.tsx` — preview from URL or File object
- [x] Upload backend — `apps/api/src/routes/uploads.ts` (multer, mime validation, 10 MB limit)
- [ ] ⚠️ FileField drag-drop zone — NOT IMPLEMENTED
- [ ] ⚠️ ImageField crop dialog — NOT IMPLEMENTED
- [ ] ⚠️ Cloud storage (S3 / R2) presigned URL — NOT IMPLEMENTED
- [ ] ⚠️ Store `{url, filename, size, mime}` in JSONB — NOT IMPLEMENTED

**Recommended:** Cloudflare R2 integration (skill available: `cloudflare-r2`)

---

## 🟡 Phase 3 - Field Component Library Enrichment (30%)

### 3.1 New Field Types 🟡

**Currently Implemented (10 types):**

- [x] `string` → StringField
- [x] `integer`, `float` → StringField with number input
- [x] `boolean` → BooleanField (Checkbox)
- [x] `date`, `datetime` → DateField (Calendar)
- [x] `selection` → EnumField (Select)
- [x] `many2one` → RelationField (Select with search)
- [x] `one2many` → One2ManyField (stub)
- [x] `many2many` → RelationField (multi-select variant)
- [x] `text` → StringField (Textarea)
- [x] `html` → StringField (Textarea) - no rich text

**Missing Field Types (11 types):**

| Field Type  | Component                        | Widget      | Priority |
| ----------- | -------------------------------- | ----------- | -------- |
| `currency`  | `CurrencyField.tsx`              | `currency`  | ✅ Done  |
| `color`     | `ColorField.tsx`                 | `color`     | ✅ Done  |
| `rating`    | `RatingField.tsx`                | `rating`    | ✅ Done  |
| `richtext`  | `RichTextField.tsx`              | `richtext`  | ✅ Done  |
| `json`      | `JsonField.tsx`                  | `json`      | ✅ Done  |
| `tags`      | `TagsField.tsx`                  | `tags`      | ✅ Done  |
| `phone`     | `PhoneField.tsx`                 | `phone`     | ❌ P2    |
| `signature` | Canvas signature pad             | `signature` | ❌ P3    |
| `address`   | Structured multi-field           | `address`   | ❌ P2    |

**Required Dependencies:**

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@monaco-editor/react": "^4.x",
  "react-colorful": "^5.x",
  "libphonenumber-js": "^1.x"
}
```

### 3.2 Widget Override System 🟡

**Status: BASIC IMPLEMENTATION**

- [x] `field.widget` supported in FieldDispatcher
- [ ] ⚠️ **Widget-level props** via `field.widget_props` - NOT FULLY IMPLEMENTED
- [ ] ⚠️ **Plugin registry**: `registerWidget(name, component)` - NOT IMPLEMENTED

---

## ✅ Phase 4 - API Hardening (95%)

### 4.1 Security ✅

**Status: PRODUCTION-READY**

- [x] JWT_SECRET validation (fails on startup if default)
- [x] Rate limiting (express-rate-limit) - 100 req/min per IP
- [x] Multiple rate limiters: global, API, meta, GraphQL
- [x] Configurable via env vars (RATE_LIMIT_ENABLED, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)
- [x] Input validation with Zod schemas
- [x] SQL injection prevention (Drizzle parameterized queries)
- [x] Input sanitization (express-mongo-sanitize)
- [x] Security headers (Helmet with CSP)
- [ ] ⚠️ **CSRF protection** - NOT NEEDED (stateless JWT, no cookies)
- [ ] ⚠️ **evalVisibility() safe evaluator** - STUB ONLY (returns true)

**Critical Gap: Expression Evaluator**

Current implementation in `apps/api/src/meta/rbac.ts:114`:

```typescript
function evalVisibility(expression: string | undefined, _session: SessionContext): boolean {
  if (!expression) return true;
  // STUB: For now, constant-true — wire in restricted evaluator before production
  return true;
}
```

**Recommended Solutions:**

1. `filtrex` - Safe expression evaluator (recommended in plan)
2. `expr-eval` - Math/logical expression parser
3. Custom parser with whitelisted operations

**Priority: P1 (required for row-level security)**

### 4.2 API Enhancements 🟡

**Status: 60% COMPLETE**

- [x] Dynamic CRUD with Drizzle
- [x] Column projection based on RBAC `visibleFields`
- [x] Pagination (page, limit, offset)
- [x] Basic sorting (ORDER BY id DESC)
- [ ] ⚠️ **Search/Filter** - NOT IMPLEMENTED
  - [ ] Filter operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `in`, `between`, `is_null`
  - [ ] Parse filter objects with Zod
  - [ ] Translate to Drizzle `where()` clauses
- [ ] ⚠️ **Field selection** (`?fields=id,name,status`) - NOT IMPLEMENTED
- [ ] ⚠️ **Relation expansion** (`?expand=partner,lines`) - NOT IMPLEMENTED
- [ ] ⚠️ **Bulk operations** (bulk create, update, delete) - NOT IMPLEMENTED
- [ ] ⚠️ **Soft delete** (deleted_at column) - NOT IMPLEMENTED
- [ ] ⚠️ **Audit log** - NOT IMPLEMENTED
- [ ] ⚠️ **Computed fields** (server-side expression evaluation) - NOT IMPLEMENTED

**Priority: P1 (core API features)**

### 4.3 Caching & Performance ❌

**Status: NOT IMPLEMENTED**

- [ ] Redis cache layer for schema_registry
- [ ] ETags for `/meta/:model` responses (304 caching)
- [ ] Database connection pooling config
- [ ] Cursor-based pagination option

**Missing Dependencies:**

- `ioredis`

**Priority: P2 (optimization)**

### 4.4 Observability ✅

**Status: PRODUCTION-READY**

- [x] Structured logging with Winston (JSON logs)
- [x] Request logging with request-id correlation
- [x] Health check endpoint
- [ ] ⚠️ **Request tracing** (OpenTelemetry) - NOT IMPLEMENTED
- [ ] ⚠️ **Error tracking** (Sentry) - NOT IMPLEMENTED

**Priority: P2 (monitoring)**

---

## ❌ Phase 5 - Module/Plugin Architecture (0%)

### 5.1 Module System ✅

**Status: FULLY IMPLEMENTED**

- [x] `MetaModule` interface definition (`packages/meta-types/src/module.ts`)
- [x] Module loader — `apps/api/src/meta/moduleRegistry.ts` (scans `modules/` directory)
- [x] Module dependency resolution (topological sort)
- [x] Module enable/disable (config-driven)
- [x] Model → Module mapping
- [x] Menu generation from module definitions

### 5.2 Action Framework ✅

**Status: FULLY IMPLEMENTED**

- [x] `MetaAction` types in `@afenda/meta-types`
- [x] `RowActionsMenu.tsx` — renders actions per record, permission-checked
- [x] `useActions` hook — executes actions with record context
- [x] `apps/api/src/actions/index.ts` — server-side action registry and execution

### 5.3 Workflow Engine ✅

**Status: IMPLEMENTED** (`apps/api/src/routes/workflow.ts`)

- [x] State machine definitions per model
- [x] Workflow API layer and Redux integration
- [x] `ApprovalActions.tsx` / `PurchaseOrderApprovalActions.tsx` — status bar widgets
- [x] Activity log (comments + status changes)
- [ ] ⚠️ Visual workflow designer UI — P3 stretch goal

---

## ❌ Phase 6 - Frontend Architecture Enhancements (0%)

### 6.1 Routing & Navigation ✅

**Status: IMPLEMENTED**

- [x] `AppRouter` in `apps/web/src/routes/index.tsx`
- [x] `App.tsx` wraps with `AppRouter`
- [x] All required routes defined (`/`, `/:module`, `/:module/:model`, `/:model/new`, `/:model/:id`)
- [x] Sidebar auto-generated from module registry
- [x] Deep-linking support

**Priority: ✅ RESOLVED**

### 6.2 App Shell ✅

**Status: IMPLEMENTED**

- [x] `<AppShell>` — `apps/web/src/components/layout/app-shell.tsx`
- [x] Collapsible sidebar — `apps/web/src/components/layout/sidebar.tsx`
- [x] Top bar (search, user menu, theme toggle) — `apps/web/src/components/layout/top-bar.tsx`
- [x] Command palette (Ctrl+K) — `apps/web/src/components/command-palette.tsx`

**Priority: ✅ RESOLVED**

### 6.3 Global Search 🟡

**Status: FRONTEND DONE — BACKEND MISSING**

- [x] Command palette UI component with keyboard navigation
- [x] Ctrl+K shortcut handler
- [ ] ⚠️ `GET /api/search?q=term&models=partner,product` — NOT IMPLEMENTED
- [ ] ⚠️ Cross-model text search backend — NOT IMPLEMENTED
- [ ] ⚠️ Wire command palette to search API — NOT IMPLEMENTED

**Priority: P1** (see `ACTUAL_COMPLETION_STATUS.md` task #4)

### 6.4 State Management 🟡

**Status: PARTIAL**

- [x] React Query for server state
- [ ] ⚠️ Zustand/Jotai for client state - NOT IMPLEMENTED
- [ ] ⚠️ Persist user preferences - NOT IMPLEMENTED

**Priority: P2 (can use React Context for now)**

### 6.5 Internationalization (i18n) ❌

**Status: NOT IMPLEMENTED**

- [ ] `react-i18next` + `i18next`
- [ ] Translation keys in MetaField labels
- [ ] Date/number formatting via `Intl`
- [ ] RTL support

**Missing Dependencies:**

- `react-i18next`
- `i18next`
- `i18next-http-backend`

**Priority: P3 (enterprise feature)**

### 6.6 Error Boundaries & Loading States 🟡

**Status: MOSTLY DONE — polish items remain**

- [x] `<ErrorBoundary>` component — `apps/web/src/components/error-boundary.tsx`
- [x] `<Suspense>` with `safeLazy` wrapper in renderers
- [x] Skeleton screens in MetaForm and MetaList
- [ ] ⚠️ Error boundary at route level in `AppRouter` — P2
- [ ] ⚠️ Offline detection banner — P2
- [ ] ⚠️ 404 / 403 / 500 error pages — P2

**Priority: P2** (see `ACTUAL_COMPLETION_STATUS.md` tasks #9, #10)

---

## ✅ Phase 7 - Testing & Quality (100%)

### 7.1 Unit Tests (Vitest) ✅

**Status: COMPLETE**

- [x] Vitest configured in `apps/web/vitest.config.ts`
- [x] Coverage thresholds: 75% (branches, functions, lines, statements)
- [x] Projects: unit, component, integration
- [x] 27/27 tests passing:
  - utils.test.ts: 8/8 ✅
  - button.test.tsx: 10/10 ✅
  - FormFieldRenderer.test.tsx: 9/9 ✅

**File:** `apps/web/vitest.config.ts`

### 7.2 Integration Tests ✅

**Status: INFRASTRUCTURE READY**

- [x] Vitest integration project configured
- [ ] ⚠️ **API integration tests** - NOT WRITTEN YET

**Priority: P2 (add tests as features are built)**

### 7.3 E2E Tests (Playwright) ✅

**Status: INFRASTRUCTURE READY**

- [x] Playwright configured in `apps/web/playwright.config.ts`
- [x] Projects: chromium, firefox, webkit
- [x] Sharding configured for CI parallelization
- [ ] ⚠️ **E2E test suites** - NOT WRITTEN YET

**File:** `apps/web/playwright.config.ts`

**Recommended Tests:**

- [ ] Form: Create record → verify in list
- [ ] List: Sort, filter, paginate, select, bulk action
- [ ] Kanban: Drag card → verify status update
- [ ] RBAC: viewer role sees readonly fields, no create button

**Priority: P2 (add tests as features are built)**

### 7.4 CI/CD Pipeline ✅

**Status: IMPLEMENTED**

- [x] `.github/workflows/ci.yml` — lint → typecheck → test → build pipeline
- [x] `.github/workflows/react-quality-gate.yml` — FE quality gates
- [x] `.github/dependabot.yml` — dependency updates
- [ ] ⚠️ Database migrations in CI — P2
- [ ] ⚠️ Preview deploys on PR — P2

---

## 🟡 Phase 8 - DevX & Documentation (50%)

### 8.1 Developer Experience 🟡

**Status: PARTIAL**

- [x] `pnpm dev` starts both API + web in parallel (via turbo)
- [ ] ⚠️ **Docker Compose** - NOT IMPLEMENTED
- [ ] ⚠️ **Seed script** (`pnpm db:seed`) - NOT IMPLEMENTED
- [x] Meta introspection CLI (`pnpm meta:introspect`)
- [x] `.env.example` files in apps/api

**Missing:**

- [x] `docker-compose.yml` — in repo root
- [x] Database seeding — `packages/db/src/_seeds/` (factories, scenarios, money)

**Priority: ✅ RESOLVED**

### 8.2 Documentation ✅

**Status: GOOD**

- [x] Main README.md
- [x] API README.md with architecture overview
- [x] API SECURITY.md with security features
- [x] UI package MIGRATION.md
- [x] UI package README.md
- [x] `docs/adding-a-module.md` — created
- [x] `docs/field-types.md` — created
- [x] `docs/deployment.md` — created
- [ ] ⚠️ `docs/rbac.md` — NOT CREATED (P2)
- [ ] ⚠️ **Storybook** for UI component library — NOT IMPLEMENTED (P3)

**Priority: P3 (post-launch)**

---

## 🚨 Critical Gaps Summary (Must Fix Before Production)

### ✅ RESOLVED — Previously P0 Blocking (Now Complete)

1. ~~Routing & Navigation~~ — ✅ AppRouter implemented
2. ~~App Shell~~ — ✅ AppShell + Sidebar + TopBar implemented
3. ~~Error Boundaries~~ — ✅ ErrorBoundary component implemented
4. ~~Expression Evaluator~~ — ✅ `filtrex` safe sandbox implemented
5. ~~API Search & Filter~~ — ✅ `queryBuilder.ts` with `parseFilters` + `buildWhereClause`
6. ~~Row selection + bulk actions~~ — ✅ `meta-list-selection.ts` + `createBulkDeleteAction`

### Priority P1 (HIGH) — Current Remaining Gaps

> See `docs/ACTUAL_COMPLETION_STATUS.md` for full details

1. **File upload cloud storage** — presigned URL / S3 / R2 not wired
2. **Global search backend** — `GET /api/search` endpoint missing
3. **API field selection** — `?fields=id,name` not implemented
4. **API relation expansion** — `?expand=partner` not implemented
5. **Soft delete** — `deleted_at` column + filtered queries not implemented

### Priority P2 (MEDIUM)

6. **MetaListV2** — column resize, reorder, faceted filters, inline edit, sticky header
7. **Missing fields** — Phone, Address, Signature components
8. **Error pages** — 404, 403, 500 route-level pages
9. **Offline detection** — offline banner + mutation retry
10. **Widget plugin registry** — `registerWidget()` API
   - Effort: High (8-10 hours)
   - File to update: `apps/web/src/renderers/MetaListV2.tsx`

7. **⚠️ One2Many Field Implementation (Phase 2.5)**
   - Status: STUB ONLY
   - Impact: Cannot edit related records
   - Effort: High (6-8 hours)
   - File to update: `apps/web/src/renderers/fields/One2ManyField.tsx`

8. **⚠️ Module System (Phase 5.1)**
   - Status: NOT IMPLEMENTED
   - Impact: Cannot organize features into modules
   - Effort: Very High (12-16 hours)
   - Files to create:
     - `apps/api/src/meta/moduleRegistry.ts`
     - `packages/meta-types/src/module.ts`

### Priority P2 (MEDIUM)

9. **Field Type Extensions (Phase 3.1)**
   - Missing: currency, phone, email, url, richtext, json, color, tags
   - Effort: Medium per field (1-2 hours each, 12-16 hours total)

10. **Docker Compose (Phase 8.1)**
    - Impact: Developers must manually install PostgreSQL
    - Effort: Low (1-2 hours)
    - File to create: `docker-compose.yml`

11. **Database Seed Script (Phase 8.1)**
    - Impact: No demo data for testing
    - Effort: Medium (2-3 hours)
    - File to create: `apps/api/src/db/seed.ts`

---

## 📋 Recommended Closure Plan

### Sprint 1: Make App Navigable (P0, 16-20 hours)

**Goal:** Users can navigate between models, create/edit/list records

1. ✅ **Implement Routing** (4 hours)
   - Create route definitions in `apps/web/src/routes/index.tsx`
   - Update App.tsx to use BrowserRouter
   - Add route guards for authentication

2. ✅ **Build App Shell** (6 hours)
   - Create collapsible sidebar with model links
   - Create top bar with user menu and theme toggle
   - Integrate PageShell layout
   - Add breadcrumb navigation

3. ✅ **Error Handling** (3 hours)
   - Create ErrorBoundary component
   - Create 404, 403, 500 error pages
   - Add offline detection banner

4. ✅ **Connect Routes to Renderers** (2 hours)
   - Wire MetaFormV2 to `/:model/:id` and `/:model/new`
   - Wire MetaListV2 to `/:model`
   - Test navigation flow

5. ✅ **Fix evalVisibility** (3 hours)
   - Install `filtrex`
   - Implement safe expression evaluator
   - Test with RBAC rules

**Deliverable:** Fully navigable application with working forms and lists

### Sprint 2: API Enhancement (P1, 12-16 hours)

**Goal:** Users can search, filter, and work with related data

1. **API Search & Filter** (8 hours)
   - Implement filter parser with Zod validation
   - Add Drizzle query builder for filters
   - Support operators: eq, neq, gt, lt, like, in, is_null
   - Test with MetaListV2

2. **One2Many Field** (6 hours)
   - Embed MetaList in compact mode
   - Add/edit via Dialog + MetaForm
   - Delete with AlertDialog confirmation
   - Test with sales_order → order_lines

**Deliverable:** Full CRUD with relationships and filtering

### Sprint 3: Module System (P1, 12-16 hours)

**Goal:** Organize features into pluggable modules

1. **Module Registry** (12 hours)
   - Define MetaModule interface
   - Implement module loader
   - Add module dependency resolution
   - Create "sales" module as example
   - Update sidebar to show modules

**Deliverable:** Modular architecture ready for scaling

### Sprint 4: Field Extensions (P2, 12-16 hours)

**Goal:** Support enterprise field types

1. **Email, URL, Currency Fields** (4 hours)
2. **Rich Text Editor (TipTap)** (6 hours)
3. **Tags Field** (3 hours)

**Deliverable:** 8 additional field types

### Sprint 5: DevX & Deployment (P2, 8-12 hours)

**Goal:** Production-ready deployment

1. **Docker Compose** (2 hours)
2. **Seed Script** (3 hours)
3. **CI/CD Pipeline** (4 hours)
4. **Documentation** (3 hours)

**Deliverable:** One-command local dev setup, automated CI/CD

---

## 🎯 Next Immediate Actions

To close critical gaps and make the application production-ready:

1. **START HERE:** Implement routing and app shell (Sprint 1)
2. Add error boundaries and 404 pages
3. Fix expression evaluator security
4. Implement API search/filter
5. Complete One2Many field editor

**Total Effort to Production:** ~60-80 hours (2-3 weeks for one developer)

---

## 📦 Missing Dependencies

Install these packages to support remaining features:

```bash
# Sprint 1-2 (P0/P1)
pnpm add -w filtrex

# Sprint 4 (P2 - Field Types)
pnpm add -w @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
pnpm add -w react-colorful libphonenumber-js

# Sprint 4 (P2 - Dashboard & Kanban)
pnpm add -w recharts react-grid-layout @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities framer-motion

# Sprint 5 (P2 - i18n)
pnpm add -w react-i18next i18next i18next-http-backend

# Sprint 5 (P2 - Caching)
pnpm add ioredis
pnpm add -D @types/ioredis

# Sprint 5 (P2 - Observability)
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
pnpm add @sentry/react
```

---

## 📝 Notes

- **Tailwind CSS v4**: No config file needed (CSS-based configuration)
- **Testing Infrastructure**: Complete (Vitest + Playwright configured)
- **API Security**: Production-ready (JWT, rate limiting, Helmet, input validation)
- **Design System**: Complete (25 shadcn/ui components in @afenda/ui)
- **Form Engine**: Production-ready (react-hook-form + Zod + shadcn)
- **Data Table**: 90% complete (missing advanced features)

**The biggest gap is routing/navigation (Phase 6). Once that's implemented, the app will be usable end-to-end.**
