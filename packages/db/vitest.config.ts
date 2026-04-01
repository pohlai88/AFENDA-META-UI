import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root .env (pnpm env:sync) — required before @afenda/db reads DATABASE_URL at import time
loadDotenv({ path: path.resolve(__dirname, "../../.env"), override: false, quiet: true });
loadDotenv({ path: path.resolve(__dirname, ".env"), override: true, quiet: true });

const testInclude = ["src/**/__test__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];

export default defineConfig({
  test: {
    include: testInclude,
    environment: "node",
  },
});
