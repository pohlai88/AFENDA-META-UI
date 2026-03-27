# ✅ Neon CLI + Drizzle ORM - Setup Complete!

Your AFENDA-META-UI monorepo is now fully configured with Neon CLI and Drizzle ORM integration.

## 🎉 What's Been Set Up

### 1. **Neon CLI** ✅

- **Installed**: v2.22.0
- **Authenticated**: Via browser (web auth)
- **Project Context**: Set to `calm-lab-59199054`
- **Active Branches**:
  - `production` (default)
  - `preview-dev-20260327` (currently in .env)

### 2. **Drizzle ORM** ✅

- **Configuration**: `packages/db/drizzle.config.ts`
- **Schema Location**: `packages/db/src/schema/`
  - Platform schemas
  - Meta schemas
  - Domain schemas
- **Migrations Folder**: `packages/db/migrations/`
- **Active Migrations**: 5 migration sets deployed

### 3. **Helper Scripts** ✅

New scripts added to `package.json`:

- `pnpm neon:branch:create` - Create new database branch with auto .env setup
- `pnpm neon:branch:switch` - Switch between branches (updates .env)
- `pnpm neon:setup` - Complete database setup (migrate + seed)
- `pnpm neon:setup:no-seed` - Setup without seeds

### 4. **Documentation** ✅

- **Comprehensive Guide**: [`docs/neon-cli-drizzle-guide.md`](./neon-cli-drizzle-guide.md)
- **Quick Reference**: [`docs/neon-cli-drizzle-quickref.md`](./neon-cli-drizzle-quickref.md)
- **This README**: Setup summary and next steps

## 🚀 Quick Start

### Most Common Workflows

#### **Work on a Feature with Isolated Database**

```bash
# 1. Create a new database branch
pnpm neon:branch:create --name feature-payment-module

# 2. Copy the generated .env.local.example to .env.local
cp .env.local.example .env.local

# 3. Setup the database (migrations + seeds)
pnpm neon:setup

# 4. Start developing
pnpm dev
```

#### **Switch Between Branches**

```bash
# Switch to feature branch
pnpm neon:branch:switch --name feature-payment-module

# Switch back to production
pnpm neon:branch:switch --name production

# Restart your app
pnpm dev
```

#### **Make Schema Changes**

```bash
# 1. Edit schema files
# packages/db/src/schema/schema-domain/your-changes.ts

# 2. Generate migration
pnpm db:generate

# 3. Review the generated SQL
# Check packages/db/migrations/XXXXXX_name/migration.sql

# 4. Apply the migration
pnpm db:migrate

# 5. Test
pnpm dev
```

## 📚 Documentation

| Document                                                         | Purpose                                      |
| ---------------------------------------------------------------- | -------------------------------------------- |
| [`neon-cli-drizzle-guide.md`](./neon-cli-drizzle-guide.md)       | Complete setup guide with detailed workflows |
| [`neon-cli-drizzle-quickref.md`](./neon-cli-drizzle-quickref.md) | Quick command reference for daily use        |

## 🔧 Configuration Files

| File                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `.neon`                           | Neon CLI project context (project ID)        |
| `drizzle.config.ts`               | Root-level demo Drizzle config                |
| `packages/db/drizzle.config.ts`   | Main Drizzle ORM configuration                |
| `packages/db/demo/`               | Demo files for testing Drizzle functionality |
| `.env`                            | Production environment variables              |
| `.env.local`                      | Local development overrides (not committed)   |

## ⚙️ Available Commands

### Neon CLI Commands

```bash
neon branches list                            # List all branches
neon branches create --name <name>            # Create new branch
neon branches delete <name>                   # Delete branch
neon connection-string <branch>               # Get connection string
neon branches schema-diff --branch <br> --parent <parent>  # Schema diff
```

### Drizzle Commands

```bash
pnpm db:generate       # Generate migration from schema changes
pnpm db:migrate        # Run pending migrations
pnpm db:push           # Push schema directly (dev only)
cd packages/db && pnpm db:studio  # Open Drizzle Studio GUI
cd packages/db && pnpm seed       # Run seed data
```

### Helper Scripts (Recommended!)

```bash
pnpm neon:branch:create --name <name> [--parent <parent>]
pnpm neon:branch:switch --name <name>
pnpm neon:setup
pnpm neon:setup:no-seed
```

## 🎯 Next Steps

### For Development

1. **Create a feature branch**: `pnpm neon:branch:create --name feature-name`
2. **Copy .env.local**: `cp .env.local.example .env.local`
3. **Setup database**: `pnpm neon:setup`
4. **Start coding**: `pnpm dev`

### For Production

1. Review migration files in `packages/db/migrations/`
2. Test migrations on a staging branch first
3. Apply to production: `neon branches schema-diff --branch staging --parent production`
4. Merge when ready

### For Team Collaboration

- Each developer can create their own database branch
- Branches are cheap and fast (copy-on-write)
- Test with production data safely using branch copies
- Share connection strings via `.env.local.example` (not committed)

## 🔍 Current Environment

Based on your `.env` file, you're currently connected to:

```
Branch: preview-dev-20260327
Branch ID: br-cool-sky-a1kb5icj
Project ID: calm-lab-59199054
```

### Your Branches

```
┌──────────────────────┬──────────────────────┬───────────────┐
│ Name                 │ Id                   │ Current State │
├──────────────────────┼──────────────────────┼───────────────┤
│ preview-dev-20260327 │ br-cool-sky-a1kb5icj │ ready         │
│ ✱ production         │ br-odd-moon-a1h8mjgx │ ready         │
└──────────────────────┴──────────────────────┴───────────────┘
```

## 💡 Pro Tips

1. **Use branch-per-feature** workflow for isolated development
2. **Always use direct connections** (`DATABASE_URL_MIGRATIONS`) for migrations
3. **Test migrations** on dev branches before production
4. **Use schema diff** to review changes before merging
5. **Leverage Drizzle Studio** for visual database inspection
6. **Keep migrations in git** - never manually edit migration files

## ⚠️ Important Warnings

- ❌ **Never use pooled connections** for migrations
- ❌ **Never manually edit migration files** - regenerate them
- ❌ **Never use `db:push` in production** - it bypasses migration history
- ✅ **Always review generated migrations** before applying
- ✅ **Always test on branch first** before production

## 🆘 Troubleshooting

If you encounter issues, check:

1. **Authentication**: Run `neon auth` if you get auth errors
2. **Context**: Verify `.neon` file exists with correct project ID
3. **Connection strings**: Ensure using `DATABASE_URL_MIGRATIONS` for migrations
4. **Migrations folder**: Should be in `packages/db/migrations/`
5. **Schema location**: Should be in `packages/db/src/schema/index.ts`

For more help, see:

- [Full troubleshooting guide](./neon-cli-drizzle-guide.md#troubleshooting)
- [Neon Documentation](https://neon.com/docs)
- [Drizzle Documentation](https://orm.drizzle.team/)

## 📊 What You Can Do Now

✅ Create database branches for features
✅ Run migrations automatically
✅ Switch between database branches easily
✅ Test with production data safely
✅ Visual database inspection with Drizzle Studio
✅ Schema diffs between branches
✅ Automated seed data deployment
✅ Type-safe database queries with Drizzle ORM

## 🎊 You're All Set!

Your Neon CLI and Drizzle ORM setup is complete and ready for production use.

Happy coding! 🚀

---

**Setup Date**: March 27, 2026
**Neon CLI Version**: 2.22.0
**Drizzle ORM**: Latest (from catalog)
**Project**: AFENDA-META-UI Monorepo
