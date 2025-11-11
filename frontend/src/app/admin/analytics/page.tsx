"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";

export const dynamic = 'force-dynamic';

interface AnalyticsData {
  overview: {
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    totalRevenue: number;
    pendingOrders: number;
    lowStockProducts: number;
  };
  growth: {
    ordersGrowth: number;
    revenueGrowth: number;
    usersGrowth: number;
  };
  salesData: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    price: number;
    featured_image: string;
    category_name: string;
    units_sold: number;
    revenue: number;
  }>;
  categoryPerformance: Array<{
    id: number;
    name: string;
    product_count: number;
    units_sold: number;
    revenue: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('30');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, salesRes, productsRes, categoriesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/analytics/stats?period=${period}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/analytics/sales-data?days=${period}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/analytics/top-products?period=${period}&limit=10`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/analytics/category-performance?period=${period}`, { headers })
      ]);

      if (!statsRes.ok || !salesRes.ok || !productsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [stats, sales, products, categories] = await Promise.all([
        statsRes.json(),
        salesRes.json(),
        productsRes.json(),
        categoriesRes.json()
      ]);

      setAnalyticsData({
        overview: stats.overview,
        growth: stats.growth,
        salesData: sales.salesData,
        topProducts: products.products,
        categoryPerformance: categories.categories
      });
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated, period]);

  const formatCurrency = (amount: number) => {
    // Try to get currency from settings, fallback to USD
    const settings = typeof window !== 'undefined' ? 
      JSON.parse(localStorage.getItem('settings') || '{}') : null;
    const currency = settings?.store?.currency || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAnalyticsData}>Retry</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-gray-600">Track your store performance and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAnalyticsData} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {analyticsData && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData.overview.totalRevenue)}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getGrowthIcon(analyticsData.growth.revenueGrowth)}
                    <span className={`ml-1 ${getGrowthColor(analyticsData.growth.revenueGrowth)}`}>
                      {analyticsData.growth.revenueGrowth >= 0 ? '+' : ''}{analyticsData.growth.revenueGrowth}%
                    </span>
                    <span className="ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalOrders)}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getGrowthIcon(analyticsData.growth.ordersGrowth)}
                    <span className={`ml-1 ${getGrowthColor(analyticsData.growth.ordersGrowth)}`}>
                      {analyticsData.growth.ordersGrowth >= 0 ? '+' : ''}{analyticsData.growth.ordersGrowth}%
                    </span>
                    <span className="ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalUsers)}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getGrowthIcon(analyticsData.growth.usersGrowth)}
                    <span className={`ml-1 ${getGrowthColor(analyticsData.growth.usersGrowth)}`}>
                      {analyticsData.growth.usersGrowth >= 0 ? '+' : ''}{analyticsData.growth.usersGrowth}%
                    </span>
                    <span className="ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalProducts)}</div>
                  <div className="text-xs text-muted-foreground">
                    {analyticsData.overview.lowStockProducts} low stock
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Sales chart visualization</p>
                    <p className="text-sm text-gray-400">Chart library integration needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Products and Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Top Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.category_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatNumber(product.units_sold)} sold</p>
                          <p className="text-sm text-gray-500">{formatCurrency(product.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Category Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.categoryPerformance.slice(0, 5).map((category, index) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-gray-500">{category.product_count} products</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatNumber(category.units_sold)} sold</p>
                          <p className="text-sm text-gray-500">{formatCurrency(category.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sales Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Recent Sales Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-right py-2">Orders</th>
                        <th className="text-right py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.salesData.slice(0, 10).map((day) => (
                        <tr key={day.date} className="border-b">
                          <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="text-right py-2">{formatNumber(day.orders)}</td>
                          <td className="text-right py-2">{formatCurrency(day.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
} 