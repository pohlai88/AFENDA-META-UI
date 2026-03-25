import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index.js";

const DEFAULT_LOCAL_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/afenda_test";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VITEST) {
    return DEFAULT_LOCAL_TEST_DATABASE_URL;
  }

  throw new Error("DATABASE_URL is required for @afenda/db");
}

export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
});

const _db = drizzle({ client: pool, schema, casing: "camelCase" });

export const db: typeof _db = _db;

export type Database = typeof db;
