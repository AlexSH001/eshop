"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { Edit, Trash2, Eye } from "lucide-react";
import { adminApiRequestJson } from "@/lib/admin-api";

export const dynamic = 'force-dynamic';

interface Order {
  id: number;
  customer: string;
  email: string;
  phone?: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export default function AdminOrdersPage() {
  const { isAuthenticated, isLoading, user } = useAdmin();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<string>("");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch orders from backend
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApiRequestJson<{ orders: any[] }>('/orders/authenticated');
      
      // Transform the data to match frontend expectations
      const transformedOrders = data.orders.map((order: any) => ({
        id: order.id,
        customer: `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim() || order.email,
        email: order.email,
        phone: order.phone || undefined,
        total: parseFloat(order.total) || 0,
        status: order.status,
        createdAt: new Date(order.created_at).toLocaleDateString(),
        items: (order.items || []).map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          total: parseFloat(item.total) || 0
        })),
        shippingAddress: order.shipping_first_name ? {
          firstName: order.shipping_first_name,
          lastName: order.shipping_last_name,
          company: order.shipping_company,
          addressLine1: order.shipping_address_line_1,
          addressLine2: order.shipping_address_line_2,
          city: order.shipping_city,
          state: order.shipping_state,
          postalCode: order.shipping_postal_code,
          country: order.shipping_country
        } : undefined
      }));
      
      setOrders(transformedOrders);
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEditOrder = async () => {
    if (!editingOrder) return;
    setLoading(true);
    setError(null);
    try {
      await adminApiRequestJson(`/orders/${editingOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      toast.success('Order updated successfully');
      setEditingOrder(null);
      setStatus("");
      fetchOrders();
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to update order');
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    setLoading(true);
    setError(null);
    try {
      await adminApiRequestJson(`/orders/${deletingOrder.id}`, {
        method: 'DELETE'
      });
      toast.success('Order deleted successfully');
      setDeletingOrder(null);
      fetchOrders();
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to delete order');
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Order #{order.id}</CardTitle>
                <Badge>{order.status}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-2">{order.customer} ({order.email})</div>
                <div className="text-sm text-gray-600 mb-2">Total: ${order.total.toFixed(2)}</div>
                <div className="flex gap-2">
                  <Dialog open={viewingOrder?.id === order.id} onOpenChange={open => {
                    if (!open) setViewingOrder(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setViewingOrder(order)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>View detailed information about this order</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Customer: {order.customer} ({order.email})</div>
                        {order.phone && <div>Phone: {order.phone}</div>}
                        <div>Status: {order.status}</div>
                        <div>Total: ${order.total.toFixed(2)}</div>
                        <div>Created: {order.createdAt}</div>
                        {order.shippingAddress && (
                          <div className="border-t pt-4">
                            <div className="font-semibold mb-2">Shipping Address:</div>
                            <div className="text-sm text-gray-600">
                              <div>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</div>
                              {order.shippingAddress.company && <div>{order.shippingAddress.company}</div>}
                              <div>{order.shippingAddress.addressLine1}</div>
                              {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                              <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
                              <div>{order.shippingAddress.country}</div>
                            </div>
                          </div>
                        )}
                        <div className="border-t pt-4">
                          <div className="font-semibold mb-2">Items:</div>
                          <ul className="list-disc ml-6">
                            {order.items.map(item => (
                              <li key={item.id}>{item.name} x{item.quantity} (${item.price.toFixed(2)})</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={editingOrder?.id === order.id} onOpenChange={open => {
                    if (!open) setEditingOrder(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingOrder(order);
                        setStatus(order.status);
                      }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Edit Order Status</DialogTitle>
                        <DialogDescription>Update the status of this order</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          className="w-full border rounded p-2 bg-white dark:bg-gray-900"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <Button onClick={handleEditOrder} disabled={loading}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {user?.role === 'super_admin' && (
                    <Dialog open={deletingOrder?.id === order.id} onOpenChange={open => {
                      if (!open) setDeletingOrder(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingOrder(order)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Delete Order</DialogTitle>
                        <DialogDescription>This action cannot be undone. This will permanently delete the order.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Are you sure you want to delete this order?</div>
                        <Button onClick={handleDeleteOrder} disabled={loading}>
                          Confirm Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
} 