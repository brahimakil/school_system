import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Controller('chat')
export class ChatController {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {}

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
