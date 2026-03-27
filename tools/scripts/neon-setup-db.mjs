#!/usr/bin/env node
/**
 * Neon + Drizzle Complete Setup Script
 *
 * Performs complete schema setup on a new or existing branch:
 * 1. Runs migrations
 * 2. Runs seeds (optional)
 *
 * Usage:
 *   node scripts/neon-setup-db.mjs
 *   node scripts/neon-setup-db.mjs --skip-seed
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dbPackagePath = path.join(rootDir, "packages", "db");

// Parse arguments
const args = process.argv.slice(2);
const skipSeed = args.includes("--skip-seed");

console.log("🚀 Setting up Neon database with Drizzle...");
console.log("");

try {
  // Step 1: Generate migrations
  console.log("📦 Step 1: Generating migrations...");
  execSync("pnpm db:generate", {
    cwd: rootDir,
    stdio: "inherit",
  });
  console.log("✅ Migrations generated");
  console.log("");

  // Step 2: Run migrations
  console.log("⚙️  Step 2: Running migrations...");
  execSync("pnpm db:migrate", {
    cwd: rootDir,
    stdio: "inherit",
  });
  console.log("✅ Migrations applied");
  console.log("");

  // Step 3: Run seeds (if not skipped)
  if (!skipSeed) {
    console.log("🌱 Step 3: Running seed data...");
    execSync("pnpm seed", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
    console.log("✅ Seed data applied");
    console.log("");
  } else {
    console.log("⏭️  Step 3: Skipped seed data");
    console.log("");
  }

  console.log("✅ Database setup complete!");
  console.log("");
  console.log("💡 Next steps:");
  console.log("   - Run your application: pnpm dev");
  console.log("   - Open Drizzle Studio: cd packages/db && pnpm db:studio");
  console.log("");
} catch (error) {
  console.error("❌ Error during database setup:", error.message);
  process.exit(1);
}
