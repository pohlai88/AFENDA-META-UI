#!/usr/bin/env node
/**
 * Neon Branch Helper Script
 *
 * Helps create and configure Neon branches with automatic .env updates
 *
 * Usage:
 *   node scripts/neon-branch-create.mjs --name my-feature-branch
 *   node scripts/neon-branch-create.mjs --name my-feature --parent production
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse arguments
const args = process.argv.slice(2);
const nameIndex = args.indexOf("--name");
const parentIndex = args.indexOf("--parent");

if (nameIndex === -1) {
  console.error("❌ Error: --name argument is required");
  console.log("\nUsage:");
  console.log("  node scripts/neon-branch-create.mjs --name my-feature-branch");
  console.log("  node scripts/neon-branch-create.mjs --name my-feature --parent production");
  process.exit(1);
}

const branchName = args[nameIndex + 1];
const parentBranch = parentIndex !== -1 ? args[parentIndex + 1] : null;

console.log("🌿 Creating Neon branch...");
console.log(`   Name: ${branchName}`);
if (parentBranch) {
  console.log(`   Parent: ${parentBranch}`);
}
console.log("");

try {
  // Create branch
  const createCmd = parentBranch
    ? `neon branches create --name ${branchName} --parent ${parentBranch}`
    : `neon branches create --name ${branchName}`;

  console.log(`⚙️  Running: ${createCmd}`);
  execSync(createCmd, { stdio: "inherit" });

  console.log("");
  console.log("✅ Branch created successfully!");
  console.log("");

  // Get connection string
  console.log("🔗 Fetching connection strings...");
  const pooledConnString = execSync(`neon connection-string ${branchName}`, {
    encoding: "utf-8",
  }).trim();

  const directConnString = execSync(`neon connection-string ${branchName} --pooled=false`, {
    encoding: "utf-8",
  }).trim();

  console.log("");
  console.log("📋 Connection Strings:");
  console.log("");
  console.log("Pooled (for application):");
  console.log(`  ${pooledConnString}`);
  console.log("");
  console.log("Direct (for migrations):");
  console.log(`  ${directConnString}`);
  console.log("");

  // Offer to update .env.local
  console.log("💡 To use this branch, update your .env or .env.local:");
  console.log("");
  console.log("DATABASE_URL=" + pooledConnString);
  console.log("DATABASE_URL_MIGRATIONS=" + directConnString);
  console.log("NEON_BRANCH_ID=" + branchName);
  console.log("");

  // Create .env.local.example if it doesn't exist
  const envLocalExamplePath = path.join(rootDir, ".env.local.example");
  const envContent = `# Neon Branch: ${branchName}
# Created: ${new Date().toISOString()}

DATABASE_URL=${pooledConnString}
DATABASE_URL_MIGRATIONS=${directConnString}
NEON_BRANCH_ID=${branchName}
`;

  fs.writeFileSync(envLocalExamplePath, envContent);
  console.log(`✅ Created .env.local.example with connection strings`);
  console.log("   Copy this to .env.local to use the new branch");
  console.log("");

  // Show next steps
  console.log("📝 Next Steps:");
  console.log("   1. Copy .env.local.example to .env.local");
  console.log("   2. Make schema changes in packages/db/src/schema/");
  console.log("   3. Run: pnpm db:generate");
  console.log("   4. Run: pnpm db:migrate");
  console.log("   5. Run: pnpm dev");
  console.log("");
  console.log("   To delete this branch later:");
  console.log(`   neon branches delete ${branchName}`);
  console.log("");
} catch (error) {
  console.error("❌ Error creating branch:", error.message);
  process.exit(1);
}
