"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { Edit, Trash2, Eye } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Order {
  id: number;
  customer: string;
  email: string;
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
}

export default function AdminOrdersPage() {
  const { isAuthenticated, isLoading } = useAdmin();
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
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch('https://backend.fortunewhisper.com/api/orders/authenticated', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      
      // Transform the data to match frontend expectations
      const transformedOrders = data.orders.map((order: any) => ({
        id: order.id,
        customer: `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim() || order.email,
        email: order.email,
        total: order.total,
        status: order.status,
        createdAt: new Date(order.created_at).toLocaleDateString(),
        items: order.items || []
      }));
      
      setOrders(transformedOrders);
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
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
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://backend.fortunewhisper.com/api/orders/${editingOrder.id}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update order');
      toast.success('Order updated successfully');
      setEditingOrder(null);
      setStatus("");
      fetchOrders();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://backend.fortunewhisper.com/api/orders/${deletingOrder.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete order');
      toast.success('Order deleted successfully');
      setDeletingOrder(null);
      fetchOrders();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to delete order');
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
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Customer: {order.customer} ({order.email})</div>
                        <div>Status: {order.status}</div>
                        <div>Total: ${order.total.toFixed(2)}</div>
                        <div>Created: {order.createdAt}</div>
                        <div>Items:</div>
                        <ul className="list-disc ml-6">
                          {order.items.map(item => (
                            <li key={item.id}>{item.name} x{item.quantity} (${item.price.toFixed(2)})</li>
                          ))}
                        </ul>
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
                      </DialogHeader>
                      <div className="space-y-4">
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          className="w-full border rounded p-2"
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
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Are you sure you want to delete this order?</div>
                        <Button onClick={handleDeleteOrder} disabled={loading}>
                          Confirm Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
} 