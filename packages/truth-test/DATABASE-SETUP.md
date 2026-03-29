# Truth Test Harness - Database Setup Guide

## Overview

The truth-test harness uses a **real PostgreSQL database** (Neon) for integration testing. This ensures tests validate actual database constraints, relationships, and business logic.

## Quick Start

### 1. Create Test Database Branch

```bash
# From repository root
node tools/scripts/setup-test-db.mjs
```

This script will:

- ✅ Create a Neon test branch (`truth-test-integration`)
- ✅ Copy production schema to test branch
- ✅ Add `TEST_DATABASE_URL` to `.env`
- ✅ Run migrations on test branch

### 2. Run Integration Tests

```bash
pnpm --filter @afenda/truth-test test
```

Tests automatically use `TEST_DATABASE_URL` from `.env`.

## Local Development

### Prerequisites

- ✅ Neon API key set in `.env` (`NEON_API_KEY`)
- ✅ Production `DATABASE_URL` in `.env`
- ✅ Node.js 22+
- ✅ pnpm 10.33.0+

### Environment Variables

The test database setup adds these to your `.env`:

```bash
# Test Database Configuration
TEST_DATABASE_URL=postgresql://...
TEST_DATABASE_URL_MIGRATIONS=postgresql://...
TEST_NEON_BRANCH_ID=truth-test-integration
```

**Important:** Never commit `.env` with real credentials!

### Test Database Lifecycle

1. **Create once:** Run `setup-test-db.mjs` once per development machine
2. **Reuse:** Tests reuse the same branch for speed
3. **Clean up:** Delete branch when done:
   ```bash
   # Visit Neon Console → Branches → Delete "truth-test-integration"
   ```

### Why No Reset?

Tests **do not** truncate tables between runs because:

- ❌ Truncating 100+ tables is slow (28+ seconds)
- ✅ Tests use auto-incrementing IDs for isolation
- ✅ Shared database speeds up test runs (3 seconds)

If you need a clean state:

```bash
# Delete and recreate test branch
node tools/scripts/setup-test-db.mjs
```

## CI/CD Integration

### GitHub Actions Setup

The CI workflow automatically:

1. Creates ephemeral test branch
2. Runs migrations
3. Executes tests
4. Deletes test branch

###Required GitHub Secrets

Add these to your repository settings:

```
Settings → Secrets and variables → Actions → New repository secret
```

- **NEON_API_KEY**: Neon API key (from Neon Console → Account → API Keys)
- **NEON_PROJECT_ID**: `calm-lab-59199054` (from Neon Console → Project Settings)
- **DATABASE_URL**: Production database connection string

### CI Workflow Example

```yaml
- name: Setup Neon test database
  env:
    NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: node tools/scripts/setup-test-db.mjs --ci

- name: Run Vitest
  env:
    TEST_DATABASE_URL: ${{ env.TEST_DATABASE_URL }}
  run: pnpm test

- name: Cleanup test database
  if: always()
  env:
    NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
    TEST_NEON_BRANCH_ID: ${{ env.TEST_NEON_BRANCH_ID }}
  run: |
    curl -X DELETE "https://console.neon.tech/api/v2/projects/${{ secrets.NEON_PROJECT_ID }}/branches/$TEST_NEON_BRANCH_ID" \
      -H "Authorization: Bearer $NEON_API_KEY"
```

## Troubleshooting

### Error: "connect ECONNREFUSED ::1:5433"

**Cause:** Test is trying to use localhost instead of Neon.

**Fix:**

```bash
# Ensure TEST_DATABASE_URL is set
echo $TEST_DATABASE_URL

# Re-run setup if missing
node tools/scripts/setup-test-db.mjs
```

### Error: "not allowed for organization API keys"

**Cause:** Neon CLI doesn't work with organization API keys.

**Fix:** The setup script uses the Neon REST API, which works with all API key types. No action needed.

### Error: "23502: NOT NULL constraint violation"

**Cause:** Test data is missing required database fields (e.g., `tenantId`).

**Fix:**

- Ensure `tenantId` is set in harness:
  ```typescript
  createTruthHarness({
    tenantId: "1", // Must be numeric string
    userId: 1,
  });
  ```
- Check `execute-mutation.ts` enriches input with context fields

### Tests Timeout After 28 Seconds

**Cause:** `reset()` is being called, truncating all tables.

**Fix:**

- Remove `afterEach(() => harness.reset())` from tests
- vitest.setup.ts should NOT call `reset()` in global `afterEach`

### Can't Find `partners` Table

**Cause:** Business entity names (`customer`) don't match schema table names (`partners`).

**Fix:**

- Use `entityToSchemaKey()` in test-db.ts for name resolution
- Or use actual table names from `@afenda/db/schema`

## Best Practices

### ✅ DO

- **Use unique test data** - Auto-incrementing IDs provide isolation
- **Test business logic** - Validate invariants, policies, events
- **Keep tests fast** - Avoid unnecessary database resets
- **Clean up after yourself** - Delete test branches when done

### ❌ DON'T

- **Reset database in every test** - Too slow for CI
- **Share IDs between tests** - Use auto-generated IDs
- **Commit `.env` files** - Contains production credentials
- **Test against production** - Always use TEST_DATABASE_URL

## Schema Compatibility

The test database inherits production schema, which includes:

- ✅ All tables, indexes, constraints
- ✅ Foreign key relationships
- ✅ Row-level security policies
- ✅ Neon Auth schema (if enabled)

**Note:** The setup script may warn about deleting `neon_auth` schema. This is safe to ignore - the warning appears during schema sync but data is preserved.

## Performance

### Benchmark Results

```
❌ With reset():     28+ seconds (truncates 100+ tables)
✅ Without reset():  <3 seconds  (isolated via unique IDs)
```

### Test Database Sizing

- **Branch Creation:** ~5
  seconds
- **Migration Sync:** ~10 seconds
- **Test Execution:** ~3 seconds
- **Branch Cleanup:** ~2 seconds

**Total CI Overhead:** ~20 seconds per test run

## Advanced Configuration

### Custom Branch Name

```bash
node tools/scripts/setup-test-db.mjs --name my-feature-tests
```

### Manual Database Cleanup

```bash
# List all test branches
# (Visit Neon Console → Branches)

# Delete specific branch via Console UI
# Or use Neon API:
curl -X DELETE \
  "https://console.neon.tech/api/v2/projects/<PROJECT_ID>/branches/<BRANCH_ID>" \
  -H "Authorization: Bearer $NEON_API_KEY"
```

### Running Tests Without Database

Not currently supported. The truth-test harness requires a real database because:

- TestDB uses Drizzle ORM which needs PostgreSQL
- Mock databases can't validate constraints
- Integration tests verify real database behavior

## FAQ

**Q: Can I use SQLite for tests?**
A: No - the harness uses `@afenda/db` which requires PostgreSQL.

**Q: Do I need a test branch for every feature?**
A: No - reuse the `truth-test-integration` branch for all local testing.

**Q: What about test data conflicts?**
A: Tests use auto-incrementing IDs, so conflicts are rare. If needed, use unique emails/names.

**Q: Can I run tests in parallel?**
A: Yes - vitest uses forks by default. Connection pooling handles concurrent access.

**Q: How do I debug failing tests?**
A: Check Neon Console → Branches → truth-test-integration → SQL Editor to inspect test data.

## Related Documentation

- **[INTEGRATION.md](./INTEGRATION.md)** - Gateway integration guide
- **[README.md](./README.md)** - Truth harness overview
