import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

// Load .env from workspace root
config({ path: path.resolve(__dirname, "../../.env") });

const migrationUrl = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("Missing DATABASE_URL_MIGRATIONS or DATABASE_URL for Drizzle migrations");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  verbose: true,
  strict: true,
});
