"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import Link from "next/link";
import { useState } from "react";

interface ShoppingCartSheetProps {
  children?: React.ReactNode;
}

export default function ShoppingCartSheet({ children }: ShoppingCartSheetProps) {
  const { state, removeItem, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleQuantityChange = (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {state.itemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                {state.itemCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({state.itemCount} items)
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {state.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Your cart is empty</p>
              <p className="text-gray-400 text-sm">Add some products to get started!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {state.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.name}</h3>
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-purple-600">${item.price}</span>
                        {item.originalPrice && (
                          <span className="text-xs text-gray-500 line-through">
                            ${item.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ${state.total.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  {isAuthenticated ? (
                    <Link href="/checkout" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                        Proceed to Checkout
                      </Button>
                    </Link>
                  ) : (
                    <AuthModal>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                        Sign In to Checkout
                      </Button>
                    </AuthModal>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    Continue Shopping
                  </Button>
                </div>

                <div className="text-center text-xs text-gray-500">
                  <p>Secure checkout with multiple payment options</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Alipay</Badge>
                    <Badge variant="outline" className="text-xs">WeChat Pay</Badge>
                    <Badge variant="outline" className="text-xs">PayPal</Badge>
                    <Badge variant="outline" className="text-xs">Cards</Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
