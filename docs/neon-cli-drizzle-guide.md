# Neon CLI + Drizzle ORM Integration Guide

Complete guide for using Neon CLI with Drizzle ORM in the AFENDA-META-UI monorepo.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Neon CLI Setup](#neon-cli-setup)
- [Drizzle Configuration](#drizzle-configuration)
- [Common Workflows](#common-workflows)
- [Branch-Based Development](#branch-based-development)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses:

- **Neon Postgres**: Serverless Postgres with database branching
- **Drizzle ORM**: Type-safe SQL ORM for TypeScript
- **Neon CLI**: Command-line tool for managing Neon projects

## Prerequisites

- Node.js 18+ installed
- pnpm 10.33.0+ installed
- Neon account with project access
- Neon CLI installed globally: `npm i -g neonctl`

## Neon CLI Setup

### 1. Install Neon CLI

```bash
npm i -g neonctl
```

### 2. Authenticate

**Web Authentication (Recommended)**

```bash
neon auth
```

**API Key Authentication (CI/CD)**

```bash
export NEON_API_KEY=your_api_key_here
```

Or add to your `.env` file:

```properties
NEON_API_KEY=napi_xxxxx
```

### 3. Set Project Context

Your project context is saved in `.neon` at the root:

```json
{
  "projectId": "calm-lab-59199054"
}
```

To update context:

```bash
neon set-context --project-id calm-lab-59199054
```

### 4. Enable Shell Completion

**For PowerShell:**

```powershell
neon completion >> $PROFILE
```

**For Bash:**

```bash
neon completion >> ~/.bashrc
source ~/.bashrc
```

**For Zsh:**

```bash
neon completion >> ~/.zshrc
source ~/.zshrc
```

## Drizzle Configuration

### Project Structure

```
AFENDA-META-UI/
├── .neon                          # Neon CLI context
├── drizzle.config.ts              # Root-level demo config (points to packages/db/demo)
└── packages/
    └── db/
        ├── drizzle.config.ts      # Main Drizzle config
        ├── migrations/            # Generated SQL migrations
        ├── demo/                  # Demo files for testing
        │   ├── schema.ts          # Demo schema
        │   ├── db.ts              # Demo DB connection
        │   └── index.ts           # Demo CRUD script
        └── src/
            ├── schema/            # Drizzle schema definitions
            │   ├── index.ts       # Main schema export
            │   ├── schema-platform/
            │   ├── schema-meta/
            │   └── schema-domain/
            └── _seeds/            # Seed data scripts
```

### Connection Strings

Two connection strings are configured in `.env`:

1. **Pooled Connection (for application queries)**

   ```properties
   DATABASE_URL=postgresql://...pooler.ap-southeast-1.aws.neon.tech/...
   ```

2. **Direct Connection (for migrations)**
   ```properties
   DATABASE_URL_MIGRATIONS=postgresql://...ap-southeast-1.aws.neon.tech/...
   ```

⚠️ **Important**: Always use `DATABASE_URL_MIGRATIONS` (direct connection) for running migrations. Pooled connections can cause migration errors.

### Current Configuration

The `packages/db/drizzle.config.ts` is configured as:

```typescript
import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("Missing DATABASE_URL_MIGRATIONS or DATABASE_URL for Drizzle migrations");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  verbose: true,
  strict: true,
});
```

## Common Workflows

### 1. List Branches

```bash
neon branches list
```

### 2. Get Connection String

```bash
# Default branch
neon connection-string

# Specific branch
neon connection-string preview-dev-20260327
```

### 3. Create a New Branch

```bash
# Create from main/production branch
neon branches create --name feature-new-module

# Create from specific branch
neon branches create --name feature-test --parent preview-dev-20260327
```

### 4. Generate Migration

After modifying schema in `packages/db/src/schema/`:

```bash
# From root
pnpm db:generate

# From packages/db
cd packages/db
pnpm db:generate
```

This runs: `drizzle-kit generate`

### 5. Run Migration

```bash
# From root
pnpm db:migrate

# From packages/db
cd packages/db
pnpm db:migrate
```

This runs: `drizzle-kit migrate`

### 6. Push Schema Changes (Development Only)

For quick development iterations without creating migration files:

```bash
# From root
pnpm db:push

# From packages/db
cd packages/db
pnpm db:push
```

⚠️ **Warning**: `db:push` bypasses migration history. Use only for development.

### 7. Run Seeds

```bash
cd packages/db
pnpm seed
```

## Branch-Based Development

### Workflow: Feature Development with Database Branching

1. **Create a new database branch**

   ```bash
   neon branches create --name feature-auth-module
   ```

2. **Get connection string for the new branch**

   ```bash
   neon connection-string feature-auth-module
   ```

3. **Update your `.env` with the new branch connection**

   ```properties
   DATABASE_URL_MIGRATIONS=postgresql://...feature-auth-module...
   ```

4. **Make schema changes** in `packages/db/src/schema/`

5. **Generate and run migration**

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. **Test your changes**

7. **When ready, merge to main branch or production**

### Workflow: Test with Production Data Copy

1. **Create a branch from production**

   ```bash
   neon branches create --name test-with-prod-data --parent production
   ```

2. **Get connection string and update `.env`**

3. **Run your tests or experiments safely**

4. **Delete the branch when done**
   ```bash
   neon branches delete test-with-prod-data
   ```

### Workflow: Schema Diff Between Branches

```bash
neon branches schema-diff --branch feature-auth-module --parent production
```

## Available Scripts

### Root-level Scripts

```bash
pnpm db:generate       # Generate migrations (@afenda/db)
pnpm db:migrate        # Run migrations (@afenda/db)
pnpm db:push           # Push schema without migration (@afenda/db)
pnpm db:test           # Run database tests
pnpm db:check          # Run all checks (typecheck + tests)
```

### Packages/db Scripts

```bash
pnpm db:generate       # drizzle-kit generate
pnpm db:migrate        # drizzle-kit migrate
pnpm db:push           # drizzle-kit push
pnpm db:studio         # Open Drizzle Studio (GUI)
pnpm seed              # Run seed scripts
```

## Integration: Neon CLI + Drizzle

### Example: Complete Feature Development Workflow

```bash
# 1. Create a new database branch
neon branches create --name feature-inventory-module

# 2. Get connection string
CONN_STRING=$(neon connection-string feature-inventory-module)
echo "DATABASE_URL_MIGRATIONS=$CONN_STRING" >> .env.local

# 3. Update schema
# Edit packages/db/src/schema/schema-domain/inventory.ts

# 4. Generate migration
pnpm db:generate

# 5. Run migration
pnpm db:migrate

# 6. Seed test data
cd packages/db && pnpm seed

# 7. Test the feature
pnpm --filter @afenda/web dev

# 8. When done, delete the branch or merge
neon branches delete feature-inventory-module
```

## Troubleshooting

### Error: "Migration URL appears to be pooled"

**Solution**: Ensure you're using `DATABASE_URL_MIGRATIONS` (direct connection) instead of `DATABASE_URL` (pooled).

```bash
# Check your connection string
echo $DATABASE_URL_MIGRATIONS

# It should NOT contain "pooler" in the hostname
```

### Error: "Authentication failed"

**Solution**: Re-authenticate with Neon CLI

```bash
neon auth
```

Or set API key:

```bash
export NEON_API_KEY=napi_xxxxx
```

### Error: "No .neon context file found"

**Solution**: Set project context

```bash
neon set-context --project-id calm-lab-59199054
```

### Error: "Cannot find schema at ./src/schema/index.ts"

**Solution**: Ensure you're in the correct directory

```bash
cd packages/db
pnpm db:generate
```

### Migration conflict or schema drift

**Solution**: Use schema diff to compare branches

```bash
neon branches schema-diff --branch your-branch --parent production
```

## Best Practices

### 1. Use Direct Connections for Migrations

Always use `DATABASE_URL_MIGRATIONS` for Drizzle migrations to avoid pooling issues.

### 2. Create Branches for Features

Create a database branch for each feature to isolate schema changes.

### 3. Use `db:generate` for Schema Changes

Never manually edit migration files. Always update schema and regenerate.

### 4. Test with Production Data Safely

Use Neon branches to copy production data for testing without affecting production.

### 5. Version Control .gitignore

Ensure `.env` is in `.gitignore` but commit `.env.example`.

### 6. Use Neon Console for Visual Management

For complex operations, use [Neon Console](https://console.neon.tech).

### 7. Set Up Shell Completion

Enable shell completion to speed up CLI usage.

## Additional Resources

- [Neon CLI Documentation](https://neon.com/docs/reference/neon-cli)
- [Neon CLI Quickstart](https://neon.com/docs/reference/cli-quickstart)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Migrations Guide](https://neon.com/docs/guides/drizzle-migrations)
- [Neon Database Branching](https://neon.com/docs/introduction/branching)

## Quick Reference

| Task                   | Command                                                   |
| ---------------------- | --------------------------------------------------------- |
| List branches          | `neon branches list`                                      |
| Create branch          | `neon branches create --name <name>`                      |
| Get connection string  | `neon connection-string <branch>`                         |
| Delete branch          | `neon branches delete <name>`                             |
| Generate migration     | `pnpm db:generate`                                        |
| Run migration          | `pnpm db:migrate`                                         |
| Push schema (dev only) | `pnpm db:push`                                            |
| Open Drizzle Studio    | `cd packages/db && pnpm db:studio`                        |
| Run seeds              | `cd packages/db && pnpm seed`                             |
| Schema diff            | `neon branches schema-diff --branch <br1> --parent <br2>` |

---

**Last Updated**: March 27, 2026
**Maintained by**: AFENDA-META-UI Team
