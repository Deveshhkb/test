import fs from 'fs';
import admin from 'firebase-admin';
import { env } from './env';

let app: admin.app.App | null = null;

/**
 * Firebase Admin is optional in local dev (falls back to JWT-only auth);
 * in production a service account is required for ID-token verification
 * and FCM push delivery.
 */
export const getFirebase = (): admin.app.App | null => {
  if (app) return app;
  const path = env.firebaseServiceAccountPath;
  if (!path || !fs.existsSync(path)) {
    if (env.isProd) throw new Error('Firebase service account is required in production');
    return null;
  }
  app = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(fs.readFileSync(path, 'utf-8'))),
  });
  return app;
};

export const verifyFirebaseIdToken = async (idToken: string) => {
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase Admin not configured');
  return firebase.auth().verifyIdToken(idToken);
};

export const sendPushToTokens = async (
  tokens: string[],
  notification: { title: string; body: string },
  data: Record<string, string> = {},
): Promise<void> => {
  const firebase = getFirebase();
  if (!firebase || tokens.length === 0) return;
  await firebase.messaging().sendEachForMulticast({
    tokens,
    notification,
    data,
    android: { priority: 'high', notification: { channelId: 'orders' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });
};
