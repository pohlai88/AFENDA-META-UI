import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

// Before any test file imports @afenda/db (DATABASE_URL at module load)
loadDotenv({ path: path.resolve(__dirname, "../../.env"), override: false, quiet: true });
loadDotenv({ path: path.resolve(__dirname, ".env"), override: true, quiet: true });

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
        "../../packages/db/src/drizzle/client/index.ts"
      ),
      "@afenda/db/truth-compiler": path.resolve(
        __dirname,
        "../../packages/db/src/truth-compiler/index.ts"
      ),
      "@afenda/db/r2": path.resolve(__dirname, "../../packages/db/src/r2/index.ts"),
      "@afenda/db/wire": path.resolve(__dirname, "../../packages/db/src/wire/index.ts"),
      "@afenda/db/queries/storage": path.resolve(
        __dirname,
        "../../packages/db/src/queries/storage/index.ts"
      ),
      "@afenda/db/queries/sales": path.resolve(
        __dirname,
        "../../packages/db/src/queries/sales/index.ts"
      ),
      "@afenda/db/schema/core": path.resolve(
        __dirname,
        "../../packages/db/src/schema/core/index.ts"
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
