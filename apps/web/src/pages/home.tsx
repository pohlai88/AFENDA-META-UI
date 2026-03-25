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
import { SearchDropdown } from "~/components/SearchDropdown";
import { useNavigate } from "react-router-dom";
import { RecentActivityWidget } from "~/components/RecentActivityWidget";

interface SearchConfig {
  model: string;
  module: string;
  label: string;
  placeholder: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats();

  const resolvedStats = {
    partners: stats?.partners ?? 0,
    salesOrders: stats?.salesOrders ?? 0,
    products: stats?.products ?? 0,
  };

  const searchConfigs: SearchConfig[] = [
    { model: "partner",      module: "sales", label: "Partners",     placeholder: "Search partners…" },
    { model: "sales_order",  module: "sales", label: "Sales Orders", placeholder: "Search orders…" },
    { model: "product",      module: "sales", label: "Products",     placeholder: "Search products…" },
  ];

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

      {/* Quick Search */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Search</CardTitle>
          <CardDescription>Jump directly to any record across all modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {searchConfigs.map(({ model, module, label, placeholder }) => (
              <div key={model}>
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <SearchDropdown
                  model={model}
                  placeholder={placeholder}
                  onSelect={(item) => {
                    const id = item.id;
                    if (typeof id === "string" && id.trim()) {
                      navigate(`/${module}/${model}/${id}`);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

      <RecentActivityWidget />
    </PageContainer>
  );
}
