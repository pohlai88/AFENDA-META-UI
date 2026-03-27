import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
  override: true,
});

// Neon requires a direct (non-pooled) connection for migrations.
const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set in .env file");
}

export default defineConfig({
  // Compatibility shim: db migrations are owned by @afenda/db.
  schema: "../../packages/db/src/schema/index.ts",
  out: "../../packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
