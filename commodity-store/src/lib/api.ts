const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  details?: any[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
    const data: ApiResponse<T> = await response.json();

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
        if (value !== undefined) {
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
  create: async (orderData: any) => {
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
  search: async (query: string, filters?: any) => {
    const searchParams = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
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

  createProduct: async (productData: any) => {
    return apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateProduct: async (productId: number, productData: any) => {
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

export { ApiError }; 