import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

// Load .env from monorepo root
config({ path: path.resolve(__dirname, "../../.env") });

// Neon requires a direct (non-pooled) connection for migrations.
// DATABASE_URL_MIGRATIONS is the direct endpoint; DATABASE_URL is the pooled
// runtime endpoint used as fallback.
const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set in .env file");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
