import React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import { PageContainer, PageHeader } from "~/components/layout";
import { useBlastRadius, useSimulateScenario } from "~/hooks/useSandbox";

const defaultScenarioJson = JSON.stringify(
  {
    id: "scenario-sales-order-1",
    name: "Sales Order Sanity Check",
    entity: "sales_order",
    record: {
      total_amount: 1250,
      status: "draft",
    },
    actor: {
      uid: "ops-user",
      roles: ["admin"],
    },
    operation: "create",
  },
  null,
  2
);

const defaultBlastJson = JSON.stringify(
  {
    policy: {
      id: "demo-policy",
      scope: "sales_order",
      name: "Require positive total",
      validate: "total_amount > 0",
      message: "Order total must be positive",
      severity: "error",
    },
    records: {
      sales_order: [
        { id: "so-1", total_amount: 1200 },
        { id: "so-2", total_amount: 0 },
      ],
    },
  },
  null,
  2
);

export default function SandboxPage() {
  const [scenarioInput, setScenarioInput] = React.useState(defaultScenarioJson);
  const [blastInput, setBlastInput] = React.useState(defaultBlastJson);
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  const simulateMutation = useSimulateScenario();
  const blastMutation = useBlastRadius();

  const runSimulation = () => {
    try {
      setJsonError(null);
      const scenario = JSON.parse(scenarioInput) as Record<string, unknown>;
      simulateMutation.mutate({ scenario: scenario as never });
    } catch {
      setJsonError("Invalid simulation JSON payload.");
    }
  };

  const runBlastRadius = () => {
    try {
      setJsonError(null);
      const payload = JSON.parse(blastInput) as { policy: unknown; records: unknown };
      blastMutation.mutate({
        policy: payload.policy as never,
        records: payload.records as never,
      });
    } catch {
      setJsonError("Invalid blast radius JSON payload.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Policy Sandbox"
        description="Run dry-run simulations and blast-radius checks before activating rules."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dry Run</CardTitle>
            <CardDescription>POST /api/sandbox/simulate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={scenarioInput}
              onChange={(event) => setScenarioInput(event.target.value)}
              className="min-h-[260px] w-full rounded-md border bg-background p-3 font-mono text-xs"
            />
            <Button onClick={runSimulation} disabled={simulateMutation.isPending}>
              {simulateMutation.isPending ? "Running..." : "Run Simulation"}
            </Button>
            {simulateMutation.data ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Badge
                    variant={simulateMutation.data.aggregate.passed ? "secondary" : "destructive"}
                  >
                    {simulateMutation.data.aggregate.passed ? "PASS" : "FAIL"}
                  </Badge>
                  <span>{simulateMutation.data.results.length} policies evaluated</span>
                </div>
                <pre className="max-h-64 overflow-auto text-xs">
                  {JSON.stringify(simulateMutation.data, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blast Radius</CardTitle>
            <CardDescription>POST /api/sandbox/blast-radius</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={blastInput}
              onChange={(event) => setBlastInput(event.target.value)}
              className="min-h-[260px] w-full rounded-md border bg-background p-3 font-mono text-xs"
            />
            <Button onClick={runBlastRadius} disabled={blastMutation.isPending}>
              {blastMutation.isPending ? "Analyzing..." : "Analyze Blast Radius"}
            </Button>
            {blastMutation.data ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{blastMutation.data.affectedRecordCount} impacted</Badge>
                  <span>{blastMutation.data.affectedEntities.length} entities</span>
                </div>
                <pre className="max-h-64 overflow-auto text-xs">
                  {JSON.stringify(blastMutation.data, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {jsonError ? <p className="mt-4 text-sm text-destructive">{jsonError}</p> : null}
    </PageContainer>
  );
}
