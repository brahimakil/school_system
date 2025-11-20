import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateHomeworkDto, HomeworkStatus } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Injectable()
export class HomeworksService {
  private homeworksCollection: admin.firestore.CollectionReference;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.homeworksCollection = this.firebaseAdmin.firestore().collection('homeworks');
  }

  async create(createHomeworkDto: CreateHomeworkDto): Promise<any> {
    const homeworkData = {
      ...createHomeworkDto,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await this.homeworksCollection.add(homeworkData);
    const doc = await docRef.get();
    
    return { id: doc.id, ...doc.data() };
  }

  async findAll(): Promise<any[]> {
    const snapshot = await this.homeworksCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    await this.homeworksCollection.doc(id).delete();
  }
}
