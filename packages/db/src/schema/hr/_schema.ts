// ============================================================================
// HR Schema Infrastructure
// Configures the shared pgSchema("hr") namespace that every file imports.
// ============================================================================
import { pgSchema } from "drizzle-orm/pg-core";

export const hrSchema = pgSchema("hr");
