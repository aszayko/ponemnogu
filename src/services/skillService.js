import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/db.js';

function requireUser(firebaseUser) {
  if (!firebaseUser?.uid) {
    throw new Error('Сессия завершилась. Войдите снова.');
  }

  return firebaseUser.uid;
}

function normalizeName(name) {
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    throw new Error('Введите название навыка.');
  }

  if (normalizedName.length > 60) {
    throw new Error('Название навыка должно быть не длиннее 60 символов.');
  }

  return normalizedName;
}

function normalizeIcon(icon) {
  const normalizedIcon = String(icon ?? '').trim();

  if (!normalizedIcon) {
    throw new Error('Выберите иконку навыка.');
  }

  return normalizedIcon;
}

function timestampValue(timestamp) {
  return timestamp?.toMillis?.() ?? 0;
}

export async function getActiveSkills(firebaseUser) {
  const uid = requireUser(firebaseUser);
  const snapshot = await getDocs(collection(db, 'users', uid, 'skills'));

  return snapshot.docs
    .map((skillDocument) => ({ ...skillDocument.data(), id: skillDocument.id }))
    .filter(({ archived }) => archived !== true)
    .sort((left, right) => timestampValue(left.createdAt) - timestampValue(right.createdAt));
}

export async function createSkill(firebaseUser, { name, icon }) {
  const uid = requireUser(firebaseUser);
  const skill = {
    name: normalizeName(name),
    icon: normalizeIcon(icon),
    totalMinutes: 0,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(collection(db, 'users', uid, 'skills'), skill);
  return { id: reference.id, ...skill };
}

export async function updateSkill(firebaseUser, skillId, { name, icon }) {
  const uid = requireUser(firebaseUser);

  await updateDoc(doc(db, 'users', uid, 'skills', skillId), {
    name: normalizeName(name),
    icon: normalizeIcon(icon),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveSkill(firebaseUser, skillId) {
  const uid = requireUser(firebaseUser);

  await updateDoc(doc(db, 'users', uid, 'skills', skillId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}
