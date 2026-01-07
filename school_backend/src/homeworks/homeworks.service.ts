import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateHomeworkDto, HomeworkStatus } from './dto/create-homework.dto';
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

  async create(createHomeworkDto: CreateHomeworkDto): Promise<any> {
    const homeworkData = {
      ...createHomeworkDto,
      totalMarks: createHomeworkDto.totalMarks || 100,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

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

  async update(id: string, updateHomeworkDto: UpdateHomeworkDto): Promise<any> {
    const doc = await this.homeworksCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Homework not found');
    }

    const updateData: any = {
      ...updateHomeworkDto,
      totalMarks: updateHomeworkDto.totalMarks || 100,
      updatedAt: admin.firestore.Timestamp.now(),
    };

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

