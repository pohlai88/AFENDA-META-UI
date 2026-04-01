#!/usr/bin/env node

/**
 * Master CI Gate Runner
 * 
 * Consolidates all CI gate checks into a single command.
 * Discovers and runs all gate scripts in subdirectories.
 * 
 * Usage:
 *   node tools/ci-gate/index.mjs                    # Run all gates
 *   node tools/ci-gate/index.mjs --gate=logger      # Run specific gate
 *   node tools/ci-gate/index.mjs --fix              # Run all gates with auto-fix
 *   node tools/ci-gate/index.mjs --gate=logger --fix # Run specific gate with fix
 *   node tools/ci-gate/index.mjs --verbose          # Run with verbose output
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

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
const args = process.argv.slice(2);
const options = {
  gate: null,
  fix: false,
  verbose: false,
  help: false,
  concurrency: 1,
  mode: 'full',
};

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--fix') {
    options.fix = true;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg.startsWith('--gate=')) {
    options.gate = arg.split('=')[1];
  } else if (arg.startsWith('--concurrency=')) {
    const raw = Number.parseInt(arg.split('=')[1] || '', 10);
    if (!Number.isNaN(raw) && raw > 0) {
      options.concurrency = raw;
    }
  } else if (arg.startsWith('--mode=')) {
    const mode = arg.split('=')[1];
    if (mode === 'fast' || mode === 'full') {
      options.mode = mode;
    }
  }
}

// Show help
if (options.help) {
  console.log(`
${colors.bright}Master CI Gate Runner${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node tools/ci-gate/index.mjs [OPTIONS]

${colors.cyan}OPTIONS:${colors.reset}
  --gate=<name>    Run a specific gate (e.g., --gate=logger)
  --fix            Enable auto-fix mode for all gates
  --concurrency=n  Number of gates to run in parallel (default: 1)
  --mode=<type>    Gate mode: full (default) or fast (skips bundle web build if no dist; skips audit/outdated)
  --verbose, -v    Show verbose output from all gates
  --help, -h       Show this help message

${colors.cyan}EXAMPLES:${colors.reset}
  node tools/ci-gate/index.mjs                    Run all gates
  node tools/ci-gate/index.mjs --gate=logger      Run logger gate only
  node tools/ci-gate/index.mjs --fix              Run all gates with auto-fix
  node tools/ci-gate/index.mjs --concurrency=2    Run up to 2 gates in parallel
  node tools/ci-gate/index.mjs --mode=fast        Skip bundle build if no dist; skip audit/outdated
  node tools/ci-gate/index.mjs --verbose          Run with verbose output

${colors.cyan}AVAILABLE GATES:${colors.reset}
`);
  
  // List available gates
  const gates = discoverGates();
  gates.forEach(gate => {
    console.log(`  ${colors.green}✓${colors.reset} ${gate.name.padEnd(20)} ${colors.dim}${gate.path}${colors.reset}`);
  });
  
  process.exit(0);
}

/**
 * Discover all gate scripts in subdirectories
 */
function discoverGates() {
  const gates = [];
  const entries = readdirSync(__dirname, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const gatePath = join(__dirname, entry.name, 'index.mjs');
      if (existsSync(gatePath)) {
        gates.push({
          name: entry.name,
          path: gatePath,
          dir: join(__dirname, entry.name),
        });
      }
    }
  }
  
  return gates.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Run a single gate script
 */
function runGate(gate, args = []) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    if (options.verbose) {
      console.log(`${colors.dim}Running: node ${gate.path} ${args.join(' ')}${colors.reset}\n`);
    }
    
    const child = spawn('node', [gate.path, ...args], {
      cwd: gate.dir,
      // ignore stdin so a child never blocks waiting for TTY input; pipe stdout/stderr for capture
      stdio: options.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    if (!options.verbose) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        name: gate.name,
        code,
        stdout,
        stderr,
        duration,
      });
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        name: gate.name,
        code: 1,
        stdout,
        stderr: error.message,
        duration,
        error,
      });
    });
  });
}

function getModeArgsForGate(gate) {
  if (gate.name === 'drizzle-schema-quality') {
    const repoRoot = resolve(__dirname, '..', '..');
    const args = [
      `--baseline=${join(repoRoot, 'tools/ci-gate/drizzle-schema-quality/baseline.json')}`,
    ];
    if (options.mode === 'fast') args.unshift('--mode=fast');
    if (options.verbose) args.push('--verbose');
    return args;
  }

  if (options.mode === 'fast' && gate.name === 'bundle') {
    return ['--skip-build'];
  }

  if (options.mode !== 'fast') {
    return [];
  }

  if (gate.name === 'dependencies') {
    return ['--skip-audit', '--skip-outdated'];
  }

  return [];
}

