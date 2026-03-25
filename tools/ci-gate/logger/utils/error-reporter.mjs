/**
 * Error Reporter
 * ==============
 * Formats and displays CI gate check results in a readable format.
 */

export function reportResults(results) {
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const { name, errors = [], warnings = [] } = result;
    const errorCount = errors.length;
    const warningCount = warnings.length;

    totalErrors += errorCount;
    totalWarnings += warningCount;

    if (errorCount === 0 && warningCount === 0) {
      console.log(`✅ ${name}: PASSED`);
      continue;
    }

    console.log(`\n❌ ${name}: ${errorCount} error(s), ${warningCount} warning(s)\n`);

    // Print errors
    for (const error of errors) {
      console.log(`  ${error.file}:${error.line}:${error.column}`);
      console.log(`    ❌ ${error.message}`);
    }

    // Print warnings
    for (const warning of warnings) {
      console.log(`  ${warning.file}:${warning.line}:${warning.column}`);
      console.log(`    ⚠️  ${warning.message}`);
    }
  }

  console.log(`\nSummary: ${totalErrors} error(s), ${totalWarnings} warning(s)`);

  return totalErrors;
}
