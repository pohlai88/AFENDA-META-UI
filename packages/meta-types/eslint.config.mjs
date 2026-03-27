import rootConfig from "../../eslint.config.js";

export default [
  ...rootConfig,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];
