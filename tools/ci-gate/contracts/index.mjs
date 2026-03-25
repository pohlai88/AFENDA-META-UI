#!/usr/bin/env node
/**
 * Export Contracts CI Gate
 * =========================
 * Validates that all lazy-loaded route pages and metadata-driven renderers
 * export the expected module shapes to prevent runtime failures.
 *
 * This gate prevents "Renderer Version Drift" - a common failure mode in
 * metadata-driven platforms where lazy imports resolve to undefined because
 * the expected export was accidentally removed or renamed.
 *
 * Checks:
 *  • All lazy route page modules export a default React component
 *  • All metadata renderers (MetaListV2, MetaFormV2, etc.) export named functions
 *  • Module shape contracts match what route definitions expect
 *
 * Usage:
 *   node tools/ci-gate/contracts/index.mjs [--verbose]
 *   pnpm ci:contracts  (from root)
 *
 * Exit codes:
 *   0 - all contracts validated
 *   1 - contract violations found
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseContractErrors, formatContractErrors, generateErrorSummary } from './utils/error-parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

const CONTRACT_TEST_FILES = [
  'src/routes/lazy-pages.contract.test.ts',
  'src/renderers/MetaListV2.contract.test.ts',
  'src/renderers/registry.test.ts',
  'src/renderers/safeLazy.test.tsx',
];

function main() {
  console.log(`${colors.bright}${colors.blue}Export Contracts CI Gate${colors.reset}\n`);
  console.log(`${colors.cyan}Validating lazy-page and renderer export contracts...${colors.reset}\n`);

  try {
    // Run the contract tests using pnpm from the web workspace
    const webDir = join(__dirname, '../../../apps/web');
    const combinedCommand = `pnpm exec vitest run ${CONTRACT_TEST_FILES.join(' ')}`;
    
    if (verbose) {
      console.log(`${colors.dim}Working directory: ${webDir}${colors.reset}`);
    }
    console.log(`${colors.dim}Running: ${combinedCommand}${colors.reset}\n`);
    
    // Execute all contract and registry tests in one Vitest process.
    const testResult = execSync(combinedCommand, {
      cwd: webDir,
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : 'pipe',
    });

    if (verbose) {
      console.log(testResult);
    }

    console.log(`\n${colors.green}✓ Export and registry contracts validated successfully${colors.reset}`);
    console.log(`${colors.dim}All lazy-loaded modules export the expected shapes.${colors.reset}\n`);
    process.exit(0);
    
  } catch (error) {
    const failedStage = "export or registry contracts";

    // Capture the error output for detailed parsing
    const output = error.stdout || error.stderr || error.message || '';
    
    // Parse errors from vitest output
    const errors = parseContractErrors(output);
    
    console.error(`\n${colors.red}✗ ${failedStage} validation failed${colors.reset}\n`);
    
    if (errors.length > 0) {
      // Show detailed diagnostics with fix suggestions
      const formattedErrors = formatContractErrors(errors);
      if (formattedErrors) {
        console.log(formattedErrors);
      }
      
      // Show summary
      console.log(generateErrorSummary(errors));
      
    } else {
      // Fallback to generic error message if parsing failed
      console.error(`${colors.yellow}⚠ One or more modules failed ${failedStage} checks.${colors.reset}`);
      if (verbose || output) {
        console.error(`\n${colors.dim}${output}${colors.reset}\n`);
      }
      
      console.log(`${colors.cyan}Common causes:${colors.reset}`);
      console.log(`  • Lazy route page missing default export`);
      console.log(`  • Renderer file accidentally overwritten`);
      console.log(`  • Named export changed without updating route`);
      console.log(`  • File moved/renamed without updating imports\n`);
    }
    
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Review the diagnostics above for specific file locations`);
    console.log(`  2. Apply the suggested fixes to each failing module`);
    console.log(`  3. Run ${colors.bright}pnpm ci:contracts${colors.reset} to verify fixes`);
    console.log(`  4. Run ${colors.bright}pnpm ci:gate${colors.reset} for full validation\n`);
    
    if (!verbose) {
      console.log(`${colors.dim}Tip: Run with --verbose flag for full test output${colors.reset}\n`);
    }
    
    process.exit(1);
  }
}

main();
