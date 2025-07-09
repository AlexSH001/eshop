"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";
import { useSearch } from "@/contexts/SearchContext";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function SearchBar({
  className = "h-10 w-80 rounded-full border-gray-200 pl-10 pr-4 focus:border-gray-300 focus:ring-0",
  placeholder = "Search products..."
}: SearchBarProps) {
  const { state, search, clearSearch, addRecentSearch, clearRecentSearches } = useSearch();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

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
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    search(value);
    setSelectedIndex(-1);
    setIsOpen(value.length > 0);
  };

  const handleProductSelect = (product: Product) => {
    addRecentSearch(product.name);
    setIsOpen(false);
    clearSearch();
    router.push(`/product/${product.id}`); // We'll create this page later
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    search(searchTerm);
    addRecentSearch(searchTerm);
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    if (state.query.trim()) {
      addRecentSearch(state.query);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(state.query)}`);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={state.query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(state.query.length > 0 || state.recentSearches.length > 0)}
          className={className}
        />
        {state.query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => {
              clearSearch();
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Search Results */}
          {state.results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 mb-2 px-2">Products</div>
              {state.results.map((product, index) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleProductSelect(product)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.category} • ${product.price}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs bg-gray-200 px-2 py-1 h-auto"
                    onClick={(e) => handleQuickAdd(product, e)}
                  >
                    Add to Cart
                  </Button>
                </div>
              ))}

              {state.query.trim() && (
                <div
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 border-t mt-2"
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Search for "{state.query}"
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {state.query.trim() && state.results.length === 0 && (
            <div className="p-4 text-center">
              <div className="text-sm text-gray-500 mb-2">No products found for "{state.query}"</div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
              >
                Search anyway
              </Button>
            </div>
          )}

          {/* Recent Searches */}
          {!state.query && state.recentSearches.length > 0 && (
            <div className="p-2 border-t">
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto p-1"
                  onClick={clearRecentSearches}
                >
                  Clear
                </Button>
              </div>
              {state.recentSearches.map((searchTerm, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRecentSearchClick(searchTerm)}
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{searchTerm}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
