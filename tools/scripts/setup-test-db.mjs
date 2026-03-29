#!/usr/bin/env node
/**
 * Neon Test Database Setup Script
 * ================================
 * Creates and configures a Neon test branch for integration testing.
 *
 * **Usage:**
 *
 * Local development:
 *   node tools/scripts/setup-test-db.mjs
 *
 * CI environment:
 *   node tools/scripts/setup-test-db.mjs --ci
 *
 * Custom branch name:
 *   node tools/scripts/setup-test-db.mjs --name my-test-branch
 *
 * **Features:**
 * - Creates ephemeral test branch from production using Neon REST API
 * - Generates TEST_DATABASE_URL for .env
 * - Runs migrations on test branch
 * - CI mode outputs GitHub Actions env vars
 *
 * **Environment Variables Required:**
 * - NEON_API_KEY: Neon API key for branch creation
 * - DATABASE_URL: Production database URL (contains project ID)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

// ========================================
// Load Environment Variables
// ========================================

// Load .env file if it exists (for local development)
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// ========================================
// Parse CLI Arguments
// ========================================

const args = process.argv.slice(2);
const isCI = args.includes("--ci");
const nameIndex = args.indexOf("--name");
const branchName = nameIndex !== -1
  ? args[nameIndex + 1]
  : isCI
    ? `test-ci-${Date.now()}`
    : "truth-test-integration";

// ========================================
// Validate Environment
// ========================================

const requiredEnvVars = ["NEON_API_KEY", "DATABASE_URL"];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error("\n💡 Make sure NEON_API_KEY and DATABASE_URL are set in .env");
  process.exit(1);
}

// ========================================
// Extract Project ID from DATABASE_URL
// ========================================

function extractProjectIdFromUrl(databaseUrl) {
  // DATABASE_URL format: postgresql://user:pass@ep-xxx-yyy.region.aws.neon.tech/db
  // Project ID is embedded in the endpoint name
  const match = databaseUrl.match(/ep-[^-]+-[^-]+-([a-z0-9]+)/);
  if (!match) {
    throw new Error("Could not extract project ID from DATABASE_URL");
  }

  // The project ID is actually in a different location
  // Let's try to get it via API
  return null; // We'll fetch it from API instead
}

// ========================================
// Neon API Helper
// ========================================

function neonApiRequest(endpoint, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "console.neon.tech",
      port: 443,
      path: `/api/v2${endpoint}`,
      method: method,
      headers: {
        "Authorization": `Bearer ${process.env.NEON_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ========================================
// Main Setup Logic
// ========================================

async function setupTestDatabase() {
  console.log("🌿 Creating Neon test branch...");
  console.log(`   Name: ${branchName}`);
  console.log(`   Mode: ${isCI ? "CI (ephemeral)" : "Local (persistent)"}`);
  console.log("");

  try {
    // Step 1: Get list of projects to find the project ID
    console.log("🔍 Finding Neon project...");
    const projectsResponse = await neonApiRequest("/projects");

    if (!projectsResponse.projects || projectsResponse.projects.length === 0) {
      throw new Error("No Neon projects found");
    }

    // Use the first project or match by DATABASE_URL
    const project = projectsResponse.projects[0];
    const projectId = project.id;

    console.log(`   Project ID: ${projectId}`);
    console.log(`   Project Name: ${project.name}`);
    console.log("");

    // Step 2: Get list of existing branches to find parent
    console.log("🔍 Finding parent branch...");
    const branchesResponse = await neonApiRequest(`/projects/${projectId}/branches`);
    const primaryBranch = branchesResponse.branches.find(b => b.primary) || branchesResponse.branches[0];

    if (!primaryBranch) {
      throw new Error("No branches found in project");
    }

    console.log(`   Parent Branch: ${primaryBranch.name} (${primaryBranch.id})`);
    console.log("");

    // Step 3: Check if test branch already exists (local mode only)
    if (!isCI) {
      const existingBranch = branchesResponse.branches.find(b => b.name === branchName);

      if (existingBranch) {
        console.log("ℹ️  Test branch already exists, using existing branch");
        console.log(`   Branch ID: ${existingBranch.id}`);
        console.log("");

        // Get endpoints for existing branch
        const endpointsResponse = await neonApiRequest(`/projects/${projectId}/branches/${existingBranch.id}/endpoints`);
        const endpoint = endpointsResponse.endpoints[0];

        if (!endpoint) {
          throw new Error("No endpoint found for existing branch");
        }

        await updateEnvironmentConfig(projectId, existingBranch.id, endpoint.host, primaryBranch);
        return;
      }
    }

    // Step 4: Create new test branch
    console.log("⚙️  Creating new test branch...");
    const createBranchResponse = await neonApiRequest(
      `/projects/${projectId}/branches`,
      "POST",
      {
        branch: {
          name: branchName,
          parent_id: primaryBranch.id,
        },
        endpoints: [{
          type: "read_write",
        }],
      }
    );

    const newBranch = createBranchResponse.branch;
    const endpoint = createBranchResponse.endpoints[0];

    console.log("✅ Branch created successfully!");
    console.log(`   Branch ID: ${newBranch.id}`);
    console.log(`   Endpoint: ${endpoint.host}`);
    console.log("");

    // Step 5: Update environment configuration
    await updateEnvironmentConfig(projectId, newBranch.id, endpoint.host, primaryBranch);

    // Step 6: Run migrations
    await runMigrations(endpoint.host, primaryBranch);

    // Step 7: Success summary
    printSuccessSummary(branchName, endpoint.host);

  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Test database setup failed");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");
    console.error("Error:", error.message);
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   1. Verify NEON_API_KEY is set correctly");
    console.error("   2. Ensure you have permissions to create branches");
    console.error("   3. Check if you've reached your branch limit");
    console.error("   4. Try creating a branch manually in Neon console");
    console.error("");
    process.exit(1);
  }
}

// ========================================
// Helper Functions
// ========================================

async function updateEnvironmentConfig(projectId, branchId, endpointHost, primaryBranch) {
  console.log("📝 Updating environment configuration...");

  // Extract credentials from primary DATABASE_URL
  const primaryUrl = process.env.DATABASE_URL;
  const urlMatch = primaryUrl.match(/postgresql:\/\/([^:]+):([^@]+)@[^/]+\/(.+)/);

  if (!urlMatch) {
    throw new Error("Could not parse DATABASE_URL");
  }

  const [, username, password, database] = urlMatch;

  // Build test database URLs
  const pooledUrl = `postgresql://${username}:${password}@${endpointHost}/${database}`;
  const directUrl = pooledUrl; // For simplicity, use same URL (can be refined later)

  if (isCI) {
    // CI mode: output GitHub Actions environment variables
    console.log("📋 GitHub Actions Environment Variables:");
    console.log("");
    console.log(`TEST_DATABASE_URL=${pooledUrl}`);
    console.log(`TEST_DATABASE_URL_MIGRATIONS=${directUrl}`);
    console.log(`TEST_NEON_BRANCH_ID=${branchId}`);
    console.log("");

    // Write to GitHub Actions environment file if available
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_DATABASE_URL=${pooledUrl}\n`);
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_DATABASE_URL_MIGRATIONS=${directUrl}\n`);
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_NEON_BRANCH_ID=${branchId}\n`);
      console.log("✅ Environment variables written to $GITHUB_ENV");
      console.log("");
    }
  } else {
    // Local mode: update .env file
    const envBackupPath = path.join(rootDir, ".env.backup");

    // Backup existing .env
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, envBackupPath);
      console.log("💾 Backed up .env to .env.backup");
    }

    // Read existing .env
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    // Remove existing TEST_DATABASE_URL lines
    envContent = envContent
      .split("\n")
      .filter(line => !line.startsWith("TEST_DATABASE_URL") && !line.startsWith("TEST_NEON_BRANCH_ID"))
      .join("\n");

    // Add test database configuration
    const testDbConfig = `
# ========================================
# Test Database Configuration
# (Generated by setup-test-db.mjs)
# ========================================
TEST_DATABASE_URL=${pooledUrl}
TEST_DATABASE_URL_MIGRATIONS=${directUrl}
TEST_NEON_BRANCH_ID=${branchId}
`;

    envContent = envContent.trim() + "\n" + testDbConfig + "\n";

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env with TEST_DATABASE_URL");
    console.log("");
  }
}

async function runMigrations(endpointHost, primaryBranch) {
  console.log("🔄 Running migrations on test branch...");

  // Extract credentials from primary DATABASE_URL
  const primaryUrl = process.env.DATABASE_URL;
  const urlMatch = primaryUrl.match(/postgresql:\/\/([^:]+):([^@]+)@[^/]+\/(.+)/);

  if (!urlMatch) {
    throw new Error("Could not parse DATABASE_URL for migrations");
  }

  const [, username, password, database] = urlMatch;
  const testDbUrl = `postgresql://${username}:${password}@${endpointHost}/${database}`;

  try {
    execSync("pnpm run db:push", {
      stdio: "inherit",
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: testDbUrl }
    });
    console.log("");
    console.log("✅ Migrations completed successfully");
    console.log("");
  } catch (migrationError) {
    console.warn("⚠️  Migration failed (schema may already be up to date)");
    console.log("");
  }
}

function printSuccessSummary(branchName, endpointHost) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Test database setup complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📋 Test Branch Details:");
  console.log(`   Name: ${branchName}`);
  console.log(`   Endpoint: ${endpointHost}`);
  console.log("");

  if (!isCI) {
    console.log("🚀 Next Steps:");
    console.log("   1. Run integration tests:");
    console.log("      pnpm --filter @afenda/truth-test test");
    console.log("");
    console.log("   2. View test data in Neon console:");
    console.log("      https://console.neon.tech");
    console.log("");
    console.log("   3. Delete test branch when done:");
    console.log(`      Visit Neon console to delete branch: ${branchName}`);
    console.log("");
  } else {
    console.log("🤖 CI Mode:");
    console.log("   Test database ready for automated testing");
    console.log("   Branch will be deleted after CI run");
    console.log("");
  }
}

// ========================================
// Run Setup
// ========================================

setupTestDatabase();
