import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  private db: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;
  private transporter: nodemailer.Transporter;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.auth = firebaseAdmin.auth();
    this.storage = firebaseAdmin.storage();
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  private async sendCredentialsEmail(email: string, fullName: string, password: string, isNewStudent: boolean) {
    try {
      const subject = isNewStudent
        ? 'Welcome to Skillify - Your Account Credentials'
        : 'Skillify - Your Updated Account Credentials';

      const htmlContent = isNewStudent
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to Skillify!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">Hello <strong>${fullName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Your student account has been created. Here are your login credentials:</p>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>
              <p style="font-size: 14px; color: #6b7280;">Please keep your credentials safe and change your password after first login.</p>
              <p style="font-size: 14px; color: #6b7280;">Best regards,<br>Skillify Team</p>
            </div>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Updated</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">Hello <strong>${fullName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Your account password has been updated. Here are your new login credentials:</p>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0;"><strong>New Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>
              <p style="font-size: 14px; color: #6b7280;">If you did not request this change, please contact support immediately.</p>
              <p style="font-size: 14px; color: #6b7280;">Best regards,<br>Skillify Team</p>
            </div>
          </div>
        `;

      await this.transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: email,
        subject,
        html: htmlContent,
      });

      console.log(`[CREDENTIALS EMAIL] Sent successfully to ${email}`);
    } catch (error) {
      console.error('[CREDENTIALS EMAIL] Failed to send:', error);
    }
  }

  async create(createStudentDto: CreateStudentDto, file?: Express.Multer.File) {
    const { email, password, fullName, phoneNumber, currentGrade, passedGrades, status } = createStudentDto;

    const userRecord = await this.auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    let photoUrl = '';
    if (file) {
      photoUrl = await this.uploadPhotoOnly(file, userRecord.uid);
    }

    const studentData = {
      uid: userRecord.uid,
      fullName,
      email,
      phoneNumber,
      currentGrade,
      passedGrades,
      status: status || 'active',
      photoUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.db.collection('students').doc(userRecord.uid).set(studentData);

    // Send credentials email to the new student
    await this.sendCredentialsEmail(email, fullName, password, true);

    return { success: true, message: 'Student created successfully', data: studentData };
  }

  async findAll() {
    const snapshot = await this.db.collection('students').orderBy('createdAt', 'desc').get();
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: students };
  }

  async findOne(id: string) {
    const doc = await this.db.collection('students').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Student not found');
    }
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, file?: Express.Multer.File) {
    const docRef = this.db.collection('students').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Student not found');
    }

    const updateData: any = {
      ...updateStudentDto,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (file) {
      const photoUrl = await this.uploadPhotoOnly(file, id);
      updateData.photoUrl = photoUrl;
    }

    if (updateStudentDto.password) {
      await this.auth.updateUser(id, { password: updateStudentDto.password });
      delete updateData.password;

      // Send email with new password to the student
      const existingData = doc.data();
      const studentEmail = updateStudentDto.email || existingData?.email;
      const studentName = updateStudentDto.fullName || existingData?.fullName;
      await this.sendCredentialsEmail(studentEmail, studentName, updateStudentDto.password, false);
    }

    await docRef.update(updateData);

    if (updateStudentDto.email) {
      await this.auth.updateUser(id, { email: updateStudentDto.email });
    }

    return { success: true, message: 'Student updated successfully' };
  }

  async remove(id: string) {
    const docRef = this.db.collection('students').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Student not found');
    }

    await this.auth.deleteUser(id);
    await docRef.delete();

    return { success: true, message: 'Student deleted successfully' };
  }

  private async uploadPhotoOnly(file: Express.Multer.File, studentId: string): Promise<string> {
    const bucket = this.storage.bucket();
    const fileName = `students/${studentId}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    await fileUpload.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  async uploadPhoto(file: Express.Multer.File, studentId: string) {
    const photoUrl = await this.uploadPhotoOnly(file, studentId);
    await this.db.collection('students').doc(studentId).update({ photoUrl });

    return { success: true, photoUrl };
  }

  async testGeminiApiKey(apiKey: string) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const result = await model.generateContent('Hello, respond with just "OK" to confirm you are working.');
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: 'API key is valid and working!',
        testResponse: text
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid API key or API error',
        error: error.message
      };
    }
  }

  async saveGeminiApiKey(studentId: string, apiKey: string) {
    try {
      const studentDoc = await this.db.collection('students').doc(studentId).get();
      if (!studentDoc.exists) {
        throw new NotFoundException('Student not found');
      }

      await this.db.collection('students').doc(studentId).update({
        geminiApiKey: apiKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'Gemini API key saved successfully!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save API key',
        error: error.message
      };
    }
  }
}
