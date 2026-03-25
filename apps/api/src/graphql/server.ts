import { createYoga } from "graphql-yoga";
import { graphqlSchema } from "./schema.js";
import type { Request, Response } from "express";
import type { SessionContext, ResolutionContext } from "@afenda/meta-types";

// GraphQL endpoint — used for:
//   • Complex dashboard / report queries
//   • Nested relation fetching
//   • Internal metadata introspection pipeline
// Security: session context + tenant context injected from middleware upstream.
export const yoga = createYoga<{ 
  req: Request; 
  res: Response; 
  session: SessionContext;
  tenantContext: ResolutionContext;
}>({
  schema: graphqlSchema,
  graphqlEndpoint: "/graphql",
  context: ({ req }) => ({
    // session is attached by auth middleware before this runs
    session: (req as any).session as SessionContext,
    // tenantContext is attached by tenantContextMiddleware
    tenantContext: (req as any).tenantContext as ResolutionContext,
  }),
  // Disable introspection in production to avoid schema leakage
  graphiql: process.env.NODE_ENV !== "production",
  maskedErrors: process.env.NODE_ENV === "production",
});
