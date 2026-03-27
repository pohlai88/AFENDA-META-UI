#!/usr/bin/env node
/**
 * Neon Branch Switch Helper Script
 *
 * Helps switch between Neon branches by updating .env with connection strings
 *
 * Usage:
 *   node scripts/neon-branch-switch.mjs --name my-feature-branch
 *   node scripts/neon-branch-switch.mjs --name production
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

if (nameIndex === -1) {
  console.error("❌ Error: --name argument is required");
  console.log("\nUsage:");
  console.log("  node scripts/neon-branch-switch.mjs --name my-feature-branch");
  console.log("");
  console.log("Available branches:");
  try {
    execSync("neon branches list", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to list branches");
  }
  process.exit(1);
}

const branchName = args[nameIndex + 1];

console.log(`🔄 Switching to Neon branch: ${branchName}`);
console.log("");

try {
  // Get connection strings
  console.log("🔗 Fetching connection strings...");
  const pooledConnString = execSync(`neon connection-string ${branchName}`, {
    encoding: "utf-8",
  }).trim();

  const directConnString = execSync(`neon connection-string ${branchName} --pooled=false`, {
    encoding: "utf-8",
  }).trim();

  console.log("✅ Connection strings retrieved");
  console.log("");

  // Read current .env file
  const envPath = path.join(rootDir, ".env");
  const envLocalPath = path.join(rootDir, ".env.local");

  let envContent;
  let targetPath;

  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, "utf-8");
    targetPath = envLocalPath;
    console.log("📝 Updating .env.local");
  } else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
    targetPath = envPath;
    console.log("📝 Updating .env");
  } else {
    console.error("❌ No .env or .env.local file found");
    process.exit(1);
  }

  // Update connection strings
  envContent = envContent.replace(/^DATABASE_URL=.*/m, `DATABASE_URL=${pooledConnString}`);

  envContent = envContent.replace(
    /^DATABASE_URL_MIGRATIONS=.*/m,
    `DATABASE_URL_MIGRATIONS=${directConnString}`
  );

  // Update or add NEON_BRANCH_ID
  if (/^NEON_BRANCH_ID=.*/m.test(envContent)) {
    envContent = envContent.replace(/^NEON_BRANCH_ID=.*/m, `NEON_BRANCH_ID=${branchName}`);
  } else {
    envContent += `\nNEON_BRANCH_ID=${branchName}\n`;
  }

  // Write back to file
  fs.writeFileSync(targetPath, envContent);

  console.log(`✅ Updated ${path.basename(targetPath)} with new connection strings`);
  console.log("");
  console.log("📋 Connection Strings:");
  console.log("");
  console.log("Pooled (for application):");
  console.log(`  ${pooledConnString}`);
  console.log("");
  console.log("Direct (for migrations):");
  console.log(`  ${directConnString}`);
  console.log("");
  console.log("✅ Branch switch complete!");
  console.log("");
  console.log("💡 Restart your application to use the new branch");
  console.log("");
} catch (error) {
  console.error("❌ Error switching branch:", error.message);
  process.exit(1);
}
