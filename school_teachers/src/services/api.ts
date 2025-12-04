import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('teacher_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // If token expired (401), logout user
      if (error.response.status === 401) {
        const message = error.response.data?.message || '';
        if (message.includes('expired') || message.includes('token')) {
          console.warn('Token expired, logging out...');
          localStorage.removeItem('teacher_token');
          localStorage.removeItem('teacher_user');
          window.location.href = '/login';
        }
      }
      
      const message = 
        error.response.data?.message || 
        error.response.data?.error ||
        error.response.statusText ||
        'An error occurred';
      
      const customError: any = new Error(message);
      customError.response = error.response;
      throw customError;
    }
    throw error;
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/teacher-login', { email, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export default api;
