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

const allCategories = [
  {
    name: "Electronics",
    icon: Smartphone,
    description: "Phones, Laptops, Gadgets",
    href: "/categories/electronics",
    productCount: 12,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop"
  },
  {
    name: "Fashion",
    icon: ShoppingBag,
    description: "Clothing, Shoes, Accessories",
    href: "/categories/fashion",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
  },
  {
    name: "Home & Garden",
    icon: HomeIcon,
    description: "Furniture, Decor, Tools",
    href: "/categories/home-garden",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
  },
  {
    name: "Gaming",
    icon: Gamepad2,
    description: "Consoles, Games, Accessories",
    href: "/categories/gaming",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop"
  },
  {
    name: "Sports",
    icon: Dumbbell,
    description: "Fitness, Camping, Sports",
    href: "/categories/sports",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop"
  },
  {
    name: "Photography",
    icon: Camera,
    description: "Cameras, Lenses, Equipment",
    href: "/categories/photography",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop"
  },
  {
    name: "Books",
    icon: Book,
    description: "Books, Movies, Music",
    href: "/categories/books",
    productCount: 4,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop"
  },
  {
    name: "Automotive",
    icon: Car,
    description: "Parts, Accessories, Tools",
    href: "/categories/automotive",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop"
  },
  {
    name: "Music",
    icon: Music,
    description: "Instruments, Audio, Equipment",
    href: "/categories/music",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop"
  },
  {
    name: "Baby & Kids",
    icon: Baby,
    description: "Toys, Clothes, Safety",
    href: "/categories/baby-kids",
    productCount: 7,
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop"
  }
];

export default function CategoriesPage() {
  const { isAuthenticated } = useAuth();
  const { state: wishlistState } = useWishlist();

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
          {allCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Link key={category.name} href={category.href}>
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
            {allCategories.slice(0, 4).map((category) => (
              <Link key={category.name} href={category.href}>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
