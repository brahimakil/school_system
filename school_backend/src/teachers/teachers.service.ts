import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async getTeacherClasses(teacherId: string) {
    try {
      const classesSnapshot = await this.db
        .collection('classes')
        .where('teacherId', '==', teacherId)
        .get();

      const classes = await Promise.all(
        classesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          // Count students matching ANY of the class's grade-sections
          let studentCount = 0;
          if (data.gradeSections && Array.isArray(data.gradeSections)) {
            const studentIds = new Set<string>();
            
            for (const gradeSection of data.gradeSections) {
              const studentsSnapshot = await this.db
                .collection('students')
                .where('currentGrade.grade', '==', gradeSection.grade)
                .where('currentGrade.section', '==', gradeSection.section)
                .get();
              
              studentsSnapshot.docs.forEach(studentDoc => {
                studentIds.add(studentDoc.id);
              });
            }
            
            studentCount = studentIds.size;
          }

          // Format schedule and day
          const schedule = data.startTime && data.endTime 
            ? `${data.startTime} - ${data.endTime}` 
            : '';
          const day = data.dayOfWeek || '';

          return {
            id: doc.id,
            name: data.className || data.name || 'Unnamed Class',
            studentCount,
            schedule,
            day,
          };
        }),
      );

      return {
        success: true,
        data: classes,
      };
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      return {
        success: false,
        message: 'Failed to fetch classes',
        data: [],
      };
    }
  }

  async getTeacherStats(teacherId: string) {
    try {
      // Get classes count
      const classesSnapshot = await this.db
        .collection('classes')
        .where('teacherId', '==', teacherId)
        .get();

      // Get total students across all classes
      const studentIds = new Set<string>();
      
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        
        if (classData.gradeSections && Array.isArray(classData.gradeSections)) {
          for (const gradeSection of classData.gradeSections) {
            const studentsSnapshot = await this.db
              .collection('students')
              .where('currentGrade.grade', '==', gradeSection.grade)
              .where('currentGrade.section', '==', gradeSection.section)
              .get();
            
            for (const studentDoc of studentsSnapshot.docs) {
              studentIds.add(studentDoc.id);
            }
          }
        }
      }

      // Get active chats
      const chatRoomsSnapshot = await this.db
        .collection('chatRooms')
        .where('teacherId', '==', teacherId)
        .where('isActive', '==', true)
        .get();

      // Get pending submissions (homework submissions that need review)
      let pendingSubmissions = 0;
      try {
        const submissionsSnapshot = await this.db
          .collection('submissions')
          .where('teacherId', '==', teacherId)
          .where('status', '==', 'submitted')
          .get();
        pendingSubmissions = submissionsSnapshot.size;
      } catch (error) {
        console.log('Could not fetch submissions:', error);
      }

      return {
        success: true,
        data: {
          totalClasses: classesSnapshot.size,
          totalStudents: studentIds.size,
          activeChats: chatRoomsSnapshot.size,
          pendingSubmissions,
        },
      };
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      return {
        success: false,
        message: 'Failed to fetch stats',
        data: {
          totalClasses: 0,
          totalStudents: 0,
          activeChats: 0,
          pendingSubmissions: 0,
        },
      };
    }
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
        throw new BadRequestException('This email address is already registered. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        throw new BadRequestException('Password is too weak. Please use a stronger password.');
      }
      throw new BadRequestException(error.message || 'Failed to create teacher');
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
