import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Only set Content-Type if it's not already set (important for FormData)
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from various possible locations
    if (error.response) {
      const message = 
        error.response.data?.message || 
        error.response.data?.error ||
        error.response.statusText ||
        'An error occurred';
      
      // Create a new error with the extracted message
      const customError: any = new Error(message);
      customError.response = error.response;
      throw customError;
    }
    throw error;
  }
);

export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/signup', { email, password, name });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export default api;
