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
    totalMarks?: number;
    attachmentUrl?: string;
    attachmentType?: 'video' | 'pdf' | 'image' | 'other';
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
    totalMarks?: number;
    attachmentUrl?: string;
    attachmentType?: 'video' | 'pdf' | 'image' | 'other';
}

export interface UpdateHomeworkDto extends Partial<CreateHomeworkDto> { }

export const getAllHomeworks = async (): Promise<Homework[]> => {
    const response = await api.get('/homeworks');
    return response.data?.data || response.data || [];
};

export const getHomeworkById = async (id: string): Promise<Homework> => {
    const response = await api.get(`/homeworks/${id}`);
    return response.data?.data || response.data;
};

export const getHomeworksByClass = async (classId: string): Promise<Homework[]> => {
    const response = await api.get(`/homeworks/class/${classId}`);
    return response.data?.data || response.data || [];
};

export const createHomework = async (data: CreateHomeworkDto | FormData): Promise<Homework> => {
    const response = await api.post('/homeworks', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return response.data?.data || response.data;
};

export const updateHomework = async (id: string, data: UpdateHomeworkDto | FormData): Promise<Homework> => {
    const response = await api.patch(`/homeworks/${id}`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return response.data?.data || response.data;
};

export const deleteHomework = async (id: string): Promise<void> => {
    await api.delete(`/homeworks/${id}`);
};
