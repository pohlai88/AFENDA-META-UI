import type { SeedPhase } from "./seed.contract.js";
import type { Tx } from "./seed-types.js";

export type SeedEngineContext = {
  tx: Tx;
};

export type SeedPhaseHandler = (ctx: SeedEngineContext) => Promise<void>;

export type SeedScenarioPlugin = {
  name: string;
  phases: Partial<Record<SeedPhase, SeedPhaseHandler>>;
};

export async function runSeedEngine(opts: {
  ctx: SeedEngineContext;
  phases: readonly SeedPhase[];
  basePhases: Record<SeedPhase, SeedPhaseHandler | undefined>;
  scenarioPlugin?: SeedScenarioPlugin;
}): Promise<void> {
  for (const phase of opts.phases) {
    await opts.basePhases[phase]?.(opts.ctx);
    const extra = opts.scenarioPlugin?.phases[phase];
    if (extra) {
      await extra(opts.ctx);
    }
  }
}
