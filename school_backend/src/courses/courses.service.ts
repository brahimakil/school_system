import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateCourseDto, AttachmentType } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  private coursesCollection: admin.firestore.CollectionReference;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.coursesCollection = this.firebaseAdmin.firestore().collection('courses');
  }

  async create(createCourseDto: CreateCourseDto, file?: Express.Multer.File): Promise<any> {
    console.log('=== CREATE COURSE DEBUG ===');
    console.log('Received file:', file ? 'YES' : 'NO');
    console.log('File details:', file);
    console.log('DTO:', createCourseDto);
    
    let attachmentUrl = createCourseDto.attachmentUrl;
    let attachmentType = createCourseDto.attachmentType;

    // Upload file to Firebase Storage if provided
    if (file) {
      const bucket = this.firebaseAdmin.storage().bucket();
      const fileName = `courses/${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      await fileUpload.makePublic();
      attachmentUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Auto-detect file type
      if (file.mimetype.startsWith('video/')) {
        attachmentType = AttachmentType.VIDEO;
      } else if (file.mimetype === 'application/pdf') {
        attachmentType = AttachmentType.PDF;
      } else if (file.mimetype.startsWith('image/')) {
        attachmentType = AttachmentType.IMAGE;
      } else {
        attachmentType = AttachmentType.OTHER;
      }
    }

    const courseData = {
      ...createCourseDto,
      attachmentUrl,
      attachmentType,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Parse gradeSections if it's a string
    if (typeof courseData.gradeSections === 'string') {
      courseData.gradeSections = JSON.parse(courseData.gradeSections as string);
    }

    const docRef = await this.coursesCollection.add(courseData);
    const doc = await docRef.get();
    
    return { id: doc.id, ...doc.data() };
  }

  async findAll(grade?: string, section?: string): Promise<any> {
    const snapshot = await this.coursesCollection.orderBy('createdAt', 'desc').get();
    let courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by grade and section if provided
    if (grade && section) {
      const gradeSection = `Grade ${grade} - Section ${section}`;
      courses = courses.filter((course: any) => 
        course.gradeSections?.includes(gradeSection)
      );
    }
    
    return { success: true, data: courses };
  }

  async findOne(id: string): Promise<any> {
    const doc = await this.coursesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Course not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async findByClass(classId: string): Promise<any[]> {
    const snapshot = await this.coursesCollection
      .where('classId', '==', classId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, file?: Express.Multer.File): Promise<any> {
    console.log('=== UPDATE COURSE DEBUG ===');
    console.log('Course ID:', id);
    console.log('Received file:', file ? 'YES' : 'NO');
    console.log('File details:', file);
    console.log('DTO:', updateCourseDto);
    
    const doc = await this.coursesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Course not found');
    }

    let attachmentUrl = updateCourseDto.attachmentUrl;
    let attachmentType = updateCourseDto.attachmentType;

    // Upload new file if provided
    if (file) {
      const bucket = this.firebaseAdmin.storage().bucket();
      const fileName = `courses/${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      await fileUpload.makePublic();
      attachmentUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Auto-detect file type
      if (file.mimetype.startsWith('video/')) {
        attachmentType = AttachmentType.VIDEO;
      } else if (file.mimetype === 'application/pdf') {
        attachmentType = AttachmentType.PDF;
      } else if (file.mimetype.startsWith('image/')) {
        attachmentType = AttachmentType.IMAGE;
      } else {
        attachmentType = AttachmentType.OTHER;
      }
    }

    const updateData: any = {
      ...updateCourseDto,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Only include attachment fields if they have values
    if (attachmentUrl !== undefined) {
      updateData.attachmentUrl = attachmentUrl;
    }
    if (attachmentType !== undefined) {
      updateData.attachmentType = attachmentType;
    }

    // Parse gradeSections if it's a string
    if (typeof updateData.gradeSections === 'string') {
      updateData.gradeSections = JSON.parse(updateData.gradeSections as string);
    }

    // Remove undefined values from updateData
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await this.coursesCollection.doc(id).update(updateData);
    const updatedDoc = await this.coursesCollection.doc(id).get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.coursesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Course not found');
    }
    await this.coursesCollection.doc(id).delete();
  }
}
