/**
 * Home / Dashboard Page
 * ======================
 * Landing page with stats, recent activity, and quick actions.
 */

import React from "react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeader } from "~/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { Button } from "@afenda/ui";
import { Badge } from "@afenda/ui";
import { ArrowRight, Plus, FileText, ShoppingCart, Package } from "lucide-react";
import { useDashboardStats } from "~/hooks/useDashboardStats";
import { useRecentActivity, type ActivityItemData } from "~/hooks/useRecentActivity";

function ActivityItem({ type, message, time }: ActivityItemData) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge variant="outline">{type}</Badge>
      <span className="text-muted-foreground">{message}</span>
      <span className="ml-auto text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

export default function HomePage() {
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats();
  const {
    data: recentActivity,
    isLoading: isRecentActivityLoading,
    isError: isRecentActivityError,
  } = useRecentActivity();

  const resolvedStats = {
    partners: stats?.partners ?? 0,
    salesOrders: stats?.salesOrders ?? 0,
    products: stats?.products ?? 0,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Welcome to AFENDA Meta-UI Platform"
      />

      {/* Stats Overview */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Partners</CardDescription>
            <CardTitle className="text-3xl">
              {isStatsLoading ? "..." : resolvedStats.partners}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="text-green-600 font-medium">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sales Orders</CardDescription>
            <CardTitle className="text-3xl">
              {isStatsLoading ? "..." : resolvedStats.salesOrders}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="text-green-600 font-medium">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Products</CardDescription>
            <CardTitle className="text-3xl">
              {isStatsLoading ? "..." : resolvedStats.products}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="text-blue-600 font-medium">+24</span> new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" aria-hidden="true" />
                Partners
              </CardTitle>
              <Badge>{isStatsLoading ? "..." : resolvedStats.partners}</Badge>
            </div>
            <CardDescription>
              Manage customers, suppliers, and business relationships
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/sales/partner">
                View All
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales/partner/new">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                Sales Orders
              </CardTitle>
              <Badge variant="secondary">
                {isStatsLoading ? "..." : resolvedStats.salesOrders}
              </Badge>
            </div>
            <CardDescription>
              Track and manage customer orders and quotations
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/sales/sales_order">
                View All
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales/sales_order/new">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" aria-hidden="true" />
                Products
              </CardTitle>
              <Badge variant="secondary">{isStatsLoading ? "..." : resolvedStats.products}</Badge>
            </div>
            <CardDescription>
              Manage product catalog, pricing, and inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/sales/product">
                View All
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales/product/new">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity (placeholder) */}
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
            <p className="text-sm text-muted-foreground">
              Unable to load recent activity right now.
            </p>
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
    </PageContainer>
  );
}
