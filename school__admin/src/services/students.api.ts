import api from './api';

export const studentsAPI = {
  getAll: async () => {
    const response = await api.get('/students');
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/students', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/students/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },
};
