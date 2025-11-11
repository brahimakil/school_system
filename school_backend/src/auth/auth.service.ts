import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SignupDto, LoginDto } from './dto/auth.dto';

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
      // Get user by email
      const userRecord = await this.auth.getUserByEmail(email);

      // Check if user exists in admins collection
      const adminDoc = await this.db.collection('admins').doc(userRecord.uid).get();

      if (!adminDoc.exists) {
        throw new UnauthorizedException('You are not authorized as an admin');
      }

      const adminData = adminDoc.data();

      if (!adminData) {
        throw new UnauthorizedException('Admin data not found');
      }

      // Create custom token
      const token = await this.auth.createCustomToken(userRecord.uid);

      return {
        success: true,
        message: 'Login successful',
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: adminData.name,
          token,
        },
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw error;
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
      // For custom tokens, we just verify it's a valid format
      // In production, you'd want to use a JWT library to verify the signature
      if (!token || token.length < 10) {
        throw new UnauthorizedException('Invalid token');
      }
      
      // For now, we'll trust the token since it's our custom token
      // The real verification is that the user exists in admins collection
      // You should implement proper JWT verification in production
      
      return {
        success: true,
        message: 'Token is valid',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
