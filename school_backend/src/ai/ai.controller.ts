import { Controller, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat/:studentId')
  @UseInterceptors(FileInterceptor('image'))
  async chat(
    @Param('studentId') studentId: string,
    @Body('message') message: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    let imageData: { mimeType: string; data: string } | undefined = undefined;
    if (file) {
      // Convert image to base64
      const base64Data = file.buffer.toString('base64');
      imageData = {
        mimeType: file.mimetype,
        data: base64Data,
      };
    }

    return this.aiService.chat(studentId, message, imageData);
  }
}
