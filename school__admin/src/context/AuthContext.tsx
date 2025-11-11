import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

interface User {
  uid: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      console.log('Auth check - token:', !!token, 'savedUser:', !!savedUser);
      
      if (token && savedUser) {
        // User exists in localStorage, just verify token is still valid
        try {
          const response = await authAPI.verify();
          console.log('Token verification response:', response);
          if (!response.success) {
            // Token expired or invalid
            console.warn('Token verification failed, logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            console.log('Token verified successfully, user stays logged in');
          }
          // If successful, user is already set from localStorage initialization
        } catch (error) {
          // Network error or server down - keep user logged in with cached data
          console.warn('Token verification failed (network error), keeping user logged in:', error);
          // Don't clear user on network errors - allow offline usage
        }
      } else {
        // No token or user data
        console.log('No token or user data found');
        setUser(null);
      }
      setLoading(false);
      console.log('Auth check complete, loading set to false');
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (response.success) {
      const userData = {
        uid: response.data.uid,
        email: response.data.email,
        name: response.data.name,
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error(response.message);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await authAPI.signup(email, password, name);
    if (response.success) {
      const userData = {
        uid: response.data.uid,
        email: response.data.email,
        name: response.data.name,
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error(response.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