/** Gates that often look "stuck" but are working (stdout buffered when not --verbose). */
const SLOW_GATE_HINTS = {
  bundle:
    'If not using --mode=fast, may run `pnpm --filter web build` when apps/web/dist is missing (several minutes).',
  dependencies:
    'Runs `pnpm audit` and `pnpm outdated` against the registry (network; can be slow).',
  'drizzle-schema-quality': 'Scans large schema trees; can take 1–3+ minutes.',
  'column-kit-sales-domain':
    'Runs Drizzle local-ts column-kit scan for `sales.*` tables (tsx + full schema load).',
};

/**
 * Run gates with bounded concurrency while preserving result order.
 */
async function runGates(gates, gateArgs) {
  const results = new Array(gates.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(options.concurrency, 1), gates.length);

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= gates.length) {
        return;
      }

      const gate = gates[index];
      const modeArgs = getModeArgsForGate(gate);
      const effectiveArgs = [...gateArgs, ...modeArgs];
      console.log(`${colors.bright}Running: ${gate.name}${colors.reset}`);
      console.log(
        `${colors.dim}${new Date().toISOString()} · ${'─'.repeat(48)}${colors.reset}`
      );
      if (modeArgs.length > 0) {
        console.log(`${colors.dim}Mode flags: ${modeArgs.join(' ')}${colors.reset}`);
      }
      const hint = SLOW_GATE_HINTS[gate.name];
      if (hint && !options.verbose) {
        console.log(`${colors.yellow}ℹ${colors.reset} ${colors.dim}${hint}${colors.reset}`);
      }

      const result = await runGate(gate, effectiveArgs);
      results[index] = result;

      if (!options.verbose) {
        if (result.code === 0) {
          console.log(`${colors.green}✓ ${gate.name} PASSED${colors.reset} ${colors.dim}(${formatDuration(result.duration)})${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ ${gate.name} FAILED${colors.reset} ${colors.dim}(${formatDuration(result.duration)})${colors.reset}`);
          if (result.stdout) {
            console.log(result.stdout);
          }
          if (result.stderr) {
            console.error(result.stderr);
          }
        }
      }

      console.log();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║           Master CI Gate Runner                           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Discover all gates
  const allGates = discoverGates();
  
  if (allGates.length === 0) {
    console.log(`${colors.yellow}⚠ No gate scripts found${colors.reset}`);
    process.exit(0);
  }
  
  // Filter gates if specific gate requested
  let gatesToRun = allGates;
  if (options.gate) {
    gatesToRun = allGates.filter(g => g.name === options.gate);
    if (gatesToRun.length === 0) {
      console.log(`${colors.red}✗ Gate '${options.gate}' not found${colors.reset}\n`);
      console.log(`${colors.cyan}Available gates:${colors.reset}`);
      allGates.forEach(gate => {
        console.log(`  ${colors.dim}•${colors.reset} ${gate.name}`);
      });
      process.exit(1);
    }
  }
  
  console.log(`${colors.cyan}Running ${gatesToRun.length} gate(s) with concurrency=${options.concurrency}, mode=${options.mode}...${colors.reset}\n`);
  
  // Prepare arguments for child processes
  const gateArgs = [];
  if (options.fix) gateArgs.push('--fix');
  
  const results = await runGates(gatesToRun, gateArgs);
  
  // Print summary
  console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Summary${colors.reset}\n`);
  
  const passed = results.filter(r => r.code === 0);
  const failed = results.filter(r => r.code !== 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  // Show individual results
  results.forEach(result => {
    const icon = result.code === 0 ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const status = result.code === 0 
      ? `${colors.green}PASSED${colors.reset}` 
      : `${colors.red}FAILED${colors.reset}`;
    const duration = `${colors.dim}${formatDuration(result.duration)}${colors.reset}`;
    
    console.log(`  ${icon} ${result.name.padEnd(20)} ${status} ${duration}`);
  });
  
  console.log();
  console.log(`${colors.bright}Total:${colors.reset} ${results.length} gate(s)`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed.length}`);
  
  if (failed.length > 0) {
    console.log(`${colors.red}Failed:${colors.reset} ${failed.length}`);
  }
  
  console.log(`${colors.dim}Duration:${colors.reset} ${formatDuration(totalDuration)}`);
  console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);
  
  // Exit with appropriate code
  if (failed.length > 0) {
    console.log(`${colors.red}❌ CI gate checks failed${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All CI gate checks passed${colors.reset}\n`);
    process.exit(0);
  }
}

// Run
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
