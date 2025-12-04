import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import type { ChatRoom } from '../types/chat.types';
import ChatRoomList from './ChatRoomList';
import socketService from '../services/socket';
import './ChatSidebar.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch teacher's chat rooms
      fetchChatRooms();

      // Socket listeners
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('room-list-updated', fetchChatRooms);
        socket.on('new-message', handleNewMessage);
      }

      return () => {
        if (socket) {
          socket.off('room-list-updated', fetchChatRooms);
          socket.off('new-message', handleNewMessage);
        }
      };
    }
  }, [isOpen]);

  const fetchChatRooms = async () => {
    try {
      socketService.emit('get-teacher-rooms', {});
      socketService.on('teacher-rooms', (data: ChatRoom[]) => {
        setRooms(data);
      });
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
    }
  };

  const handleNewMessage = (data: any) => {
    // Update unread count for rooms
    setRooms(prev =>
      prev.map(room =>
        room.id === data.roomId && room.id !== selectedRoom?.id
          ? { ...room, unreadCount: (room.unreadCount || 0) + 1, lastMessage: data.message, lastMessageTime: new Date() }
          : room
      )
    );
  };

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    // Join room
    socketService.emit('join-room', { roomId: room.id });
    // Clear unread count
    setRooms(prev =>
      prev.map(r => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  };

  const handleToggleRoomStatus = (roomId: string, isActive: boolean) => {
    socketService.emit('toggle-chat-status', { roomId, isActive });
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId ? { ...room, isActive } : room
      )
    );
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
