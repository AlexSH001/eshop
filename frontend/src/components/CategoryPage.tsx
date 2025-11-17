"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import PriceDisplay from "@/components/PriceDisplay";
import ProductQuickView from "@/components/ProductQuickView";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCategoryProducts } from "@/hooks/useCategoryProducts";
import { fetchGroupedProducts, Product } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CategoryPageProps {
  categoryName: string;
  categorySlug: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  image?: string;
}

export default function CategoryPage({
  categoryName,
  categorySlug,
  description,
  gradientFrom,
  gradientTo,
  image,
}: CategoryPageProps) {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { state: wishlistState, toggleWishlist, isInWishlist } = useWishlist();
  
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const loadFallbackProducts = async () => {
      try {
        const groupedProducts = await fetchGroupedProducts();
        setFallbackProducts(groupedProducts[categoryName] || []);
      } catch (error) {
        console.error('Error loading fallback products:', error);
        setFallbackProducts([]);
      }
    };
    
    loadFallbackProducts();
  }, [categoryName]);
  
  const { products = [], isLoading, error } = useCategoryProducts(categoryName, fallbackProducts);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/categories" className="text-gray-600 hover:text-gray-900">Categories</Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-900">{categoryName}</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`relative h-64 bg-gradient-to-r ${gradientFrom} ${gradientTo} overflow-hidden`}>
        {image && (
          <img
            src={image}
            alt={categoryName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 z-10">
          <h1 className="text-4xl font-bold text-white mb-4">{categoryName}</h1>
          <p className="text-xl text-white/90">{description}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{categoryName} Products</h2>
            <p className="text-gray-600 mt-1">{(products || []).length} products available</p>
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

        {/* No Products State */}
        {!isLoading && (products || []).length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <div className="mb-4">
                <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                  <Eye className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {categoryName} Products Yet</h3>
              <p className="text-gray-600 mb-6">
                We're working on adding amazing products. Check back soon!
              </p>
              <Link href="/categories">
                <Button>Browse Other Categories</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && (products || []).length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(products || []).map((product) => (
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
                      category: categoryName
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
                          category: categoryName
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
                  <PriceDisplay price={product.price} className="font-semibold text-gray-900" />
                  {product.originalPrice && (
                    <PriceDisplay price={product.originalPrice} className="text-sm text-gray-500 line-through" />
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
                    category: categoryName
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

