import { sql } from "drizzle-orm";
import { buildSalesPartitionPlan } from "./sales-partition-plan.js";

type CliArgs = {
  apply: boolean;
  yearsAhead: number;
  allowParentConversion: boolean;
};

function parseIntegerArg(name: string, fallback: number): number {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }

  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative integer`);
  }

  return value;
}

function parseArgs(): CliArgs {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const allowParentConversion = process.argv.includes("--allow-parent-conversion");
  return {
    apply,
    yearsAhead: parseIntegerArg("years-ahead", 2),
    allowParentConversion,
  };
}

async function run(): Promise<void> {
  const args = parseArgs();
  const plan = buildSalesPartitionPlan({
    yearsAhead: args.yearsAhead,
    allowParentConversion: args.allowParentConversion,
  });

  console.log("Sales partition plan");
  console.log(`generatedAt=${plan.generatedAt}`);
  console.log(`parent=${plan.schemaName}.${plan.parentTable}`);
  console.log(`years=${plan.years.join(",")}`);
  console.log(`allowParentConversion=${args.allowParentConversion}`);
  console.log("");

  for (const action of plan.actions) {
    console.log(`- ${action.id}: ${action.description}`);
  }

  if (!args.apply) {
    console.log("\nDry run mode: SQL actions were planned but not executed.");
    return;
  }

  const { db } = await import("../db.js");
  console.log("\nApply mode: executing partition actions in a single transaction...");
  await db.transaction(async (tx) => {
    for (const action of plan.actions) {
      console.log(`  executing ${action.id}`);
      await tx.execute(sql.raw(action.statement));
    }
  });

  console.log("Partition actions executed successfully.");
}

run().catch((error) => {
  console.error("Partition runner failed:", error);
  process.exitCode = 1;
});
