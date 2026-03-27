import React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@afenda/ui";
import { PageContainer, PageHeader } from "~/components/layout";
import { useDomainEvents } from "~/hooks/useOps";

function toStartOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

export default function OpsEventsPage() {
  const [eventType, setEventType] = React.useState<string>("all");
  const [entityType, setEntityType] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const filters = React.useMemo(
    () => ({
      page: 1,
      limit: 50,
      eventType: eventType === "all" ? undefined : eventType,
      entityType: entityType === "all" ? undefined : entityType,
      dateFrom: dateFrom ? toStartOfDayIso(dateFrom) : undefined,
      dateTo: dateTo ? toEndOfDayIso(dateTo) : undefined,
    }),
    [eventType, entityType, dateFrom, dateTo]
  );

  const { data, isLoading } = useDomainEvents(filters);

  const eventTypeOptions = React.useMemo(() => {
    return Array.from(new Set((data?.data ?? []).map((row) => row.eventType))).sort();
  }, [data?.data]);

  const entityTypeOptions = React.useMemo(() => {
    return Array.from(new Set((data?.data ?? []).map((row) => row.entityType))).sort();
  }, [data?.data]);

  const clearFilters = () => {
    setEventType("all");
    setEntityType("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ops Events"
        description="Live domain events stream for operational visibility."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by event type, entity type, and date window.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                {eventTypeOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entity Types</SelectItem>
                {entityTypeOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Date from"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Date to"
            />

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Domain Events</CardTitle>
          <CardDescription>
            Auto-refreshes every 30 seconds. Showing latest 50 records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading domain events...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Event Type</th>
                    <th className="px-2 py-2">Entity</th>
                    <th className="px-2 py-2">Entity ID</th>
                    <th className="px-2 py-2">Triggered By</th>
                    <th className="px-2 py-2">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-2 py-2">{row.eventType}</td>
                      <td className="px-2 py-2">{row.entityType}</td>
                      <td className="px-2 py-2">{row.entityId}</td>
                      <td className="px-2 py-2">{row.triggeredBy ?? "-"}</td>
                      <td className="max-w-[300px] truncate px-2 py-2">{row.payload ?? "-"}</td>
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
