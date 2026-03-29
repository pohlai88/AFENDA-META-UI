import { defineConfig } from "vitest/config";
import path from "node:path";

const testInclude = ["src/**/__test__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];

export default defineConfig({
  resolve: {
    alias: {
      "@afenda/db/schema/meta": path.resolve(
        __dirname,
        "../../packages/db/src/schema/meta/index.ts"
      ),
      "@afenda/db/schema/sales": path.resolve(
        __dirname,
        "../../packages/db/src/schema/sales/index.ts"
      ),
      "@afenda/db/schema-meta": path.resolve(
        __dirname,
        "../../packages/db/src/schema/meta/index.ts"
      ),
      "@afenda/db/schema-domain": path.resolve(
        __dirname,
        "../../packages/db/src/schema/sales/index.ts"
      ),
      "@afenda/db/client": path.resolve(
        __dirname,
        "../../packages/db/src/client/index.ts"
      ),
      "@afenda/db/truth-compiler": path.resolve(
        __dirname,
        "../../packages/db/src/truth-compiler/index.ts"
      ),
      "@afenda/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
    },
  },
  test: {
    include: testInclude,
    environment: "node",
    setupFiles: ["./src/__test__/setup-env.ts"],
  },
});
