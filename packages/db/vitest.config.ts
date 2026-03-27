import { defineConfig } from "vitest/config";

const testInclude = ["src/**/__test__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];

export default defineConfig({
  test: {
    include: testInclude,
    environment: "node",
  },
});
