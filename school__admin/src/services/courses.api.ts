import api from './api';

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

export interface CreateCourseDto {
  classId: string;
  className: string;
  gradeSections: string[];
  subject: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'overdue';
  attachmentUrl?: string;
  attachmentType?: 'video' | 'pdf' | 'image' | 'other';
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {}

export const getAllCourses = async (): Promise<Course[]> => {
  const response = await api.get('/courses');
  return response.data?.data || response.data || [];
};

export const getCourseById = async (id: string): Promise<Course> => {
  const response = await api.get(`/courses/${id}`);
  return response.data?.data || response.data;
};

export const getCoursesByClass = async (classId: string): Promise<Course[]> => {
  const response = await api.get(`/courses/class/${classId}`);
  return response.data?.data || response.data || [];
};

export const createCourse = async (data: CreateCourseDto | FormData): Promise<Course> => {
  const response = await api.post('/courses', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  });
  return response.data?.data || response.data;
};

export const updateCourse = async (id: string, data: UpdateCourseDto | FormData): Promise<Course> => {
  const response = await api.patch(`/courses/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  });
  return response.data?.data || response.data;
};

export const deleteCourse = async (id: string): Promise<void> => {
  await api.delete(`/courses/${id}`);
};
