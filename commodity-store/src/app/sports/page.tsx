"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, User, ShoppingBag, Eye } from "lucide-react";
import Link from "next/link";
import ShoppingCartSheet from "@/components/ShoppingCart";
import AuthModal from "@/components/AuthModal";
import UserDropdown from "@/components/UserDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";

const sportsProducts = [
  { id: 37, name: "Running Shoes", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" },
  { id: 38, name: "Yoga Mat", price: 29.99, originalPrice: 49.99, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop" },
  { id: 39, name: "Dumbbells Set", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop" },
  { id: 40, name: "Sports Water Bottle", price: 19.99, originalPrice: 29.99, image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop" },
  { id: 41, name: "Fitness Tracker", price: 149.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&h=300&fit=crop" },
  { id: 42, name: "Tennis Racket", price: 99.99, originalPrice: 149.99, image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=300&h=300&fit=crop" }
];

export default function SportsPage() {
  const { isAuthenticated } = useAuth();
  const { state: wishlistState } = useWishlist();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Shop</span>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/wishlist">
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                    <Heart className="h-5 w-5" />
                    {wishlistState.itemCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                        {wishlistState.itemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <Heart className="h-5 w-5" />
                </Button>
              )}
              {isAuthenticated ? <UserDropdown /> : (
                <AuthModal>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </AuthModal>
              )}
              <ShoppingCartSheet />
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/categories" className="text-gray-600 hover:text-gray-900">Categories</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-900">Sports</span>
          </div>
        </div>
      </div>

      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-4">Sports & Fitness</h1>
          <p className="text-xl text-white/90">Get active with our premium sports equipment</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Sports Products</h2>
          <p className="text-gray-600 mt-1">{sportsProducts.length} products available</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sportsProducts.map((product) => (
            <Card key={product.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg">
              <div className="aspect-square overflow-hidden rounded-t-lg">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <CardContent className="p-4">
                <h3 className="mb-2 text-sm font-medium text-gray-900">{product.name}</h3>
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
                  )}
                </div>
                <Button size="sm" className="w-full bg-black hover:bg-gray-800">
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
