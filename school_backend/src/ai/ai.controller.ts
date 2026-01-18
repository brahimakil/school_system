import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ============ Admin Endpoints ============

  /**
   * Get current AI settings (for admin)
   */
  @Get('settings')
  async getSettings() {
    const settings = await this.aiService.getAiSettings();
    return {
      success: true,
      data: settings ? {
        hasApiKey: !!settings.apiKey,
        apiKeyPreview: settings.apiKey ? `${settings.apiKey.substring(0, 8)}...${settings.apiKey.substring(settings.apiKey.length - 4)}` : null,
        enabled: settings.enabled ?? false,
        lastUpdated: settings.lastUpdated,
        lastTestedAt: settings.lastTestedAt,
        lastTestResult: settings.lastTestResult,
      } : {
        hasApiKey: false,
        enabled: false,
      },
    };
  }

  /**
   * Save AI settings (API key and enabled status)
   */
  @Post('settings')
  async saveSettings(
    @Body('apiKey') apiKey: string,
    @Body('enabled') enabled?: boolean,
  ) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new BadRequestException('API key is required');
    }

    return this.aiService.saveAiSettings(apiKey, enabled ?? true);
  }

  /**
   * Test an API key
   */
  @Post('test-key')
  async testKey(@Body('apiKey') apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new BadRequestException('API key is required');
    }

    return this.aiService.testApiKey(apiKey);
  }

  /**
   * Toggle AI enabled/disabled
   */
  @Post('toggle')
  async toggleAi(@Body('enabled') enabled: boolean) {
    return this.aiService.toggleAiEnabled(enabled);
  }

  /**
   * Test chat with a simple message (for admin testing)
   */
  @Post('test-chat')
  async testChat(@Body('message') message: string) {
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    try {
      // Use a simple test without student context
      const settings = await this.aiService.getAiSettings();
      if (!settings || !settings.apiKey) {
        throw new BadRequestException('AI is not configured. Please save an API key first.');
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(settings.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const result = await model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
      };
    } catch (error) {
      console.error('Test chat error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get AI response',
      };
    }
  }

  // ============ Student Endpoints ============

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
