"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useRef } from "react";

function OrderSuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const hasClearedCart = useRef(false);

  useEffect(() => {
    // Only clear cart once when component mounts
    if (!hasClearedCart.current) {
      hasClearedCart.current = true;
      clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center p-8">
        <CheckCircle className="mx-auto mb-6 h-16 w-16 text-green-500" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been confirmed.
        </p>
        {orderId && (
            <p className="text-sm text-gray-500 mb-6">
                Your Order ID is: <strong>{orderId}</strong>
            </p>
        )}
        <div className="space-x-4">
          <Link href="/orders">
            <Button>View My Orders</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-6"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
} 