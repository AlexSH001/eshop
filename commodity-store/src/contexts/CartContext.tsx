"use client";

import type React from 'react';
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import { toast } from "sonner";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

        return { items: updatedItems, total, itemCount };
      }
      const newItem = { ...action.payload, quantity: 1 };
      const updatedItems = [...state.items, newItem];
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

    case 'SET_CART':
      const total = action.payload.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      return { items: action.payload, total, itemCount };

    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
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

  // Load cart from API on mount
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

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Convert API cart items to local format
          const items = data.items?.map((item: any) => ({
            id: item.product_id,
            name: item.product_name,
            price: parseFloat(item.price),
            image: item.product_image,
            category: item.category_name || 'Unknown',
            quantity: item.quantity,
          })) || [];

          dispatch({ type: 'SET_CART', payload: items });
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    };

    loadCart();
  }, []);

  const addItem = async (item: Omit<CartItem, 'quantity'>) => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
        body: JSON.stringify({
          productId: item.id,
          quantity: 1,
        }),
      });

      if (response.ok) {
        dispatch({ type: 'ADD_ITEM', payload: item });
        toast.success(`${item.name} added to cart!`);
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart/items/${id}`, {
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart/items/${id}`, {
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

  const clearCart = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart`, {
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
  };

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
