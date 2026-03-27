#!/usr/bin/env node

/**
 * Truth Score Gate
 * =================
 * Reports business-truth enforcement coverage across high-risk sales tables.
 * Fails CI when configured minimum coverage is not met.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..", "..");

const TABLES_PATH = resolve(repoRoot, "packages/db/src/schema-domain/sales/tables.ts");
const TRIGGERS_PATH = resolve(repoRoot, "packages/db/src/triggers/status-transitions.sql");

const HIGH_RISK_TABLES = [
  "sales_orders",
  "subscriptions",
  "commission_entries",
  "return_orders",
  "consignment_agreements",
];

const AGGREGATE_CONSISTENCY_TARGETS = [
  {
    parentTable: "sales_orders",
    childTable: "sales_order_lines",
    validatorFunction: "sales.validate_sales_order_aggregate_consistency",
    triggerFunction: "sales.defer_validate_sales_order_consistency",
    triggerName: "trg_defer_validate_sales_order_consistency",
  },
  {
    parentTable: "subscriptions",
    childTable: "subscription_lines",
    validatorFunction: "sales.validate_subscription_aggregate_consistency",
    triggerFunction: "sales.defer_validate_subscription_consistency",
    triggerName: "trg_defer_validate_subscription_consistency",
  },
];

const LAYERS = {
  invariants: {
    title: "Invariant Checks",
    threshold: 100,
  },
  stateMachine: {
    title: "State Machine Triggers",
    threshold: 100,
  },
  eventEmission: {
    title: "Mandatory Event Emission",
    threshold: 100,
  },
  aggregateConsistency: {
    title: "Aggregate Consistency",
    threshold: 100,
  },
  tenantIsolation: {
    title: "Tenant Isolation Primitives",
    threshold: 100,
  },
};

function getTableBlock(source, tableName) {
  const tableDeclRegex = new RegExp(String.raw`salesSchema\.table\(\s*\"${tableName}\"`, "m");
  const match = tableDeclRegex.exec(source);
  if (!match || match.index < 0) {
    return "";
  }

  const start = match.index;
  const next = source.indexOf("\nexport const ", start + 1);
  const end = next > start ? next : source.length;
  return source.slice(start, end);
}

function tableHasInvariantChecks(tableBlock) {
  return /check\(\s*\"chk_/m.test(tableBlock);
}

function tableHasTenantIsolation(source, tableName) {
  const policyName = tableName.startsWith("sales_") ? tableName : `sales_${tableName}`;
  const pattern = new RegExp(
    String.raw`salesSchema\.table\(\s*"${tableName}"[\s\S]*?tenantId\s*:\s*integer\("tenant_id"\)\.notNull\(\)[\s\S]*?\.\.\.tenantIsolationPolicies\("${policyName}"\)[\s\S]*?serviceBypassPolicy\("${policyName}"\)`
  );
  return pattern.test(source);
}

function tableHasStateMachineTrigger(triggerSql, tableName) {
  const target = `BEFORE UPDATE OF status ON sales.${tableName}`;
  return triggerSql.includes(target);
}

function tableHasEventEmissionTrigger(triggerSql, tableName) {
  const start = `CREATE TRIGGER trg_emit_`;
  const op = `AFTER INSERT OR UPDATE OR DELETE ON sales.${tableName}`;
  return triggerSql.includes(start) && triggerSql.includes(op);
}

function targetHasAggregateConsistency(triggerSql, target) {
  return (
    triggerSql.includes(`CREATE OR REPLACE FUNCTION ${target.validatorFunction}`) &&
    triggerSql.includes(`CREATE OR REPLACE FUNCTION ${target.triggerFunction}`) &&
    triggerSql.includes(`CREATE CONSTRAINT TRIGGER ${target.triggerName}`) &&
    triggerSql.includes(`ON sales.${target.childTable}`)
  );
}

function percent(hit, total) {
  if (total === 0) {
    return 0;
  }
  return Math.round((hit / total) * 100);
}

function printLayerResult(name, score, threshold, misses) {
  const pass = score >= threshold;
  const icon = pass ? "PASS" : "FAIL";
  console.log(`- ${name}: ${score}% (min ${threshold}%) [${icon}]`);
  if (misses.length > 0) {
    console.log(`  missing: ${misses.join(", ")}`);
  }
}

function main() {
  const tablesSource = readFileSync(TABLES_PATH, "utf-8");
  const triggerSource = readFileSync(TRIGGERS_PATH, "utf-8");

  const totals = {
    invariants: { hit: 0, misses: [] },
    stateMachine: { hit: 0, misses: [] },
    eventEmission: { hit: 0, misses: [] },
    aggregateConsistency: { hit: 0, misses: [] },
    tenantIsolation: { hit: 0, misses: [] },
  };

  for (const tableName of HIGH_RISK_TABLES) {
    const block = getTableBlock(tablesSource, tableName);

    if (tableHasInvariantChecks(block)) {
      totals.invariants.hit += 1;
    } else {
      totals.invariants.misses.push(tableName);
    }

    if (tableHasStateMachineTrigger(triggerSource, tableName)) {
      totals.stateMachine.hit += 1;
    } else {
      totals.stateMachine.misses.push(tableName);
    }

    if (tableHasEventEmissionTrigger(triggerSource, tableName)) {
      totals.eventEmission.hit += 1;
    } else {
      totals.eventEmission.misses.push(tableName);
    }

    if (tableHasTenantIsolation(tablesSource, tableName)) {
      totals.tenantIsolation.hit += 1;
    } else {
      totals.tenantIsolation.misses.push(tableName);
    }
  }

  for (const target of AGGREGATE_CONSISTENCY_TARGETS) {
    if (targetHasAggregateConsistency(triggerSource, target)) {
      totals.aggregateConsistency.hit += 1;
    } else {
      totals.aggregateConsistency.misses.push(target.parentTable);
    }
  }

  const scores = {
    invariants: percent(totals.invariants.hit, HIGH_RISK_TABLES.length),
    stateMachine: percent(totals.stateMachine.hit, HIGH_RISK_TABLES.length),
    eventEmission: percent(totals.eventEmission.hit, HIGH_RISK_TABLES.length),
    aggregateConsistency: percent(
      totals.aggregateConsistency.hit,
      AGGREGATE_CONSISTENCY_TARGETS.length
    ),
    tenantIsolation: percent(totals.tenantIsolation.hit, HIGH_RISK_TABLES.length),
  };

  const overall = Math.round(
    Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length
  );

  console.log("Truth Score Coverage Report");
  console.log("===========================");
  console.log(`Scope: ${HIGH_RISK_TABLES.join(", ")}`);
  console.log("");

  printLayerResult(
    LAYERS.invariants.title,
    scores.invariants,
    LAYERS.invariants.threshold,
    totals.invariants.misses
  );
  printLayerResult(
    LAYERS.stateMachine.title,
    scores.stateMachine,
    LAYERS.stateMachine.threshold,
    totals.stateMachine.misses
  );
  printLayerResult(
    LAYERS.eventEmission.title,
    scores.eventEmission,
    LAYERS.eventEmission.threshold,
    totals.eventEmission.misses
  );
  printLayerResult(
    LAYERS.aggregateConsistency.title,
    scores.aggregateConsistency,
    LAYERS.aggregateConsistency.threshold,
    totals.aggregateConsistency.misses
  );
  printLayerResult(
    LAYERS.tenantIsolation.title,
    scores.tenantIsolation,
    LAYERS.tenantIsolation.threshold,
    totals.tenantIsolation.misses
  );

  console.log("");
  console.log(`Overall Truth Score: ${overall}%`);

  const failing = Object.entries(scores).filter(([key, value]) => value < LAYERS[key].threshold);
  if (failing.length > 0) {
    console.log("");
    console.error("Truth-score gate failed: one or more layers are below threshold.");
    process.exit(1);
  }

  console.log("Truth-score gate passed.");
}

main();
