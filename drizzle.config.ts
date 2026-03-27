import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Neon requires a direct (non-pooled) connection for migrations.
const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set in .env file");
}

export default defineConfig({
  schema: "./packages/db/demo/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
