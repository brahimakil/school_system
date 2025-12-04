import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import type { ChatRoom } from '../types/chat.types';
import socketService from '../services/socket';
import './Chat.css';

type TabType = 'all' | 'students' | 'classes';

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const handleChatStatusChanged = (data: { roomId: string; isActive: boolean }) => {
    console.log('Chat status changed event:', data);
    setRooms(prev =>
      prev.map(room =>
        room.id === data.roomId ? { ...room, isActive: data.isActive } : room
      )
    );
    
    // Update selected room if it's the one that changed
    if (selectedRoom && selectedRoom.id === data.roomId) {
      setSelectedRoom(prev => prev ? { ...prev, isActive: data.isActive } : null);
    }
  };

  const handleNewMessage = (data: any) => {
    console.log('New message received in Chat page:', data);
    setRooms(prev =>
      prev.map(room =>
        room.id === data.roomId
          ? { 
              ...room, 
              unreadCount: room.id === selectedRoom?.id ? 0 : (room.unreadCount || 0) + 1, 
              lastMessage: data.content, 
              lastMessageTime: new Date(data.timestamp) 
            }
          : room
      )
    );
  };

  const initializeChatRooms = async () => {
    setInitializing(true);
    try {
      const response = await fetch('http://localhost:3000/classes/initialize-chat-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      console.log('Initialize class rooms result:', result);
      
      // Refresh rooms
      socketService.emit('get-teacher-rooms', { teacherId: user?.id });
    } catch (error) {
      console.error('Failed to initialize chat rooms:', error);
    } finally {
      setInitializing(false);
    }
  };

  const initializeStudentRooms = async () => {
    setInitializing(true);
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('initialize-student-rooms', { teacherId: user?.id });
        socket.once('student-rooms-initialized', (result: { created: number; existing: number }) => {
          console.log('Student rooms initialized:', result);
          setInitializing(false);
        });
      }
    } catch (error) {
      console.error('Failed to initialize student rooms:', error);
      setInitializing(false);
    }
  };

  useEffect(() => {
    const socket = socketService.getSocket();
    
    console.log('Current user:', user);
    
    const handleTeacherRooms = (data: ChatRoom[]) => {
      console.log('Received teacher rooms:', data);
      setRooms(data);
      setLoading(false);
    };

    if (socket) {
      socket.on('teacher-rooms', handleTeacherRooms);
      socket.on('room-list-updated', () => {
        socketService.emit('get-teacher-rooms', { teacherId: user?.id });
      });
      socket.on('new-message', handleNewMessage);
      socket.on('chat-status-changed', handleChatStatusChanged);
      
      // Request rooms with teacher ID
      console.log('Requesting rooms for teacher:', user?.id);
      socketService.emit('get-teacher-rooms', { teacherId: user?.id });
    } else {
      console.error('Socket not connected');
      setLoading(false);
    }

    return () => {
      if (socket) {
        socket.off('teacher-rooms', handleTeacherRooms);
        socket.off('room-list-updated');
        socket.off('new-message', handleNewMessage);
        socket.off('chat-status-changed', handleChatStatusChanged);
      }
    };
  }, [user]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    socketService.emit('join-room', { roomId: room.id });
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

  const getFilteredRooms = () => {
    if (activeTab === 'all') {
      return rooms;
    } else if (activeTab === 'students') {
      return rooms.filter(r => r.type === 'private');
    } else {
      return rooms.filter(r => r.type === 'class');
    }
  };

  const filteredRooms = getFilteredRooms();

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="chat-page">
      {/* Left Panel */}
      <div className={`chat-list-panel ${selectedRoom ? 'hidden-mobile' : ''}`}>
        <div className="chat-list-header">
          <h2>Messages</h2>
        </div>

        {/* Tabs */}
        <div className="chat-tabs">
          <button
            className={`chat-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Chats
          </button>
          <button
            className={`chat-tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button
            className={`chat-tab ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes
          </button>
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {loading ? (
            <div className="chat-loading">
              <div className="spinner"></div>
              <p>Loading chats...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="chat-empty">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No conversations yet</p>
              <span>
                {activeTab === 'all' && 'Your chats will appear here'}
                {activeTab === 'students' && 'No student chats yet. Click below to create chats with your students.'}
                {activeTab === 'classes' && 'No class chats yet. Click below to create group chats for your classes.'}
              </span>
              <div style={{marginTop: '16px', fontSize: '12px', color: '#94a3b8'}}>
                Total rooms loaded: {rooms.length}
              </div>
              {activeTab === 'classes' && (
                <button 
                  onClick={initializeChatRooms} 
                  disabled={initializing}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: initializing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {initializing ? 'Creating...' : 'Create Class Chats'}
                </button>
              )}
              {activeTab === 'students' && (
                <button 
                  onClick={initializeStudentRooms} 
                  disabled={initializing}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: initializing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {initializing ? 'Creating...' : 'Create Student Chats'}
                </button>
              )}
              {activeTab === 'all' && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <button 
                    onClick={initializeChatRooms} 
                    disabled={initializing}
                    style={{
                      padding: '8px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: initializing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {initializing ? 'Creating...' : 'Create Class Chats'}
                  </button>
                  <button 
                    onClick={initializeStudentRooms} 
                    disabled={initializing}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: initializing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {initializing ? 'Creating...' : 'Create Student Chats'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredRooms.map(room => (
              <div
                key={room.id}
                className={`chat-list-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => handleRoomSelect(room)}
              >
                <div className="chat-item-avatar">
                  {room.type === 'class' ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{room.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-top">
                    <h4>{room.name}</h4>
                    {room.lastMessageTime && (
                      <span className="chat-item-time">{formatTime(room.lastMessageTime)}</span>
                    )}
                  </div>
                  <div className="chat-item-bottom">
                    <p className="chat-item-message">
                      {room.lastMessage || 'No messages yet'}
                    </p>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <span className="chat-item-badge">{room.unreadCount}</span>
                    )}
                  </div>
                  {room.type === 'class' && (
                    <div className="chat-item-status">
                      <span className={`status-indicator ${room.isActive ? 'active' : 'inactive'}`}>
                        {room.isActive ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className={`chat-window-panel ${selectedRoom ? 'active' : ''}`}>
        {selectedRoom ? (
          <ChatWindow
            room={selectedRoom}
            onBack={handleBack}
            onToggleStatus={handleToggleRoomStatus}
          />
        ) : (
          <div className="chat-placeholder">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
