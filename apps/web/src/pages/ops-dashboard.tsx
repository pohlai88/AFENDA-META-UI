import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { PageContainer, PageHeader } from "~/components/layout";
import { useInvariantStats, useInvariantViolations } from "~/hooks/useOps";

function StatCard(props: { title: string; value: number; description?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.title}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      {props.description ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{props.description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function OpsDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useInvariantStats();
  const { data: violations, isLoading: violationsLoading } = useInvariantViolations({
    page: 1,
    limit: 20,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time invariant violations and domain event health."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Checks" value={statsLoading ? 0 : (stats?.total ?? 0)} />
        <StatCard title="Failures" value={statsLoading ? 0 : (stats?.byStatus.fail ?? 0)} />
        <StatCard title="Warnings" value={statsLoading ? 0 : (stats?.byStatus.warning ?? 0)} />
        <StatCard
          title="Failures (24h)"
          value={statsLoading ? 0 : (stats?.recentFailures24h ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Invariant Violations</CardTitle>
          <CardDescription>
            Auto-refreshes every 30 seconds. Showing latest 20 records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {violationsLoading ? (
            <p className="text-sm text-muted-foreground">Loading latest violations...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Invariant</th>
                    <th className="px-2 py-2">Entity</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Severity</th>
                    <th className="px-2 py-2">Expected</th>
                    <th className="px-2 py-2">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {(violations?.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-2 py-2">{new Date(row.evaluatedAt).toLocaleString()}</td>
                      <td className="px-2 py-2">{row.invariantCode}</td>
                      <td className="px-2 py-2">{row.entityType}</td>
                      <td className="px-2 py-2">{row.status}</td>
                      <td className="px-2 py-2">{row.severity}</td>
                      <td className="max-w-[200px] truncate px-2 py-2">{row.expectedValue ?? "-"}</td>
                      <td className="max-w-[200px] truncate px-2 py-2">{row.actualValue ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
