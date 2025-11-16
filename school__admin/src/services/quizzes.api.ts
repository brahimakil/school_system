import api from './api';

export interface QuizQuestion {
  question: string;
  answers: string[]; // Array of 4 answers [A, B, C, D]
  correctAnswer: string; // 'A', 'B', 'C', or 'D'
  marks: number;
}

export interface Quiz {
  id?: string;
  classId: string;
  className: string;
  gradeSections: string[]; // Array of "Grade X - Section Y"
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  quizDurationMinutes: number;
  questions: QuizQuestion[];
  totalMarks: number;
  status: 'pending' | 'available' | 'completed' | 'cancelled';
  createdAt?: any;
  updatedAt?: any;
}

export const getAllQuizzes = async (): Promise<Quiz[]> => {
  const response = await api.get('/quizzes');
  return response.data;
};

export const getQuizById = async (id: string): Promise<Quiz> => {
  const response = await api.get(`/quizzes/${id}`);
  return response.data;
};

export const getQuizzesByClass = async (classId: string): Promise<Quiz[]> => {
  const response = await api.get(`/quizzes/class/${classId}`);
  return response.data;
};

export const createQuiz = async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'totalMarks'>): Promise<Quiz> => {
  const response = await api.post('/quizzes', quiz);
  return response.data;
};

export const updateQuiz = async (id: string, quiz: Partial<Quiz>): Promise<Quiz> => {
  const response = await api.put(`/quizzes/${id}`, quiz);
  return response.data;
};

export const updateQuizStatus = async (id: string, status: Quiz['status']): Promise<Quiz> => {
  const response = await api.patch(`/quizzes/${id}/status`, { status });
  return response.data;
};

export const deleteQuiz = async (id: string): Promise<void> => {
  await api.delete(`/quizzes/${id}`);
};
