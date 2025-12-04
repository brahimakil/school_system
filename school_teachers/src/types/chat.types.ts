export interface ChatRoom {
  id: string;
  name: string;
  type: 'class' | 'private';
  classId?: string;
  studentId?: string;
  isActive?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'teacher' | 'student';
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
}