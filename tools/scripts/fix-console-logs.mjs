#!/usr/bin/env node
/**
 * Automated Console Fixer
 * =======================
 * Replaces console.log/error/warn with structured logger calls
 * 
 * Usage:
 *   node tools/scripts/fix-console-logs.mjs [--dry-run]
 *   pnpm fix:console -- --dry-run
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');

// Files to exclude from auto-fix
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/SUGGESTIONS_DEMO.ts',
  '**/INTEGRATION_EXAMPLES.tsx',
  '**/EnhancedStringField.example.tsx',
  '**/error-boundary.tsx',
];

// Detect module name from file path
function getModuleName(filePath) {
  const parts = filePath.split(path.sep);
  const fileName = parts[parts.length - 1].replace(/\.(ts|tsx)$/, '');
  return fileName;
}

// Transform console statement to logger statement
function transformConsoleCall(line, method) {
  // Basic pattern: console.METHOD(args)
  // Transform to: log.METHOD(args)
  
  const consolePattern = new RegExp(`console\\.${method}\\(`, 'g');
  return line.replace(consolePattern, `log.${method === 'log' ? 'info' : method}(`);
}

// Check if file already has logger import
function hasLoggerImport(content) {
  return /import\s+{\s*logger\s*}\s+from\s+['"].*logger['"]/.test(content);
}

// Add logger import at the top of the file
function addLoggerImport(content, filePath) {
  // Determine relative path to logger using forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  // Count directory depth from apps/web/src/
  const srcIndex = parts.findIndex((p, i) => 
    p === 'src' && parts[i - 1] === 'web' && parts[i - 2] === 'apps'
  );
  
  if (srcIndex === -1) {
    // Fallback - use absolute import
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      }
    }
    
    const moduleName = getModuleName(filePath);
    lines.splice(insertIndex, 0, 
      `import { logger } from '@/lib/logger';`,
      `const log = logger.child({ module: '${moduleName}' });`,
      ''
    );
    
    return lines.join('\n');
  }
  
  const depth = parts.length - srcIndex - 2; // -2 for src and current file
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  const importPath = `${prefix}lib/logger`;
  
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1;
    }
  }
  
  const moduleName = getModuleName(filePath);
  
  lines.splice(insertIndex, 0, 
    `import { logger } from '${importPath}';`,
    `const log = logger.child({ module: '${moduleName}' });`,
    ''
  );
  
  return lines.join('\n');
}

// Process a single file
async function processFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;
  
  // Check if file has console statements
  if (!/(console\.(log|error|warn|info|debug|trace)\()/.test(content)) {
    return { filePath, modified: false };
  }
  
  // Add logger import if not exists
  if (!hasLoggerImport(content)) {
    content = addLoggerImport(content, filePath);
    modified = true;
  }
  
  // Transform console statements
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }
    
    // Transform console.log → log.info
    if (line.includes('console.log(')) {
      lines[i] = transformConsoleCall(line, 'log');
      modified = true;
    }
    
    // Transform console.error → log.error
    if (line.includes('console.error(')) {
      lines[i] = transformConsoleCall(line, 'error');
      modified = true;
    }
    
    // Transform console.warn → log.warn
    if (line.includes('console.warn(')) {
      lines[i] = transformConsoleCall(line, 'warn');
      modified = true;
    }
    
    // Transform console.info → log.info
    if (line.includes('console.info(')) {
      lines[i] = transformConsoleCall(line, 'info');
      modified = true;
    }
    
    // Transform console.debug → log.debug
    if (line.includes('console.debug(')) {
      lines[i] = transformConsoleCall(line, 'debug');
      modified = true;
    }
  }
  
  if (modified) {
    content = lines.join('\n');
    
    if (!DRY_RUN) {
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }
  
  return { filePath, modified };
}

async function main() {
  console.log('🔧 Console Statement Auto-Fixer\n');
  
  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode (no files will be modified)\n');
  }
  
  // Find all TypeScript files in apps/web
  const files = await glob('apps/web/src/**/*.{ts,tsx}', {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  });
  
  console.log(`📁 Found ${files.length} files to process\n`);
  
  const results = {
    total: files.length,
    modified: 0,
    skipped: 0,
  };
  
  for (const file of files) {
    try {
      const result = await processFile(file);
      
      if (result.modified) {
        results.modified++;
        const relativePath = path.relative(process.cwd(), file);
        console.log(`✅ ${relativePath}`);
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results:`);
  console.log(`   Total files: ${results.total}`);
  console.log(`   Modified: ${results.modified}`);
  console.log(`   Skipped: ${results.skipped}`);
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ All console statements have been replaced!');
    console.log('\n📌 Next steps:');
    console.log('   1. Review changes: git diff');
    console.log('   2. Test application: pnpm dev');
    console.log('   3. Run logger gate: node tools/ci-gate/logger/index.mjs');
    console.log('   4. Commit changes: git add . && git commit -m "fix: replace console with structured logger"');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
