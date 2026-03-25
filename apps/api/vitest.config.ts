import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@afenda/db/schema-meta": path.resolve(
        __dirname,
        "../../packages/db/src/schema-meta/index.ts"
      ),
      "@afenda/db/schema-domain": path.resolve(
        __dirname,
        "../../packages/db/src/schema-domain/index.ts"
      ),
      "@afenda/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
