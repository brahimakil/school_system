import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateQuizDto, QuizStatus } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

interface QuizData {
  classId: string;
  className: string;
  gradeSections: string[];
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  quizDurationMinutes: number;
  questions: Array<{
    question: string;
    answers: string[];
    correctAnswer: string;
    marks: number;
  }>;
  totalMarks: number;
  status: QuizStatus;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

@Injectable()
export class QuizzesService {
  private quizzesCollection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
    private activityLogService: ActivityLogService,
  ) {
    this.quizzesCollection = this.firebaseAdmin.firestore().collection('quizzes');
  }

  async create(createQuizDto: CreateQuizDto): Promise<any> {
    // Calculate total marks
    const totalMarks = createQuizDto.questions.reduce((sum, q) => sum + q.marks, 0);

    // Convert to plain object to avoid Firestore serialization issues
    const quizData = {
      classId: createQuizDto.classId,
      className: createQuizDto.className,
      gradeSections: createQuizDto.gradeSections,
      title: createQuizDto.title,
      description: createQuizDto.description,
      startDateTime: createQuizDto.startDateTime,
      endDateTime: createQuizDto.endDateTime,
      quizDurationMinutes: createQuizDto.quizDurationMinutes,
      questions: createQuizDto.questions.map(q => ({
        question: q.question,
        answers: q.answers,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      })),
      totalMarks,
      status: createQuizDto.status,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await this.quizzesCollection.add(quizData);
    const doc = await docRef.get();

    // Log activity
    await this.activityLogService.logActivity({
      type: 'quiz',
      action: 'created',
      entityId: doc.id,
      entityName: createQuizDto.title,
      details: `Quiz created for ${createQuizDto.className} with ${totalMarks} total marks`,
    });

    return { id: doc.id, ...doc.data() };
  }

  async findAll(grade?: string, section?: string): Promise<any> {
    let query: admin.firestore.Query = this.quizzesCollection.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    let quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by grade and section if provided
    if (grade && section) {
      const gradeSection = `Grade ${grade} - Section ${section}`;
      quizzes = quizzes.filter((quiz: any) =>
        quiz.gradeSections?.includes(gradeSection)
      );
    }

    // Auto-update expired quizzes
    const updatedCount = await this.autoUpdateExpiredQuizzes(quizzes);

    // Re-fetch if any were updated to get the latest data
    if (updatedCount > 0) {
      const updatedSnapshot = await query.get();
      let updatedQuizzes = updatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (grade && section) {
        const gradeSection = `Grade ${grade} - Section ${section}`;
        updatedQuizzes = updatedQuizzes.filter((quiz: any) =>
          quiz.gradeSections?.includes(gradeSection)
        );
      }

      return { success: true, data: updatedQuizzes };
    }

    return { success: true, data: quizzes };
  }

  async findOne(id: string): Promise<any> {
    const doc = await this.quizzesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Quiz not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async findByClass(classId: string): Promise<any[]> {
    const snapshot = await this.quizzesCollection
      .where('classId', '==', classId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<any> {
    const doc = await this.quizzesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Quiz not found');
    }

    // Convert to plain object
    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Only include fields that are provided
    if (updateQuizDto.classId !== undefined) updateData.classId = updateQuizDto.classId;
    if (updateQuizDto.className !== undefined) updateData.className = updateQuizDto.className;
    if (updateQuizDto.gradeSections !== undefined) updateData.gradeSections = updateQuizDto.gradeSections;
    if (updateQuizDto.title !== undefined) updateData.title = updateQuizDto.title;
    if (updateQuizDto.description !== undefined) updateData.description = updateQuizDto.description;
    if (updateQuizDto.startDateTime !== undefined) updateData.startDateTime = updateQuizDto.startDateTime;
    if (updateQuizDto.endDateTime !== undefined) updateData.endDateTime = updateQuizDto.endDateTime;
    if (updateQuizDto.quizDurationMinutes !== undefined) updateData.quizDurationMinutes = updateQuizDto.quizDurationMinutes;
    if (updateQuizDto.status !== undefined) updateData.status = updateQuizDto.status;

    // Recalculate total marks if questions are updated
    if (updateQuizDto.questions && Array.isArray(updateQuizDto.questions)) {
      updateData.questions = updateQuizDto.questions.map(q => ({
        question: q.question,
        answers: q.answers,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      }));
      updateData.totalMarks = updateQuizDto.questions.reduce((sum, q) => sum + q.marks, 0);
    }

    await this.quizzesCollection.doc(id).update(updateData);
    const updated = await this.quizzesCollection.doc(id).get();

    return { id: updated.id, ...updated.data() };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.quizzesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Quiz not found');
    }

    const quizData = doc.data() as QuizData;
    const quizTitle = quizData?.title || 'Unknown Quiz';

    // Log activity before deletion
    await this.activityLogService.logActivity({
      type: 'quiz',
      action: 'deleted',
      entityId: id,
      entityName: quizTitle,
      details: `Quiz removed from the system`,
    });

    await this.quizzesCollection.doc(id).delete();
  }

  async updateStatus(id: string, status: QuizStatus): Promise<any> {
    const doc = await this.quizzesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Quiz not found');
    }

    await this.quizzesCollection.doc(id).update({
      status,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const updated = await this.quizzesCollection.doc(id).get();
    return { id: updated.id, ...updated.data() };
  }

  private async autoUpdateExpiredQuizzes(quizzes: any[]): Promise<number> {
    const now = new Date();
    console.log('Checking for expired quizzes. Current time:', now.toISOString());

    const expiredQuizzes = quizzes.filter(quiz => {
      if (quiz.status === QuizStatus.COMPLETED || quiz.status === QuizStatus.CANCELLED) {
        return false;
      }

      const endDateTime = new Date(quiz.endDateTime);
      console.log(`Quiz "${quiz.title}" - End: ${endDateTime.toISOString()}, Status: ${quiz.status}, Expired: ${endDateTime < now}`);
      return endDateTime < now;
    });

    if (expiredQuizzes.length > 0) {
      console.log(`Found ${expiredQuizzes.length} expired quiz(es), updating...`);
      const updatePromises = expiredQuizzes.map(quiz =>
        this.quizzesCollection.doc(quiz.id).update({
          status: QuizStatus.COMPLETED,
          updatedAt: admin.firestore.Timestamp.now(),
        })
      );

      await Promise.all(updatePromises);
      console.log(`Auto-expired ${expiredQuizzes.length} quiz(es)`);
    } else {
      console.log('No expired quizzes found');
    }

    return expiredQuizzes.length;
  }
}
