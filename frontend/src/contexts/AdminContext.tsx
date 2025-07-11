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
      const res = await fetch('http://localhost:3001/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Invalid admin credentials' };
      }
      const data = await res.json();
      const user: AdminUser = {
        id: data.admin.id,
        email: data.admin.email,
        name: data.admin.name,
        role: data.admin.role,
      };
      localStorage.setItem('admin_user', JSON.stringify(user));
      localStorage.setItem('admin_token', data.token);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
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
