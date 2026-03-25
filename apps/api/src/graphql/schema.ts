import { buildSchema } from "drizzle-graphql";
import { execute as graphqlExecute, type ExecutionArgs, type ExecutionResult } from "graphql";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";

// drizzle-graphql auto-generates queries, mutations and types from the
// Drizzle schema. We expose this as the internal "data language" for:
//   1. Complex querying (dashboards, reports, nested relations)
//   2. GraphQL introspection → feeding the Meta Compiler pipeline
const { schema: graphqlSchema } = buildSchema(db);

export async function execute(
	args: Omit<ExecutionArgs, "schema">
): Promise<ExecutionResult> {
	return graphqlExecute({ schema: graphqlSchema, ...args });
}

export { graphqlSchema };
