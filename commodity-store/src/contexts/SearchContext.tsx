"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

interface SearchState {
  query: string;
  results: Product[];
  isSearching: boolean;
  recentSearches: string[];
}

interface SearchContextType {
  state: SearchState;
  search: (query: string) => void;
  clearSearch: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Mock product database - in a real app this would come from an API
const ALL_PRODUCTS: Product[] = [
  // Electronics
  { id: 1, name: "Wireless Bluetooth Headphones", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 2, name: "Smart Phone", price: 699.99, originalPrice: 799.99, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 3, name: "Laptop", price: 999.99, originalPrice: 1299.99, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 4, name: "Smart Watch", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 5, name: "Tablet", price: 449.99, originalPrice: 549.99, image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 6, name: "Digital Camera", price: 799.99, originalPrice: 999.99, image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 7, name: "Gaming Console", price: 499.99, originalPrice: 599.99, image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=300&fit=crop", category: "Electronics" },
  { id: 8, name: "Bluetooth Speakers", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&h=300&fit=crop", category: "Electronics" },

  // Fashion
  { id: 9, name: "Cotton T-Shirt", price: 24.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 10, name: "Denim Jeans", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 11, name: "Sneakers", price: 129.99, originalPrice: 159.99, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 12, name: "Leather Jacket", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 13, name: "Summer Dress", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 14, name: "Sunglasses", price: 49.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 15, name: "Winter Coat", price: 249.99, originalPrice: 349.99, image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=300&h=300&fit=crop", category: "Fashion" },
  { id: 16, name: "Handbag", price: 159.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop", category: "Fashion" },

  // Home & Garden
  { id: 17, name: "Desk Lamp", price: 45.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 18, name: "Coffee Maker", price: 159.99, originalPrice: 219.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 19, name: "Plant Pot", price: 29.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 20, name: "Throw Pillow", price: 19.99, originalPrice: 29.99, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 21, name: "Candle Set", price: 39.99, originalPrice: 59.99, image: "https://images.unsplash.com/photo-1602874801006-7ad421e4d2b8?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 22, name: "Wall Art", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 23, name: "Garden Tools", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop", category: "Home & Garden" },
  { id: 24, name: "Storage Box", price: 49.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop", category: "Home & Garden" },

  // Gaming
  { id: 25, name: "Mechanical Keyboard", price: 129.99, originalPrice: 179.99, image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 26, name: "Gaming Mouse", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 27, name: "Gaming Headset", price: 149.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1612198537235-1f85bde9ac07?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 28, name: "Controller", price: 59.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 29, name: "Gaming Chair", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1592300556311-8fc8ac6d0ddc?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 30, name: "Gaming Monitor", price: 399.99, originalPrice: 499.99, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 31, name: "Gaming Desk", price: 249.99, originalPrice: 329.99, image: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=300&h=300&fit=crop", category: "Gaming" },
  { id: 32, name: "RGB Lighting", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop", category: "Gaming" }
];

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isSearching: false,
    recentSearches: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('recentSearches') || '[]') : [],
  });

  const searchResults = useMemo(() => {
    if (!state.query.trim()) return [];

    const query = state.query.toLowerCase();
    return ALL_PRODUCTS.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    ).slice(0, 6); // Limit to 6 results for dropdown
  }, [state.query]);

  const search = (query: string) => {
    setState(prev => ({
      ...prev,
      query,
      results: query.trim() ? searchResults : [],
      isSearching: Boolean(query.trim())
    }));
  };

  const clearSearch = () => {
    setState(prev => ({
      ...prev,
      query: '',
      results: [],
      isSearching: false
    }));
  };

  const addRecentSearch = (query: string) => {
    if (!query.trim()) return;

    setState(prev => {
      const newRecentSearches = [
        query,
        ...prev.recentSearches.filter(s => s !== query)
      ].slice(0, 5); // Keep only 5 recent searches

      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      }

      return {
        ...prev,
        recentSearches: newRecentSearches
      };
    });
  };

  const clearRecentSearches = () => {
    setState(prev => ({ ...prev, recentSearches: [] }));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recentSearches');
    }
  };

  return (
    <SearchContext.Provider value={{
      state: { ...state, results: searchResults },
      search,
      clearSearch,
      addRecentSearch,
      clearRecentSearches
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
