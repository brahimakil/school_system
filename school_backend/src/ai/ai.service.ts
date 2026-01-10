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

    if (['1', '2', '3'].some(g => gradeLevel.includes(g))) {
      instruction += `Use simple, clear language appropriate for elementary school. Be patient and encouraging. Use examples and analogies that young students can relate to.`;
    } else if (['4', '5', '6'].some(g => gradeLevel.includes(g))) {
      instruction += `Use clear language appropriate for upper elementary students. Explain concepts step-by-step and provide relevant examples.`;
    } else if (['7', '8', '9'].some(g => gradeLevel.includes(g))) {
      instruction += `Use language appropriate for middle school students. Provide detailed explanations with examples and encourage critical thinking.`;
    } else {
      instruction += `Adjust your language to be clear and educational. Provide detailed explanations with relevant examples.`;
    }

    instruction += `\n\nYou have access to the student's courses and homework assignments. When answering questions:
- When the student types /courses, list ALL their available courses with numbers and ask which one they want to explore
- When the student types /homework, list ALL their homework assignments with numbers and ask which one they need help with
- When they mention a specific course or homework by name, provide detailed help about it
- Reference specific courses or homework when relevant to their questions
- Help explain concepts from their curriculum in detail
- Assist with homework by guiding them through problems step-by-step, not giving direct answers
- Be supportive, encouraging, and patient
- If you see an image, analyze it thoroughly and help the student understand it in the context of their studies
- Always acknowledge the courses and homeworks you have access to`;

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
      // Match the format used in courses/homeworks: "Grade Grade 9 - Section A"
      const gradeStr = `Grade ${currentGrade.grade} - Section ${currentGrade.section}`;

      console.log('=== AI CONTEXT DEBUG ===');
      console.log('Student ID:', studentId);
      console.log('Student Grade:', currentGrade);
      console.log('Searching for gradeStr:', gradeStr);

      // Get ALL courses first to debug
      const allCoursesSnapshot = await this.db.collection('courses').limit(5).get();
      console.log('Sample courses in DB:', allCoursesSnapshot.docs.map(doc => ({
        id: doc.id,
        gradeSections: doc.data().gradeSections,
        title: doc.data().title
      })));

      // Get student's courses
      const coursesSnapshot = await this.db.collection('courses')
        .where('gradeSections', 'array-contains', gradeStr)
        .get();

      console.log('Found courses for student:', coursesSnapshot.size);

      const courses = coursesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          subject: data.subject,
          description: data.description,
          status: data.status,
          attachmentUrl: data.attachmentUrl,
        };
      });

      // Get ALL homeworks first to debug
      const allHomeworksSnapshot = await this.db.collection('homeworks').limit(5).get();
      console.log('Sample homeworks in DB:', allHomeworksSnapshot.docs.map(doc => ({
        id: doc.id,
        gradeSections: doc.data().gradeSections,
        title: doc.data().title
      })));

      // Get student's homeworks
      const homeworksSnapshot = await this.db.collection('homeworks')
        .where('gradeSections', 'array-contains', gradeStr)
        .get();

      console.log('Found homeworks for student:', homeworksSnapshot.size);
      console.log('=== END DEBUG ===');

      const homeworks = homeworksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          subject: data.subject,
          description: data.description,
          dueDate: data.dueDate,
          status: data.status,
          attachmentUrl: data.attachmentUrl,
        };
      });

      // Build context string
      let context = `\n\n=== STUDENT CONTEXT ===\n`;
      context += `Student Grade: ${currentGrade.grade}, Section: ${currentGrade.section}\n\n`;

      if (courses.length > 0) {
        context += `📚 AVAILABLE COURSES (Total: ${courses.length}):\n`;
        context += `The student can reference these courses using /courses command\n\n`;
        courses.forEach((course, idx) => {
          context += `Course ${idx + 1}: "${course.title}"\n`;
          context += `  - Subject: ${course.subject}\n`;
          context += `  - Status: ${course.status}\n`;
          if (course.description) {
            context += `  - Description: ${course.description}\n`;
          }
          if (course.attachmentUrl) {
            context += `  - Has Attachment: Yes\n`;
          }
          context += `\n`;
        });
      } else {
        context += `📚 COURSES: No courses found for this student\n\n`;
      }

      if (homeworks.length > 0) {
        context += `📝 AVAILABLE HOMEWORK ASSIGNMENTS (Total: ${homeworks.length}):\n`;
        context += `The student can reference these homeworks using /homework command\n\n`;
        homeworks.forEach((hw, idx) => {
          context += `Homework ${idx + 1}: "${hw.title}"\n`;
          context += `  - Subject: ${hw.subject}\n`;
          context += `  - Status: ${hw.status}\n`;
          if (hw.description) {
            context += `  - Description: ${hw.description}\n`;
          }
          if (hw.dueDate) {
            context += `  - Due Date: ${hw.dueDate}\n`;
          }
          if (hw.attachmentUrl) {
            context += `  - Has Attachment: Yes\n`;
          }
          context += `\n`;
        });
      } else {
        context += `📝 HOMEWORK: No homework assignments found for this student\n\n`;
      }

      context += `=== END CONTEXT ===\n\n`;
      context += `IMPORTANT: When the student uses /courses or /homework commands, provide them with the list above and help them explore specific items.\n`;

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
