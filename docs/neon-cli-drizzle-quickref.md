# Neon CLI + Drizzle Quick Reference

Quick command reference for daily workflows with Neon and Drizzle.

## 🔧 Setup Commands

```bash
# Install Neon CLI
npm i -g neonctl

# Authenticate
neon auth

# Set project context
neon set-context --project-id calm-lab-59199054

# Enable shell completion
neon completion >> $PROFILE  # PowerShell
neon completion >> ~/.bashrc  # Bash
```

## 🌿 Branch Management

```bash
# List all branches
neon branches list

# Create new branch
neon branches create --name feature-name

# Create branch from specific parent
neon branches create --name feature-name --parent production

# Delete branch
neon branches delete feature-name

# Get connection string
neon connection-string branch-name

# Get direct (non-pooled) connection
neon connection-string branch-name --pooled=false

# Schema diff between branches
neon branches schema-diff --branch feature-name --parent production
```

## 📦 Drizzle Commands

```bash
# Generate migration from schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Push schema directly (dev only, bypasses migration history)
pnpm db:push

# Open Drizzle Studio (GUI)
cd packages/db && pnpm db:studio

# Run seed data
cd packages/db && pnpm seed
```

## 🚀 Helper Scripts (New!)

```bash
# Create new branch with automatic .env setup
pnpm neon:branch:create --name my-feature

# Create branch from specific parent
pnpm neon:branch:create --name my-feature --parent production

# Switch to existing branch (updates .env)
pnpm neon:branch:switch --name feature-name

# Complete database setup (migrate + seed)
pnpm neon:setup

# Setup without seed data
pnpm neon:setup:no-seed
```

## 🔄 Common Workflows

### Create Feature Branch

```bash
# 1. Create database branch
pnpm neon:branch:create --name feature-auth

# 2. Copy .env.local.example to .env.local (created automatically)
cp .env.local.example .env.local

# 3. Make schema changes
# Edit packages/db/src/schema/...

# 4. Generate and run migration
pnpm db:generate
pnpm db:migrate

# 5. Start developing
pnpm dev
```

### Switch Between Branches

```bash
# Switch to feature branch
pnpm neon:branch:switch --name feature-auth

# Switch back to production
pnpm neon:branch:switch --name production

# Restart app to pick up new connection
pnpm dev
```

### Test with Production Data

```bash
# 1. Create branch from production
neon branches create --name test-prod-data --parent production

# 2. Switch to it
pnpm neon:branch:switch --name test-prod-data

# 3. Run tests
pnpm test

# 4. Delete when done
neon branches delete test-prod-data
```

### Schema Changes

```bash
# 1. Update schema files
# Edit packages/db/src/schema/...

# 2. Generate migration
pnpm db:generate

# 3. Review migration SQL
# Check packages/db/migrations/XXXXXX_name/migration.sql

# 4. Apply migration
pnpm db:migrate

# 5. Test and verify
pnpm dev
```

## 🔍 Debugging & Inspection

```bash
# Check current Neon project
cat .neon

# View branches with details
neon branches list

# Get current connection string
neon connection-string

# Check schema differences
neon branches schema-diff --branch feature --parent production

# Open Drizzle Studio
cd packages/db && pnpm db:studio
```

## ⚠️ Important Notes

- **Always use `DATABASE_URL_MIGRATIONS`** (direct connection) for migrations
- **Never use pooled connections** for migration operations
- **Commit migrations to git** before merging branches
- **Test migrations** on a dev branch before applying to production
- **Use `db:push` only in development** - it bypasses migration history

## 🔗 Environment Variables

```properties
# Pooled connection (for application)
DATABASE_URL=postgresql://...pooler.ap-southeast-1.aws.neon.tech/...

# Direct connection (for migrations)
DATABASE_URL_MIGRATIONS=postgresql://...ap-southeast-1.aws.neon.tech/...

# Current branch ID (optional, for reference)
NEON_BRANCH_ID=br-cool-sky-a1kb5icj

# Neon API key (for CI/CD)
NEON_API_KEY=napi_xxxxx

# Neon project ID
NEON_PROJECT_ID=calm-lab-59199054
```

## 📚 Full Documentation

See [neon-cli-drizzle-guide.md](./neon-cli-drizzle-guide.md) for complete documentation.

## 🆘 Troubleshooting

| Problem                              | Solution                                         |
| ------------------------------------ | ------------------------------------------------ |
| "Migration URL appears to be pooled" | Use `DATABASE_URL_MIGRATIONS` not `DATABASE_URL` |
| "Authentication failed"              | Run `neon auth`                                  |
| "No .neon context file"              | Run `neon set-context --project-id <id>`         |
| Schema drift                         | Run `neon branches schema-diff`                  |
| Can't find schema                    | `cd packages/db` before running commands         |

---

**Version**: 1.0.0
**Last Updated**: March 27, 2026
