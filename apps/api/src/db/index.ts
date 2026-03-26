import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema/index.js";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const CURRENT_DIR = path.dirname(CURRENT_FILE);
const ROOT_ENV_PATH = path.resolve(CURRENT_DIR, "../../../../.env");

// Prefer repository root .env values for local tooling, even when the shell already defines DATABASE_URL.
dotenv.config({ path: ROOT_ENV_PATH, override: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db = drizzle({ client: pool, schema });
export type Db = typeof db;

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}

export { pool };
