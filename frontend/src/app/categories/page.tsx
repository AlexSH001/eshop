"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, User, ShoppingBag, Smartphone, Home as HomeIcon, Gamepad2, Camera, Book, Dumbbell, Car, Music, Baby } from "lucide-react";
import Link from "next/link";
import ShoppingCartSheet from "@/components/ShoppingCart";
import AuthModal from "@/components/AuthModal";
import UserDropdown from "@/components/UserDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
// import { allCategories } from "@/data/categories";
import { fetchCategories, fetchGroupedProducts, Category } from "@/lib/utils";
import { useEffect, useState } from "react";

async function fetchCategoriesAndGroupedProducts() {
  const categories = await fetchCategories();
  const groupedProducts = await fetchGroupedProducts();
  for (const category of categories) {
    const productCount = groupedProducts[category.name]?.length || 0;
    category.productCount = productCount;
  }
  return categories;
}

export default function CategoriesPage() {
  const { isAuthenticated } = useAuth();
  const { state: wishlistState } = useWishlist();

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetchCategoriesAndGroupedProducts().then(categories => {
      setCategories(categories);
    });
  }, []);

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
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-900">All Categories</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover quality products across all our categories. From electronics to fashion,
            we have everything you need with secure payments and fast shipping.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => {
            const IconComponent = category.icon;
            const href = category.href || `/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`;
            return (
              <Link key={category.name} href={href}>
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group">
                  <div className="aspect-video overflow-hidden rounded-t-lg relative">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
                    <div className="absolute bottom-4 left-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm">
                        <IconComponent className="h-6 w-6 text-gray-700" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-black">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {category.productCount} products
                      </span>
                      <Badge variant="secondary" className="group-hover:bg-black group-hover:text-white transition-colors">
                        Browse
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Popular Categories Section */}
        <div className="mt-16 border-t border-gray-200 pt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Categories</h2>
            <p className="text-gray-600">Most shopped categories this month</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((category) => {
              const href = category.href || `/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`;
              return (
              <Link key={category.name} href={href}>
                <div className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square hover:shadow-lg transition-all duration-200">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm opacity-90">{category.productCount} items</p>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
