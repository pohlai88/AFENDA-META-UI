/**
 * Contract Test Error Parser
 * ===========================
 * Parses Vitest output to extract contract violations and provide
 * detailed diagnostics with fix suggestions.
 */

/**
 * Parse vitest output and extract contract failures
 */
export function parseContractErrors(vitestOutput) {
  const errors = [];
  const lines = vitestOutput.split('\n');
  
  let currentTest = null;
  let currentError = null;
  let errorContext = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match test failure headers
    // Example: "❌ src/routes/lazy-pages.contract.test.ts > ../pages/model-list exports a default React component"
    const testMatch = line.match(/❌\s+(.+?)\s+>\s+(.+)/);
    if (testMatch) {
      if (currentError) {
        errors.push(finalizeError(currentError, errorContext));
      }
      
      currentTest = {
        file: testMatch[1].trim(),
        testName: testMatch[2].trim(),
      };
      currentError = {
        testFile: currentTest.file,
        testName: currentTest.testName,
        modulePath: extractModulePath(currentTest.testName),
      };
      errorContext = [];
      continue;
    }
    
    // Match error messages
    // Example: "AssertionError: expected 'undefined' to be 'function'"
    const errorMatch = line.match(/AssertionError:\s*(.+)/i);
    if (errorMatch && currentError) {
      currentError.assertion = errorMatch[1].trim();
      continue;
    }
    
    // Match expected/received patterns
    const expectedMatch = line.match(/expected:\s*(.+)/i);
    const receivedMatch = line.match(/received:\s*(.+)/i);
    
    if (expectedMatch && currentError) {
      currentError.expected = expectedMatch[1].trim().replace(/['"]/g, '');
    }
    if (receivedMatch && currentError) {
      currentError.received = receivedMatch[1].trim().replace(/['"]/g, '');
    }
    
    // Collect error context
    if (currentError && line.trim() && !line.includes('Test Files') && !line.includes('Duration')) {
      errorContext.push(line);
    }
  }
  
  // Finalize last error
  if (currentError) {
    errors.push(finalizeError(currentError, errorContext));
  }
  
  return errors;
}

/**
 * Extract module path from test name
 */
function extractModulePath(testName) {
  // Example: "../pages/model-list exports a default React component" → "../pages/model-list"
  const match = testName.match(/^([^\s]+)/);
  return match ? match[1] : testName;
}

/**
 * Finalize error with categorization and fix suggestions
 */
function finalizeError(error, context) {
  const category = categorizeError(error);
  const diagnostic = generateDiagnostic(error, category);
  
  return {
    ...error,
    category,
    ...diagnostic,
    context: context.slice(-5), // Keep last 5 lines of context
  };
}

/**
 * Categorize the error type
 */
function categorizeError(error) {
  const { received, expected, modulePath, testName } = error;
  
  // Missing export (undefined)
  if (received === 'undefined' && expected === 'function') {
    if (testName.includes('default')) {
      return 'MISSING_DEFAULT_EXPORT';
    }
    return 'MISSING_NAMED_EXPORT';
  }
  
  // Wrong type
  if (received && expected && received !== 'undefined' && received !== expected) {
    return 'WRONG_EXPORT_TYPE';
  }
  
  // Import error
  if (testName.includes('Cannot find module') || error.assertion?.includes('Cannot find')) {
    return 'MODULE_NOT_FOUND';
  }
  
  // Generic
  return 'CONTRACT_VIOLATION';
}

/**
 * Generate diagnostic message and fix suggestions
 */
function generateDiagnostic(error, category) {
  const { modulePath, testName, expected, received } = error;
  
  switch (category) {
    case 'MISSING_DEFAULT_EXPORT':
      return {
        severity: 'error',
        message: `Module '${modulePath}' does not export a default component`,
        explanation: `The lazy route expects a default export, but the module exports ${received}.`,
        fixes: [
          `Add a default export to ${modulePath}.tsx:`,
          `  export default function YourComponent() { ... }`,
          ``,
          `Or if using named export, wrap it:`,
          `  export { YourComponent as default };`,
        ],
        relatedFiles: [
          guessSourceFile(modulePath),
        ],
      };
      
    case 'MISSING_NAMED_EXPORT':
      return {
        severity: 'error',
        message: `Module '${modulePath}' does not export the expected named function`,
        explanation: `Expected a named export but got ${received}.`,
        fixes: [
          `Check that ${guessSourceFile(modulePath)} exports the expected function:`,
          `  export function YourRenderer({ ...props }) { ... }`,
          ``,
          `Ensure the export name matches what the route expects.`,
          `Review the route definition to see which named export is required.`,
        ],
        relatedFiles: [
          guessSourceFile(modulePath),
        ],
      };
      
    case 'WRONG_EXPORT_TYPE':
      return {
        severity: 'error',
        message: `Module '${modulePath}' exports ${received} but expected ${expected}`,
        explanation: `The export exists but has the wrong type.`,
        fixes: [
          `Change the export in ${guessSourceFile(modulePath)} to be a ${expected}:`,
          expected === 'function' 
            ? `  export function YourComponent() { ... }`
            : `  export const YourExport = ...;`,
          ``,
          `If this is intentional, update the contract test to match.`,
        ],
        relatedFiles: [
          guessSourceFile(modulePath),
        ],
      };
      
    case 'MODULE_NOT_FOUND':
      return {
        severity: 'error',
        message: `Cannot find module '${modulePath}'`,
        explanation: `The module file does not exist at the expected location.`,
        fixes: [
          `Check that ${guessSourceFile(modulePath)} exists in the filesystem.`,
          ``,
          `If the file was moved:`,
          `  1. Update the route definition with the new path`,
          `  2. Update the contract test with the new path`,
          ``,
          `If the file was deleted:`,
          `  1. Remove the route definition`,
          `  2. Remove from the contract test module paths array`,
        ],
        relatedFiles: [
          guessSourceFile(modulePath),
          'apps/web/src/routes/index.tsx',
        ],
      };
      
    default:
      return {
        severity: 'error',
        message: `Contract violation in '${modulePath}'`,
        explanation: error.assertion || 'Module does not match expected contract.',
        fixes: [
          `Review the test expectations in the contract test.`,
          `Ensure ${guessSourceFile(modulePath)} exports the expected shape.`,
          `Check that imports and exports are correctly defined.`,
        ],
        relatedFiles: [
          guessSourceFile(modulePath),
        ],
      };
  }
}

/**
 * Convert module path to likely source file location
 */
function guessSourceFile(modulePath) {
  // Convert relative import paths to absolute-ish workspace paths
  if (modulePath.startsWith('../pages/')) {
    return 'apps/web/src/pages/' + modulePath.replace('../pages/', '') + '.tsx';
  }
  if (modulePath.startsWith('../renderers/')) {
    return 'apps/web/src/renderers/' + modulePath.replace('../renderers/', '') + '.tsx';
  }
  if (modulePath.startsWith('./')) {
    return 'apps/web/src/renderers/' + modulePath.replace('./', '');
  }
  
  return modulePath;
}

/**
 * Format errors for display
 */
export function formatContractErrors(errors) {
  if (errors.length === 0) {
    return null;
  }
  
  const output = [];
  
  // Group by category
  const byCategory = {};
  for (const error of errors) {
    if (!byCategory[error.category]) {
      byCategory[error.category] = [];
    }
    byCategory[error.category].push(error);
  }
  
  // Format each category
  for (const [category, categoryErrors] of Object.entries(byCategory)) {
    output.push('');
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    output.push(`${getCategoryIcon(category)} ${formatCategoryName(category)} (${categoryErrors.length})`);
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    for (const error of categoryErrors) {
      output.push('');
      output.push(`📍 Location: ${error.testFile}`);
      output.push(`   Test: ${error.testName}`);
      output.push('');
      output.push(`❌ ${error.message}`);
      output.push('');
      output.push(`💡 Explanation:`);
      output.push(`   ${error.explanation}`);
      output.push('');
      output.push(`🔧 Fix suggestions:`);
      for (const fix of error.fixes) {
        output.push(`   ${fix}`);
      }
      
      if (error.relatedFiles && error.relatedFiles.length > 0) {
        output.push('');
        output.push(`📂 Related files:`);
        for (const file of error.relatedFiles) {
          output.push(`   • ${file}`);
        }
      }
      
      output.push('');
    }
  }
  
  return output.join('\n');
}

/**
 * Get emoji icon for error category
 */
function getCategoryIcon(category) {
  const icons = {
    MISSING_DEFAULT_EXPORT: '🚫',
    MISSING_NAMED_EXPORT: '⚠️',
    WRONG_EXPORT_TYPE: '🔀',
    MODULE_NOT_FOUND: '📁',
    CONTRACT_VIOLATION: '⚡',
  };
  return icons[category] || '❌';
}

/**
 * Format category name for display
 */
function formatCategoryName(category) {
  return category
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate summary statistics
 */
export function generateErrorSummary(errors) {
  if (errors.length === 0) {
    return 'All export contracts validated successfully ✅';
  }
  
  const byCategory = {};
  for (const error of errors) {
    byCategory[error.category] = (byCategory[error.category] || 0) + 1;
  }
  
  const lines = [
    ``,
    `📊 Contract Violation Summary`,
    `════════════════════════════════════════════════════════════`,
    `Total violations: ${errors.length}`,
    ``,
  ];
  
  for (const [category, count] of Object.entries(byCategory)) {
    lines.push(`  ${getCategoryIcon(category)} ${formatCategoryName(category)}: ${count}`);
  }
  
  lines.push('');
  
  return lines.join('\n');
}
