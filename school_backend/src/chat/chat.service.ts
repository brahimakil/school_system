import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'class' | 'private';
  classId?: string;
  teacherId: string;
  studentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'teacher' | 'student';
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
}

@Injectable()
export class ChatService {
  private db: admin.firestore.Firestore;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
  }

  async getTeacherRooms(teacherId: string): Promise<ChatRoom[]> {
    try {
      const roomsSnapshot = await this.db
        .collection('chatRooms')
        .where('teacherId', '==', teacherId)
        .get();

      const rooms: ChatRoom[] = [];
      for (const doc of roomsSnapshot.docs) {
        const data = doc.data();
        
        // Get last message for this room
        const lastMessageSnapshot = await this.db
          .collection('messages')
          .where('roomId', '==', doc.id)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        let lastMessage = '';
        let lastMessageTime: Date | undefined;
        if (!lastMessageSnapshot.empty) {
          const msgData = lastMessageSnapshot.docs[0].data();
          lastMessage = msgData.content || '';
          lastMessageTime = msgData.timestamp?.toDate();
        }

        // Get unread count (simplified - you might want to track per-user)
        const unreadSnapshot = await this.db
          .collection('messages')
          .where('roomId', '==', doc.id)
          .where('senderType', '==', 'student')
          .get();

        rooms.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          classId: data.classId,
          teacherId: data.teacherId,
          studentId: data.studentId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          unreadCount: unreadSnapshot.size,
          lastMessage,
          lastMessageTime,
        } as any);
      }

      return rooms.sort((a: any, b: any) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error fetching teacher rooms:', error);
      return [];
    }
  }

  async getStudentRooms(studentId: string): Promise<ChatRoom[]> {
    try {
      // Get student's grade and section first
      const studentDoc = await this.db.collection('students').doc(studentId).get();
      const studentData = studentDoc.data();
      
      console.log('DEBUG: Full student document:', JSON.stringify(studentData, null, 2));
      
      const grade = studentData?.currentGrade?.grade;
      const section = studentData?.currentGrade?.section;

      if (!studentData) {
        console.log('Student not found');
        return [];
      }

      console.log(`Fetching rooms for student ${studentId}, grade: ${grade}, section: ${section}`);

      const rooms: ChatRoom[] = [];
      const teacherIds = new Set<string>();

      // Get private rooms
      const privateRoomsSnapshot = await this.db
        .collection('chatRooms')
        .where('type', '==', 'private')
        .where('studentId', '==', studentId)
        .get();

      console.log(`Found ${privateRoomsSnapshot.docs.length} private rooms`);

      // Process private rooms
      for (const doc of privateRoomsSnapshot.docs) {
        const data = doc.data();
        teacherIds.add(data.teacherId);
        
        rooms.push({
          id: doc.id,
          name: '', // Will be filled with teacher name
          type: data.type,
          teacherId: data.teacherId,
          studentId: data.studentId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate(),
          studentUnreadCount: data.studentUnreadCount || 0,
          teacherName: data.teacherName || '',
        } as any);
      }

      // Get student's classes to find class chat rooms
      if (grade && section) {
        // Find all classes for this student's grade and section
        const classesSnapshot = await this.db
          .collection('classes')
          .get();

        const studentClassIds: string[] = [];
        
        console.log(`DEBUG: Checking ${classesSnapshot.docs.length} total classes`);
        
        for (const classDoc of classesSnapshot.docs) {
          const classData = classDoc.data();
          const gradeSections = classData.gradeSections || [];
          
          console.log(`DEBUG: Class ${classDoc.id} (${classData.className}) has gradeSections:`, JSON.stringify(gradeSections));
          console.log(`DEBUG: Looking for grade="${grade}" section="${section}"`);
          
          // Check if this class has the student's grade and section
          const hasStudentGradeSection = gradeSections.some(
            (gs: any) => {
              console.log(`DEBUG: Comparing gs.grade="${gs.grade}" === "${grade}" && gs.section="${gs.section}" === "${section}"`);
              return gs.grade === grade && gs.section === section;
            }
          );

          console.log(`DEBUG: Class ${classData.className} match: ${hasStudentGradeSection}`);

          if (hasStudentGradeSection) {
            studentClassIds.push(classDoc.id);
          }
        }

        console.log(`Found ${studentClassIds.length} classes for student's grade ${grade} section ${section}, IDs:`, studentClassIds);

        // Get chat rooms for these classes
        if (studentClassIds.length > 0) {
          // Firestore 'in' query supports up to 10 items
          const classRoomsSnapshot = await this.db
            .collection('chatRooms')
            .where('type', '==', 'class')
            .where('classId', 'in', studentClassIds.slice(0, 10))
            .get();

          console.log(`Found ${classRoomsSnapshot.docs.length} class chat rooms`);

          for (const doc of classRoomsSnapshot.docs) {
            const data = doc.data();
            teacherIds.add(data.teacherId);
            
            rooms.push({
              id: doc.id,
              name: data.name,
              type: data.type,
              classId: data.classId,
              teacherId: data.teacherId,
              isActive: data.isActive ?? true,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime?.toDate(),
              studentUnreadCount: data.studentUnreadCount || 0,
            } as any);
          }
        }
      }

      // Fetch all teacher names in one batch
      if (teacherIds.size > 0) {
        const teacherPromises = Array.from(teacherIds).map(id => 
          this.db.collection('teachers').doc(id).get()
        );
        const teacherDocs = await Promise.all(teacherPromises);
        const teacherMap = new Map<string, string>();
        
        for (const doc of teacherDocs) {
          const data = doc.data();
          teacherMap.set(doc.id, data?.fullName || data?.name || 'Teacher');
        }

        // Update private room names with teacher names (student should see teacher name, not their own name)
        for (const room of rooms) {
          if (room.type === 'private') {
            room.name = teacherMap.get(room.teacherId) || 'Teacher';
          }
        }
      }

      // Sort by last message time
      const sortedRooms = rooms.sort((a: any, b: any) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        }
        return 0;
      });

      console.log(`Returning ${sortedRooms.length} total rooms (${privateRoomsSnapshot.docs.length} private)`);
      return sortedRooms;
    } catch (error) {
      console.error('Error fetching student rooms:', error);
      return [];
    }
  }

  async getClassRooms(classId: string): Promise<ChatRoom[]> {
    try {
      const roomsSnapshot = await this.db
        .collection('chatRooms')
        .where('classId', '==', classId)
        .where('type', '==', 'class')
        .get();

      const rooms: ChatRoom[] = [];
      roomsSnapshot.forEach((doc) => {
        const data = doc.data();
        rooms.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          classId: data.classId,
          teacherId: data.teacherId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return rooms;
    } catch (error) {
      console.error('Error fetching class rooms:', error);
      return [];
    }
  }

  async getOrCreatePrivateRoom(teacherId: string, studentId: string): Promise<ChatRoom> {
    try {
      // Check if room exists
      const existingRoomSnapshot = await this.db
        .collection('chatRooms')
        .where('type', '==', 'private')
        .where('teacherId', '==', teacherId)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();

      if (!existingRoomSnapshot.empty) {
        const doc = existingRoomSnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          teacherId: data.teacherId,
          studentId: data.studentId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      // Create new room - store both student and teacher names
      const studentDoc = await this.db.collection('students').doc(studentId).get();
      const studentName = studentDoc.data()?.fullName || 'Student';
      
      const teacherDoc = await this.db.collection('teachers').doc(teacherId).get();
      const teacherName = teacherDoc.data()?.fullName || teacherDoc.data()?.name || 'Teacher';

      const roomRef = await this.db.collection('chatRooms').add({
        name: studentName,  // For teacher's view
        teacherName: teacherName,  // For student's view
        studentName: studentName,  // Explicit student name
        type: 'private',
        teacherId,
        studentId,
        isActive: true,
        teacherUnreadCount: 0,
        studentUnreadCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        id: roomRef.id,
        name: studentName,
        type: 'private',
        teacherId,
        studentId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating private room:', error);
      throw error;
    }
  }

  async getMessages(roomId: string, limit = 100): Promise<Message[]> {
    try {
      const messagesSnapshot = await this.db
        .collection('messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp', 'asc')
        .limit(limit)
        .get();

      const messages: Message[] = [];
      messagesSnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          roomId: data.roomId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderType: data.senderType,
          content: data.content,
          messageType: data.messageType || 'text',
          mediaUrl: data.mediaUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    senderType: 'teacher' | 'student',
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'document',
    mediaUrl?: string,
    fileName?: string,
    fileSize?: number,
  ): Promise<Message> {
    try {
      const messageData: any = {
        roomId,
        senderId,
        senderName,
        senderType,
        content,
        messageType: messageType || 'text',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.fileName = fileName;
        messageData.fileSize = fileSize;
      }

      const messageRef = await this.db.collection('messages').add(messageData);

      // Update room's last message, time, and increment unread count for the recipient
      // If student sends, increment teacherUnreadCount; if teacher sends, increment studentUnreadCount
      const unreadField = senderType === 'student' ? 'teacherUnreadCount' : 'studentUnreadCount';
      await this.db.collection('chatRooms').doc(roomId).update({
        lastMessage: content,
        lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        [unreadField]: admin.firestore.FieldValue.increment(1),
      });

      const messageDoc = await messageRef.get();
      const savedMessageData = messageDoc.data();

      return {
        id: messageRef.id,
        roomId,
        senderId,
        senderName,
        senderType,
        content,
        messageType: messageType || 'text',
        mediaUrl,
        fileName,
        fileSize,
        timestamp: savedMessageData?.timestamp?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markRoomAsRead(roomId: string, userType: 'teacher' | 'student'): Promise<void> {
    try {
      const unreadField = userType === 'teacher' ? 'teacherUnreadCount' : 'studentUnreadCount';
      await this.db.collection('chatRooms').doc(roomId).update({
        [unreadField]: 0,
      });
    } catch (error) {
      console.error('Error marking room as read:', error);
      throw error;
    }
  }

  async toggleChatStatus(roomId: string, isActive: boolean): Promise<void> {
    try {
      await this.db.collection('chatRooms').doc(roomId).update({
        isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling chat status:', error);
      throw error;
    }
  }

  async createClassChatRoom(classId: string, teacherId: string, className: string): Promise<ChatRoom> {
    try {
      // Check if room already exists
      const existingRoomSnapshot = await this.db
        .collection('chatRooms')
        .where('type', '==', 'class')
        .where('classId', '==', classId)
        .limit(1)
        .get();

      if (!existingRoomSnapshot.empty) {
        const doc = existingRoomSnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          classId: data.classId,
          teacherId: data.teacherId,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      // Create new room - default to OPEN
      const roomRef = await this.db.collection('chatRooms').add({
        name: className,
        type: 'class',
        classId,
        teacherId,
        isActive: true, // Default to OPEN
        teacherUnreadCount: 0,
        studentUnreadCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        id: roomRef.id,
        name: className,
        type: 'class',
        classId,
        teacherId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating class chat room:', error);
      throw error;
    }
  }

  async initializeStudentChatRooms(teacherId: string): Promise<{ created: number; existing: number }> {
    try {
      // Get all classes for this teacher
      const classesSnapshot = await this.db
        .collection('classes')
        .where('teacherId', '==', teacherId)
        .get();

      const studentIds = new Set<string>();
      
      // Get all students from the teacher's classes
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        const gradeSections = classData.gradeSections || [];

        for (const gradeSection of gradeSections) {
          const studentsSnapshot = await this.db
            .collection('students')
            .where('currentGrade.grade', '==', gradeSection.grade)
            .where('currentGrade.section', '==', gradeSection.section)
            .get();

          studentsSnapshot.docs.forEach(studentDoc => {
            studentIds.add(studentDoc.id);
          });
        }
      }

      let created = 0;
      let existing = 0;

      // Get teacher name once
      const teacherDoc = await this.db.collection('teachers').doc(teacherId).get();
      const teacherName = teacherDoc.data()?.fullName || teacherDoc.data()?.name || 'Teacher';

      // Create or get private chat room for each student
      for (const studentId of studentIds) {
        // Check if room already exists
        const existingRoomSnapshot = await this.db
          .collection('chatRooms')
          .where('type', '==', 'private')
          .where('teacherId', '==', teacherId)
          .where('studentId', '==', studentId)
          .limit(1)
          .get();

        if (existingRoomSnapshot.empty) {
          // Create new room with both names
          const studentDoc = await this.db.collection('students').doc(studentId).get();
          const studentData = studentDoc.data();
          const studentName = studentData?.fullName || studentData?.name || 'Student';

          await this.db.collection('chatRooms').add({
            name: studentName,  // For teacher's view
            teacherName: teacherName,  // For student's view
            studentName: studentName,  // Explicit student name
            type: 'private',
            teacherId,
            studentId,
            isActive: true,
            teacherUnreadCount: 0,
            studentUnreadCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          created++;
        } else {
          // Update existing room to add teacherName if missing
          const existingRoom = existingRoomSnapshot.docs[0];
          const existingData = existingRoom.data();
          if (!existingData.teacherName) {
            await existingRoom.ref.update({
              teacherName: teacherName,
              studentName: existingData.name || 'Student',
            });
          }
          existing++;
        }
      }

      return { created, existing };
    } catch (error) {
      console.error('Error initializing student chat rooms:', error);
      throw error;
    }
  }
}
