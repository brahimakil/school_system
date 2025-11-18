import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';

@Injectable()
export class TeachersService {
  private db: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.auth = firebaseAdmin.auth();
    this.storage = firebaseAdmin.storage();
  }

  async create(createTeacherDto: CreateTeacherDto, file?: Express.Multer.File) {
    const { email, password, fullName, phoneNumber, subjects, status } = createTeacherDto;

    try {
      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName: fullName,
      });

      let photoUrl = '';
      if (file) {
        photoUrl = await this.uploadPhotoOnly(file, userRecord.uid);
      }

      const teacherData = {
        uid: userRecord.uid,
        fullName,
        email,
        phoneNumber,
        subjects,
        status: status || 'active',
        photoUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection('teachers').doc(userRecord.uid).set(teacherData);

      return { success: true, message: 'Teacher created successfully', data: teacherData };
    } catch (error) {
      // Handle Firebase Auth errors with user-friendly messages
      if (error.code === 'auth/email-already-exists') {
        throw new Error('This email address is already registered. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password.');
      }
      throw error;
    }
  }

  async findAll() {
    const snapshot = await this.db.collection('teachers').orderBy('createdAt', 'desc').get();
    const teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: teachers };
  }

  async findOne(id: string) {
    const doc = await this.db.collection('teachers').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Teacher not found');
    }
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto, file?: Express.Multer.File) {
    const docRef = this.db.collection('teachers').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Teacher not found');
    }

    const updateData: any = {};

    if (updateTeacherDto.fullName !== undefined) updateData.fullName = updateTeacherDto.fullName;
    if (updateTeacherDto.email !== undefined) updateData.email = updateTeacherDto.email;
    if (updateTeacherDto.phoneNumber !== undefined) updateData.phoneNumber = updateTeacherDto.phoneNumber;
    if (updateTeacherDto.status !== undefined) updateData.status = updateTeacherDto.status;
    
    if (updateTeacherDto.subjects !== undefined) {
      updateData.subjects = updateTeacherDto.subjects;
    }
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (file) {
      const photoUrl = await this.uploadPhotoOnly(file, id);
      updateData.photoUrl = photoUrl;
    }

    if (updateTeacherDto.password) {
      await this.auth.updateUser(id, { password: updateTeacherDto.password });
    }

    await docRef.set(updateData, { merge: true });

    if (updateTeacherDto.email) {
      await this.auth.updateUser(id, { email: updateTeacherDto.email });
    }

    return { success: true, message: 'Teacher updated successfully' };
  }

  async remove(id: string) {
    const docRef = this.db.collection('teachers').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Teacher not found');
    }

    await this.auth.deleteUser(id);
    await docRef.delete();

    return { success: true, message: 'Teacher deleted successfully' };
  }

  private async uploadPhotoOnly(file: Express.Multer.File, teacherId: string): Promise<string> {
    const bucket = this.storage.bucket();
    const fileName = `teachers/${teacherId}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    await fileUpload.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  async uploadPhoto(file: Express.Multer.File, teacherId: string) {
    const photoUrl = await this.uploadPhotoOnly(file, teacherId);
    await this.db.collection('teachers').doc(teacherId).update({ photoUrl });

    return { success: true, photoUrl };
  }
}
