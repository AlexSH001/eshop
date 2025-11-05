"use client";

import { createContext, useContext, useState, type ReactNode } from 'react';

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

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isSearching: false,
    recentSearches: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('recentSearches') || '[]') : [],
  });

  const search = async (query: string) => {
    setState(prev => ({ ...prev, query, isSearching: true }));
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], isSearching: false }));
      return;
    }
    try {
      const res = await fetch(`http://10.170.0.4:3001/api/products?search=${encodeURIComponent(query)}&limit=6`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setState(prev => ({ ...prev, results: data.products, isSearching: false }));
    } catch (err) {
      setState(prev => ({ ...prev, results: [], isSearching: false }));
    }
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
      ].slice(0, 5);
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
      state,
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
