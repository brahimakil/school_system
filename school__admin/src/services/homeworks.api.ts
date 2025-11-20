import api from './api';

export interface Homework {
  id: string;
  classId: string;
  className: string;
  gradeSections: string[];
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'active' | 'completed' | 'past_due';
  createdAt?: any;
  updatedAt?: any;
}

export interface CreateHomeworkDto {
  classId: string;
  className: string;
  gradeSections: string[];
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'active' | 'completed' | 'past_due';
}

export interface UpdateHomeworkDto extends Partial<CreateHomeworkDto> {}

export const getAllHomeworks = async (): Promise<Homework[]> => {
  const response = await api.get('/homeworks');
  return response.data;
};

export const getHomeworkById = async (id: string): Promise<Homework> => {
  const response = await api.get(`/homeworks/${id}`);
  return response.data;
};

export const getHomeworksByClass = async (classId: string): Promise<Homework[]> => {
  const response = await api.get(`/homeworks/class/${classId}`);
  return response.data;
};

export const createHomework = async (data: CreateHomeworkDto): Promise<Homework> => {
  const response = await api.post('/homeworks', data);
  return response.data;
};

export const updateHomework = async (id: string, data: UpdateHomeworkDto): Promise<Homework> => {
  const response = await api.patch(`/homeworks/${id}`, data);
  return response.data;
};

export const deleteHomework = async (id: string): Promise<void> => {
  await api.delete(`/homeworks/${id}`);
};
