'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { adminApiRequestJson } from "@/lib/admin-api";
import { toast } from "sonner";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
  productsGrowth: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  date: string;
}

interface TopProduct {
  id: number;
  name: string;
  sales: number;
  revenue: number;
  category: string;
}

interface ApiStatsResponse {
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
}

interface ApiRecentOrdersResponse {
  orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    email: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
}

interface ApiTopProductsResponse {
  products: Array<{
    id: number;
    name: string;
    price: number;
    featured_image: string;
    category_name: string;
    units_sold: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    usersGrowth: 0,
    productsGrowth: 0
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      const [statsData, ordersData, productsData] = await Promise.all([
        adminApiRequestJson<ApiStatsResponse>('/admin/dashboard/stats?period=30'),
        adminApiRequestJson<ApiRecentOrdersResponse>('/admin/dashboard/recent-orders?limit=5'),
        adminApiRequestJson<ApiTopProductsResponse>('/admin/dashboard/top-products?limit=5&period=30')
      ]);

      // Validate response data
      if (!statsData || !statsData.overview) {
        throw new Error('Invalid stats data received from server');
      }
      if (!ordersData || !Array.isArray(ordersData.orders)) {
        throw new Error('Invalid orders data received from server');
      }
      if (!productsData || !Array.isArray(productsData.products)) {
        throw new Error('Invalid products data received from server');
      }

      // Set stats from real API data
      setStats({
        totalProducts: Number(statsData.overview.totalProducts) || 0,
        totalOrders: Number(statsData.overview.totalOrders) || 0,
        totalUsers: Number(statsData.overview.totalUsers) || 0,
        totalRevenue: Number(statsData.overview.totalRevenue) || 0,
        revenueGrowth: Number(statsData.growth?.revenueGrowth) || 0,
        ordersGrowth: Number(statsData.growth?.ordersGrowth) || 0,
        usersGrowth: Number(statsData.growth?.usersGrowth) || 0,
        productsGrowth: 0 // Not provided by API
      });

      // Map recent orders from real API data
      setRecentOrders(
        ordersData.orders.map((order) => ({
          id: order.order_number || String(order.id),
          customer: order.customer_name || order.email || 'Unknown',
          total: Number(order.total) || 0,
          status: (order.status as 'pending' | 'processing' | 'shipped' | 'delivered') || 'pending',
          date: order.created_at || new Date().toISOString()
        }))
      );

      // Map top products from real API data
      setTopProducts(
        productsData.products.map((product) => ({
          id: product.id,
          name: product.name || 'Unnamed Product',
          sales: Number(product.units_sold) || 0,
          revenue: Number(product.revenue) || 0,
          category: product.category_name || 'Uncategorized'
        }))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || dataLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'shipped':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your store today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={dataLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.revenueGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
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
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.ordersGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.ordersGrowth >= 0 ? '+' : ''}{stats.ordersGrowth.toFixed(1)}%
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
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.usersGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.usersGrowth >= 0 ? '+' : ''}{stats.usersGrowth.toFixed(1)}%
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
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <div className="text-xs text-muted-foreground">
                Active products in store
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/orders')}>
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4 text-red-600 text-sm">
                  {error}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recent orders
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <div className="font-medium text-sm">{order.id}</div>
                          <div className="text-xs text-gray-600">{order.customer}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">${order.total.toFixed(2)}</div>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Products</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/products')}>
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4 text-red-600 text-sm">
                  {error}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No products data available
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                          <div className="text-xs text-gray-600">{product.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{product.sales} sales</div>
                        <div className="text-xs text-gray-600">${product.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => router.push('/admin/products?action=create')}
              >
                <Package className="h-6 w-6" />
                <span className="text-sm">Add Product</span>
              </Button>
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => router.push('/admin/orders')}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm">View Orders</span>
              </Button>
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => router.push('/admin/users')}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Manage Users</span>
              </Button>
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => router.push('/admin/analytics')}
              >
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
