import {
  assertNoProjectionDrift,
  dbGetAggregateEvents,
  detectProjectionDrift,
  getLatestEventVersionStrict,
  getProjectionCheckpoint,
} from "../events/index.js";
import {
  executeMutationCommand,
  type ExecuteMutationCommandInput,
} from "./mutation-command-gateway.js";

export type { ExecuteMutationCommandResult } from "./mutation-command-gateway.js";

type CommandRecord = Record<string, unknown>;

export interface ProjectionRuntimeDefinition {
  name: string;
  version: {
    version: number;
    schemaHash: string;
  };
}

export interface ProjectionDriftValidatorInput {
  aggregateType: string;
  definition: ProjectionRuntimeDefinition;
}

export function createProjectionDriftValidator(input: ProjectionDriftValidatorInput) {
  return async (aggregateId?: string): Promise<void> => {
    if (!aggregateId) {
      return;
    }

    const checkpoint = getProjectionCheckpoint({
      projectionName: input.definition.name,
      aggregateType: input.aggregateType,
      aggregateId,
    });

    if (!checkpoint) {
      return;
    }

    const events = await dbGetAggregateEvents(input.aggregateType, aggregateId);
    const latestEventVersion = getLatestEventVersionStrict(events, input.definition.name);

    assertNoProjectionDrift(
      detectProjectionDrift({
        definition: input.definition,
        checkpoint,
        latestEventVersion,
      })
    );
  };
}

export async function executeCommandRuntime<TRecord extends CommandRecord>(
  input: ExecuteMutationCommandInput<TRecord>
): Promise<import("./mutation-command-gateway.js").ExecuteMutationCommandResult<TRecord>> {
  return executeMutationCommand(input);
}
