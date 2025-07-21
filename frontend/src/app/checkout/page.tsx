"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Lock,
  Smartphone,
  Wallet,
  DollarSign,
  ShoppingBag
} from "lucide-react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { state, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState("credit_card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmitOrder = async () => {
    setIsProcessing(true);

    try {
      // Get form data
      const email = (document.getElementById('email') as HTMLInputElement)?.value;
      const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
      const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value;
      const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value;
      const address = (document.getElementById('address') as HTMLInputElement)?.value;
      const city = (document.getElementById('city') as HTMLInputElement)?.value;
      const stateValue = (document.getElementById('state') as HTMLInputElement)?.value;
      const zipCode = (document.getElementById('zipCode') as HTMLInputElement)?.value;

      // Validate required fields
      if (!email || !firstName || !lastName || !address || !city || !stateValue || !zipCode) {
        toast.error("Please fill in all required fields");
        setIsProcessing(false);
        return;
      }
      
      if (!termsAccepted) {
        toast.error("You must agree to the Terms of Service and Privacy Policy.");
        setIsProcessing(false);
        return;
      }

      // Prepare order data
      const orderData = {
        email,
        phone: phone || null,
        paymentMethod: selectedPayment,
        billingAddress: {
          firstName,
          lastName,
          addressLine1: address,
          city,
          state: stateValue,
          postalCode: zipCode,
          country: 'US'
        },
        shippingAddress: {
          firstName,
          lastName,
          addressLine1: address,
          city,
          state: stateValue,
          postalCode: zipCode,
          country: 'US'
        },
        cartItems: state.items.map((item: CartItem) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // Create order
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderResult = await response.json();
      const orderId = orderResult.order.id;
      
      // After creating the order, handle payment flow
      if (selectedPayment === 'alipay') {
        toast.info("Redirecting to Alipay for payment...");
        const payResponse = await fetch(`http://localhost:3001/api/orders/${orderId}/pay/alipay`, {
          method: 'POST',
          headers,
        });
        if (!payResponse.ok) {
          const errorData = await payResponse.json();
          throw new Error(errorData.error || 'Failed to initiate Alipay payment');
        }
        const { payUrl } = await payResponse.json();
        window.location.href = payUrl;

      } else if (selectedPayment === 'paypal') {
        toast.info("Redirecting to PayPal for payment...");
        const payResponse = await fetch(`http://localhost:3001/api/orders/${orderId}/pay/paypal`, {
          method: 'POST',
          headers,
        });
        if (!payResponse.ok) {
          const errorData = await payResponse.json();
          throw new Error(errorData.error || 'Failed to initiate PayPal payment');
        }
        const { approvalUrl } = await payResponse.json();
        window.location.href = approvalUrl;
      
      } else {
        // For 'credit_card' or other methods that don't have a redirect flow implemented
        toast.success("Order placed successfully! You will receive a confirmation email shortly.");
        clearCart();
        window.location.href = `/orders/order-success?orderId=${orderId}`;
      }
      
    } catch (error) {
      console.error('Order processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process order');
      setIsProcessing(false);
    }
    // No need for finally block as setIsProcessing is handled in error case.
    // In success cases, the page redirects away.
  };

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-6">Add some products to proceed to checkout</p>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Shopping</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Shop</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm">Secure</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Order Summary */}
          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.category}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                        {item.originalPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ${(item.originalPrice * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${state.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>${(state.total * 0.08).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${(state.total * 1.08).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <div className="space-y-8">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="123 Main Street" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="New York" />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" placeholder="NY" />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input id="zipCode" placeholder="10001" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Lock className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedPayment} onValueChange={setSelectedPayment}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="credit_card" className="text-xs">
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="alipay" className="text-xs">
                        Alipay
                      </TabsTrigger>
                      <TabsTrigger value="wechat_pay" className="text-xs">
                        WeChat
                      </TabsTrigger>
                      <TabsTrigger value="paypal" className="text-xs">
                        PayPal
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="credit_card" className="mt-6 space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input id="expiryDate" placeholder="MM/YY" />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" placeholder="123" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="cardName">Name on Card</Label>
                        <Input id="cardName" placeholder="John Doe" />
                      </div>
                    </TabsContent>

                    <TabsContent value="alipay" className="mt-6">
                      <div className="rounded-lg border border-gray-200 p-6 text-center">
                        <Smartphone className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                        <h3 className="mb-2 text-lg font-semibold">Pay with Alipay</h3>
                        <p className="text-sm text-gray-600">
                          You'll be redirected to Alipay to complete your payment securely.
                        </p>
                        <Badge variant="outline" className="mt-3">
                          QR code and mobile payments supported
                        </Badge>
                      </div>
                    </TabsContent>

                    <TabsContent value="wechat_pay" className="mt-6">
                      <div className="rounded-lg border border-gray-200 p-6 text-center">
                        <Wallet className="mx-auto mb-4 h-12 w-12 text-green-600" />
                        <h3 className="mb-2 text-lg font-semibold">Pay with WeChat Pay</h3>
                        <p className="text-sm text-gray-600">
                          Scan the QR code with your WeChat app to complete the payment.
                        </p>
                        <Badge variant="outline" className="mt-3">
                          Quick and secure mobile payment
                        </Badge>
                      </div>
                    </TabsContent>

                    <TabsContent value="paypal" className="mt-6">
                      <div className="rounded-lg border border-gray-200 p-6 text-center">
                        <DollarSign className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                        <h3 className="mb-2 text-lg font-semibold">Pay with PayPal</h3>
                        <p className="text-sm text-gray-600">
                          You'll be redirected to PayPal to log in and complete your payment.
                        </p>
                        <Badge variant="outline" className="mt-3">
                          Buyer protection included
                        </Badge>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <Link href="/terms" className="text-blue-600 hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="newsletter" />
                      <Label htmlFor="newsletter" className="text-sm">
                        Subscribe to our newsletter for exclusive deals
                      </Label>
                    </div>
                  </div>

                  <Button
                    className="mt-6 w-full bg-gray-50 hover:bg-gray-800"
                    onClick={handleSubmitOrder}
                    disabled={isProcessing}
                    size="lg"
                  >
                    {isProcessing ? (
                      "Processing Payment..."
                    ) : (
                      `Complete Order • $${(state.total * 1.08).toFixed(2)}`
                    )}
                  </Button>

                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure 256-bit SSL encryption</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
