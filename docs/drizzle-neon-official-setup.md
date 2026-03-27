# Drizzle with Neon - Official Documentation

Source: https://orm.drizzle.team/docs/tutorials/drizzle-with-neon

## Setup Overview

### 1. Install Dependencies

```bash
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
```

### 2. Database Connection Setup

#### Using Neon Serverless Driver (src/db.ts)

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

### 3. Schema Definition (src/schema.ts)

```typescript
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  email: text("email").notNull().unique(),
});

export const postsTable = pgTable("posts_table", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;
```

### 4. Drizzle Config (drizzle.config.ts)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 5. Environment Variables (.env)

```env
DATABASE_URL=postgresql://username:password@host/database
```

### 6. Migration Workflow

#### Generate migrations:

```bash
npx drizzle-kit generate
```

#### Apply migrations:

```bash
npx drizzle-kit migrate
```

#### Or push schema directly (for rapid prototyping):

```bash
npx drizzle-kit push
```

> **IMPORTANT**: Push command is good for rapid testing in local development. It bypasses migration history and applies changes directly.

### 7. Basic File Structure

```
📦 <project root>
 ├ 📂 src
 │  ├ 📜 db.ts
 │  └ 📜 schema.ts
 ├ 📂 migrations
 │  ├ 📂 meta
 │  │  ├ 📜 _journal.json
 │  │  └ 📜 0000_snapshot.json
 │  └ 📜 0000_initial_migration.sql
 ├ 📜 .env
 ├ 📜 drizzle.config.ts
 ├ 📜 package.json
 └ 📜 tsconfig.json
```

## Query Examples

### Insert Data (src/queries/insert.ts)

```typescript
import { db } from "../db";
import { InsertPost, InsertUser, postsTable, usersTable } from "../schema";

export async function createUser(data: InsertUser) {
  await db.insert(usersTable).values(data);
}

export async function createPost(data: InsertPost) {
  await db.insert(postsTable).values(data);
}
```

### Select Data (src/queries/select.ts)

```typescript
import { asc, between, count, eq, getColumns, sql } from "drizzle-orm";
import { db } from "../db";
import { SelectUser, usersTable, postsTable } from "../schema";

export async function getUserById(id: SelectUser["id"]): Promise<
  Array<{
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.id, id));
}

export async function getUsersWithPostsCount(
  page = 1,
  pageSize = 5
): Promise<
  Array<{
    postsCount: number;
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db
    .select({
      ...getColumns(usersTable),
      postsCount: count(postsTable.id),
    })
    .from(usersTable)
    .leftJoin(postsTable, eq(usersTable.id, postsTable.userId))
    .groupBy(usersTable.id)
    .orderBy(asc(usersTable.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function getPostsForLast24Hours(
  page = 1,
  pageSize = 5
): Promise<
  Array<{
    id: number;
    title: string;
  }>
> {
  return db
    .select({
      id: postsTable.id,
      title: postsTable.title,
    })
    .from(postsTable)
    .where(between(postsTable.createdAt, sql`now() - interval '1 day'`, sql`now()`))
    .orderBy(asc(postsTable.title), asc(postsTable.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
```

> **Note**: `getColumns` is available starting from `drizzle-orm@1.x`. If you're on pre-1 version (like `0.45.1`), use `getTableColumns` instead.

### Update Data (src/queries/update.ts)

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { SelectPost, postsTable } from "../schema";

export async function updatePost(id: SelectPost["id"], data: Partial<Omit<SelectPost, "id">>) {
  await db.update(postsTable).set(data).where(eq(postsTable.id, id));
}
```

### Delete Data (src/queries/delete.ts)

```typescript
import { db } from "../db";
import { eq } from "drizzle-orm";
import { SelectUser, usersTable } from "../schema";

export async function deleteUser(id: SelectUser["id"]) {
  await db.delete(usersTable).where(eq(usersTable.id, id));
}
```

## Key Differences from Current Setup

1. **Driver**: Official docs use `@neondatabase/serverless` with `drizzle-orm/neon-http` driver
2. **Connection**: Uses `neon()` function directly, not `Pool` from `pg`
3. **Simpler**: No need for manual migration scripts - `drizzle-kit migrate` handles everything
4. **Edge-Ready**: Neon serverless driver works in edge environments (Vercel Edge, Cloudflare Workers)

## Migration to Official Pattern

To align with official Drizzle + Neon patterns:

```typescript
// Before (node-postgres):
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// After (neon serverless):
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
```

## Benefits of Neon Serverless Driver

- ✅ Edge-compatible (works in Vercel Edge Functions)
- ✅ Automatic connection pooling
- ✅ HTTP-based (no persistent connections)
- ✅ Built specifically for serverless environments
- ✅ No manual connection management needed
