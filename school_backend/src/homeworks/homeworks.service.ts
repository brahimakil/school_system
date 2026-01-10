import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateHomeworkDto, HomeworkStatus, AttachmentType } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class HomeworksService {
  private homeworksCollection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
    private activityLogService: ActivityLogService,
  ) {
    this.homeworksCollection = this.firebaseAdmin.firestore().collection('homeworks');
  }

  async create(createHomeworkDto: CreateHomeworkDto, file?: Express.Multer.File): Promise<any> {
    console.log('=== CREATE HOMEWORK DEBUG ===');
    console.log('Received file:', file ? 'YES' : 'NO');
    console.log('File details:', file);
    console.log('DTO:', createHomeworkDto);

    let attachmentUrl = createHomeworkDto.attachmentUrl;
    let attachmentType = createHomeworkDto.attachmentType;

    // Upload file to Firebase Storage if provided
    if (file) {
      const bucket = this.firebaseAdmin.storage().bucket();
      const fileName = `homeworks/${Date.now()}_${file.originalname}`;
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

    // Parse gradeSections if it's a string (from FormData)
    let gradeSections = createHomeworkDto.gradeSections;
    if (typeof gradeSections === 'string') {
      gradeSections = JSON.parse(gradeSections);
    }

    // Parse totalMarks if it's a string (from FormData)
    let totalMarks = createHomeworkDto.totalMarks;
    if (typeof totalMarks === 'string') {
      totalMarks = parseInt(totalMarks, 10);
    }

    const homeworkData: any = {
      classId: createHomeworkDto.classId,
      className: createHomeworkDto.className,
      gradeSections,
      subject: createHomeworkDto.subject,
      title: createHomeworkDto.title,
      description: createHomeworkDto.description,
      dueDate: createHomeworkDto.dueDate,
      status: createHomeworkDto.status,
      totalMarks: totalMarks || 100,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Only add attachment fields if they have values
    if (attachmentUrl) {
      homeworkData.attachmentUrl = attachmentUrl;
      homeworkData.attachmentType = attachmentType;
    }

    const docRef = await this.homeworksCollection.add(homeworkData);
    const doc = await docRef.get();

    // Log activity
    await this.activityLogService.logActivity({
      type: 'homework',
      action: 'created',
      entityId: doc.id,
      entityName: createHomeworkDto.title,
      details: `Homework assigned for ${createHomeworkDto.className}`,
    });

    return { id: doc.id, ...doc.data() };
  }

  async findAll(grade?: string, section?: string): Promise<any> {
    const snapshot = await this.homeworksCollection.orderBy('createdAt', 'desc').get();
    let homeworks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by grade and section if provided
    if (grade && section) {
      const gradeSection = `Grade ${grade} - Section ${section}`;
      homeworks = homeworks.filter((homework: any) =>
        homework.gradeSections?.includes(gradeSection)
      );
    }

    return { success: true, data: homeworks };
  }

  async findOne(id: string): Promise<any> {
    const doc = await this.homeworksCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Homework not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async findByClass(classId: string): Promise<any[]> {
    const snapshot = await this.homeworksCollection
      .where('classId', '==', classId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, updateHomeworkDto: UpdateHomeworkDto, file?: Express.Multer.File): Promise<any> {
    console.log('=== UPDATE HOMEWORK DEBUG ===');
    console.log('Homework ID:', id);
    console.log('Received file:', file ? 'YES' : 'NO');
    console.log('File details:', file);
    console.log('DTO:', updateHomeworkDto);

    const doc = await this.homeworksCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Homework not found');
    }

    let attachmentUrl = updateHomeworkDto.attachmentUrl;
    let attachmentType = updateHomeworkDto.attachmentType;

    // Upload new file if provided
    if (file) {
      const bucket = this.firebaseAdmin.storage().bucket();
      const fileName = `homeworks/${Date.now()}_${file.originalname}`;
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

    // Parse gradeSections if it's a string (from FormData)
    let gradeSections = updateHomeworkDto.gradeSections;
    if (typeof gradeSections === 'string') {
      gradeSections = JSON.parse(gradeSections);
    }

    // Parse totalMarks if it's a string (from FormData)
    let totalMarks = updateHomeworkDto.totalMarks;
    if (typeof totalMarks === 'string') {
      totalMarks = parseInt(totalMarks, 10);
    }

    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Only add fields that are defined
    if (updateHomeworkDto.classId) updateData.classId = updateHomeworkDto.classId;
    if (updateHomeworkDto.className) updateData.className = updateHomeworkDto.className;
    if (gradeSections) updateData.gradeSections = gradeSections;
    if (updateHomeworkDto.subject) updateData.subject = updateHomeworkDto.subject;
    if (updateHomeworkDto.title) updateData.title = updateHomeworkDto.title;
    if (updateHomeworkDto.description !== undefined) updateData.description = updateHomeworkDto.description;
    if (updateHomeworkDto.dueDate) updateData.dueDate = updateHomeworkDto.dueDate;
    if (updateHomeworkDto.status) updateData.status = updateHomeworkDto.status;
    if (totalMarks) updateData.totalMarks = totalMarks;

    // Only include attachment fields if they have values
    if (attachmentUrl) {
      updateData.attachmentUrl = attachmentUrl;
      updateData.attachmentType = attachmentType;
    }

    await this.homeworksCollection.doc(id).update(updateData);
    const updatedDoc = await this.homeworksCollection.doc(id).get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.homeworksCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Homework not found');
    }

    const homeworkData = doc.data();
    const homeworkTitle = homeworkData?.title || 'Unknown Homework';

    // Log activity before deletion
    await this.activityLogService.logActivity({
      type: 'homework',
      action: 'deleted',
      entityId: id,
      entityName: homeworkTitle,
      details: `Homework removed from the system`,
    });

    await this.homeworksCollection.doc(id).delete();
  }
}
