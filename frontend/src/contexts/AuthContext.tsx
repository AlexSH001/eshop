"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount and listen for storage changes
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Validate token with backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const user = JSON.parse(storedUser);
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Try to refresh the token
            const refreshTokenValue = localStorage.getItem('refresh_token');
            if (refreshTokenValue) {
              try {
                const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/auth/refresh`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ refreshToken: refreshTokenValue }),
                });

                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  localStorage.setItem('auth_token', refreshData.accessToken);
                  const user = JSON.parse(storedUser);
                  setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                } else {
                  // Refresh token is also invalid, clear storage
                  localStorage.removeItem('user');
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                  setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                  });
                }
              } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                localStorage.removeItem('user');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                setState({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
              }
            } else {
              // No refresh token, clear storage
              localStorage.removeItem('user');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          }
        } catch (error) {
          console.error('Failed to validate token:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();

    // Listen for storage changes (when tokens are cleared by API functions)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue) {
        // Token was removed, update state
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store tokens
      localStorage.setItem('auth_token', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
      }

      // Store user data
      const user: User = {
        id: data.user.id.toString(),
        email: data.user.email,
        name: `${data.user.first_name} ${data.user.last_name}`,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
      };

      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Merge guest cart with user cart if session exists
      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        try {
          const mergeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/cart/merge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.tokens.accessToken}`,
            },
            body: JSON.stringify({ sessionId }),
          });

          if (mergeResponse.ok) {
            // Clear session ID after successful merge
            localStorage.removeItem('session_id');
            
            // Trigger cart reload after successful merge
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'auth_token',
              newValue: data.tokens.accessToken,
              oldValue: null
            }));
          }
        } catch (mergeError) {
          console.error('Failed to merge cart:', mergeError);
          // Don't fail login if cart merge fails
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }

      // Store tokens
      localStorage.setItem('auth_token', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
      }

      // Store user data
      const user: User = {
        id: data.user.id.toString(),
        email: data.user.email,
        name: `${data.user.first_name} ${data.user.last_name}`,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
      };

      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Merge guest cart with user cart if session exists
      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        try {
          const mergeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/cart/merge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.tokens.accessToken}`,
            },
            body: JSON.stringify({ sessionId }),
          });

          if (mergeResponse.ok) {
            // Clear session ID after successful merge
            localStorage.removeItem('session_id');
            
            // Trigger cart reload after successful merge
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'auth_token',
              newValue: data.tokens.accessToken,
              oldValue: null
            }));
          }
        } catch (mergeError) {
          console.error('Failed to merge cart:', mergeError);
          // Don't fail signup if cart merge fails
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('wishlist');
    
    // Trigger custom logout event for cart context
    window.dispatchEvent(new CustomEvent('logout'));
    
    // Also trigger storage event to notify cart context
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'auth_token',
      newValue: null,
      oldValue: localStorage.getItem('auth_token')
    }));
    
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshToken = async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    
    if (!refreshTokenValue) {
      return false;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.fortunewhisper.com/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.accessToken);
        return true;
      } else {
        // Refresh token is invalid, logout user
        logout();
        return false;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
