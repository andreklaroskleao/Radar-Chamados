'use client';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
const firestoreByApp = new WeakMap<FirebaseApp, Firestore>();

export function isFirebaseConfigured() {
  return Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
}

export function getFirebaseClient() {
  if (!isFirebaseConfigured()) throw new Error('A configuração pública do Firebase está incompleta. Confira as variáveis NEXT_PUBLIC_FIREBASE_*.');
  const app = getApps().length ? getApp() : initializeApp(config);
  // Force WebChannel long-polling because some mobile networks and proxies
  // report a successful Auth connection but leave Firestore marked offline.
  // initializeFirestore may configure a Firestore instance only once per app.
  // This accessor is shared by many components and can run again after HMR.
  let db = firestoreByApp.get(app);
  if (!db) {
    try {
      db = initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      const alreadyStarted = firebaseError.code === 'failed-precondition'
        && /already been started/i.test(firebaseError.message || '');
      if (!alreadyStarted) throw error;
      // The module cache may reset during hot reload while Firebase keeps its
      // app and Firestore instances alive. Recover the existing client then.
      db = getFirestore(app);
    }
    firestoreByApp.set(app, db);
  }
  return { app, auth: getAuth(app), db };
}

