import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Injectable()
export class SubmissionsService {
  private readonly submissionsCollection: admin.firestore.CollectionReference;
  private readonly homeworksCollection: admin.firestore.CollectionReference;

  constructor(@Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin) {
    this.submissionsCollection = this.firebaseAdmin.firestore().collection('submissions');
    this.homeworksCollection = this.firebaseAdmin.firestore().collection('homeworks');
  }

  async create(createSubmissionDto: CreateSubmissionDto): Promise<any> {
    // Check if homework allows submissions
    const homework = await this.homeworksCollection.doc(createSubmissionDto.homeworkId).get();
    if (!homework.exists) {
      throw new NotFoundException('Homework not found');
    }

    const homeworkData: any = homework.data();
    
    // Only allow submissions for ACTIVE homeworks
    if (homeworkData.status !== 'active') {
      throw new BadRequestException('This homework is not accepting submissions');
    }

    // Check if past due date
    const dueDate = new Date(homeworkData.dueDate);
    if (new Date() > dueDate) {
      throw new BadRequestException('Submission deadline has passed');
    }

    const submissionData = {
      homeworkId: createSubmissionDto.homeworkId,
      studentId: createSubmissionDto.studentId,
      studentName: createSubmissionDto.studentName,
      textContent: createSubmissionDto.textContent || null,
      fileUrl: createSubmissionDto.fileUrl || null,
      fileName: createSubmissionDto.fileName || null,
      grade: null,
      teacherFeedback: null,
      gradedBy: null,
      gradedAt: null,
      submittedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await this.submissionsCollection.add(submissionData);
    const doc = await docRef.get();
    
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async findByHomeworkAndStudent(homeworkId: string, studentId: string): Promise<any> {
    const snapshot = await this.submissionsCollection
      .where('homeworkId', '==', homeworkId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: true, data: null };
    }

    const doc = snapshot.docs[0];
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async findByHomework(homeworkId: string): Promise<any> {
    const snapshot = await this.submissionsCollection
      .where('homeworkId', '==', homeworkId)
      .orderBy('submittedAt', 'desc')
      .get();

    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: submissions };
  }

  async findByStudent(studentId: string): Promise<any> {
    const snapshot = await this.submissionsCollection
      .where('studentId', '==', studentId)
      .orderBy('submittedAt', 'desc')
      .get();

    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: submissions };
  }

  async update(id: string, updateSubmissionDto: UpdateSubmissionDto): Promise<any> {
    const doc = await this.submissionsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Submission not found');
    }

    const submissionData: any = doc.data();

    // If this is a grading update (contains grade or teacherFeedback)
    const isGrading = updateSubmissionDto.grade !== undefined || updateSubmissionDto.teacherFeedback !== undefined;

    if (!isGrading) {
      // Student is trying to update - check if allowed
      
      // Cannot edit if already graded
      if (submissionData.grade !== null && submissionData.grade !== undefined) {
        throw new BadRequestException('Cannot edit a graded submission');
      }

      // Check homework status and due date
      const homework = await this.homeworksCollection.doc(submissionData.homeworkId).get();
      if (!homework.exists) {
        throw new NotFoundException('Homework not found');
      }

      const homeworkData: any = homework.data();
      
      // Cannot edit if homework is not active
      if (homeworkData.status !== 'active') {
        throw new BadRequestException('Cannot edit submission - homework is not active');
      }

      // Cannot edit if past due date
      const dueDate = new Date(homeworkData.dueDate);
      if (new Date() > dueDate) {
        throw new BadRequestException('Cannot edit submission - deadline has passed');
      }
    }

    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Add fields that are being updated
    if (updateSubmissionDto.textContent !== undefined) updateData.textContent = updateSubmissionDto.textContent;
    if (updateSubmissionDto.fileUrl !== undefined) updateData.fileUrl = updateSubmissionDto.fileUrl;
    if (updateSubmissionDto.fileName !== undefined) updateData.fileName = updateSubmissionDto.fileName;
    
    // Grading fields
    if (updateSubmissionDto.grade !== undefined) {
      // Validate grade against homework totalMarks
      const homework = await this.homeworksCollection.doc(submissionData.homeworkId).get();
      if (homework.exists) {
        const homeworkData: any = homework.data();
        const totalMarks = homeworkData.totalMarks || 100;
        if (updateSubmissionDto.grade > totalMarks) {
          throw new BadRequestException(`Grade cannot exceed total marks (${totalMarks})`);
        }
        if (updateSubmissionDto.grade < 0) {
          throw new BadRequestException('Grade cannot be negative');
        }
      }
      updateData.grade = updateSubmissionDto.grade;
      updateData.gradedAt = admin.firestore.Timestamp.now();
    }
    if (updateSubmissionDto.teacherFeedback !== undefined) updateData.teacherFeedback = updateSubmissionDto.teacherFeedback;
    if (updateSubmissionDto.gradedBy !== undefined) updateData.gradedBy = updateSubmissionDto.gradedBy;

    await this.submissionsCollection.doc(id).update(updateData);
    const updatedDoc = await this.submissionsCollection.doc(id).get();
    
    return { success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } };
  }

  async remove(id: string): Promise<any> {
    const doc = await this.submissionsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Submission not found');
    }
    await this.submissionsCollection.doc(id).delete();
    return { success: true, message: 'Submission deleted successfully' };
  }
}
