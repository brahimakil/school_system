import api from './api';

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

export const getAllClasses = async (): Promise<Class[]> => {
    const response = await api.get('/classes');
    return response.data?.data || response.data || [];
};

export const getClassById = async (id: string): Promise<Class> => {
    const response = await api.get(`/classes/${id}`);
    return response.data?.data || response.data;
};

export const getClassStudents = async (id: string): Promise<any[]> => {
    const response = await api.get(`/classes/${id}/students`);
    return response.data?.data || response.data || [];
};
