import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from workspace root
config({ path: path.resolve(__dirname, "../../.env") });

const migrationUrl = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  console.error("❌ Environment variables:");
  console.error("   DATABASE_URL:", process.env.DATABASE_URL ? "[SET]" : "[NOT SET]");
  console.error(
    "   DATABASE_URL_MIGRATIONS:",
    process.env.DATABASE_URL_MIGRATIONS ? "[SET]" : "[NOT SET]"
  );
  throw new Error("Missing DATABASE_URL_MIGRATIONS or DATABASE_URL");
}

console.log("🔗 Connecting to Neon database...");
console.log(`   Branch: ${migrationUrl.split("@")[1]?.split("/")[0] || "unknown"}`);
console.log(`   Using: ${migrationUrl.substring(0, 30)}...`);

const sql = neon(migrationUrl);
const db = drizzle({ client: sql });

async function main() {
  try {
    console.log("⚙️  Running migrations from packages/db/migrations...");

    await migrate(db, {
      migrationsFolder: path.join(__dirname, "migrations"),
    });

    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    throw error;
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error during migration");
  process.exit(1);
});
