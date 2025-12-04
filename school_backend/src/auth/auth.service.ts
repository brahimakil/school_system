import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SignupDto, LoginDto, StudentSignupDto, StudentLoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private db: admin.firestore.Firestore;
  private auth: admin.auth.Auth;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.auth = firebaseAdmin.auth();
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    try {
      // Create user in Firebase Auth
      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Save admin to Firestore admins collection
      await this.db.collection('admins').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isAdmin: true,
      });

      // Create custom token for login
      const token = await this.auth.createCustomToken(userRecord.uid);

      return {
        success: true,
        message: 'Admin registered successfully',
        data: {
          uid: userRecord.uid,
          email,
          name,
          token,
        },
      };
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      // First, verify the password by trying to sign in with Firebase Auth
      // Note: Firebase Admin SDK doesn't have a direct password verification method
      // We need to use the Firebase REST API to verify the password
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const authData = await response.json();
      const uid = authData.localId;

      // Check if user exists in admins collection
      const adminDoc = await this.db.collection('admins').doc(uid).get();

      if (!adminDoc.exists) {
        throw new UnauthorizedException('You are not authorized as an admin');
      }

      const adminData = adminDoc.data();

      if (!adminData) {
        throw new UnauthorizedException('Admin data not found');
      }

      // Create custom token
      const token = await this.auth.createCustomToken(uid);

      return {
        success: true,
        message: 'Login successful',
        data: {
          uid: uid,
          email: email,
          name: adminData.name,
          token,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async teacherLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const authData = await response.json();
      const uid = authData.localId;
      const idToken = authData.idToken; // Get the ID token from Firebase

      // Check if user exists in teachers collection
      const teacherDoc = await this.db.collection('teachers').doc(uid).get();

      if (!teacherDoc.exists) {
        throw new UnauthorizedException('You are not registered as a teacher');
      }

      const teacherData = teacherDoc.data();

      if (!teacherData) {
        throw new UnauthorizedException('Teacher data not found');
      }

      if (teacherData.status !== 'active') {
        throw new UnauthorizedException('Your account is not active. Please contact administration.');
      }

      return {
        success: true,
        message: 'Login successful',
        data: {
          id: uid,
          email: email,
          name: teacherData.fullName,
          subject: teacherData.subjects?.[0] || '',
          token: idToken, // Return the ID token from Firebase
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async verifyAdmin(uid: string) {
    try {
      const adminDoc = await this.db.collection('admins').doc(uid).get();

      if (!adminDoc.exists) {
        throw new UnauthorizedException('You are not authorized as an admin');
      }

      return {
        success: true,
        message: 'Admin verified',
        data: adminDoc.data(),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid admin');
    }
  }

  async verifyToken(token: string) {
    try {
      // Verify Firebase ID token
      const decodedToken = await this.auth.verifyIdToken(token);
      
      return {
        success: true,
        message: 'Token is valid',
        data: {
          uid: decodedToken.uid,
        },
      };
    } catch (error) {
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async studentSignup(studentSignupDto: StudentSignupDto) {
    const { email, password, fullName, phoneNumber, currentGrade } = studentSignupDto;

    try {
      // Create user in Firebase Auth
      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName: fullName,
      });

      // Save student to Firestore students collection
      const studentData = {
        uid: userRecord.uid,
        email,
        fullName,
        phoneNumber,
        currentGrade,
        passedGrades: [],
        status: 'active',
        photoUrl: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection('students').doc(userRecord.uid).set(studentData);

      // Create custom token for login
      const token = await this.auth.createCustomToken(userRecord.uid);

      return {
        success: true,
        message: 'Student registered successfully',
        data: {
          uid: userRecord.uid,
          email,
          fullName,
          phoneNumber,
          currentGrade,
          photoUrl: '',
          token,
        },
      };
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async studentLogin(studentLoginDto: StudentLoginDto) {
    const { email, password } = studentLoginDto;

    try {
      // Verify password using Firebase REST API
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const authData = await response.json();
      const uid = authData.localId;

      // Check if user exists in students collection
      const studentDoc = await this.db.collection('students').doc(uid).get();

      if (!studentDoc.exists) {
        throw new UnauthorizedException('You are not registered as a student');
      }

      const studentData = studentDoc.data();

      if (!studentData) {
        throw new UnauthorizedException('Student data not found');
      }

      if (studentData.status !== 'active') {
        throw new UnauthorizedException('Your account is not active. Please contact administration.');
      }

      // Create custom token
      const token = await this.auth.createCustomToken(uid);

      return {
        success: true,
        message: 'Login successful',
        data: {
          uid: uid,
          email: email,
          fullName: studentData.fullName,
          phoneNumber: studentData.phoneNumber,
          currentGrade: studentData.currentGrade,
          photoUrl: studentData.photoUrl || '',
          token,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid email or password');
    }
  }
}
