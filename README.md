# 🚀 AFENDA Meta-Driven UI Platform

A **metadata-driven ERP platform** inspired by Odoo but designed around JSON schemas, RBAC, and modern APIs. Built on Node.js + React + Drizzle + GraphQL.

---

## 📋 Table of Contents

- Architecture
- Quick Start
- Project Structure
- How It Works
- Development

---

## 🏗 Architecture

### The Metadata Pipeline

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  PostgreSQL │  ──>  │  Drizzle ORM │  ──>  │ drizzle-graphql│
│   Schema    │      │   Tables     │      │  GraphQL Query  │
└─────────────┘      └──────────────┘      └────────────────┘
                                                    │
                                                    ⬇
┌──────────────────────────────────────────────────────────────┐
│  Meta Compiler (introspect-cli.ts)                           │
│  Transforms GraphQL introspection into ModelMeta JSON schema │
└──────────────────────────────────────────────────────────────┘
                                                    │
                                                    ⬇
┌──────────────────────────────────────────────────────────────┐
│  Schema Registry (Postgres table)                            │
│  Stores compiled ModelMeta as JSONB (versioned, queryable)   │
└──────────────────────────────────────────────────────────────┘
                                                    │
                      ┌─────────────────────────────┼─────────────────────────────┐
                      ⬇                             ⬇                             ⬇
             ┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
             │  /meta/:model   │         │  /api/:model     │         │  /graphql        │
             │  (RBAC-filtered)│         │  (REST CRUD)     │         │  (Complex data)  │
             │  ModelMeta      │         │  w/ column proj  │         │                  │
             └─────────────────┘         └──────────────────┘         └──────────────────┘
                      │                             │                             │
                      └─────────────────────────────┼─────────────────────────────┘
                                                    ⬇
                        ┌─────────────────────────────────────────┐
                        │  React Frontend                         │
                        │  • MetaRenderers (Form, List, Kanban)   │
                        │  • RBAC-aware field visibility          │
                        │  • TanStack Query cache layer           │
                        └─────────────────────────────────────────┘
```

### Core Concepts

#### 1. **Schema Registry** (DB-backed)

- Tables, fields, views, actions, permissions stored as **JSONB in PostgreSQL**
- Queryable and versionable — no XML brittleness
- `schema_registry` table: `{ model, meta: ModelMeta, version, created_at, updated_at }`

#### 2. **RBAC at Multiple Layers**

- **Model-level**: `can_create`, `can_read`, `can_update`, `can_delete` per role
- **Field-level**: `visible_to` and `writable_by` role arrays
- **Action-level**: `allowed_roles` whitelist + `visible_when` expressions
- **Server-side evaluation**: front-end never receives data it isn't allowed to see

#### 3. **Metadata-Driven Rendering**

- One JSON ModelMeta document drives **form, list, kanban, dashboard, filters, bulk actions**
- No need to maintain UI and data schema separately
- Developers patch ModelMeta _incrementally_ via migration scripts

#### 4. **API-First Design**

- `/meta/{model}` — returns RBAC-filtered ModelMeta → FE knows what to render
- `/api/{model}` — REST CRUD with automatic column projection
- `/graphql` — complex queries, nested relations, dashboards (internal + advanced users)

#### 5. **MetaExpression** (Server-Evaluated)

- Actions visibility: `"visible_when": "record.status == 'draft' && user.roles.includes('sales')"`
- Default values, computed fields, state machines — all as expressions
- Currently stubbed; ready for a safe sandbox VM (e.g., restricted eval)

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- **PostgreSQL** 13+

### 1. Clone & Install

```bash
git clone <repo-url> AFENDA-META-UI
cd AFENDA-META-UI
pnpm install
```

### 2. Setup Database

```bash
# Create a PostgreSQL database
createdb afenda

# Copy .env.example and configure
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

### 3. Run Migrations

```bash
pnpm --filter @afenda/api db:push
```

### 4. Introspect & Seed Schema Registry

```bash
# Compiles GraphQL schema → ModelMeta → stores in schema_registry
pnpm --filter @afenda/api meta:introspect
```

### 5. Start Development

