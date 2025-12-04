import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class UploadsService {
  private readonly storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin) {
    this.storage = this.firebaseAdmin.storage();
  }

  async uploadToFirebase(file: Express.Multer.File): Promise<string> {
    const bucket = this.storage.bucket();
    const fileName = `submissions/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Make the file publicly accessible
    await fileUpload.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }
}
