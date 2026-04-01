import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTenantScopedDbTruthVerificationAdapters } from "../src/ci/tenantScopedDbAdapters.js";
import { verifyTruth } from "../src/ci/verifyTruth.js";
import { writeArtifact } from "../src/ci/writeArtifact.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = path.resolve(__dirname, "../artifacts/truth");
const tenantId = "tenant_a";

async function main(): Promise<void> {
  // Replace these stub readers with actual infrastructure-backed readers
  // from your tenant-scoped persistence layer:
  // - memory event stream reader
  // - current projection reader
  // - invariant failure collector
  const adapters = createTenantScopedDbTruthVerificationAdapters({
    tenantId,
    readers: {
      async readMemoryEventRows(requestedTenantId) {
        return [
          {
            tenant_id: requestedTenantId,
            event_id: "evt_1",
            entity_name: "sales_order",
            entity_id: "SO-1",
            present_state: { status: "posted", amount: 100 },
            supersedes_event_id: null,
          },
        ];
      },
      async readCurrentProjection(requestedTenantId) {
        return {
          tenantId: requestedTenantId,
          projection: {
            "sales_order::SO-1": { status: "posted", amount: 100 },
          },
        };
      },
      async readInvariantFailureRows(requestedTenantId) {
        void requestedTenantId;
        return [];
      },
    },
  });

  const result = await verifyTruth({
    adapters,
    generatorDriftChecked: true,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "truth-evidence.json",
    value: result.evidence,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "current-projection.json",
    value: result.snapshot.currentProjection,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "memory-replay-events.json",
    value: result.snapshot.events,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "invariant-failures.json",
    value: result.snapshot.failures,
  });

  if (!result.evidence.replayMatchesCurrentProjection) {
    throw new Error(
      `Replay checksum mismatch: replay=${result.evidence.replayChecksum} current=${result.evidence.currentProjectionChecksum}`,
    );
  }

  process.stdout.write(
    `Truth verification passed. Artifacts written to ${artifactDir}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
