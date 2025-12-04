import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateQuizResultDto } from './dto/create-quiz-result.dto';

@Injectable()
export class QuizResultsService {
  private readonly resultsCollection: admin.firestore.CollectionReference;
  private readonly quizzesCollection: admin.firestore.CollectionReference;

  constructor(@Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin) {
    this.resultsCollection = this.firebaseAdmin.firestore().collection('quiz-results');
    this.quizzesCollection = this.firebaseAdmin.firestore().collection('quizzes');
  }

  async create(createQuizResultDto: CreateQuizResultDto): Promise<any> {
    // Check if quiz exists and is available
    const quizDoc = await this.quizzesCollection.doc(createQuizResultDto.quizId).get();
    if (!quizDoc.exists) {
      throw new NotFoundException('Quiz not found');
    }

    const quizData: any = quizDoc.data();
    
    // Only allow submissions for AVAILABLE quizzes
    if (quizData.status !== 'available') {
      throw new BadRequestException('This quiz is not available for taking');
    }

    // Check if student already submitted
    const existingResult = await this.findByQuizAndStudent(
      createQuizResultDto.quizId,
      createQuizResultDto.studentId
    );
    
    if (existingResult.data) {
      throw new BadRequestException('You have already submitted this quiz');
    }

    // Auto-grade the quiz
    const gradingResult = this.gradeQuiz(quizData.questions, createQuizResultDto.answers);

    const resultData = {
      quizId: createQuizResultDto.quizId,
      studentId: createQuizResultDto.studentId,
      studentName: createQuizResultDto.studentName,
      answers: gradingResult.answers,
      totalScore: gradingResult.totalScore,
      totalMarks: quizData.totalMarks,
      percentage: gradingResult.percentage,
      submittedAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await this.resultsCollection.add(resultData);
    const doc = await docRef.get();
    
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async findByQuiz(quizId: string): Promise<any> {
    const snapshot = await this.resultsCollection
      .where('quizId', '==', quizId)
      .orderBy('submittedAt', 'desc')
      .get();
    
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: results };
  }

  async findByQuizAndStudent(quizId: string, studentId: string): Promise<any> {
    const snapshot = await this.resultsCollection
      .where('quizId', '==', quizId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return { success: true, data: null };
    }
    
    const doc = snapshot.docs[0];
    return { success: true, data: { id: doc.id, ...doc.data() } };
  }

  async findByStudent(studentId: string): Promise<any> {
    const snapshot = await this.resultsCollection
      .where('studentId', '==', studentId)
      .orderBy('submittedAt', 'desc')
      .get();
    
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: results };
  }

  async remove(id: string): Promise<any> {
    const doc = await this.resultsCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Quiz result not found');
    }
    
    await this.resultsCollection.doc(id).delete();
    return { success: true, message: 'Quiz result deleted successfully' };
  }

  private gradeQuiz(questions: any[], studentAnswers: any[]): any {
    let totalScore = 0;
    const gradedAnswers: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const studentAnswer = studentAnswers.find(a => a.questionIndex === i);
      
      const isCorrect = studentAnswer && studentAnswer.selectedAnswer === question.correctAnswer;
      const marksAwarded = isCorrect ? question.marks : 0;
      
      totalScore += marksAwarded;
      
      gradedAnswers.push({
        questionIndex: i,
        selectedAnswer: studentAnswer?.selectedAnswer || null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marksAwarded,
        maxMarks: question.marks,
      });
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    return {
      answers: gradedAnswers,
      totalScore,
      percentage,
    };
  }
}
