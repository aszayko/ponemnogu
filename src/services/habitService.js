import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/db.js';
import { getLocalDateKey } from '../logic/dates.js';
import { normalizeGoal, normalizeSchedule } from '../logic/schedules.js';

function requireUser(firebaseUser) {
  if (!firebaseUser?.uid) {
    throw new Error('Сессия завершилась. Войдите снова.');
  }

  return firebaseUser.uid;
}

function normalizeName(name) {
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    throw new Error('Введите название привычки.');
  }

  if (normalizedName.length > 80) {
    throw new Error('Название привычки должно быть не длиннее 80 символов.');
  }

  return normalizedName;
}

function normalizeIcon(icon) {
  const normalizedIcon = String(icon ?? '').trim();

  if (!normalizedIcon) {
    throw new Error('Выберите иконку привычки.');
  }

  return normalizedIcon;
}

function editableHabitFields(values) {
  return {
    name: normalizeName(values.name),
    icon: normalizeIcon(values.icon),
    ...normalizeSchedule(values),
    ...normalizeGoal(values),
  };
}

function timestampValue(timestamp) {
  return timestamp?.toMillis?.() ?? 0;
}

export async function getActiveHabits(firebaseUser) {
  const uid = requireUser(firebaseUser);
  const snapshot = await getDocs(collection(db, 'users', uid, 'habits'));

  return snapshot.docs
    .map((habitDocument) => ({ ...habitDocument.data(), id: habitDocument.id }))
    .filter(({ archived }) => archived !== true)
    .sort((left, right) => timestampValue(left.createdAt) - timestampValue(right.createdAt));
}

export async function createHabit(firebaseUser, values) {
  const uid = requireUser(firebaseUser);
  const habit = {
    ...editableHabitFields(values),
    habitStrength: 0,
    archived: false,
    startDate: getLocalDateKey(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(collection(db, 'users', uid, 'habits'), habit);
  return { ...habit, id: reference.id };
}

export async function updateHabit(firebaseUser, habitId, values) {
  const uid = requireUser(firebaseUser);

  await updateDoc(doc(db, 'users', uid, 'habits', habitId), {
    ...editableHabitFields(values),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveHabit(firebaseUser, habitId) {
  const uid = requireUser(firebaseUser);

  await updateDoc(doc(db, 'users', uid, 'habits', habitId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}