```bash
# Terminal 1 — API server
pnpm --filter @afenda/api dev

# Terminal 2 — React dev server
pnpm --filter @afenda/web dev
```

Visit: **http://localhost:5173** (React) connects to **http://localhost:4000** (API)

---

## 📁 Project Structure

```
d:\AFENDA-META-UI
├── apps/
│   ├── api/                          # Node.js backend
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/           # Drizzle table definitions
│   │   │   │   │   ├── platform.ts   # schemaRegistry, roles, users tables
│   │   │   │   │   ├── sales.ts      # Example ERP domain (products, orders)
│   │   │   │   │   └── index.ts      # barrel export
│   │   │   │   └── index.ts          # Drizzle db instance
│   │   │   ├── meta/
│   │   │   │   ├── compiler.ts       # GraphQL introspection → ModelMeta
│   │   │   │   ├── registry.ts       # CRUD for schema_registry
│   │   │   │   ├── rbac.ts           # RBAC filtering (applyRbac)
│   │   │   │   └── introspect-cli.ts # CLI: runs every dev/build cycle
│   │   │   ├── graphql/
│   │   │   │   ├── schema.ts         # drizzle-graphql buildSchema
│   │   │   │   └── server.ts         # GraphQL Yoga setup
│   │   │   ├── routes/
│   │   │   │   ├── api.ts            # REST CRUD handlers
│   │   │   │   └── meta.ts           # /meta/:model endpoints
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT → SessionContext
│   │   │   │   └── rbac.ts           # Placeholder
│   │   │   ├── index.ts              # Express app entry
│   │   │   └── ...
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── ...
│   └── web/                          # React frontend
│       ├── src/
│       │   ├── renderers/
│       │   │   ├── MetaForm.tsx       # Form view renderer
│       │   │   ├── MetaList.tsx       # List view + pagination/sort
│       │   │   ├── MetaKanban.tsx     # Kanban board (drag-drop)
│       │   │   ├── MetaDashboard.tsx  # Dashboard widgets
│       │   │   └── fields/            # Field components
│       │   │       ├── StringField.tsx
│       │   │       ├── BooleanField.tsx
│       │   │       ├── EnumField.tsx
│       │   │       ├── DateField.tsx
│       │   │       ├── RelationField.tsx
│       │   │       ├── One2ManyField.tsx
│       │   │       ├── FieldWrapper.tsx
│       │   │       └── index.ts (dispatcher)
│       │   ├── hooks/
│       │   │   ├── useMeta.ts         # Fetch ModelMeta from /meta/:model
│       │   │   └── useModel.ts        # CRUD + list queries
│       │   ├── lib/
│       │   │   ├── query-client.ts    # TanStack Query setup
│       │   │   ├── query-error-classifier.ts
│       │   │   └── query-error-overrides-registry.ts
│       │   ├── bootstrap/
│       │   │   └── query-error-overrides.ts # App-level query/mutation error messages
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       └── ...
├── packages/
│   └── meta-types/                   # Shared TypeScript types
│       ├── src/
│       │   ├── schema.ts             # ✨ Core types: ModelMeta, MetaField, etc.
│       │   ├── rbac.ts               # SessionContext, RbacResult
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── .env.example                      # Environment template
├── package.json                      # Monorepo root
├── turbo.json                        # Turborepo pipeline
├── pnpm-workspace.yaml               # PNPM workspace definition
├── tsconfig.base.json                # Shared TS config
└── README.md                         # This file
```

---

## 🔍 How It Works

### Example: Rendering a Sales Order Form

#### 1. **User navigates to `/order/123`**

Frontend calls `useMeta("sales_order")`:

```typescript
GET /meta/sales_order
    ↓
{
  "meta": {
    "model": "sales_order",
    "fields": [
      { "name": "id", "type": "string", "readonly": true },
      { "name": "partner_id", "type": "many2one", "relation": {...} },
      { "name": "status", "type": "enum", "options": [...] },
      ...
    ],
    "views": {
      "form": { "groups": [...] }
    }
  },
  "permissions": { "can_read": true, "can_update": true, ... },
  "effective_role": "sales"
}
```

Server-side RBAC already stripped fields the role can't see.

