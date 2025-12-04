import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Socket> = new Map();

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const token = client.handshake.auth.token;
    
    if (token) {
      // Store user socket mapping
      // In production, verify the token and extract userId
      this.userSockets.set(client.id, client);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.userSockets.delete(client.id);
  }

  @SubscribeMessage('get-teacher-rooms')
  async handleGetTeacherRooms(
    @MessageBody() data: { teacherId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // In production, extract teacherId from authenticated token
      const teacherId = data.teacherId || 'mock-teacher-id';
      const rooms = await this.chatService.getTeacherRooms(teacherId);
      client.emit('teacher-rooms', rooms);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch rooms' });
    }
  }

  @SubscribeMessage('get-student-rooms')
  async handleGetStudentRooms(
    @MessageBody() data: { studentId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('GATEWAY: Received get-student-rooms event with data:', data);
      // In production, extract studentId from authenticated token
      const studentId = data.studentId || 'mock-student-id';
      console.log('GATEWAY: Fetching rooms for studentId:', studentId);
      const rooms = await this.chatService.getStudentRooms(studentId);
      console.log('GATEWAY: Emitting student-rooms with', rooms.length, 'rooms');
      client.emit('student-rooms', rooms);
    } catch (error) {
      console.error('Error fetching student rooms:', error);
      client.emit('error', { message: 'Failed to fetch rooms' });
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await client.join(data.roomId);
      console.log(`Client ${client.id} joined room ${data.roomId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await client.leave(data.roomId);
      console.log(`Client ${client.id} left room ${data.roomId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('get-messages')
  async handleGetMessages(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const messages = await this.chatService.getMessages(data.roomId);
      client.emit('message-history', messages);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch messages' });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { 
      roomId: string; 
      content: string; 
      senderId?: string; 
      senderName?: string; 
      senderType?: 'teacher' | 'student';
      messageType?: 'text' | 'image' | 'video' | 'document';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // In production, extract user info from authenticated token
      const senderId = data.senderId || 'mock-user-id';
      const senderName = data.senderName || 'User';
      const senderType = data.senderType || 'teacher';

      const message = await this.chatService.sendMessage(
        data.roomId,
        senderId,
        senderName,
        senderType,
        data.content,
        data.messageType,
        data.mediaUrl,
        data.fileName,
        data.fileSize,
      );

      // Broadcast message to all users in the room (including the sender)
      this.server.to(data.roomId).emit('new-message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('toggle-chat-status')
  async handleToggleChatStatus(
    @MessageBody() data: { roomId: string; isActive: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.toggleChatStatus(data.roomId, data.isActive);
      
      // Broadcast status change to all connected clients
      this.server.emit('chat-status-changed', {
        roomId: data.roomId,
        isActive: data.isActive,
      });
      
      console.log(`Chat status changed for room ${data.roomId}: ${data.isActive}`);
    } catch (error) {
      console.error('Error toggling chat status:', error);
      client.emit('error', { message: 'Failed to toggle chat status' });
    }
  }

  @SubscribeMessage('initialize-student-rooms')
  async handleInitializeStudentRooms(
    @MessageBody() data: { teacherId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chatService.initializeStudentChatRooms(data.teacherId);
      client.emit('student-rooms-initialized', result);
      
      // Refresh the room list
      const rooms = await this.chatService.getTeacherRooms(data.teacherId);
      client.emit('teacher-rooms', rooms);
    } catch (error) {
      console.error('Error initializing student rooms:', error);
      client.emit('error', { message: 'Failed to initialize student rooms' });
    }
  }
}
