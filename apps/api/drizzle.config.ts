import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
  override: true,
});

export default defineConfig({
  // Compatibility shim: db migrations are owned by @afenda/db.
  schema: "../../packages/db/src/schema/index.ts",
  out: "../../packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
