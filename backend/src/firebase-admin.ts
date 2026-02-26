import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

// Load environment variables from .env in the backend folder
dotenv.config();

let app: admin.app.App | undefined;

export function getFirebaseAdmin(): admin.app.App {
  if (app) {
    return app;
  }

  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Convert \n in the env var into real newlines
    const privateKey = rawPrivateKey?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY env vars.',
      );
    }

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = admin.app();
  }

  return app;
}

