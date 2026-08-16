import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/db.js';
import {
  getHabitLogId,
  getIsoWeekday,
  parseLocalDateKey,
  validatePastOrTodayDate,
} from '../logic/dates.js';
import { calculateHabitStrength } from '../logic/habitStrength.js';
import { calculatePlayerProgress } from '../logic/playerXp.js';
import { isHabitPlannedOnDate } from '../logic/schedules.js';

function requireUser(firebaseUser) {
  if (!firebaseUser?.uid) {
    throw new Error('Сессия завершилась. Войдите снова.');
  }

  return firebaseUser.uid;
}

function normalizeMinutes(minutes) {
  const normalizedMinutes = Number(minutes);

  if (!Number.isInteger(normalizedMinutes) || normalizedMinutes <= 0) {
    throw new Error('Количество минут должно быть больше нуля.');
  }

  return normalizedMinutes;
}

function clampSkillMinutes(totalMinutes) {
  const minutes = Number(totalMinutes);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
}

export async function getHabitLogsForRange(firebaseUser, startDate, endDate) {
  const uid = requireUser(firebaseUser);
  const logsQuery = query(
    collection(db, 'users', uid, 'habitLogs'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  );
  const snapshot = await getDocs(logsQuery);

  return snapshot.docs.map((logDocument) => ({
    ...logDocument.data(),
    id: logDocument.id,
  }));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function commitUpdates(updates) {
  const batchSize = 450;

  for (let offset = 0; offset < updates.length; offset += batchSize) {
    const batch = writeBatch(db);
    updates.slice(offset, offset + batchSize).forEach(({ reference, data }) => {
      batch.update(reference, data);
    });
    await batch.commit();
  }
}

export async function synchronizeProgress(firebaseUser) {
  const uid = requireUser(firebaseUser);
  const habitsReference = collection(db, 'users', uid, 'habits');
  const logsReference = collection(db, 'users', uid, 'habitLogs');
  const userReference = doc(db, 'users', uid);
  const [habitsSnapshot, logsSnapshot, userSnapshot] = await Promise.all([
    getDocs(habitsReference),
    getDocs(logsReference),
    getDoc(userReference),
  ]);

  if (!userSnapshot.exists()) {
    throw new Error('Профиль пользователя не найден.');
  }

  const habits = habitsSnapshot.docs.map((snapshot) => ({
    ...snapshot.data(),
    id: snapshot.id,
  }));
  const logs = logsSnapshot.docs.map((snapshot) => ({
    ...snapshot.data(),
    id: snapshot.id,
  }));
  const updates = [];

  habits.forEach((habit) => {
    const habitStrength = calculateHabitStrength(habit, logs);
    if (numberOrZero(habit.habitStrength) !== habitStrength) {
      updates.push({
        reference: doc(db, 'users', uid, 'habits', habit.id),
        data: { habitStrength, updatedAt: serverTimestamp() },
      });
    }
  });

  const playerProgress = calculatePlayerProgress(habits, logs);
  logs.forEach((log) => {
    const xpAwarded = playerProgress.awards.get(log.id) ?? 0;
    if (numberOrZero(log.xpAwarded) !== xpAwarded) {
      updates.push({
        reference: doc(db, 'users', uid, 'habitLogs', log.id),
        data: { xpAwarded, updatedAt: serverTimestamp() },
      });
    }
  });

  const user = userSnapshot.data();
  if (
    numberOrZero(user.totalXp) !== playerProgress.totalXp
    || numberOrZero(user.playerLevel) !== playerProgress.playerLevel
  ) {
    updates.push({
      reference: userReference,
      data: {
        totalXp: playerProgress.totalXp,
        playerLevel: playerProgress.playerLevel,
        updatedAt: serverTimestamp(),
      },
    });
  }

  await commitUpdates(updates);
  return {
    totalXp: playerProgress.totalXp,
    playerLevel: playerProgress.playerLevel,
  };
}

export async function setHabitCompletion(firebaseUser, habit, date, actualMinutes = null) {
  const uid = requireUser(firebaseUser);
  const normalizedDate = validatePastOrTodayDate(date);
  const parsedDate = parseLocalDateKey(normalizedDate);

  if (!habit?.id || !isHabitPlannedOnDate(habit, normalizedDate, getIsoWeekday(parsedDate))) {
    throw new Error('Этот день не запланирован для привычки.');
  }

  const minutes = habit.goalType === 'minutes' ? normalizeMinutes(actualMinutes) : null;
  const habitLogId = getHabitLogId(habit.id, normalizedDate);
  const habitLogRef = doc(db, 'users', uid, 'habitLogs', habitLogId);

  await runTransaction(db, async (transaction) => {
    const habitLogSnapshot = await transaction.get(habitLogRef);

    if (habitLogSnapshot.exists()) {
      throw new Error('Этот день уже отмечен.');
    }

    transaction.set(habitLogRef, {
      habitId: habit.id,
      date: normalizedDate,
      completed: true,
      actualMinutes: minutes,
      xpAwarded: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await synchronizeProgress(firebaseUser);

  return habitLogId;
}

export async function removeHabitCompletion(firebaseUser, habit, date) {
  const uid = requireUser(firebaseUser);
  const normalizedDate = validatePastOrTodayDate(date);
  const habitId = typeof habit === 'string' ? habit : habit?.id;

  if (!habitId || (habit?.startDate && normalizedDate < habit.startDate)) {
    throw new Error('Нельзя изменить дату до создания привычки.');
  }

  const habitLogId = getHabitLogId(habitId, normalizedDate);
  const habitLogRef = doc(db, 'users', uid, 'habitLogs', habitLogId);
  await deleteDoc(habitLogRef);
  await synchronizeProgress(firebaseUser);
}

export async function addManualSkillPractice(firebaseUser, { skillId, date, minutes }) {
  const uid = requireUser(firebaseUser);
  const normalizedSkillId = String(skillId ?? '').trim();

  if (!normalizedSkillId) {
    throw new Error('Выберите навык.');
  }

  const normalizedDate = validatePastOrTodayDate(date);
  const normalizedMinutes = normalizeMinutes(minutes);
  const skillRef = doc(db, 'users', uid, 'skills', normalizedSkillId);
  const skillLogRef = doc(collection(db, 'users', uid, 'skillLogs'));

  await runTransaction(db, async (transaction) => {
    const skillSnapshot = await transaction.get(skillRef);

    if (!skillSnapshot.exists() || skillSnapshot.data().archived === true) {
      throw new Error('Выбранный навык недоступен.');
    }

    transaction.set(skillLogRef, {
      skillId: normalizedSkillId,
      date: normalizedDate,
      minutes: normalizedMinutes,
      source: 'manual',
      habitId: null,
      habitLogId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(skillRef, {
      totalMinutes: clampSkillMinutes(skillSnapshot.data().totalMinutes) + normalizedMinutes,
      updatedAt: serverTimestamp(),
    });
  });

  return skillLogRef.id;
}
