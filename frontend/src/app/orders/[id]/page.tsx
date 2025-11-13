"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, CheckCircle, Truck, Clock } from "lucide-react";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  tracking?: string;
  estimatedDelivery?: string;
  phone?: string;
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/orders/${id}`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch order");
        return res.json();
      })
      .then(data => {
        // Transform the data to convert string numbers to actual numbers
        const order = data.order;
        setOrder({
          ...order,
          total: parseFloat(order.total) || 0,
          phone: order.phone || undefined,
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
        });
      })
      .catch(err => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "shipped":
        return <Truck className="h-5 w-5 text-blue-600" />;
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <div className="text-xl font-semibold">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <div className="text-xl font-semibold text-red-600">{error || "Order not found"}</div>
        <Link href="/orders">
          <Button className="mt-4">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                <p className="text-sm text-gray-600">
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                <Badge>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-3">
                {order.items.map((item: OrderItem, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} • ${item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {order.shippingAddress && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Shipping Address</h3>
                  <div className="text-sm text-gray-600">
                    <div>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</div>
                    {order.shippingAddress.company && <div>{order.shippingAddress.company}</div>}
                    <div>{order.shippingAddress.addressLine1}</div>
                    {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                    <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
                    <div>{order.shippingAddress.country}</div>
                    {order.phone && <div className="mt-2">Phone: {order.phone}</div>}
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Estimated Delivery: {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : "TBD"}
                    </p>
                    {order.tracking && (
                      <p className="text-sm text-gray-600">
                        Tracking: {order.tracking}
                      </p>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    Total: ${order.total}
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Link href="/orders">
                  <Button variant="outline">Back to Orders</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 