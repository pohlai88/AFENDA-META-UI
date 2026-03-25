import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { Box, ShoppingCart, User } from "lucide-react";
import { useRecentActivity, type ActivityItemData } from "~/hooks/useRecentActivity";

function getActivityIcon(type: ActivityItemData["type"]) {
  switch (type) {
    case "Sales Order":
      return ShoppingCart;
    case "Partner":
      return User;
    case "Product":
      return Box;
  }
}

function ActivityItem({ type, message, time }: ActivityItemData) {
  const ActivityIcon = getActivityIcon(type);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className="rounded-md border border-border p-1.5 text-muted-foreground"
        aria-hidden="true"
      >
        <ActivityIcon className="h-3.5 w-3.5" />
      </div>
      <Badge variant="outline">{type}</Badge>
      <span className="text-muted-foreground">{message}</span>
      <span className="ml-auto text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

export function RecentActivityWidget() {
  const {
    data: recentActivity,
    isLoading: isRecentActivityLoading,
    isError: isRecentActivityError,
  } = useRecentActivity();

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest changes across all modules</CardDescription>
      </CardHeader>
      <CardContent>
        {isRecentActivityLoading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Loading recent activity...</p>
          </div>
        ) : isRecentActivityError ? (
          <p className="text-sm text-muted-foreground">Unable to load recent activity right now.</p>
        ) : recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item, index) => (
              <ActivityItem
                key={`${item.type}-${item.message}-${index}`}
                type={item.type}
                message={item.message}
                time={item.time}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
