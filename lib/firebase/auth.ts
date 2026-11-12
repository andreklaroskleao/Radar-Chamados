'use client';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from './client';

export async function ensureUserDocuments(user: User, displayName?: string) {
  const { db } = getFirebaseClient();
  const userRef = doc(db, 'users', user.uid);
  const profileRef = doc(db, 'professionalProfiles', user.uid);
  const [userSnapshot, profileSnapshot] = await Promise.all([getDoc(userRef), getDoc(profileRef)]);
  if (userSnapshot.exists() && profileSnapshot.exists()) return;
  const name = displayName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Profissional';
  const batch = writeBatch(db);
  if (!userSnapshot.exists()) batch.set(userRef, { displayName: name, accountStatus: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  if (!profileSnapshot.exists()) batch.set(profileRef, {
    userId: user.uid, displayName: name, headline: '', bio: '', specialties: [], courses: [], qualifications: [], certifications: [],
    hasVehicle: false, ownsTools: false, experienceYears: 0, accountStatus: 'active',
    stateCode: 'RS', cityCode: '', serviceCityCodes: [], acceptsTravel: false, available: true,
    visibility: 'private', moderationStatus: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  await batch.commit();
}
export async function registerWithEmail(name: string, email: string, password: string) {
  const { auth } = getFirebaseClient();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(result.user, { displayName: name.trim() });
  await ensureUserDocuments(result.user, name);
  return result.user;
}
export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(getFirebaseClient().auth, email.trim(), password);
  await ensureUserDocuments(result.user);
  return result.user;
}
export async function logout() { await signOut(getFirebaseClient().auth); }
export async function sendPasswordReset(email: string) { await sendPasswordResetEmail(getFirebaseClient().auth, email.trim()); }


