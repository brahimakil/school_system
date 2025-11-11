import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  private db: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.auth = firebaseAdmin.auth();
    this.storage = firebaseAdmin.storage();
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
}
