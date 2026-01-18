import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL - using production backend
const API_URL = 'https://school-system-34gn.vercel.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('studentToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
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

export interface GradeSection {
  grade: string;
  section: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  currentGrade: GradeSection;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface StudentData {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  currentGrade: GradeSection;
  photoUrl: string;
  token: string;
}

export const studentAuthAPI = {
  signup: async (data: SignupData): Promise<{ success: boolean; data: StudentData; message: string }> => {
    const response = await api.post('/auth/student/signup', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<{ success: boolean; data: StudentData; message: string }> => {
    const response = await api.post('/auth/student/login', data);
    return response.data;
  },

  initiateLogin: async (data: LoginData): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/student/login-initiate', data);
    return response.data;
  },

  verifyLogin: async (email: string, otp: string): Promise<{ success: boolean; data: StudentData; message: string }> => {
    const response = await api.post('/auth/student/login-verify', { email, otp });
    return response.data;
  },
};

export interface ClassSchedule {
  id: string;
  className: string;
  teacherId: string;
  teacherName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  gradeSections: GradeSection[];
}

export const scheduleAPI = {
  getMyClasses: async (grade: string, section: string): Promise<{ success: boolean; data: ClassSchedule[] }> => {
    const response = await api.get(`/classes?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
    return response.data;
  },
};

export interface Quiz {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  quizDurationMinutes: number;
  totalMarks: number;
  status: string;
  gradeSections: string[];
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: string;
  marks: number;
}

export const quizAPI = {
  getMyQuizzes: async (grade: string, section: string): Promise<{ success: boolean; data: Quiz[] }> => {
    const response = await api.get(`/quizzes?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
    return response.data;
  },

  getQuizById: async (quizId: string): Promise<Quiz> => {
    const response = await api.get(`/quizzes/${quizId}`);
    return response.data;
  },
};

export interface Homework {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  status: HomeworkStatus;
  gradeSections: string[];
  attachmentUrl?: string;
  attachmentType?: 'video' | 'pdf' | 'image' | 'other';
}

export enum HomeworkStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAST_DUE = 'past_due',
}

export const homeworkAPI = {
  getMyHomework: async (grade: string, section: string): Promise<{ success: boolean; data: Homework[] }> => {
    const response = await api.get(`/homeworks?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
    return response.data;
  },

  getMySubmissions: async (studentId: string): Promise<{ success: boolean; data: Submission[] }> => {
    const response = await api.get(`/submissions/student/${studentId}`);
    return response.data;
  },
};

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  textContent?: string;
  fileUrl?: string;
  fileName?: string;
  grade?: number;
  teacherFeedback?: string;
  gradedBy?: string;
  gradedAt?: any;
  submittedAt: any;
  updatedAt: any;
}

export interface Course {
  id: string;
  classId: string;
  className: string;
  gradeSections: string[];
  subject: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'overdue';
  attachmentUrl?: string;
  attachmentType?: 'video' | 'pdf' | 'image' | 'other';
  createdAt?: any;
  updatedAt?: any;
}

export const coursesAPI = {
  getMyCourses: async (grade: string, section: string): Promise<{ success: boolean; data: Course[] }> => {
    const response = await api.get(`/courses?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
    return response.data;
  },

  getCourseById: async (courseId: string): Promise<Course> => {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },

  markAsCompleted: async (courseId: string): Promise<any> => {
    const response = await api.patch(`/courses/${courseId}`, { status: 'completed' });
    return response.data;
  },
};

export interface CreateSubmissionData {
  homeworkId: string;
  studentId: string;
  studentName: string;
  textContent?: string;
  fileUrl?: string;
  fileName?: string;
}

export const submissionAPI = {
  create: async (data: CreateSubmissionData): Promise<{ success: boolean; data: Submission }> => {
    const response = await api.post('/submissions', data);
    return response.data;
  },

  getByHomeworkAndStudent: async (homeworkId: string, studentId: string): Promise<{ success: boolean; data: Submission | null }> => {
    const response = await api.get(`/submissions/homework/${homeworkId}/student/${studentId}`);
    return response.data;
  },

  getByHomework: async (homeworkId: string): Promise<{ success: boolean; data: Submission[] }> => {
    const response = await api.get(`/submissions/homework/${homeworkId}`);
    return response.data;
  },

  getByStudent: async (studentId: string): Promise<{ success: boolean; data: Submission[] }> => {
    const response = await api.get(`/submissions/student/${studentId}`);
    return response.data;
  },

  update: async (id: string, data: { textContent?: string; fileUrl?: string; fileName?: string }): Promise<{ success: boolean; data: Submission }> => {
    const response = await api.patch(`/submissions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/submissions/${id}`);
    return response.data;
  },
};

export interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  answers: {
    questionIndex: number;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
    maxMarks: number;
  }[];
  totalScore: number;
  totalMarks: number;
  percentage: number;
  submittedAt: any;
}

export interface CreateQuizResultData {
  quizId: string;
  studentId: string;
  studentName: string;
  answers: QuizAnswer[];
}

export const quizResultAPI = {
  submit: async (data: CreateQuizResultData): Promise<{ success: boolean; data: QuizResult }> => {
    const response = await api.post('/quiz-results', data);
    return response.data;
  },

  getByQuizAndStudent: async (quizId: string, studentId: string): Promise<{ success: boolean; data: QuizResult | null }> => {
    const response = await api.get(`/quiz-results/quiz/${quizId}/student/${studentId}`);
    return response.data;
  },

  getByStudent: async (studentId: string): Promise<{ success: boolean; data: QuizResult[] }> => {
    const response = await api.get(`/quiz-results/student/${studentId}`);
    return response.data;
  },

  getByQuiz: async (quizId: string): Promise<{ success: boolean; data: QuizResult[] }> => {
    const response = await api.get(`/quiz-results/quiz/${quizId}`);
    return response.data;
  },
};

export const studentsAPI = {
  getProfile: async (studentId: string): Promise<any> => {
    const response = await api.get(`/students/${studentId}`);
    return response.data;
  },
};

export const aiAPI = {
  chat: async (studentId: string, message: string, imageUri?: string): Promise<{ response: string }> => {
    const formData = new FormData();
    formData.append('message', message);

    if (imageUri) {
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }

    const response = await api.post(`/ai/chat/${studentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
