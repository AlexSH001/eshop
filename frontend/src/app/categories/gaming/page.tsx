"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, User, ShoppingBag, Eye } from "lucide-react";
import Link from "next/link";
import ShoppingCartSheet from "@/components/ShoppingCart";
import ProductQuickView from "@/components/ProductQuickView";
import AuthModal from "@/components/AuthModal";
import UserDropdown from "@/components/UserDropdown";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { gamingProducts } from "@/data/products";
import { useCategoryProducts } from "@/hooks/useCategoryProducts";

export default function GamingPage() {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { state: wishlistState, toggleWishlist, isInWishlist } = useWishlist();
  
  const fallbackProducts = gamingProducts.map(p => ({ ...p, category: 'Gaming' }));
  const { products, isLoading, error } = useCategoryProducts('Gaming', fallbackProducts);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

              {isAuthenticated ? (
                <UserDropdown />
              ) : (
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

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/categories" className="text-gray-600 hover:text-gray-900">Categories</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-900">Gaming</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-4">Gaming Gear</h1>
          <p className="text-xl text-white/90">Level up your gaming experience with professional equipment</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gaming Products</h2>
            <p className="text-gray-600 mt-1">{products.length} products available</p>
          </div>
          <Button variant="outline">
            Filter & Sort
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-lg">Loading products...</span>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
            <Card key={product.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg group">
              <div className="aspect-square overflow-hidden rounded-t-lg relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Quick View Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <ProductQuickView
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      originalPrice: product.originalPrice,
                      image: product.image,
                      category: "Gaming"
                    }}
                  >
                    <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-black">
                      <Eye className="h-4 w-4 mr-2" />
                      Quick View
                    </Button>
                  </ProductQuickView>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-900 flex-1">
                    {product.name}
                  </h3>
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          originalPrice: product.originalPrice,
                          image: product.image,
                          category: "Gaming"
                        });
                      }}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isInWishlist(product.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                      />
                    </Button>
                  )}
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.originalPrice}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  className="w-full bg-gray-50 hover:bg-gray-800"
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    image: product.image,
                    category: "Gaming"
                  })}
                >
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
