import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ChatRoom, Message } from '../types/chat.types';
import MediaPreview from './MediaPreview';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { chatAPI } from '../services/chatApi';
import './ChatWindow.css';

interface ChatWindowProps {
  room: ChatRoom;
  onBack: () => void;
  onToggleStatus: (roomId: string, isActive: boolean) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ room, onBack, onToggleStatus }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom>(room);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video'; fileName?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentRoom(room);
    setLoading(true);

    // Real-time listener for messages in this room
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', room.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: Message[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          roomId: data.roomId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderType: data.senderType,
          content: data.content,
          messageType: data.messageType || 'text',
          mediaUrl: data.mediaUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      }

      setMessages(messagesData);
      setLoading(false);
    });

    // Real-time listener for room status changes
    const roomQuery = query(
      collection(db, 'chatRooms'),
      where('__name__', '==', room.id)
    );

    const unsubscribeRoom = onSnapshot(roomQuery, (snapshot) => {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        setCurrentRoom(prev => ({ ...prev, isActive: data.isActive ?? true }));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeRoom();
    };
  }, [room.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id) return;

    try {
      await chatAPI.sendMessage({
        roomId: room.id,
        content: newMessage.trim(),
        senderId: user.id,
        senderName: user.name || 'Teacher',
        senderType: 'teacher',
        messageType: 'text',
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    try {
      const uploadData = await chatAPI.uploadFile(file);

      // Send message with media
      await chatAPI.sendMessage({
        roomId: room.id,
        content: uploadData.fileName,
        senderId: user.id,
        senderName: user.name || 'Teacher',
        senderType: 'teacher',
        messageType: uploadData.messageType,
        mediaUrl: uploadData.url,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
      });
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = msg.timestamp.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="chat-room-info">
          <h3>{currentRoom.name}</h3>
          <span className={`room-status ${currentRoom.isActive ? 'active' : 'inactive'}`}>
            {currentRoom.isActive ? 'Chat Open' : 'Chat Closed'}
          </span>
        </div>
        {currentRoom.type === 'class' && (
          <button
            className={`toggle-chat-btn ${currentRoom.isActive ? 'active' : 'inactive'}`}
            onClick={() => onToggleStatus(currentRoom.id, !currentRoom.isActive)}
            title={currentRoom.isActive ? 'Close chat' : 'Open chat'}
          >
            {currentRoom.isActive ? 'Close' : 'Open'}
          </button>
        )}
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="loading-state">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="empty-chat-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          <>
            {Object.keys(messageGroups).map(dateKey => (
              <div key={dateKey}>
                <div className="date-separator">
                  <span>{formatDate(new Date(dateKey))}</span>
                </div>
                {messageGroups[dateKey].map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderType === 'teacher' ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      {msg.senderType === 'student' && (
                        <span className="message-sender">{msg.senderName}</span>
                      )}
                      <div className="message-bubble">
                        {msg.messageType === 'image' && msg.mediaUrl && (
                          <div className="message-media">
                            <img 
                              src={msg.mediaUrl} 
                              alt={msg.fileName} 
                              style={{ maxWidth: '300px', borderRadius: '8px', cursor: 'pointer' }} 
                              onClick={() => setPreviewMedia({ url: msg.mediaUrl!, type: 'image', fileName: msg.fileName })}
                            />
                          </div>
                        )}
                        {msg.messageType === 'video' && msg.mediaUrl && (
                          <div className="message-media">
                            <video 
                              controls 
                              style={{ maxWidth: '300px', borderRadius: '8px', cursor: 'pointer' }}
                              onClick={(e) => {
                                if (e.currentTarget.paused) {
                                  e.currentTarget.play();
                                } else {
                                  e.stopPropagation();
                                  setPreviewMedia({ url: msg.mediaUrl!, type: 'video', fileName: msg.fileName });
                                }
                              }}
                            >
                              <source src={msg.mediaUrl} />
                            </video>
                          </div>
                        )}
                        {msg.messageType === 'document' && msg.mediaUrl && (
                          <div className="message-media message-document" style={{ cursor: 'pointer' }} onClick={() => window.open(msg.mediaUrl, '_blank')}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }}>
                              <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div>
                              <span style={{ color: 'inherit', textDecoration: 'none' }}>
                                {msg.fileName}
                              </span>
                              {msg.fileSize && <span style={{ fontSize: '12px', opacity: 0.7 }}> ({formatFileSize(msg.fileSize)})</span>}
                            </div>
                          </div>
                        )}
                        {msg.messageType === 'text' && <p>{msg.content}</p>}
                        <span className="message-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!currentRoom.isActive || uploading}
          className="attach-btn"
          title="Attach media"
          style={{ fontSize: '22px', lineHeight: 1 }}
        >
          🖼️
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={uploading ? "Uploading..." : currentRoom.isActive ? "Type a message..." : "Chat is closed"}
          disabled={!currentRoom.isActive || uploading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !currentRoom.isActive || uploading}
          className="send-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      {previewMedia && (
        <MediaPreview
          mediaUrl={previewMedia.url}
          mediaType={previewMedia.type}
          fileName={previewMedia.fileName}
          onClose={() => setPreviewMedia(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
