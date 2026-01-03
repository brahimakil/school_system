import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentAuthAPI, StudentData, SignupData, LoginData, homeworkAPI, quizAPI } from '../services/api';
import { NotificationService } from '../services/notificationService';

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
  initiateLogin: (data: LoginData) => Promise<void>;
  verifyLogin: (email: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Start notification service when student logs in
  useEffect(() => {
    if (student) {
      startNotifications();
    } else {
      NotificationService.stopPeriodicCheck();
    }

    return () => {
      NotificationService.stopPeriodicCheck();
    };
  }, [student]);

  const startNotifications = async () => {
    if (!student) return;

    const fetchHomeworks = async () => {
      try {
        const response = await homeworkAPI.getMyHomework(
          student.currentGrade.grade,
          student.currentGrade.section
        );
        return response.success ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch homeworks for notifications:', error);
        return [];
      }
    };

    const fetchQuizzes = async () => {
      try {
        const response = await quizAPI.getMyQuizzes(
          student.currentGrade.grade,
          student.currentGrade.section
        );
        return response.success ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch quizzes for notifications:', error);
        return [];
      }
    };

    // Start periodic check - 5 seconds for debugging (change to 3600 for production = 1 hour)
    NotificationService.startPeriodicCheck(fetchHomeworks, fetchQuizzes, 5);
  };

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

  const initiateLogin = async (data: LoginData) => {
    try {
      const response = await studentAuthAPI.initiateLogin(data);
      if (!response.success) {
        throw new Error(response.message);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send OTP');
    }
  };

  const verifyLogin = async (email: string, otp: string) => {
    try {
      const response = await studentAuthAPI.verifyLogin(email, otp);
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
      throw new Error(error.message || 'Verification failed');
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
    <AuthContext.Provider value={{ student, loading, login, signup, logout, initiateLogin, verifyLogin }}>
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
