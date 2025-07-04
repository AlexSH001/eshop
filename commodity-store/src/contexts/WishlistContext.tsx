"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';

interface WishlistItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

interface WishlistState {
  items: WishlistItem[];
  itemCount: number;
}

interface WishlistContextType {
  state: WishlistState;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: number) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: number) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WishlistState>({
    items: [],
    itemCount: 0,
  });

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
      try {
        const items = JSON.parse(savedWishlist) as WishlistItem[];
        setState({
          items,
          itemCount: items.length,
        });
      } catch (error) {
        console.error('Failed to parse wishlist:', error);
        localStorage.removeItem('wishlist');
      }
    }
  }, []);

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(state.items));
  }, [state.items]);

  const addToWishlist = (item: WishlistItem) => {
    setState(prev => {
      const existingItem = prev.items.find(i => i.id === item.id);
      if (existingItem) {
        toast.info('Item already in wishlist');
        return prev;
      }

      const newItems = [...prev.items, item];
      toast.success('Added to wishlist');
      return {
        items: newItems,
        itemCount: newItems.length,
      };
    });
  };

  const removeFromWishlist = (id: number) => {
    setState(prev => {
      const newItems = prev.items.filter(item => item.id !== id);
      toast.success('Removed from wishlist');
      return {
        items: newItems,
        itemCount: newItems.length,
      };
    });
  };

  const toggleWishlist = (item: WishlistItem) => {
    setState(prev => {
      const existingItem = prev.items.find(i => i.id === item.id);

      if (existingItem) {
        // Remove from wishlist
        const newItems = prev.items.filter(i => i.id !== item.id);
        toast.success('Removed from wishlist');
        return {
          items: newItems,
          itemCount: newItems.length,
        };
      }
      // Add to wishlist
      const newItems = [...prev.items, item];
      toast.success('Added to wishlist');
      return {
        items: newItems,
        itemCount: newItems.length,
      };
    });
  };

  const isInWishlist = (id: number): boolean => {
    return state.items.some(item => item.id === id);
  };

  const clearWishlist = () => {
    setState({
      items: [],
      itemCount: 0,
    });
    toast.success('Wishlist cleared');
  };

  const value: WishlistContextType = {
    state,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
