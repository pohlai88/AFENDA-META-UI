import { sql } from "drizzle-orm";
import { buildSalesRetentionPlan } from "./sales-retention-plan.js";

type CliArgs = {
  tenantId: number;
  actorId: number;
  apply: boolean;
};

function parseIntegerArg(name: string, fallback: number): number {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }

  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }

  return value;
}

function parseArgs(): CliArgs {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");

  return {
    tenantId: parseIntegerArg("tenant", 1),
    actorId: parseIntegerArg("actor", 1),
    apply,
  };
}

async function run(): Promise<void> {
  const args = parseArgs();
  const plan = buildSalesRetentionPlan({ tenantId: args.tenantId, actorId: args.actorId });

  console.log("Sales retention plan");
  console.log(`generatedAt=${plan.generatedAt}`);
  console.log(`tenantId=${plan.tenantId} actorId=${plan.actorId}`);
  console.log(`salesOrdersBefore=${plan.cutoffs.salesOrdersBefore}`);
  console.log(`approvalLogsBefore=${plan.cutoffs.approvalLogsBefore}`);
  console.log(`attachmentsBefore=${plan.cutoffs.attachmentsBefore}`);
  console.log("");

  for (const action of plan.actions) {
    console.log(`- ${action.id}: ${action.description}`);
  }

  if (!args.apply) {
    console.log("\nDry run mode: SQL actions were planned but not executed.");
    return;
  }

  const { db } = await import("../db.js");
  console.log("\nApply mode: executing retention actions in a single transaction...");
  await db.transaction(async (tx) => {
    for (const action of plan.actions) {
      console.log(`  executing ${action.id}`);
      await tx.execute(sql.raw(action.statement));
    }
  });

  console.log("Retention actions executed successfully.");
}

run().catch((error) => {
  console.error("Retention runner failed:", error);
  process.exitCode = 1;
});
