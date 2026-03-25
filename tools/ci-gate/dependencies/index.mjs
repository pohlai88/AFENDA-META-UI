#!/usr/bin/env node

/**
 * Dependency Governance CI Gate
 *
 * Enforces core dependency governance rules across the monorepo:
 * - Critical package version alignment
 * - Server/client dependency boundary
 * - Internal workspace dependency spec usage
 * - Runtime dependency hygiene checks
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import { formatDependencyIssues, summarizeDependencyIssues } from "./utils/diagnostics.mjs";

/**
 * Parse the catalog: section from pnpm-workspace.yaml without an external YAML parser.
 * Supports the default catalog only (not named catalogs).
 */
function readWorkspaceCatalog(root) {
  const yamlPath = join(root, "pnpm-workspace.yaml");
  if (!existsSync(yamlPath)) return {};

  const lines = readFileSync(yamlPath, "utf-8").split("\n");
  const catalog = {};
  let inCatalog = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.trimStart() === "catalog:") {
      inCatalog = true;
      continue;
    }
    if (inCatalog) {
      // A new top-level key (no leading spaces) ends the catalog block
      if (trimmed.length > 0 && !/^\s/.test(trimmed)) {
        inCatalog = false;
        continue;
      }
      const match = trimmed.match(/^\s+["']?(@?[\w\-./]+)["']?:\s*["']?([^"'\s]+)["']?/);
      if (match) catalog[match[1]] = match[2];
    }
  }

  return catalog;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const STRICT = process.argv.includes("--strict");
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const criticalAlignedPackages = ["drizzle-orm", "drizzle-kit", "zod", "vitest"];

const serverOnlyPackages = [
  "@aws-sdk/client-s3",
  "compression",
  "cors",
  "dotenv",
  "drizzle-kit",
  "drizzle-orm",
  "express",
  "express-mongo-sanitize",
  "express-rate-limit",
  "express-validator",
  "graphql-yoga",
  "helmet",
  "jose",
  "multer",
  "pg",
  "pino",
  "pino-http",
];

function getMajor(versionLike) {
  if (!versionLike) return null;
  const match = String(versionLike).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function extractOutdatedItems(outdatedJson) {
  if (!outdatedJson) return [];
  if (Array.isArray(outdatedJson)) return outdatedJson;

  const items = [];
  for (const [scope, value] of Object.entries(outdatedJson)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") items.push({ ...item, scope });
      }
      continue;
    }

    if (value && typeof value === "object") {
      for (const [name, item] of Object.entries(value)) {
        if (item && typeof item === "object") {
          items.push({ name, ...item, scope });
        }
      }
    }
  }

  return items;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function resolveWorkspacePackageJsonPaths(rootPkg) {
  const patterns = rootPkg.workspaces || [];
  const paths = [];

  for (const pattern of patterns) {
    if (!pattern.endsWith("/*")) continue;
    const baseDir = pattern.slice(0, -2);
    const absBase = join(repoRoot, baseDir);
    if (!existsSync(absBase)) continue;

    const children = readdirSync(absBase, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(absBase, entry.name, "package.json"))
      .filter((candidate) => existsSync(candidate));

    paths.push(...children);
  }

  return paths;
}

function getDeclaredVersion(pkgJson, depName) {
  return (
    pkgJson.dependencies?.[depName] ||
    pkgJson.devDependencies?.[depName] ||
    pkgJson.peerDependencies?.[depName] ||
    null
  );
}

function rel(absPath) {
  return absPath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function collectVersionMap(manifests, depName) {
  const map = new Map();

  for (const manifest of manifests) {
    const version = getDeclaredVersion(manifest.pkgJson, depName);
    if (!version) continue;
    if (!map.has(version)) map.set(version, []);
    map.get(version).push(rel(manifest.path));
  }

  return map;
}

function createIssue({
  level,
  category,
  message,
  explanation,
  relatedFiles = [],
  fixes = [],
}) {
  return {
    level,
    category,
    message,
    explanation,
    relatedFiles,
    fixes,
  };
}

function main() {
  console.log(`${colors.bright}${colors.blue}Dependency Governance CI Gate${colors.reset}`);
  console.log(`${colors.dim}Checking workspace dependency policy compliance...${colors.reset}`);

  const rootPkgPath = join(repoRoot, "package.json");
  const rootPkg = readJson(rootPkgPath);
  const workspacePkgPaths = resolveWorkspacePackageJsonPaths(rootPkg);

  const manifests = [
    { path: rootPkgPath, pkgJson: rootPkg },
    ...workspacePkgPaths.map((pkgPath) => ({ path: pkgPath, pkgJson: readJson(pkgPath) })),
  ];

  const errors = [];
  const warnings = [];

  // Rule 0: Governance versions should be centrally defined — either in the workspace
  // catalog (preferred, pnpm-workspace.yaml > catalog:) or in root pnpm.overrides
  // (acceptable for transitive-only pins).
  const rootOverrides = rootPkg.pnpm?.overrides || {};
  const workspaceCatalog = readWorkspaceCatalog(repoRoot);
  const governedPackages = [...criticalAlignedPackages, "typescript", "tsx", "pg", "@types/node", "@types/pg"];
  for (const dep of governedPackages) {
    const inCatalog = Boolean(workspaceCatalog[dep]);
    const inOverride = Boolean(rootOverrides[dep]);
    if (!inCatalog && !inOverride) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "GOVERNANCE_VERSION_MISSING",
          message: `${dep} is not governed by the workspace catalog or a root override.`,
          explanation:
            "Governed packages must have their version defined in pnpm-workspace.yaml catalog: (preferred) " +
            "or in package.json > pnpm.overrides (for transitive-only pins). " +
            "This ensures deterministic, drift-resistant version resolution.",
          relatedFiles: ["pnpm-workspace.yaml", "package.json"],
          fixes: [
            `Add \"${dep}\" to the catalog: section in pnpm-workspace.yaml.`,
            `Then reference it as \"catalog:\" in any workspace package.json that declares ${dep}.`,
            "Re-run pnpm install to regenerate the lockfile.",
          ],
        })
      );
    }
  }

  // Bonus: warn if any workspace manifest declares a governed dep with an explicit version
  // instead of "catalog:". This means the dep drifted out of governance.
  for (const manifest of manifests) {
    for (const sectionName of ["dependencies", "devDependencies"]) {
      const section = manifest.pkgJson[sectionName] || {};
      for (const dep of governedPackages) {
        const version = section[dep];
        if (!version) continue;
        if (version !== "catalog:" && !version.startsWith("workspace:")) {
          warnings.push(
            createIssue({
              level: "warning",
              category: "CATALOG_BYPASS",
              message: `${rel(manifest.path)} declares ${dep}@${version} explicitly instead of using catalog:.`,
              explanation:
                "Packages governed by the workspace catalog should reference them as \"catalog:\" " +
                "so version changes only need to be made in one place.",
              relatedFiles: [rel(manifest.path), "pnpm-workspace.yaml"],
              fixes: [
                `Change ${dep} to \"catalog:\" in ${sectionName} of ${rel(manifest.path)}.`,
                `Ensure the version is defined in pnpm-workspace.yaml catalog: section.`,
              ],
            })
          );
        }
      }
    }
  }

  // Rule 1: Critical packages should stay version-aligned across workspace manifests.
  for (const dep of criticalAlignedPackages) {
    const versionMap = collectVersionMap(manifests, dep);
    if (versionMap.size > 1) {
      const details = [...versionMap.entries()]
        .map(([version, files]) => `${dep}@${version} -> ${files.join(", ")}`)
        .join(" | ");
      errors.push(
        createIssue({
          level: "error",
          category: "VERSION_DRIFT",
          message: `Version drift detected for ${dep}. ${details}`,
          explanation:
            "Critical runtime/tooling packages must be version-aligned to avoid type and runtime incompatibilities.",
          relatedFiles: ["package.json", "pnpm-lock.yaml"],
          fixes: [
            `Align ${dep} to a single version across workspace manifests.`,
            "Use catalog: in pnpm-workspace.yaml to ensure a single source of truth.",
          ],
        })
      );
    }
  }

  // Rule 2: Server-only dependencies must not exist in web runtime deps.
  const webPkgPath = join(repoRoot, "apps", "web", "package.json");
  if (existsSync(webPkgPath)) {
    const webPkg = readJson(webPkgPath);
    const webRuntimeDeps = webPkg.dependencies || {};
    for (const dep of serverOnlyPackages) {
      if (webRuntimeDeps[dep]) {
        errors.push(
          createIssue({
            level: "error",
            category: "SERVER_CLIENT_BOUNDARY",
            message: `Server-only package ${dep} is in apps/web runtime dependencies.`,
            explanation:
              "Server libraries in frontend runtime dependencies can leak Node-only code into browser bundles.",
            relatedFiles: ["apps/web/package.json"],
            fixes: [
              `Remove ${dep} from apps/web dependencies.`,
              `Move ${dep} usage to apps/api if still required.`,
            ],
          })
        );
      }
    }

    if (webPkg.dependencies?.shadcn) {
      errors.push(
        createIssue({
          level: "error",
          category: "SHADCN_RUNTIME_DEP",
          message: "shadcn CLI is in apps/web dependencies.",
          explanation:
            "shadcn is a codegen CLI and should not be shipped as a runtime dependency.",
          relatedFiles: ["apps/web/package.json"],
          fixes: [
            "Move shadcn from dependencies to devDependencies.",
            "Use pnpm dlx shadcn for one-off component generation where possible.",
          ],
        })
      );
    }

    const reactMajor = getMajor(webPkg.dependencies?.react);
    const reactTypesMajor = getMajor(webPkg.devDependencies?.["@types/react"]);
    if (reactMajor && reactTypesMajor && reactMajor !== reactTypesMajor) {
      errors.push(
        createIssue({
          level: "error",
          category: "REACT_TYPES_MISMATCH",
          message: `React major mismatch in apps/web: react@${webPkg.dependencies?.react} vs @types/react@${webPkg.devDependencies?.["@types/react"]}.`,
          explanation:
            "React runtime and @types/react majors should match to avoid invalid typings and build instability.",
          relatedFiles: ["apps/web/package.json"],
          fixes: [
            "Align react and @types/react to the same major version.",
            "Run typecheck after alignment to verify compatibility.",
          ],
        })
      );
    }
  }

  // Rule 3: Internal @afenda/* dependencies must use workspace:*.
  for (const manifest of manifests) {
    for (const sectionName of ["dependencies", "devDependencies", "peerDependencies"]) {
      const section = manifest.pkgJson[sectionName] || {};
      for (const [name, version] of Object.entries(section)) {
        if (!name.startsWith("@afenda/")) continue;
        if (version !== "workspace:*") {
          errors.push(
            createIssue({
              level: "error",
              category: "INTERNAL_WORKSPACE_SPEC",
              message: `${rel(manifest.path)} uses ${name}@${version} in ${sectionName}. Use workspace:*.`,
              explanation:
                "Internal packages should use workspace:* to ensure local linking and monorepo consistency.",
              relatedFiles: [rel(manifest.path)],
              fixes: [
                `Change ${name} version spec to workspace:* in ${sectionName}.`,
                "Run pnpm install to refresh lockfile links.",
              ],
            })
          );
        }
      }
    }
  }

  // Rule 4: TypeScript version floor drift should be reviewed.
  const tsVersionMap = collectVersionMap(manifests, "typescript");
  if (tsVersionMap.size > 1) {
    const details = [...tsVersionMap.entries()]
      .map(([version, files]) => `${version}: ${files.join(", ")}`)
      .join(" | ");
    warnings.push(
      createIssue({
        level: "warning",
        category: "TYPESCRIPT_RANGE_DRIFT",
        message: `TypeScript range drift detected across manifests. ${details}`,
        explanation:
          "Different TypeScript ranges can create inconsistent local behavior and CI type differences.",
        relatedFiles: ["package.json"],
        fixes: [
          "Align TypeScript ranges where possible.",
          "Use catalog: in pnpm-workspace.yaml for long-term consistency.",
        ],
      })
    );
  }

  // Rule 5: High severity audit must pass.
  try {
    execSync("pnpm audit --audit-level=high", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch (error) {
    if (VERBOSE) {
      console.log(`${colors.dim}${error.stdout || ""}${colors.reset}`);
      console.log(`${colors.dim}${error.stderr || ""}${colors.reset}`);
    }

    const output = `${error.stdout || ""}\n${error.stderr || ""}`.toLowerCase();
    if (output.includes("vulnerab")) {
      errors.push(
        createIssue({
          level: "error",
          category: "SECURITY_AUDIT",
          message: "High/critical vulnerabilities detected by pnpm audit.",
          explanation:
            "Security policy requires immediate remediation for high and critical vulnerabilities.",
          relatedFiles: ["pnpm-lock.yaml", "package.json"],
          fixes: [
            "Run pnpm audit --audit-level=high for full vulnerability details.",
            "Upgrade or replace vulnerable packages and commit lockfile updates.",
          ],
        })
      );
    } else {
      warnings.push(
        createIssue({
          level: "warning",
          category: "SECURITY_AUDIT",
          message: "pnpm audit could not complete reliably.",
          explanation:
            "Audit command failed unexpectedly, often due to registry/network instability.",
          fixes: [
            "Retry pnpm audit --audit-level=high.",
            "Check registry/network settings and CI egress policies.",
          ],
        })
      );
    }
  }

  // Rule 6: Major version drift should be tracked as warning.
  try {
    const outdatedRaw = execSync("pnpm outdated --recursive --format json", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });

    if (VERBOSE) {
      console.log(`${colors.dim}${outdatedRaw}${colors.reset}`);
    }

    if (outdatedRaw?.trim()) {
      const outdatedJson = JSON.parse(outdatedRaw);
      const items = extractOutdatedItems(outdatedJson);
      const majorDrifts = items
        .filter((item) => {
          const currentMajor = getMajor(item.current);
          const latestMajor = getMajor(item.latest);
          return currentMajor && latestMajor && latestMajor > currentMajor;
        })
        .map((item) => `${item.name || "unknown"} ${item.current} -> ${item.latest}`);

      if (majorDrifts.length > 0) {
        warnings.push(
          createIssue({
            level: "warning",
            category: "OUTDATED_PARSE",
            message: `Major update candidates detected: ${majorDrifts.join(" | ")}`,
            explanation:
              "Major upgrades should be handled in planned migration waves, not auto-updated blindly.",
            relatedFiles: ["package.json", "pnpm-lock.yaml"],
            fixes: [
              "Track major candidates in dependency-validation-report.md.",
              "Plan migration branch with rollback and regression checks.",
            ],
          })
        );
      }
    }
  } catch {
    warnings.push(
      createIssue({
        level: "warning",
        category: "OUTDATED_PARSE",
        message: "Unable to parse pnpm outdated output for major drift reporting.",
        explanation:
          "The gate could not build advisory major drift insights; core checks still ran.",
        fixes: [
          "Run pnpm outdated --recursive --format json manually.",
          "Ensure pnpm version is compatible with JSON output shape.",
        ],
      })
    );
  }

  if (errors.length > 0) {
    console.log(`\n${colors.bright}${colors.red}Errors${colors.reset}`);
    console.log(formatDependencyIssues(errors));
  }

  if (warnings.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}Warnings${colors.reset}`);
    console.log(formatDependencyIssues(warnings));
  }

  console.log(summarizeDependencyIssues(errors, warnings));

  const failed = errors.length > 0 || (STRICT && warnings.length > 0);

  console.log("\n" + `${colors.bright}${colors.blue}${"=".repeat(64)}${colors.reset}`);
  console.log(`${colors.bright}Summary${colors.reset}`);
  console.log(` - Errors: ${errors.length}`);
  console.log(` - Warnings: ${warnings.length}`);
  console.log(` - Strict mode: ${STRICT ? "enabled" : "disabled"}`);

  if (failed) {
    console.log(`\n${colors.red}Dependency governance gate failed.${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.green}Dependency governance gate passed.${colors.reset}`);
  process.exit(0);
}

main();
