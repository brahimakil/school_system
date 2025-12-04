import React from 'react';
import type { ChatRoom } from '../types/chat.types';
import './ChatRoomList.css';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  onSelectRoom: (room: ChatRoom) => void;
  onToggleRoomStatus: (roomId: string, isActive: boolean) => void;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ rooms, onSelectRoom, onToggleRoomStatus }) => {
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

  const classRooms = rooms.filter(r => r.type === 'class');
  const privateRooms = rooms.filter(r => r.type === 'private');

  return (
    <div className="chat-room-list">
      {classRooms.length > 0 && (
        <div className="room-section">
          <h3 className="room-section-title">Class Chats</h3>
          {classRooms.map(room => (
            <div key={room.id} className="room-item">
              <div className="room-item-main" onClick={() => onSelectRoom(room)}>
                <div className="room-avatar">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="room-info">
                  <div className="room-name-row">
                    <span className="room-name">{room.name}</span>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <span className="unread-badge">{room.unreadCount}</span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <div className="room-last-message">
                      <span className="last-message-text">{room.lastMessage}</span>
                      <span className="last-message-time">{formatTime(room.lastMessageTime)}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                className={`room-toggle ${room.isActive ? 'active' : 'inactive'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRoomStatus(room.id, !room.isActive);
                }}
                title={room.isActive ? 'Close chat' : 'Open chat'}
              >
                {room.isActive ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {privateRooms.length > 0 && (
        <div className="room-section">
          <h3 className="room-section-title">Private Messages</h3>
          {privateRooms.map(room => (
            <div key={room.id} className="room-item" onClick={() => onSelectRoom(room)}>
              <div className="room-avatar room-avatar-private">
                {room.name.charAt(0).toUpperCase()}
              </div>
              <div className="room-info">
                <div className="room-name-row">
                  <span className="room-name">{room.name}</span>
                  {room.unreadCount && room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount}</span>
                  )}
                </div>
                {room.lastMessage && (
                  <div className="room-last-message">
                    <span className="last-message-text">{room.lastMessage}</span>
                    <span className="last-message-time">{formatTime(room.lastMessageTime)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rooms.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>No conversations yet</p>
          <span>Your class chats will appear here</span>
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;
