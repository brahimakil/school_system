const API_URL = 'http://localhost:3000';

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
    const response = await fetch(`${API_URL}/subjects`);
    if (!response.ok) throw new Error('Failed to fetch subjects');
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  },

  getById: async (id: string): Promise<Subject> => {
    const response = await fetch(`${API_URL}/subjects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch subject');
    return response.json();
  },

  create: async (data: CreateSubjectData): Promise<Subject> => {
    const response = await fetch(`${API_URL}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subject');
    return response.json();
  },

  update: async (id: string, data: UpdateSubjectData): Promise<Subject> => {
    const response = await fetch(`${API_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subject');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/subjects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete subject');
  },
};
