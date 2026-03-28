export function createNonSalesParityChecks() {
  return [
    {
      label: "Policy contract consistency gate",
      command: "pnpm",
      args: ["ci:policy:contract-consistency"],
    },
    {
      label: "Organization store and command-service tests",
      command: "pnpm",
      args: [
        "--filter",
        "@afenda/api",
        "exec",
        "vitest",
        "run",
        "src/organization/__test__/index.test.ts",
        "src/organization/__test__/organization-command-service.test.ts",
      ],
    },
    {
      label: "Organization route command-ownership tests",
      command: "pnpm",
      args: [
        "--filter",
        "@afenda/api",
        "exec",
        "vitest",
        "run",
        "src/routes/__test__/organization.route.test.ts",
      ],
    },
    {
      label: "Workflow command-service tests",
      command: "pnpm",
      args: [
        "--filter",
        "@afenda/api",
        "exec",
        "vitest",
        "run",
        "src/workflow/__test__/workflow-command-service.test.ts",
      ],
    },
    {
      label: "Workflow route actor and command tests",
      command: "pnpm",
      args: [
        "--filter",
        "@afenda/api",
        "exec",
        "vitest",
        "run",
        "src/routes/__test__/workflow.route.test.ts",
      ],
    },
    {
      label: "Projection replay checks",
      command: "pnpm",
      args: ["ci:api:projection-replay"],
    },
  ];
}
