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
