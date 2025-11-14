"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

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
  refreshToken: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem('admin_refresh_token');
    
    console.log('Attempting to refresh admin token...');
    console.log('Refresh token exists:', !!refreshTokenValue);
    
    if (!refreshTokenValue) {
      console.log('No refresh token found');
      return false;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      console.log('Refresh response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Token refresh successful:', data);
        localStorage.setItem('admin_token', data.accessToken);
        
        // Update user data if provided
        if (data.admin) {
          const user: AdminUser = {
            id: data.admin.id,
            email: data.admin.email,
            name: data.admin.name,
            role: data.admin.role,
          };
          localStorage.setItem('admin_user', JSON.stringify(user));
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        }
        
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('Token refresh failed:', errorData);
        // Refresh token is invalid, logout admin
        logoutRef.current();
        return false;
      }
    } catch (error) {
      console.error('Failed to refresh admin token:', error);
      logoutRef.current();
      return false;
    }
  }, []);

  // Check for existing admin session on mount and listen for logout events
  useEffect(() => {
    const checkAdminAuth = async () => {
      const storedAdmin = localStorage.getItem('admin_user');
      const adminToken = localStorage.getItem('admin_token');
      const adminRefreshToken = localStorage.getItem('admin_refresh_token');
      
      if (storedAdmin && adminToken) {
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
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_refresh_token');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else if (adminRefreshToken) {
        // Try to refresh token if we have a refresh token but no access token
        const refreshed = await refreshToken();
        if (!refreshed) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAdminAuth();

    // Listen for admin logout events (triggered by API functions when refresh fails)
    const handleAdminLogout = () => {
      logout();
    };

    // Listen for storage changes (when tokens are cleared by API functions)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_token' && !e.newValue) {
        // Token was removed, update state
        logout();
      }
    };

    window.addEventListener('admin-logout', handleAdminLogout);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('admin-logout', handleAdminLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logout, refreshToken]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        // Handle rate limiting specifically
        if (res.status === 429) {
          const retryAfter = data.retryAfter || Math.ceil(15 * 60); // Default to 15 minutes
          const minutes = Math.ceil(retryAfter / 60);
          return { 
            success: false, 
            error: `Too many login attempts. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.` 
          };
        }
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
      localStorage.setItem('admin_token', data.tokens.accessToken);
      console.log('Login response tokens:', data.tokens);
      if (data.tokens.refreshToken) {
        localStorage.setItem('admin_refresh_token', data.tokens.refreshToken);
        console.log('Refresh token stored successfully');
      } else {
        console.log('No refresh token in login response');
      }
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


  const value: AdminContextType = {
    ...state,
    login,
    logout,
    refreshToken,
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
