"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
}

interface AdminState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminContextType extends AdminState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminAuth = () => {
      const storedAdmin = localStorage.getItem('admin_user');
      if (storedAdmin) {
        try {
          const user = JSON.parse(storedAdmin);
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to parse stored admin user:', error);
          localStorage.removeItem('admin_user');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAdminAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo admin credentials
      if ((email === 'admin@shop.com' && password === 'admin123') ||
          (email === 'superadmin@shop.com' && password === 'super123')) {
        const user: AdminUser = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          name: email.includes('super') ? 'Super Admin' : 'Admin User',
          role: email.includes('super') ? 'super_admin' : 'admin',
        };

        localStorage.setItem('admin_user', JSON.stringify(user));
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }
      return { success: false, error: 'Invalid admin credentials' };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_user');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const value: AdminContextType = {
    ...state,
    login,
    logout,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
