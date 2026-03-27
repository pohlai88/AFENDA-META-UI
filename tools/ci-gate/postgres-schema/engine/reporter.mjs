/**
 * Engine v2 — Reporter
 * =====================
 * Categorized diagnostic output compatible with the existing CI gate
 * visual style (icons, separators, explanations, fix hints).
 * Sets process.exitCode = 1 only when error-severity rules fail.
 */

/**
 * @typedef {import('./rule-types.mjs').EvaluatedRule} EvaluatedRule
 */

const CATEGORY_META = {
  'constraint-exists': {
    icon: '🔒',
    title: 'Constraint Existence',
    explanation: 'A named CHECK, FK, UNIQUE, or INDEX constraint expected by the matrix is missing from the schema.',
    fixes: [
      'Add the missing constraint to the table definition in tables.ts.',
      'Ensure the constraint name matches the matrix specification exactly.',
    ],
  },
  'constraint-semantic': {
    icon: '🧮',
    title: 'Constraint Semantics',
    explanation: 'A CHECK constraint exists but its SQL expression does not match the expected business formula.',
    fixes: [
      'Review the CHECK expression against the matrix specification.',
      'Ensure formula order and column references are correct.',
    ],
  },
  'state-machine': {
    icon: '🔄',
    title: 'State Machine Coverage',
    explanation: 'A status enum column does not cover all expected business states.',
    fixes: [
      'Update the enum definition in _enums.ts to include missing states.',
      'Verify the enum values match what business logic expects.',
    ],
  },
  tenant: {
    icon: '🏢',
    title: 'Tenant Isolation',
    explanation: 'A table is missing tenant_id column, tenant FK, tenant index, or RLS policies.',
    fixes: [
      'Add tenantId column with FK to the tenant table.',
      'Spread ...tenantIsolationPolicies("sales_<table>") in the table definition.',
      'Ensure serviceBypassPolicy() is present for service-role access.',
    ],
  },
  audit: {
    icon: '📋',
    title: 'Audit Trail',
    explanation: 'A table is missing audit, timestamp, or soft-delete column sets.',
    fixes: [
      'Spread ...auditColumns for createdBy/updatedBy tracking.',
      'Spread ...timestampColumns for createdAt/updatedAt timestamps.',
      'Spread ...softDeleteColumns for soft-delete support (if applicable).',
    ],
  },
  derived: {
    icon: '📐',
    title: 'Derived Field Protection',
    explanation: 'A computed/derived financial column exists without a CHECK constraint protecting its value.',
    fixes: [
      'Add a CHECK constraint enforcing the derivation formula.',
      'If the field is intentionally unprotected, suppress with a rule override.',
    ],
  },
};

/**
 * Print categorized results and set exit code.
 *
 * @param {EvaluatedRule[]} results - Evaluated rule results
 * @returns {number} Total error count
 */
export function report(results) {
  const failures = results.filter((r) => !r.pass);
  const errors = failures.filter((r) => r.severity === 'error');
  const warnings = failures.filter((r) => r.severity === 'warn');
  const passed = results.filter((r) => r.pass);

  // Group failures by category
  /** @type {Map<string, EvaluatedRule[]>} */
  const byCategory = new Map();
  for (const f of failures) {
    if (!byCategory.has(f.type)) byCategory.set(f.type, []);
    byCategory.get(f.type).push(f);
  }

  // Print passed summary
  if (passed.length > 0) {
    console.log(`✅ ${passed.length} rule(s) passed`);
  }

  // Print grouped failures
  for (const [category, items] of byCategory) {
    const meta = CATEGORY_META[category] || {
      icon: '⚠️',
      title: category,
      explanation: 'Policy violation detected.',
      fixes: ['Review the rule definition and schema.'],
    };

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${meta.icon} ${meta.title} (${items.length})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const item of items) {
      const icon = item.severity === 'error' ? '❌' : '⚠️';
      console.log();
      console.log(`${icon} [${item.severity.toUpperCase()}] ${item.id} — ${item.table}`);
      console.log(`   ${item.description}`);
      if (item.message) {
        console.log(`   → ${item.message}`);
      }
    }

    console.log();
    console.log(`💡 Explanation: ${meta.explanation}`);
    console.log('🔧 Fix suggestions:');
    for (const fix of meta.fixes) {
      console.log(`   - ${fix}`);
    }
  }

  // Summary
  console.log();
  console.log('📊 Postgres Schema Gate Summary');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total rules:  ${results.length}`);
  console.log(`  Passed:     ${passed.length}`);
  console.log(`  Errors:     ${errors.length}`);
  console.log(`  Warnings:   ${warnings.length}`);

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`  Duration:   ${totalDuration.toFixed(1)}ms`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }

  return errors.length;
}
