import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { CreateClassDto, UpdateClassDto, GradeSection } from './dto/class.dto';
import * as admin from 'firebase-admin';
import { ActivityLogService } from '../activity-log/activity-log.service';

export interface ClassData {
  id?: string;
  className: string;
  teacherId: string;
  teacherName?: string;
  gradeSections: GradeSection[];
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  studentIds?: string[];
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ClassesService {
  private db: admin.firestore.Firestore;
  private classesCollection: admin.firestore.CollectionReference;
  private studentsCollection: admin.firestore.CollectionReference;
  private teachersCollection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
    private activityLogService: ActivityLogService,
  ) {
    this.db = firebaseAdmin.firestore();
    this.classesCollection = this.db.collection('classes');
    this.studentsCollection = this.db.collection('students');
    this.teachersCollection = this.db.collection('teachers');
  }

  private async createClassChatRoom(classId: string, teacherId: string, className: string): Promise<void> {
    try {
      // Check if chat room already exists for this class NAME and teacher
      // (NOT by classId, because each schedule period has a different classId)
      const existingRoomSnapshot = await this.db
        .collection('chatRooms')
        .where('type', '==', 'class')
        .where('name', '==', className)
        .where('teacherId', '==', teacherId)
        .limit(1)
        .get();

      if (!existingRoomSnapshot.empty) {
        console.log(`Chat room already exists for class "${className}" (teacher: ${teacherId})`);
        return;
      }

      // Create new chat room (only one per class name per teacher)
      // Default to OPEN (isActive: true) so students can chat immediately
      await this.db.collection('chatRooms').add({
        name: className,
        type: 'class',
        classId, // Keep first classId for reference
        teacherId,
        isActive: true, // Default to OPEN
        teacherUnreadCount: 0,
        studentUnreadCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Created chat room for class "${className}" (teacher: ${teacherId})`);
    } catch (error) {
      console.error('Error creating class chat room:', error);
    }
  }

  // Auto-create private chat rooms for all students in the class's grade-sections
  private async createPrivateChatRoomsForStudents(teacherId: string, gradeSections: GradeSection[]): Promise<void> {
    try {
      // Get teacher name
      const teacherDoc = await this.teachersCollection.doc(teacherId).get();
      const teacherData = teacherDoc.data();
      const teacherName = teacherData?.fullName || teacherData?.name || 'Teacher';

      // Get all students matching the grade-sections
      for (const gs of gradeSections) {
        const studentsSnapshot = await this.studentsCollection
          .where('currentGrade.grade', '==', gs.grade)
          .where('currentGrade.section', '==', gs.section)
          .get();

        for (const studentDoc of studentsSnapshot.docs) {
          const studentId = studentDoc.id;
          const studentData = studentDoc.data();
          const studentName = studentData?.fullName || studentData?.name || 'Student';

          // Check if private chat room already exists
          const existingRoomSnapshot = await this.db
            .collection('chatRooms')
            .where('type', '==', 'private')
            .where('teacherId', '==', teacherId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

          if (existingRoomSnapshot.empty) {
            // Create new private chat room
            await this.db.collection('chatRooms').add({
              name: studentName,  // For teacher's view
              teacherName: teacherName,  // For student's view
              studentName: studentName,
              type: 'private',
              teacherId,
              studentId,
              isActive: true,
              teacherUnreadCount: 0,
              studentUnreadCount: 0,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Created private chat room: Teacher ${teacherName} <-> Student ${studentName}`);
          }
        }
      }
    } catch (error) {
      console.error('Error creating private chat rooms for students:', error);
    }
  }

  // Helper: Check if two time ranges overlap
  private timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    // Overlap if: start1 < end2 AND start2 < end1
    return s1 < e2 && s2 < e1;
  }

  // Helper: Check if grade-section exists in array
  private hasGradeSectionMatch(gradeSections1: GradeSection[], gradeSections2: GradeSection[]): boolean {
    return gradeSections1.some(gs1 =>
      gradeSections2.some(gs2 => gs1.grade === gs2.grade && gs1.section === gs2.section)
    );
  }

  // Validate no conflicts before creating/updating
  private async validateNoConflicts(
    classData: CreateClassDto | UpdateClassDto,
    excludeClassId?: string
  ): Promise<void> {
    const { teacherId, gradeSections, dayOfWeek, startTime, endTime } = classData as any;

    // Validate end time is after start time
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      throw new ConflictException('End time must be after start time');
    }

    // Get all classes for this day
    const classesSnapshot = await this.classesCollection
      .where('dayOfWeek', '==', dayOfWeek)
      .get();

    const existingClasses = classesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ClassData))
      .filter(c => c.id !== excludeClassId); // Exclude current class if updating

    for (const existingClass of existingClasses) {
      // Check if times overlap
      if (!this.timeRangesOverlap(startTime, endTime, existingClass.startTime, existingClass.endTime)) {
        continue; // No time overlap, skip this class
      }

      // Times overlap - check for grade-section conflict
      if (this.hasGradeSectionMatch(gradeSections, existingClass.gradeSections)) {
        const conflictGS = gradeSections.find(gs1 =>
          existingClass.gradeSections.some(gs2 => gs1.grade === gs2.grade && gs1.section === gs2.section)
        );
        throw new ConflictException(
          `Grade ${conflictGS.grade} Section ${conflictGS.section} already has "${existingClass.className}" ` +
          `on ${dayOfWeek} from ${existingClass.startTime} to ${existingClass.endTime}`
        );
      }

      // Times overlap - check for teacher conflict
      if (teacherId === existingClass.teacherId) {
        throw new ConflictException(
          `Teacher is already assigned to "${existingClass.className}" ` +
          `on ${dayOfWeek} from ${existingClass.startTime} to ${existingClass.endTime}`
        );
      }
    }
  }

  // Get students that match the class's grade-sections
  private async getMatchingStudents(gradeSections: GradeSection[]): Promise<string[]> {
    const studentIds: string[] = [];

    for (const gs of gradeSections) {
      const studentsSnapshot = await this.studentsCollection
        .where('currentGrade.grade', '==', gs.grade)
        .where('currentGrade.section', '==', gs.section)
        .get();

      studentsSnapshot.docs.forEach(doc => {
        if (!studentIds.includes(doc.id)) {
          studentIds.push(doc.id);
        }
      });
    }

    return studentIds;
  }

  async create(createClassDto: CreateClassDto): Promise<ClassData> {
    // Validate no conflicts
    await this.validateNoConflicts(createClassDto);

    // Get teacher name
    const teacherDoc = await this.teachersCollection.doc(createClassDto.teacherId).get();
    if (!teacherDoc.exists) {
      throw new NotFoundException('Teacher not found');
    }
    const teacherData = teacherDoc.data();
    if (!teacherData) {
      throw new NotFoundException('Teacher data not found');
    }

    // Get matching students
    const studentIds = await this.getMatchingStudents(createClassDto.gradeSections);

    const classData = {
      ...createClassDto,
      teacherName: teacherData.fullName,
      studentIds,
      studentCount: studentIds.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await this.classesCollection.add(classData);
    const classId = docRef.id;

    // Log activity
    await this.activityLogService.logActivity({
      type: 'class',
      action: 'created',
      entityId: classId,
      entityName: createClassDto.className,
      details: `Class created on ${createClassDto.dayOfWeek} from ${createClassDto.startTime} to ${createClassDto.endTime}`,
    });

    // Create chat room for the class
    await this.createClassChatRoom(classId, createClassDto.teacherId, createClassDto.className);

    // Auto-create private chat rooms for all students in the class's grade-sections
    await this.createPrivateChatRoomsForStudents(createClassDto.teacherId, createClassDto.gradeSections);

    return { id: classId, ...classData };
  }

  async findAll(): Promise<ClassData[]> {
    const snapshot = await this.classesCollection.orderBy('dayOfWeek').orderBy('startTime').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
  }

  async findByGradeSection(grade: string, section: string): Promise<ClassData[]> {
    const allClasses = await this.findAll();

    // Filter classes that include this grade-section
    return allClasses.filter(classData =>
      classData.gradeSections.some(gs =>
        gs.grade === grade && gs.section === section
      )
    );
  }

  async findOne(id: string): Promise<ClassData> {
    const doc = await this.classesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Class not found');
    }
    return { id: doc.id, ...doc.data() } as ClassData;
  }

  async update(id: string, updateClassDto: UpdateClassDto): Promise<ClassData> {
    const classDoc = await this.classesCollection.doc(id).get();
    if (!classDoc.exists) {
      throw new NotFoundException('Class not found');
    }

    const currentData = classDoc.data() as ClassData;
    const updatedData = { ...currentData, ...updateClassDto };

    // Validate no conflicts (excluding current class)
    await this.validateNoConflicts(updatedData, id);

    // Update teacher name if teacher changed
    if (updateClassDto.teacherId && updateClassDto.teacherId !== currentData.teacherId) {
      const teacherDoc = await this.teachersCollection.doc(updateClassDto.teacherId).get();
      if (!teacherDoc.exists) {
        throw new NotFoundException('Teacher not found');
      }
      const teacherData = teacherDoc.data();
      if (teacherData) {
        updatedData.teacherName = teacherData.fullName;
      }
    }

    // Update students if gradeSections changed
    if (updateClassDto.gradeSections) {
      const studentIds = await this.getMatchingStudents(updateClassDto.gradeSections);
      updatedData.studentIds = studentIds;
      updatedData.studentCount = studentIds.length;
    }

    updatedData.updatedAt = new Date().toISOString();

    await this.classesCollection.doc(id).update(updatedData);
    return { id, ...updatedData };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.classesCollection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Class not found');
    }

    const classData = doc.data() as ClassData;
    const className = classData?.className || 'Unknown Class';

    // Log activity before deletion
    await this.activityLogService.logActivity({
      type: 'class',
      action: 'deleted',
      entityId: id,
      entityName: className,
      details: `Class removed from the system`,
    });

    await this.classesCollection.doc(id).delete();
  }

  // Get all students enrolled in this class
  async getClassStudents(id: string): Promise<any[]> {
    const classDoc = await this.classesCollection.doc(id).get();
    if (!classDoc.exists) {
      throw new NotFoundException('Class not found');
    }

    const classData = classDoc.data() as ClassData;
    const studentIds = classData.studentIds || [];

    const students: any[] = [];
    for (const studentId of studentIds) {
      const studentDoc = await this.studentsCollection.doc(studentId).get();
      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        if (studentData) {
          students.push({ id: studentDoc.id, ...studentData });
        }
      }
    }

    return students;
  }

  async initializeChatRooms(): Promise<{ success: boolean; message: string; created: number }> {
    try {
      const classesSnapshot = await this.classesCollection.get();
      let created = 0;

      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data() as ClassData;
        await this.createClassChatRoom(classDoc.id, classData.teacherId, classData.className);
        created++;
      }

      return {
        success: true,
        message: `Initialized chat rooms for ${created} classes`,
        created,
      };
    } catch (error) {
      console.error('Error initializing chat rooms:', error);
      return {
        success: false,
        message: 'Failed to initialize chat rooms',
        created: 0,
      };
    }
  }
}
