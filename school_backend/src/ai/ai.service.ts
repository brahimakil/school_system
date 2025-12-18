import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Global model name for easy configuration
export const GEMINI_MODEL_NAME = 'gemini-2.0-flash-exp';

@Injectable()
export class AiService {
  private db: admin.firestore.Firestore;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
  }

  /**
   * Generate system instruction based on student's grade level
   */
  private getSystemInstruction(grade: string): string {
    const gradeLevel = grade.toLowerCase();
    
    let instruction = `You are an AI educational assistant helping a student in grade ${grade}. `;
    
    if (gradeLevel.includes('kg') || gradeLevel.includes('kindergarten')) {
      instruction += `Use very simple language, short sentences, and be encouraging. Focus on basic concepts with examples from everyday life.`;
    } else if (['1', '2', '3'].some(g => gradeLevel.includes(g))) {
      instruction += `Use simple, clear language appropriate for elementary school. Be patient and encouraging. Use examples and analogies that young students can relate to.`;
    } else if (['4', '5', '6'].some(g => gradeLevel.includes(g))) {
      instruction += `Use clear language appropriate for upper elementary students. Explain concepts step-by-step and provide relevant examples.`;
    } else if (['7', '8', '9'].some(g => gradeLevel.includes(g))) {
      instruction += `Use language appropriate for middle school students. Provide detailed explanations with examples and encourage critical thinking.`;
    } else if (['10', '11', '12'].some(g => gradeLevel.includes(g))) {
      instruction += `Use advanced language appropriate for high school students. Provide comprehensive explanations, encourage analytical thinking, and relate concepts to real-world applications.`;
    } else {
      instruction += `Adjust your language to be clear and educational. Provide detailed explanations with relevant examples.`;
    }
    
    instruction += `\n\nYou have access to the student's courses and homework assignments. When answering questions:
- Reference specific courses or homework when relevant
- Help explain concepts from their curriculum
- Assist with homework by guiding them through problems rather than giving direct answers
- Be supportive and encouraging
- If you see an image, analyze it and help the student understand it in the context of their studies`;
    
    return instruction;
  }

  /**
   * Build context from student's courses and homeworks
   */
  private async buildStudentContext(studentId: string): Promise<string> {
    try {
      // Get student data
      const studentDoc = await this.db.collection('students').doc(studentId).get();
      if (!studentDoc.exists) {
        throw new NotFoundException('Student not found');
      }
      
      const studentData = studentDoc.data();
      if (!studentData) {
        return '\n\n[Student data not available]\n\n';
      }
      const currentGrade = studentData.currentGrade;
      const gradeStr = `${currentGrade.grade}-${currentGrade.section}`;

      // Get student's active courses
      const coursesSnapshot = await this.db.collection('courses')
        .where('gradeSections', 'array-contains', gradeStr)
        .where('status', 'in', ['active', 'pending'])
        .limit(50)
        .get();

      const courses = coursesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          title: data.title,
          subject: data.subject,
          description: data.description,
          status: data.status,
        };
      });

      // Get student's active homeworks
      const homeworksSnapshot = await this.db.collection('homeworks')
        .where('gradeSections', 'array-contains', gradeStr)
        .where('status', 'in', ['pending', 'active'])
        .limit(50)
        .get();

      const homeworks = homeworksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          title: data.title,
          subject: data.subject,
          description: data.description,
          dueDate: data.dueDate,
          status: data.status,
        };
      });

      // Build context string
      let context = `\n\n=== STUDENT CONTEXT ===\n`;
      context += `Grade: ${currentGrade.grade}, Section: ${currentGrade.section}\n\n`;
      
      if (courses.length > 0) {
        context += `CURRENT COURSES (${courses.length}):\n`;
        courses.forEach((course, idx) => {
          context += `${idx + 1}. ${course.title} (${course.subject})\n`;
          if (course.description) {
            context += `   Description: ${course.description}\n`;
          }
        });
        context += `\n`;
      }
      
      if (homeworks.length > 0) {
        context += `ACTIVE HOMEWORK ASSIGNMENTS (${homeworks.length}):\n`;
        homeworks.forEach((hw, idx) => {
          context += `${idx + 1}. ${hw.title} (${hw.subject})\n`;
          if (hw.description) {
            context += `   Description: ${hw.description}\n`;
          }
          if (hw.dueDate) {
            context += `   Due: ${hw.dueDate}\n`;
          }
        });
      }
      
      context += `\n=== END CONTEXT ===\n\n`;
      
      return context;
    } catch (error) {
      console.error('Error building student context:', error);
      return '\n\n[Context could not be loaded]\n\n';
    }
  }

  /**
   * Chat with AI using student's context
   */
  async chat(
    studentId: string, 
    message: string, 
    image?: { mimeType: string; data: string }
  ): Promise<{ response: string }> {
    try {
      // Get student data and API key
      const studentDoc = await this.db.collection('students').doc(studentId).get();
      if (!studentDoc.exists) {
        throw new NotFoundException('Student not found');
      }

      const studentData = studentDoc.data();
      if (!studentData) {
        throw new NotFoundException('Student data not found');
      }
      
      const apiKey = studentData.geminiApiKey;

      if (!apiKey) {
        throw new BadRequestException('Please configure your Gemini API key in your profile first');
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Build context
      const context = await this.buildStudentContext(studentId);
      const systemInstruction = this.getSystemInstruction(studentData.currentGrade.grade);
      
      // Get model with system instruction
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_MODEL_NAME,
        systemInstruction: systemInstruction + context,
      });

      // Prepare content parts
      const parts: any[] = [];
      
      // Add image if provided
      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
      
      // Add text message
      parts.push({ text: message });

      // Generate response
      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      return { response: text };
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
        throw new BadRequestException('Your Gemini API key is invalid. Please update it in your profile.');
      }
      
      throw new BadRequestException(`AI service error: ${error.message || 'Unknown error'}`);
    }
  }
}
