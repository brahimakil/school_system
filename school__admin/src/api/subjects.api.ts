import api from '../services/api';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectData {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubjectData {
  name?: string;
  code?: string;
  description?: string;
}

export const subjectsAPI = {
  getAll: async (): Promise<Subject[]> => {
    const response = await api.get('/subjects');
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  getById: async (id: string): Promise<Subject> => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  create: async (data: CreateSubjectData): Promise<Subject> => {
    const response = await api.post('/subjects', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSubjectData): Promise<Subject> => {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subjects/${id}`);
  },
};
