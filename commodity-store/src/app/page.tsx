"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Search, User, Heart, Star, ShoppingBag, Smartphone, Home as HomeIcon, Gamepad2, Camera, Book, Dumbbell, Car, Music, Baby, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import ShoppingCartSheet from "@/components/ShoppingCart";
import ProductQuickView from "@/components/ProductQuickView";
import SearchBar from "@/components/SearchBar";
import MobileSearchBar from "@/components/MobileSearchBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AuthModal from "@/components/AuthModal";
import UserDropdown from "@/components/UserDropdown";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useEffect, useState } from "react";

export default function Home() {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { state: wishlistState, toggleWishlist, isInWishlist } = useWishlist();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const commodityTypes = [
    { name: "Electronics", icon: Smartphone, description: "Phones, Laptops, Gadgets" },
    { name: "Home & Garden", icon: HomeIcon, description: "Furniture, Decor, Tools" },
    { name: "Fashion", icon: ShoppingBag, description: "Clothing, Shoes, Accessories" },
    { name: "Sports", icon: Dumbbell, description: "Fitness, Camping, Sports" },
    { name: "Gaming", icon: Gamepad2, description: "Consoles, Games, Accessories" },
    { name: "Photography", icon: Camera, description: "Cameras, Lenses, Equipment" },
    { name: "Books", icon: Book, description: "Books, Movies, Music" },
    { name: "Automotive", icon: Car, description: "Parts, Accessories, Tools" },
    { name: "Music", icon: Music, description: "Instruments, Audio, Equipment" },
    { name: "Baby & Kids", icon: Baby, description: "Toys, Clothes, Safety" }
  ];

  const bannerSlides = [
    {
      id: 1,
      title: "Summer Sale",
      subtitle: "Up to 70% off on all electronics",
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
      cta: "Shop Electronics",
      link: "/category/electronics"
    },
    {
      id: 2,
      title: "New Fashion Collection",
      subtitle: "Discover the latest trends",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      cta: "Shop Fashion",
      link: "/category/fashion"
    },
    {
      id: 3,
      title: "Home & Garden Sale",
      subtitle: "Transform your living space",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=400&fit=crop",
      cta: "Shop Home",
      link: "/category/home-garden"
    },
    {
      id: 4,
      title: "Gaming Gear",
      subtitle: "Level up your gaming experience",
      image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&h=400&fit=crop",
      cta: "Shop Gaming",
      link: "/category/gaming"
    }
  ];

  const categoryProducts = {
    "Electronics": [
      { id: 1, name: "Wireless Bluetooth Headphones", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop" },
      { id: 2, name: "Smart Phone", price: 699.99, originalPrice: 799.99, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop" },
      { id: 3, name: "Laptop", price: 999.99, originalPrice: 1299.99, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop" },
      { id: 4, name: "Smart Watch", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&h=300&fit=crop" },
      { id: 5, name: "Tablet", price: 449.99, originalPrice: 549.99, image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&h=300&fit=crop" },
      { id: 6, name: "Camera", price: 799.99, originalPrice: 999.99, image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=300&fit=crop" },
      { id: 7, name: "Gaming Console", price: 499.99, originalPrice: 599.99, image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=300&fit=crop" },
      { id: 8, name: "Speakers", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&h=300&fit=crop" }
    ],
    "Fashion": [
      { id: 9, name: "Cotton T-Shirt", price: 24.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop" },
      { id: 10, name: "Denim Jeans", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop" },
      { id: 11, name: "Sneakers", price: 129.99, originalPrice: 159.99, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop" },
      { id: 12, name: "Leather Jacket", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop" },
      { id: 13, name: "Summer Dress", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop" },
      { id: 14, name: "Sunglasses", price: 49.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop" },
      { id: 15, name: "Winter Coat", price: 249.99, originalPrice: 349.99, image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=300&h=300&fit=crop" },
      { id: 16, name: "Handbag", price: 159.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" }
    ],
    "Home & Garden": [
      { id: 17, name: "Desk Lamp", price: 45.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop" },
      { id: 18, name: "Coffee Maker", price: 159.99, originalPrice: 219.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop" },
      { id: 19, name: "Plant Pot", price: 29.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop" },
      { id: 20, name: "Throw Pillow", price: 19.99, originalPrice: 29.99, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop" },
      { id: 21, name: "Candle Set", price: 39.99, originalPrice: 59.99, image: "https://images.unsplash.com/photo-1602874801006-7ad421e4d2b8?w=300&h=300&fit=crop" },
      { id: 22, name: "Wall Art", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop" },
      { id: 23, name: "Garden Tools", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop" },
      { id: 24, name: "Storage Box", price: 49.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop" }
    ],
    "Gaming": [
      { id: 25, name: "Mechanical Keyboard", price: 129.99, originalPrice: 179.99, image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=300&fit=crop" },
      { id: 26, name: "Gaming Mouse", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop" },
      { id: 27, name: "Gaming Headset", price: 149.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1612198537235-1f85bde9ac07?w=300&h=300&fit=crop" },
      { id: 28, name: "Controller", price: 59.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=300&h=300&fit=crop" },
      { id: 29, name: "Gaming Chair", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1592300556311-8fc8ac6d0ddc?w=300&h=300&fit=crop" },
      { id: 30, name: "Monitor", price: 399.99, originalPrice: 499.99, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop" },
      { id: 31, name: "Gaming Desk", price: 249.99, originalPrice: 329.99, image: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=300&h=300&fit=crop" },
      { id: 32, name: "RGB Lighting", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop" }
    ]
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="min-h-screen bg-white pb-16 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="text-xl font-semibold text-gray-900">
                  Shop
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Desktop Search */}
              <div className="hidden md:block">
                <SearchBar />
              </div>

              {/* Mobile Search Button */}
              <div className="md:hidden">
                <MobileSearchBar>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <Search className="h-5 w-5" />
                  </Button>
                </MobileSearchBar>
              </div>

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

      {/* Hero Carousel Banner */}
      <section className="relative">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {bannerSlides.map((slide) => (
              <CarouselItem key={slide.id}>
                <div className="relative h-[300px] sm:h-[400px] w-full overflow-hidden">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute inset-0 flex items-center">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                      <div className="max-w-2xl text-white">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
                          {slide.title}
                        </h1>
                        <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-6 sm:leading-8">
                          {slide.subtitle}
                        </p>
                        <div className="mt-6 sm:mt-10">
                          <Link href={slide.link}>
                            <Button
                              size="lg"
                              className="bg-white text-black hover:bg-gray-100 touch-target mobile-tap w-full sm:w-auto"
                            >
                              {slide.cta}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 sm:left-4 h-8 w-8 sm:h-10 sm:w-10" />
          <CarouselNext className="right-2 sm:right-4 h-8 w-8 sm:h-10 sm:w-10" />

          {/* Pagination Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full transition-colors touch-target ${
                  index === current ? "bg-white" : "bg-white/50"
                }`}
                onClick={() => api?.scrollTo(index)}
              />
            ))}
          </div>
        </Carousel>
      </section>

      {/* Categories Bar */}
      <section className="border-b border-gray-100 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            {/* Mobile: Horizontal scrolling categories */}
            <div className="md:hidden">
              <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                {commodityTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Link
                      key={type.name}
                      href={`/${type.name.toLowerCase().replace(/\s+/g, '-').replace('&', '')}`}
                      className="flex flex-col items-center space-y-2 text-center hover:text-black transition-colors flex-shrink-0"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300">
                        <IconComponent className="h-7 w-7 text-gray-700" />
                      </div>
                      <span className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap text-center leading-tight">
                        {type.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden md:flex items-center justify-evenly w-full">
              {commodityTypes.slice(0, 8).map((type) => {
                const IconComponent = type.icon;
                return (
                  <Link
                    key={type.name}
                    href={`/${type.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex flex-col items-center space-y-2 text-center hover:text-black transition-colors flex-shrink-0"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <IconComponent className="h-6 w-6 text-gray-700" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
                      {type.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="flex justify-center">
              <Link href="/categories" className="text-sm text-gray-600 hover:text-gray-900 py-2 px-4 rounded-full hover:bg-gray-50">
                View All Categories
                <ChevronRight className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-category Horizontal Product Gallery */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {Object.entries(categoryProducts).map(([category, products]) => (
              <div key={category} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                  <Link href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Button variant="ghost" className="flex items-center gap-2 text-sm">
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Horizontal Scrollable Products */}
                <div className="relative">
                  <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {products.map((product) => (
                      <Card
                        key={product.id}
                        className="flex-shrink-0 w-48 sm:w-56 md:w-64 cursor-pointer transition-all duration-200 hover:shadow-lg group card-hover mobile-tap"
                      >
                        <div className="aspect-square overflow-hidden rounded-t-lg relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Quick View Overlay - Hidden on mobile, shown on hover for desktop */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hidden sm:flex">
                            <ProductQuickView
                              product={{
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                category: category
                              }}
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                className="bg-white/90 hover:bg-white text-black"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Quick View
                              </Button>
                            </ProductQuickView>
                          </div>

                          {/* Mobile Quick View Button */}
                          <div className="absolute top-2 right-2 sm:hidden">
                            <ProductQuickView
                              product={{
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                category: category
                              }}
                            >
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white text-black"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </ProductQuickView>
                          </div>
                        </div>

                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="line-clamp-2 text-sm font-medium text-gray-900 flex-1">
                              {product.name}
                            </h3>
                            {isAuthenticated && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-2 flex-shrink-0 touch-target"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWishlist({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    originalPrice: product.originalPrice,
                                    image: product.image,
                                    category: category
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
                            className="w-full bg-black hover:bg-gray-800 touch-target mobile-tap"
                            onClick={() => addItem({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              originalPrice: product.originalPrice,
                              image: product.image,
                              category: category
                            })}
                          >
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="text-xl font-semibold text-gray-900">Shop</span>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Your one-stop shop for quality products across all categories.
                Secure payments with multiple options.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Alipay</Badge>
                <Badge variant="outline" className="text-xs">WeChat Pay</Badge>
                <Badge variant="outline" className="text-xs">PayPal</Badge>
                <Badge variant="outline" className="text-xs">Credit Cards</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">Shop</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><Link href="/electronics" className="hover:text-gray-900">Electronics</Link></li>
                <li><Link href="/fashion" className="hover:text-gray-900">Fashion</Link></li>
                <li><Link href="/home-garden" className="hover:text-gray-900">Home & Garden</Link></li>
                <li><Link href="/sports" className="hover:text-gray-900">Sports</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">Support</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><Link href="/help" className="hover:text-gray-900">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900">Contact Us</Link></li>
                <li><Link href="/shipping" className="hover:text-gray-900">Shipping Info</Link></li>
                <li><Link href="/returns" className="hover:text-gray-900">Returns</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">Account</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><Link href="/account" className="hover:text-gray-900">My Account</Link></li>
                <li><Link href="/orders" className="hover:text-gray-900">Order History</Link></li>
                <li><Link href="/wishlist" className="hover:text-gray-900">Wishlist</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2024 Shop. All rights reserved. Secure payments supported worldwide.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
