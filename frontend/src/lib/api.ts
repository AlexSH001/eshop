import { Product } from "@/lib/types";

// Use relative URL when behind nginx proxy (production), or use env var for direct backend access (development)
// When NEXT_PUBLIC_API_URL is not set, use relative URL which will work with nginx proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

interface OrderData {
  // Define the shape of order data as needed
  [key: string]: unknown;
}

interface ProductData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  stock: number;
  status: string;
  featuredImage?: string;
  image?: string;
}

interface CategoryData {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
  error?: string;
  details?: unknown[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token refresh lock to prevent race conditions
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh the access token using the refresh token
 * Uses a lock mechanism to prevent multiple simultaneous refresh attempts
 */
async function refreshAccessToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshTokenValue = localStorage.getItem('refresh_token');
  if (!refreshTokenValue) {
    return null;
  }

  // Create a new refresh promise
  refreshPromise = (async () => {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        localStorage.setItem('auth_token', refreshData.accessToken);
        return refreshData.accessToken;
      } else {
        // Refresh failed, clear tokens and trigger logout
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Trigger logout event to update UI state
        window.dispatchEvent(new CustomEvent('logout'));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: null,
          oldValue: localStorage.getItem('auth_token')
        }));
        
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Refresh failed, clear tokens and trigger logout
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Trigger logout event to update UI state
      window.dispatchEvent(new CustomEvent('logout'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth_token',
        newValue: null,
        oldValue: localStorage.getItem('auth_token')
      }));
      
      return null;
    } finally {
      // Clear the lock after refresh completes
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    
    // Handle 401 errors before parsing JSON (token expired/invalid)
    if (response.status === 401 && localStorage.getItem('refresh_token')) {
      // Try to refresh the token
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry the original request with the new token
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        };
        
        const retryResponse = await fetch(url, retryConfig);
        
        // Parse response
        let retryData: ApiResponse<T>;
        try {
          retryData = await retryResponse.json();
        } catch {
          // If response is not JSON, throw error
          throw new ApiError(retryResponse.status, 'Invalid response format');
        }
        
        if (!retryResponse.ok) {
          // If retry still fails with 401, token refresh didn't work
          if (retryResponse.status === 401) {
            throw new ApiError(401, 'Authentication expired');
          }
          throw new ApiError(
            retryResponse.status,
            retryData.error || 'API request failed',
            retryData.details
          );
        }
        
        return retryData.data || retryData as T;
      } else {
        // Refresh failed, trigger logout and throw authentication error
        window.dispatchEvent(new CustomEvent('logout'));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: null,
          oldValue: localStorage.getItem('auth_token')
        }));
        throw new ApiError(401, 'Authentication expired');
      }
    }

    // Parse response for non-401 errors
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      // If response is not JSON, create a basic error
      if (!response.ok) {
        throw new ApiError(response.status, `Request failed with status ${response.status}`);
      }
      throw new ApiError(500, 'Invalid response format');
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || 'API request failed',
        data.details
      );
    }

    return data.data || data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error');
  }
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  me: async () => {
    return apiRequest('/auth/me');
  },

  refresh: async (refreshToken: string) => {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/products?${searchParams.toString()}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/products/${id}`);
  },

  getByCategory: async (categoryId: number) => {
    return apiRequest(`/products/category/${categoryId}`);
  },

  getFeatured: async () => {
    return apiRequest('/products/featured/list');
  },
};

// Cart API
export const cartApi = {
  get: async () => {
    const sessionId = localStorage.getItem('session_id');
    const headers: Record<string, string> = {};
    
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    return apiRequest('/cart', { headers });
  },

  addItem: async (productId: number, quantity: number = 1) => {
    return apiRequest('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },

  updateItem: async (itemId: number, quantity: number) => {
    return apiRequest(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  removeItem: async (itemId: number) => {
    return apiRequest(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  clear: async () => {
    return apiRequest('/cart', {
      method: 'DELETE',
    });
  },

  merge: async (sessionId: string) => {
    return apiRequest('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },
};

// Wishlist API
export const wishlistApi = {
  get: async () => {
    return apiRequest('/wishlist');
  },

  addItem: async (productId: number) => {
    return apiRequest(`/wishlist/items/${productId}`, {
      method: 'POST',
    });
  },

  removeItem: async (productId: number) => {
    return apiRequest(`/wishlist/items/${productId}`, {
      method: 'DELETE',
    });
  },

  check: async (productId: number) => {
    return apiRequest(`/wishlist/check/${productId}`);
  },
};

// Orders API
export const ordersApi = {
  create: async (orderData: OrderData) => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  getMyOrders: async () => {
    return apiRequest('/orders/my-orders');
  },

  getById: async (id: number) => {
    return apiRequest(`/orders/${id}`);
  },
};

// Search API
export const searchApi = {
  search: async (query: string, filters?: Record<string, string | number | boolean>) => {
    const searchParams = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/search?${searchParams.toString()}`);
  },

  getSuggestions: async (query: string) => {
    return apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`);
  },

  getPopular: async () => {
    return apiRequest('/search/popular');
  },

  getRecent: async () => {
    return apiRequest('/search/recent');
  },
};

// Admin API
export const adminApi = {
  login: async (email: string, password: string) => {
    return apiRequest('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getDashboardStats: async () => {
    return apiRequest('/admin/dashboard/stats');
  },

  getRecentOrders: async () => {
    return apiRequest('/admin/dashboard/recent-orders');
  },

  getTopProducts: async () => {
    return apiRequest('/admin/dashboard/top-products');
  },

  getAllOrders: async () => {
    return apiRequest('/admin/orders');
  },

  updateOrderStatus: async (orderId: number, status: string, trackingNumber?: string) => {
    return apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, trackingNumber }),
    });
  },

  getAllProducts: async () => {
    return apiRequest('/admin/products');
  },

  createProduct: async (productData: ProductData) => {
    return apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateProduct: async (productId: number, productData: ProductData) => {
    return apiRequest(`/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  deleteProduct: async (productId: number) => {
    return apiRequest(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  },
};

// User Addresses API
export const getUserAddresses = async (): Promise<any> => {
  return apiRequest('/users/addresses');
};

export const createUserAddress = async (addressData: any): Promise<any> => {
  return apiRequest('/users/addresses', {
    method: 'POST',
    body: JSON.stringify(addressData),
  });
};

export const updateUserAddress = async (addressId: number, addressData: any): Promise<any> => {
  return apiRequest(`/users/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(addressData),
  });
};

export const deleteUserAddress = async (addressId: number): Promise<any> => {
  return apiRequest(`/users/addresses/${addressId}`, {
    method: 'DELETE',
  });
};

export const setDefaultAddress = async (addressId: number): Promise<any> => {
  return apiRequest(`/users/addresses/${addressId}/default`, {
    method: 'PUT',
  });
};

// Update user profile
export const updateUserProfile = async (profileData: any): Promise<any> => {
  return apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
  return apiRequest('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

export { ApiError }; 