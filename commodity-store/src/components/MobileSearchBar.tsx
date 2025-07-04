"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Mic
} from "lucide-react";
import type { Product } from "@/lib/types";
import { useSearch } from "@/contexts/SearchContext";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MobileSearchBarProps {
  children: React.ReactNode;
}

export default function MobileSearchBar({ children }: MobileSearchBarProps) {
  const { state, search, clearSearch, addRecentSearch, clearRecentSearches } = useSearch();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < state.results.length - 1 ? prev + 1 : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > -1 ? prev - 1 : state.results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && state.results[selectedIndex]) {
          handleProductSelect(state.results[selectedIndex]);
        } else if (state.query.trim()) {
          handleSearch();
        }
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    search(value);
    setSelectedIndex(-1);
  };

  const handleProductSelect = (product: Product) => {
    addRecentSearch(product.name);
    setIsOpen(false);
    clearSearch();
    router.push(`/product/${product.id}`);
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    search(searchTerm);
    addRecentSearch(searchTerm);
  };

  const handleSearch = () => {
    if (state.query.trim()) {
      addRecentSearch(state.query);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(state.query)}`);
      clearSearch();
    }
  };

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category
    });
  };

  const popularSearches = ["headphones", "laptop", "gaming", "smartphone", "fashion"];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="top" className="h-full">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Search Products</SheetTitle>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search products..."
                value={state.query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="h-12 pl-12 pr-12 text-base rounded-full border-gray-200"
              />
              {state.query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  onClick={() => {
                    clearSearch();
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full flex-shrink-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Search Results */}
          {state.results.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-500 mb-3 px-1">Products</div>
              <div className="space-y-2">
                {state.results.map((product, index) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.category} • ${product.price}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 h-8 text-xs"
                      onClick={(e) => handleQuickAdd(product, e)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>

              {state.query.trim() && (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 active:bg-gray-100 border-t mt-4 pt-4"
                  onClick={handleSearch}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Search for "{state.query}"
                    </div>
                    <div className="text-sm text-gray-500">
                      See all results
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {state.query.trim() && state.results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-medium text-gray-900 mb-2">No products found</div>
              <div className="text-sm text-gray-500 mb-4">
                Try a different search term
              </div>
              <Button
                variant="outline"
                onClick={handleSearch}
                className="w-full"
              >
                Search anyway
              </Button>
            </div>
          )}

          {/* Recent Searches */}
          {!state.query && state.recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Recent
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm h-auto p-1"
                  onClick={clearRecentSearches}
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1">
                {state.recentSearches.map((searchTerm, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => handleRecentSearchClick(searchTerm)}
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-gray-500" />
                    </div>
                    <span className="flex-1 font-medium text-gray-700">{searchTerm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {!state.query && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-3 px-1 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Popular
              </div>
              <div className="grid grid-cols-2 gap-2">
                {popularSearches.map((term, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-12 text-left justify-start"
                    onClick={() => handleRecentSearchClick(term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
