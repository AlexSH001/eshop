"use client";

import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderFailedContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center p-8">
        <XCircle className="mx-auto mb-6 h-16 w-16 text-red-500" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          Unfortunately, we were unable to process your payment.
        </p>
        {orderId && (
            <p className="text-sm text-gray-500 mb-6">
                Your order (ID: <strong>{orderId}</strong>) has been created, but payment is pending. You can try paying again from your order history.
            </p>
        )}
        <div className="space-x-4">
            {orderId ? (
                <Link href="/orders">
                    <Button>Go to My Orders</Button>
                </Link>
            ) : (
                <Link href="/checkout">
                    <Button>Try Again</Button>
                </Link>
            )}
            <Link href="/">
                <Button variant="outline">Continue Shopping</Button>
            </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-6"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrderFailedContent />
    </Suspense>
  );
} 