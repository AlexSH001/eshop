// Admin API utility functions
export const getAdminHeaders = () => {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) {
    throw new Error('No admin token found');
  }
  
  return {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
};

export const adminApiCall = async (url: string, options: RequestInit = {}) => {
  const headers = getAdminHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response;
}; 