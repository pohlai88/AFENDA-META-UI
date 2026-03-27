import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_MIGRATION is not set in .env file");
}

if (migrationUrl.includes("pooler")) {
  throw new Error(
    "Migration URL appears to be pooled. Use a direct Neon connection string in DATABASE_URL_MIGRATION for drizzle-kit migrate."
  );
}

export default defineConfig({
  schema: "./packages/db/demo/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
