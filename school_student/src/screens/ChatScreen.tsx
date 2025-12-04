import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import io, { Socket } from 'socket.io-client';

// Production backend URL
const API_URL = 'https://school-system-34gn.vercel.app';

interface ChatRoom {
  id: string;
  name: string;
  type: 'class' | 'private';
  classId?: string;
  teacherId?: string;
  isActive: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'teacher' | 'student';
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  fileName?: string;
  timestamp: Date;
}

const ChatScreen: React.FC = () => {
  const { student } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  // Update ref when room changes
  useEffect(() => {
    currentRoomIdRef.current = selectedRoom?.id || null;
  }, [selectedRoom]);

  useEffect(() => {
    console.log('ChatScreen: Current student data:', student);
    const token = student?.uid || 'student-token';
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: false,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      console.log('Emitting get-student-rooms with studentId:', student?.uid);
      newSocket.emit('get-student-rooms', { studentId: student?.uid });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setLoading(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('student-rooms', (data: ChatRoom[]) => {
      console.log('Received rooms:', data);
      // Parse date strings to Date objects and ensure proper types
      const parsedRooms = data.map(room => ({
        ...room,
        lastMessage: room.lastMessage ? String(room.lastMessage) : undefined,
        lastMessageTime: room.lastMessageTime ? new Date(room.lastMessageTime) : undefined,
        unreadCount: room.unreadCount ? Number(room.unreadCount) : undefined,
      }));
      setRooms(parsedRooms);
      setLoading(false);
      clearTimeout(timeout); // Clear timeout once we get rooms
    });

    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
      setLoading(false);
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      console.log('Timeout: No response from server after 10 seconds');
      setLoading(false);
    }, 10000);

    newSocket.on('new-message', (data: any) => {
      console.log('New message received:', data);
      // Check if message is for current room using ref
      if (currentRoomIdRef.current === data.roomId) {
        setMessages((prev) => [...prev, { ...data, timestamp: new Date(data.timestamp) }]);
      }
      
      // Update room's last message
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId
            ? {
                ...room,
                lastMessage: String(data.content || ''),
                lastMessageTime: new Date(data.timestamp),
                unreadCount: currentRoomIdRef.current === data.roomId ? 0 : (room.unreadCount || 0) + 1,
              }
            : room
        )
      );
    });

    newSocket.on('message-history', (data: Message[]) => {
      setMessages(data.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
    });

    newSocket.on('chat-status-changed', (data: { roomId: string; isActive: boolean }) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId ? { ...room, isActive: data.isActive } : room
        )
      );
      if (selectedRoom?.id === data.roomId) {
        setSelectedRoom((prev) => prev ? { ...prev, isActive: data.isActive } : null);
      }
    });

    setSocket(newSocket);

    return () => {
      clearTimeout(timeout);
      newSocket.disconnect();
    };
  }, [student?.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages([]);
    if (socket) {
      socket.emit('join-room', { roomId: room.id });
      socket.emit('get-messages', { roomId: room.id });
    }
    // Clear unread count
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size && file.size > maxSize) {
        Alert.alert('File too large', 'Please select a file smaller than 10MB');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      
      // For React Native, create proper file object
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name,
      } as any);

      const uploadResponse = await fetch('http://192.168.0.103:3000/chat/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.url && socket) {
        socket.emit('send-message', {
          roomId: selectedRoom?.id,
          content: file.name,
          senderId: student?.uid,
          senderName: student?.fullName,
          senderType: 'student',
          messageType: uploadResult.messageType,
          mediaUrl: uploadResult.url,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
        });
      } else {
        Alert.alert('Upload failed', 'Could not upload file');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Upload failed', 'Could not upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRoom || !socket) return;

    setSending(true);
    socket.emit('send-message', {
      roomId: selectedRoom.id,
      content: newMessage.trim(),
      senderId: student?.uid,
      senderName: student?.fullName,
      senderType: 'student',
      messageType: 'text',
    });

    setNewMessage('');
    setSending(false);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderType === 'student' && item.senderId === student?.uid;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{String(item.senderName || '')}</Text>
        )}
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          {item.messageType === 'image' && item.mediaUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(item.mediaUrl!)}>
              <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          {item.messageType === 'document' && item.mediaUrl && (
            <TouchableOpacity
              style={styles.documentContainer}
              onPress={() => Linking.openURL(item.mediaUrl!)}
            >
              <Ionicons name="document-text" size={24} color="#6366f1" />
              <Text style={styles.documentName}>{String(item.fileName || 'Document')}</Text>
            </TouchableOpacity>
          )}
          {item.messageType === 'text' && (
            <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
              {String(item.content || '')}
            </Text>
          )}
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => {
    return (
    <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomSelect(item)}>
      <View style={styles.roomAvatar}>
        <Ionicons name={item.type === 'class' ? 'people' : 'person'} size={24} color="#fff" />
      </View>
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName}>{String(item.name || '')}</Text>
          <Text style={styles.roomTime}>{formatDate(item.lastMessageTime)}</Text>
        </View>
        <View style={styles.roomFooter}>
          <Text style={styles.roomLastMessage} numberOfLines={1}>
            {String(item.lastMessage || 'No messages yet')}
          </Text>
          {(item.unreadCount ?? 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{String(item.unreadCount)}</Text>
            </View>
          )}
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.statusText, { color: item.isActive ? '#22c55e' : '#ef4444' }]}>
            {item.isActive ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  if (selectedRoom) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior='padding'
        keyboardVerticalOffset={90}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedRoom(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>{selectedRoom?.name || ''}</Text>
            <Text style={styles.chatHeaderStatus}>
              {selectedRoom?.isActive ? '🟢 Chat Open' : '🔴 Chat Closed'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {selectedRoom?.isActive ? (
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleFileSelect}
              disabled={uploading}
            >
              <Ionicons name="attach" size={24} color={uploading ? "#cbd5e1" : "#6366f1"} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedChatBanner}>
            <Ionicons name="lock-closed" size={20} color="#ef4444" />
            <Text style={styles.closedChatText}>This chat is currently closed by the teacher</Text>
          </View>
        )}
      </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Your class chats will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.roomsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  roomsList: {
    padding: 12,
  },
  roomItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  roomTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomLastMessage: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatHeader: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#e0e7ff',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#e0e7ff',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#94a3b8',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    fontSize: 14,
    color: '#6366f1',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  closedChatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  closedChatText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});

export default ChatScreen;
