# Demo Files

These files are for testing basic Drizzle ORM functionality at the root level.

## Files

- `schema.ts` - Simple demo schema with `demo_users` table
- `db.ts` - Database connection setup using Neon serverless driver
- `index.ts` - CRUD operations demo script

## Usage

From the root directory:

```bash
# Generate migrations for demo schema
pnpm db:generate:demo

# Run migrations
pnpm db:migrate:demo

# Run CRUD demo
pnpm db:crud:demo
```

## Note

For production database work, use the main database package:

- Schema: `packages/db/src/schema/`
- Seeds: `packages/db/src/_seeds/`
- Scripts: `pnpm db:generate`, `pnpm db:migrate`, etc.

These demo files are kept separate for testing and learning purposes only.
