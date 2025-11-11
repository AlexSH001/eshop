"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Search, User, Heart, Star, ShoppingBag, Smartphone, Home as HomeIcon, Gamepad2, Camera, Book, Dumbbell, Car, Music, Baby, ChevronRight, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import ShoppingCartSheet from "@/components/ShoppingCart";
import ProductQuickView from "@/components/ProductQuickView";
import SearchBar from "@/components/SearchBar";
import MobileSearchBar from "@/components/MobileSearchBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AuthModal from "@/components/AuthModal";
import UserDropdown from "@/components/UserDropdown";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisplay from "@/components/PriceDisplay";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useEffect, useState } from "react";
import { allCategories, bannerSlides } from "@/data/categories";
import { fetchProducts, fetchGroupedProducts, Product } from "@/lib/utils";

export default function Home() {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { state: wishlistState, toggleWishlist, isInWishlist } = useWishlist();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 

  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchProducts();
        const groupedProducts = await fetchGroupedProducts();
        setCategoryProducts(groupedProducts);
        
      } catch (err) {
        setError((err as Error).message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, []);

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

  // Loading state (only show if no products are available)
  if (isLoading && Object.keys(categoryProducts).length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Loading products...</span>
        </div>
      </div>
    );
  }

  // Error state (only show if no products are available)
  if (error && Object.keys(categoryProducts).length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 sm:pb-0">
      {/* Header */}
      <Header />
      
      {/* Mobile Search Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <MobileSearchBar>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </MobileSearchBar>
      </div>

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
                {allCategories.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Link
                      key={type.name}
                      href={type.href}
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
              {allCategories.slice(0, 8).map((type) => {
                const IconComponent = type.icon;
                return (
                  <Link
                    key={type.name}
                    href={type.href}
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
                  <Link href={`/categories/${category.toLowerCase().replace(' & ', '-').replace(/\s+/g, '-')}`}>
                    <Button variant="ghost" className="flex items-center gap-2 text-sm">
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Horizontal Scrollable Products */}
                <div className="relative">
                  <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {(products as Product[]).map((product: Product) => (
                      <Card
                        key={product.id}
                        className="flex-shrink-0 w-48 sm:w-56 md:w-64 cursor-pointer transition-all duration-200 hover:shadow-lg group card-hover mobile-tap"
                      >
                        <div className="aspect-square overflow-hidden rounded-t-lg relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onLoad={() => console.log(`Image loaded successfully: ${product.name}`)}
                            onError={(e) => {
                              console.error(`Image failed to load for ${product.name}:`, product.image);
                              const target = e.target as HTMLImageElement;
                              // Use a placeholder image instead of trying to load non-existent static images
                              target.src = '/static/images/default.jpg';
                            }}
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
                            <PriceDisplay price={product.price} />
                            {product.originalPrice && (
                              <span className="text-sm text-gray-500 line-through">
                                <PriceDisplay price={product.originalPrice} />
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-gray-50 hover:bg-gray-800 touch-target mobile-tap"
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
      <Footer />

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
