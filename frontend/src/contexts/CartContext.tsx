"use client";

import type React from 'react';
import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { toast } from "sonner";

export interface CartItem {
  id: number; // This is the cart item ID (from cart_items.id)
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  quantity: number;
  specifications?: Record<string, string>; // itemName -> selected value name
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] };

// Helper function to compare specifications
const specsEqual = (specs1?: Record<string, string>, specs2?: Record<string, string>): boolean => {
  if (!specs1 && !specs2) return true;
  if (!specs1 || !specs2) return false;
  
  const keys1 = Object.keys(specs1).sort();
  const keys2 = Object.keys(specs2).sort();
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => specs1[key] === specs2[key]);
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Find existing item with same productId AND same specifications
      const existingItem = state.items.find(item => 
        item.productId === action.payload.productId && 
        specsEqual(item.specifications, action.payload.specifications)
      );

      if (existingItem) {
        // This case might be hit if the user clicks "add to cart" multiple times quickly
        // The backend handles this by updating quantity, so we'll just update here too.
        const updatedItems = state.items.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: action.payload.quantity } // Use quantity from backend response
            : item
        );
        const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

        return { items: updatedItems, total, itemCount };
      }

      const updatedItems = [...state.items, action.payload];
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: updatedItems, total, itemCount };
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: updatedItems, total, itemCount };
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        const updatedItems = state.items.filter(item => item.id !== action.payload.id);
        const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

        return { items: updatedItems, total, itemCount };
      }

      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: updatedItems, total, itemCount };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0, itemCount: 0 };

    case 'SET_CART': {
      const total = action.payload.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      return { items: action.payload, total, itemCount };
    }

    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity' | 'id' | 'productId'> & { id: number }) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
  });

  // Load cart from API on mount and when auth state changes
  useEffect(() => {
    const loadCart = async () => {
      try {
        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('auth_token');
        
        if (!sessionId && !token) {
          // Create session ID for guest users
          const newSessionId = Math.random().toString(36).substr(2, 9);
          localStorage.setItem('session_id', newSessionId);
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/cart`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Convert API cart items to local format
          const items = data.items?.map((item: any) => ({
            id: item.id as number,
            productId: item.productId as number,
            name: item.name as string,
            price: item.currentPrice as number,
            originalPrice: item.originalPrice as number,
            image: item.image as string,
            category: item.category as string || 'Unknown',
            quantity: item.quantity as number,
            specifications: item.specifications || undefined,
          })) || [];

          dispatch({ type: 'SET_CART', payload: items });
        } else {
          // If request fails, clear cart state
          dispatch({ type: 'SET_CART', payload: [] });
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
        // On error, clear cart state
        dispatch({ type: 'SET_CART', payload: [] });
      }
    };

    loadCart();

    // Listen for auth state changes to reload cart
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'session_id') {
        // Add a small delay to ensure localStorage is updated
        setTimeout(loadCart, 100);
      }
    };

    // Also listen for custom logout event
    const handleLogout = () => {
      // Clear cart immediately on logout
      dispatch({ type: 'SET_CART', payload: [] });
      // Then reload cart for guest session
      setTimeout(loadCart, 100);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logout', handleLogout);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logout', handleLogout);
    };
  }, []);

  const addItem = async (product: Omit<CartItem, 'quantity' | 'id' | 'productId'> & { id: number }) => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');

      // Check if item is already in cart with same specifications to prevent duplicate requests
      const existingItem = state.items.find(item => 
        item.productId === product.id && 
        specsEqual(item.specifications, product.specifications)
      );
      if (existingItem) {
        // If item exists with same specs, update quantity instead of adding
        await updateQuantity(existingItem.id, existingItem.quantity + 1);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // The backend returns the created/updated cart item, including its new quantity and ID
        const backendItem = data.item;

        const fullNewItem: CartItem = {
          id: backendItem.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          category: product.category,
          quantity: backendItem.quantity,
          specifications: product.specifications,
        };

        dispatch({ type: 'ADD_ITEM', payload: fullNewItem });
        toast.success(`${product.name} added to cart!`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const removeItem = async (id: number) => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');
      const item = state.items.find(item => item.id === id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/cart/items/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });

      if (response.ok) {
        dispatch({ type: 'REMOVE_ITEM', payload: id });
        if (item) {
          toast.success(`${item.name} removed from cart`);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  const updateQuantity = async (id: number, quantity: number) => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/cart/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const clearCart = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/cart`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });

      if (response.ok) {
        dispatch({ type: 'CLEAR_CART' });
        toast.success('Cart cleared');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
      toast.error('Failed to clear cart');
    }
  }, []);

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
