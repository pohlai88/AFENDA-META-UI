import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/__tests__/**/*.ts"],
    environment: "node",
  },
});