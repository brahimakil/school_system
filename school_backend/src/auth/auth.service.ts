import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { SignupDto, LoginDto, StudentSignupDto, StudentLoginDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private db: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private transporter: nodemailer.Transporter;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
    this.db = firebaseAdmin.firestore();
    this.auth = firebaseAdmin.auth();
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
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

      // Look up the subject name from the subjects collection
      let subjectName = '';
      const subjectId = teacherData.subjects?.[0];
      if (subjectId) {
        const subjectDoc = await this.db.collection('subjects').doc(subjectId).get();
        if (subjectDoc.exists) {
          const subjectData = subjectDoc.data();
          subjectName = subjectData?.name || '';
        }
      }

      return {
        success: true,
        message: 'Login successful',
        data: {
          id: uid,
          email: email,
          name: teacherData.fullName,
          subject: subjectName,
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

  async initiateStudentLogin(studentLoginDto: StudentLoginDto) {
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

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      console.log(`[OTP] Generated for ${email}: ${otp}`);

      // Save OTP to Firestore
      await this.db.collection('otp_codes').doc(email).set({
        otp,
        expiresAt,
        uid,
      });

      // Send Email
      await this.transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: email,
        subject: 'Your Login Verification Code',
        text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
        html: `<p>Your verification code is: <b>${otp}</b></p><p>It expires in 5 minutes.</p>`,
      });

      console.log(`[OTP] Email sent successfully to ${email}`);

      return {
        success: true,
        message: 'OTP sent to your email',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login init error:', error);
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async verifyStudentLogin(verifyDto: VerifyOtpDto) {
    const { email, otp } = verifyDto;

    try {
      const otpDoc = await this.db.collection('otp_codes').doc(email).get();

      if (!otpDoc.exists) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      const otpData = otpDoc.data();

      if (!otpData) {
        throw new UnauthorizedException('Invalid OTP data');
      }

      if (otpData.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      if (Date.now() > otpData.expiresAt) {
        await this.db.collection('otp_codes').doc(email).delete();
        throw new UnauthorizedException('OTP expired');
      }

      // OTP is valid, proceed to login
      const uid = otpData.uid;

      // Get student data again to return it
      const studentDoc = await this.db.collection('students').doc(uid).get();
      const studentData = studentDoc.data();

      if (!studentData) {
        throw new UnauthorizedException('Student data not found');
      }

      // Create custom token
      const token = await this.auth.createCustomToken(uid);

      // Delete used OTP
      await this.db.collection('otp_codes').doc(email).delete();

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
      throw error;
    }
  }
}
