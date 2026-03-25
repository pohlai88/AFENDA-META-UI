import { createYoga } from "graphql-yoga";
import { graphqlSchema } from "./schema.js";
import type { Request, Response } from "express";
import type { SessionContext, ResolutionContext } from "@afenda/meta-types";

type RequestWithContext = Request & {
  session?: SessionContext;
  tenantContext?: ResolutionContext;
};

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
    ...(() => {
      const request = req as RequestWithContext;
      return {
        session: request.session as SessionContext,
        // tenantContext is attached by tenantContextMiddleware
        tenantContext: request.tenantContext as ResolutionContext,
      };
    })(),
  }),
  // Disable introspection in production to avoid schema leakage
  graphiql: process.env.NODE_ENV !== "production",
  maskedErrors: process.env.NODE_ENV === "production",
});
