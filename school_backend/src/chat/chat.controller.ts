import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as admin from 'firebase-admin';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    private readonly chatService: ChatService,
  ) {}

  // Get teacher's chat rooms
  @Get('rooms/teacher/:teacherId')
  async getTeacherRooms(@Param('teacherId') teacherId: string) {
    const rooms = await this.chatService.getTeacherRooms(teacherId);
    return { success: true, data: rooms };
  }

  // Get student's chat rooms
  @Get('rooms/student/:studentId')
  async getStudentRooms(@Param('studentId') studentId: string) {
    const rooms = await this.chatService.getStudentRooms(studentId);
    return { success: true, data: rooms };
  }

  // Get messages for a room
  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.chatService.getMessages(
      roomId,
      limit ? Number.parseInt(limit) : 100,
    );
    return { success: true, data: messages };
  }

  // Send a message
  @Post('messages')
  async sendMessage(
    @Body()
    body: {
      roomId: string;
      senderId: string;
      senderName: string;
      senderType: 'teacher' | 'student';
      content: string;
      messageType?: 'text' | 'image' | 'video' | 'document';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
    },
  ) {
    const message = await this.chatService.sendMessage(
      body.roomId,
      body.senderId,
      body.senderName,
      body.senderType,
      body.content,
      body.messageType,
      body.mediaUrl,
      body.fileName,
      body.fileSize,
    );
    return { success: true, data: message };
  }

  // Toggle chat room status
  @Patch('rooms/:roomId/status')
  async toggleChatStatus(
    @Param('roomId') roomId: string,
    @Body() body: { isActive: boolean },
  ) {
    await this.chatService.toggleChatStatus(roomId, body.isActive);
    return { success: true, message: 'Chat status updated' };
  }

  // Create or get private chat room
  @Post('rooms/private')
  async getOrCreatePrivateRoom(
    @Body() body: { teacherId: string; studentId: string },
  ) {
    const room = await this.chatService.getOrCreatePrivateRoom(
      body.teacherId,
      body.studentId,
    );
    return { success: true, data: room };
  }

  // Initialize student chat rooms for a teacher
  @Post('rooms/initialize')
  async initializeStudentRooms(@Body() body: { teacherId: string }) {
    const result = await this.chatService.initializeStudentChatRooms(
      body.teacherId,
    );
    return { success: true, data: result };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const bucket = this.firebaseAdmin.storage().bucket();
      const timestamp = Date.now();
      const fileName = `chat-media/${timestamp}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      // Determine content type
      const contentType = file.mimetype || 'application/octet-stream';

      // Upload file to Firebase Storage
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType,
        },
        public: true,
      });

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Determine message type based on MIME type
      let messageType: 'image' | 'video' | 'document' = 'document';
      if (file.mimetype.startsWith('image/')) {
        messageType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        messageType = 'video';
      }

      return {
        url: publicUrl,
        fileName: file.originalname,
        fileSize: file.size,
        messageType,
        mimeType: file.mimetype,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }
}
