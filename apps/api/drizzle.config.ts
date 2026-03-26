import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
  override: true,
});

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
