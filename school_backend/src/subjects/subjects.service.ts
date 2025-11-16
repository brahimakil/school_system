import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import * as admin from 'firebase-admin';

export interface SubjectData {
  id?: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SubjectsService {
  private db: admin.firestore.Firestore;
  private subjectsCollection: admin.firestore.CollectionReference;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.subjectsCollection = this.db.collection('subjects');
  }

  async create(createSubjectDto: CreateSubjectDto): Promise<SubjectData> {
    // Check if code already exists
    const codeSnapshot = await this.subjectsCollection
      .where('code', '==', createSubjectDto.code)
      .get();
    
    if (!codeSnapshot.empty) {
      throw new ConflictException('Subject code already exists');
    }

    const subjectData = {
      ...createSubjectDto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await this.subjectsCollection.add(subjectData);
    return { id: docRef.id, ...subjectData };
  }

  async findAll(): Promise<SubjectData[]> {
    const snapshot = await this.subjectsCollection.orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectData));
  }

  async findOne(id: string): Promise<SubjectData> {
    const doc = await this.subjectsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Subject not found');
    }
    return { id: doc.id, ...doc.data() } as SubjectData;
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto): Promise<SubjectData> {
    const doc = await this.subjectsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Subject not found');
    }

    // If updating code, check for duplicates
    if (updateSubjectDto.code) {
      const codeSnapshot = await this.subjectsCollection
        .where('code', '==', updateSubjectDto.code)
        .get();
      
      const duplicate = codeSnapshot.docs.find(d => d.id !== id);
      if (duplicate) {
        throw new ConflictException('Subject code already exists');
      }
    }

    const updatedData = {
      ...doc.data(),
      ...updateSubjectDto,
      updatedAt: new Date().toISOString(),
    };

    await this.subjectsCollection.doc(id).update(updatedData);
    return { id, ...updatedData } as SubjectData;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.subjectsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Subject not found');
    }
    await this.subjectsCollection.doc(id).delete();
  }
}
