/**
 * Admin API request helper with automatic token refresh
 * This utility handles admin authentication tokens and automatically refreshes them when expired
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Token refresh lock to prevent race conditions
let adminRefreshPromise: Promise<string | null> | null = null;

/**
 * Refresh admin token using the refresh token stored in localStorage
 * Uses a lock mechanism to prevent multiple simultaneous refresh attempts
 * @returns {Promise<string | null>} New access token or null if refresh failed
 */
const refreshAdminToken = async (): Promise<string | null> => {
  // If a refresh is already in progress, wait for it
  if (adminRefreshPromise) {
    return adminRefreshPromise;
  }

  const refreshTokenValue = localStorage.getItem('admin_refresh_token');
  
  if (!refreshTokenValue) {
    return null;
  }

  // Create a new refresh promise
  adminRefreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_token', data.accessToken);
        
        // Update user data if provided
        if (data.admin) {
          localStorage.setItem('admin_user', JSON.stringify(data.admin));
        }
        
        return data.accessToken;
      } else {
        // Refresh token is invalid, clear all admin tokens and trigger logout
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        
        // Trigger admin logout event to update UI state
        window.dispatchEvent(new CustomEvent('admin-logout'));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'admin_token',
          newValue: null,
          oldValue: localStorage.getItem('admin_token')
        }));
        
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh admin token:', error);
      // Clear tokens on error and trigger logout
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      
      // Trigger admin logout event to update UI state
      window.dispatchEvent(new CustomEvent('admin-logout'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'admin_token',
        newValue: null,
        oldValue: localStorage.getItem('admin_token')
      }));
      
      return null;
    } finally {
      // Clear the lock after refresh completes
      adminRefreshPromise = null;
    }
  })();

  return adminRefreshPromise;
};

/**
 * Make an authenticated admin API request with automatic token refresh
 * @param endpoint - API endpoint (e.g., '/categories/admin/list')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export const adminApiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const adminToken = localStorage.getItem('admin_token');
  
  if (!adminToken) {
    throw new Error('Admin authentication required. Please login again.');
  }

  // Make the initial request
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    credentials: 'include',
  });

  // If token expired, try to refresh and retry
  // Always attempt refresh on 401 errors when refresh token is available
  if (response.status === 401 && localStorage.getItem('admin_refresh_token')) {
    const newToken = await refreshAdminToken();
    
    if (newToken) {
      // Retry the request with the new token
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } else {
      // Refresh failed, trigger logout and throw error
      window.dispatchEvent(new CustomEvent('admin-logout'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'admin_token',
        newValue: null,
        oldValue: localStorage.getItem('admin_token')
      }));
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};

/**
 * Make an authenticated admin API request and parse JSON response
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns {Promise<T>} Parsed JSON response
 */
export const adminApiRequestJson = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await adminApiRequest(endpoint, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
};
