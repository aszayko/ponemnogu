import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firebaseApp } from './config.js';

export const db = getFirestore(firebaseApp);

function getInitialUserData(firebaseUser) {
  return {
    displayName:
      firebaseUser.displayName?.trim() ||
      firebaseUser.email?.split('@')[0] ||
      'Пользователь',
    email: firebaseUser.email ?? '',
    avatar: {
      bodyType: null,
      skinTone: 'default',
      hairStyle: null,
      hairColor: null,
      eyeColor: null,
      hoodieColor: null,
    },
    totalXp: 0,
    playerLevel: 1,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function ensureUserDocument(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data();
  }

  const initialData = getInitialUserData(firebaseUser);
  await setDoc(userRef, initialData);
  return initialData;
}

export async function getUserDocument(firebaseUser) {
  return ensureUserDocument(firebaseUser);
}

export async function saveAvatarProfile(firebaseUser, profile) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const avatar = {
    bodyType: profile.avatar.bodyType,
    skinTone: 'default',
    hairStyle: profile.avatar.hairStyle,
    hairColor: profile.avatar.hairColor,
    eyeColor: profile.avatar.eyeColor,
    hoodieColor: profile.avatar.hoodieColor,
  };

  await updateDoc(userRef, {
    displayName: profile.displayName,
    avatar,
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });

  return {
    displayName: profile.displayName,
    avatar,
    onboardingCompleted: true,
  };
}
