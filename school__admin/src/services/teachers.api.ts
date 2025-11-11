import api from './api';

export const teachersAPI = {
  getAll: async () => {
    const response = await api.get('/teachers');
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/teachers', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/teachers/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post(`/teachers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
