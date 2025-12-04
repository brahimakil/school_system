import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const chatAPI = {
  // Get teacher's chat rooms
  getTeacherRooms: async (teacherId: string) => {
    const response = await axios.get(`${API_URL}/chat/rooms/teacher/${teacherId}`);
    return response.data;
  },

  // Get student's chat rooms
  getStudentRooms: async (studentId: string) => {
    const response = await axios.get(`${API_URL}/chat/rooms/student/${studentId}`);
    return response.data;
  },

  // Get messages for a room
  getRoomMessages: async (roomId: string, limit = 100) => {
    const response = await axios.get(`${API_URL}/chat/rooms/${roomId}/messages`, {
      params: { limit },
    });
    return response.data;
  },

  // Send a message
  sendMessage: async (data: {
    roomId: string;
    senderId: string;
    senderName: string;
    senderType: 'teacher' | 'student';
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'document';
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => {
    const response = await axios.post(`${API_URL}/chat/messages`, data);
    return response.data;
  },

  // Toggle chat room status
  toggleChatStatus: async (roomId: string, isActive: boolean) => {
    const response = await axios.patch(`${API_URL}/chat/rooms/${roomId}/status`, {
      isActive,
    });
    return response.data;
  },

  // Upload file
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/chat/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Initialize student chat rooms
  initializeStudentRooms: async (teacherId: string) => {
    const response = await axios.post(`${API_URL}/chat/rooms/initialize`, {
      teacherId,
    });
    return response.data;
  },

  // Initialize class chat rooms
  initializeClassRooms: async (teacherId: string) => {
    const response = await axios.post(`${API_URL}/classes/initialize-chat-rooms`, {
      teacherId,
    });
    return response.data;
  },
};
