import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatWindow from './ChatWindow';
import type { ChatRoom } from '../types/chat.types';
import ChatRoomList from './ChatRoomList';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { chatAPI } from '../services/chatApi';
import './ChatSidebar.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    // Real-time listener for teacher's chat rooms
    const q = query(
      collection(db, 'chatRooms'),
      where('teacherId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomsData: ChatRoom[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        roomsData.push({
          id: doc.id,
          name: data.name || '',
          type: data.type,
          classId: data.classId,
          teacherId: data.teacherId,
          studentId: data.studentId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate(),
          unreadCount: data.unreadCount || 0,
        } as ChatRoom);
      }

      // Sort by last message time
      roomsData.sort((a, b) => {
        const aTime = a.lastMessageTime?.getTime() || 0;
        const bTime = b.lastMessageTime?.getTime() || 0;
        return bTime - aTime;
      });

      setRooms(roomsData);
    });

    return () => unsubscribe();
  }, [isOpen, user?.id]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
  };

  const handleToggleRoomStatus = async (roomId: string, isActive: boolean) => {
    try {
      await chatAPI.toggleChatStatus(roomId, isActive);
      // Status change will be reflected by Firestore listener
    } catch (error) {
      console.error('Error toggling chat status:', error);
    }
  };

  const handleBack = () => {
    setSelectedRoom(null);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <div className="chat-header-title">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2>Messages</h2>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="chat-sidebar-content">
        {selectedRoom ? (
          <ChatWindow
            room={selectedRoom}
            onBack={handleBack}
            onToggleStatus={handleToggleRoomStatus}
          />
        ) : (
          <ChatRoomList
            rooms={rooms}
            onSelectRoom={handleRoomSelect}
            onToggleRoomStatus={handleToggleRoomStatus}
          />
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
