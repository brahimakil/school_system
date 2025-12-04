import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface GradeSection {
  grade: string;
  section: string;
}

export interface Class {
  id?: string;
  className: string;
  teacherId: string;
  teacherName?: string;
  gradeSections: GradeSection[];
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  studentIds?: string[];
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassData {
  className: string;
  teacherId: string;
  gradeSections: GradeSection[];
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface UpdateClassData {
  className?: string;
  teacherId?: string;
  gradeSections?: GradeSection[];
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

export const getAllClasses = async (): Promise<Class[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data?.data || response.data || [];
};

export const getClassById = async (id: string): Promise<Class> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/classes/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data?.data || response.data;
};

export const getClassStudents = async (id: string): Promise<any[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/classes/${id}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data?.data || response.data || [];
};

export const createClass = async (classData: CreateClassData): Promise<Class> => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/classes`, {
    ...classData,
    gradeSections: JSON.stringify(classData.gradeSections),
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const updateClass = async (id: string, classData: UpdateClassData): Promise<Class> => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/classes/${id}`, {
    ...classData,
    gradeSections: classData.gradeSections ? JSON.stringify(classData.gradeSections) : undefined,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const deleteClass = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/classes/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
