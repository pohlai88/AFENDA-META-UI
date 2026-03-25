import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import * as schema from "./schema/index.js";

dotenv.config();

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
