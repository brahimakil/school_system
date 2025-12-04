import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentAuthAPI, StudentData, SignupData, LoginData } from '../services/api';

interface Student {
  uid: string;
  id?: string; // Alias for uid for compatibility
  email: string;
  fullName: string;
  phoneNumber: string;
  currentGrade: {
    grade: string;
    section: string;
  };
  photoUrl: string;
}

interface AuthContextType {
  student: Student | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('studentToken');
      const studentData = await AsyncStorage.getItem('studentData');

      if (token && studentData) {
        const parsedStudent = JSON.parse(studentData);
        setStudent(parsedStudent);
      } else {
        setStudent(null);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    try {
      const response = await studentAuthAPI.login(data);
      if (response.success) {
        const studentData: Student = {
          uid: response.data.uid,
          email: response.data.email,
          fullName: response.data.fullName,
          phoneNumber: response.data.phoneNumber,
          currentGrade: response.data.currentGrade,
          photoUrl: response.data.photoUrl,
        };

        await AsyncStorage.setItem('studentToken', response.data.token);
        await AsyncStorage.setItem('studentData', JSON.stringify(studentData));
        setStudent(studentData);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await studentAuthAPI.signup(data);
      if (response.success) {
        const studentData: Student = {
          uid: response.data.uid,
          email: response.data.email,
          fullName: response.data.fullName,
          phoneNumber: response.data.phoneNumber,
          currentGrade: response.data.currentGrade,
          photoUrl: response.data.photoUrl,
        };

        await AsyncStorage.setItem('studentToken', response.data.token);
        await AsyncStorage.setItem('studentData', JSON.stringify(studentData));
        setStudent(studentData);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('studentToken');
      await AsyncStorage.removeItem('studentData');
      setStudent(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ student, loading, login, signup, logout }}>
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