#### 2. **Frontend renders `<MetaForm model="sales_order" recordId="123" />`**

- `useMeta` fetches ModelMeta
- `useModel("sales_order", "123")` fetches record data
- `<MetaForm>` maps each MetaField → `<FieldDispatcher>`
- Each field component renders the appropriate widget (text, select, date, relation picker, etc.)

#### 3. **User edits and saves**

```javascript
const { updateRecord } = useModel("sales_order");
await updateRecord("123", { status: "confirmed", total: 1500 });
    ↓
PATCH /api/sales_order/123
  { "status": "confirmed", "total": 1500 }
    ↓
Server:
  1. Check SessionContext roles
  2. Load ModelMeta from schema_registry
  3. Call resolveRbac(meta, session) → verify role can update these fields
  4. Update record
  5. Return updated record
```

---

## 💻 Development

### Query And Mutation Error Messaging

The React Query error messaging flow is split between reusable library logic and app-level startup registration:

- Classify and tag errors by category/source: `apps/web/src/lib/query-error-classifier.ts`
- Store and merge presentation overrides: `apps/web/src/lib/query-error-overrides-registry.ts`
- Apply messages at startup (single registration point): `apps/web/src/bootstrap/query-error-overrides.ts`
- Wire registration during app boot: `apps/web/src/main.tsx`

To customize wording for a feature area, call `registerQueryErrorPresentationOverrides(...)` from the startup registration module instead of editing core query client internals.

### Adding a New Domain Model

#### 1. **Define the Drizzle schema** (`apps/api/src/db/schema/mymodule.ts`)

```typescript
import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const myRecords = pgTable("my_records", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});
```

#### 2. **Export in schema/index.ts**

```typescript
export { myRecords } from "./mymodule.js";
```

#### 3. **Run introspection**

```bash
pnpm --filter @afenda/api meta:introspect
```

This CLI:

- Queries GraphQL introspection
- Compiles each new table → ModelMeta
- Upserts into schema_registry

#### 4. **Patch the schema (optional)**

If auto-compiled schema needs tweaks (custom widgets, field order, permissions), edit via:

- Direct SQL `UPDATE schema_registry SET meta = ... WHERE model = '...';`
- Or write a migration script

#### 5. **Render in React**

```typescript
import { MetaForm } from "@/renderers/MetaForm";

export function MyFormPage() {
  return <MetaForm model="my_records" />;
}
```

### Testing & Development

**Run tests** (coming soon):

```bash
pnpm test
pnpm --filter @afenda/api test
```

**GraphQL Introspection & Yoga GraphiQL**:

- Disable in production via `NODE_ENV=production`
- Dev mode: http://localhost:4000/graphql

**Database Studio** (Drizzle Kit UI):

```bash
pnpm --filter @afenda/api db:studio
```

---

## 🔐 Security Best Practices

1. **Change `JWT_SECRET` in production** — use a strong random string (32+ chars)
2. **Enable HTTPS** — set `NODE_ENV=production` to mask GraphQL introspection
3. **Field-level RBAC** — use `field_permissions` to hide sensitive data at the schema level
4. **Server-side MetaExpression evaluation** — don't trust client-provided expressions
5. **Rate limiting** — add middleware (e.g., `express-rate-limit`) before deployment
6. **Audit logging** — log all mutations with user context

---

## 📦 Dependencies

- **Backend**: Node.js, Express, Drizzle ORM, GraphQL Yoga, drizzle-graphql, Jose (JWT)
- **Frontend**: React 18, Vite, @tanstack/react-query, date-fns
- **Database**: PostgreSQL
- **Monorepo**: pnpm workspaces, Turborepo

---

## 🤝 Contributing

1. Follow the architecture patterns (schema → GraphQL → metadata → UI)
2. Add field components in `apps/web/src/renderers/fields/`
3. Add domain schemas in `apps/api/src/db/schema/`
4. Run `meta:introspect` after schema changes

---

## 📝 License

MIT (or your preferred license)

---

**Questions?** Start with the Architecture section above or explore `/apps/api/src/meta/compiler.ts` to see how ModelMeta is generated!
