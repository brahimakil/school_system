import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

interface Teacher {
  id: string;
  email: string;
  name: string;
  subject?: string;
}

interface AuthContextType {
  user: Teacher | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Teacher | null>(() => {
    const savedUser = localStorage.getItem('teacher_user');
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
    const checkAuth = async () => {
      const token = localStorage.getItem('teacher_token');
      const savedUser = localStorage.getItem('teacher_user');
      
      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Try to verify token, refresh if expired
          try {
            const response = await authAPI.verify();
            if (response.success) {
              socketService.connect(token);
            } else {
              console.warn('Token verification unsuccessful');
              socketService.connect(token);
            }
          } catch (verifyError: any) {
            // If token expired, try to refresh by re-logging in
            if (verifyError?.response?.status === 401) {
              console.warn('Token expired, user needs to re-login');
              localStorage.removeItem('teacher_token');
              localStorage.removeItem('teacher_user');
              setUser(null);
            } else {
              console.warn('Token verification failed, but keeping user logged in:', verifyError);
              socketService.connect(token);
            }
          }
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('teacher_token');
          localStorage.removeItem('teacher_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Set up token refresh interval (refresh every 50 minutes if token expires in 1 hour)
    const refreshInterval = setInterval(() => {
      const currentUser = localStorage.getItem('teacher_user');
      if (currentUser) {
        console.log('Token refresh check - user should re-authenticate if needed');
      }
    }, 50 * 60 * 1000);

    return () => {
      socketService.disconnect();
      clearInterval(refreshInterval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (response.success) {
      const userData = {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        subject: response.data.subject,
      };
      localStorage.setItem('teacher_token', response.data.token);
      localStorage.setItem('teacher_user', JSON.stringify(userData));
      setUser(userData);
      
      // Connect socket
      socketService.connect(response.data.token);
    } else {
      throw new Error(response.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_user');
    socketService.disconnect();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
