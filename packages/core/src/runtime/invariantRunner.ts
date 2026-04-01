import type { TruthRegistry } from "./registry.js";
import type { CommandContext, InvariantEvaluationResult } from "./types.js";

export type RuntimeInvariant<TInput = unknown> = {
  key: string;
  timing: "pre-commit" | "post-commit";
  evaluate: (context: CommandContext<TInput>) => Promise<InvariantEvaluationResult>;
};

export function createInvariantRunner<TInput = unknown>(args: {
  registry: TruthRegistry;
  invariants: readonly RuntimeInvariant<TInput>[];
}) {
  return {
    async run(timing: "pre-commit" | "post-commit", context: CommandContext<TInput>) {
      const failures: InvariantEvaluationResult[] = [];

      for (const invariant of args.invariants) {
        if (invariant.timing !== timing) continue;
        const result = await invariant.evaluate(context);
        if (!result.ok) failures.push(result);
      }

      return failures;
    },
  };
}
