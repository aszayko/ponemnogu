import {
  getIsoWeekday,
  getLocalDateKey,
  parseLocalDateKey,
} from './dates.js';
import { isHabitPlannedOnDate } from './schedules.js';

export const XP_PER_COMPLETION = 10;

export function xpNeededForNextLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return 100 + (normalizedLevel - 1) * 50;
}

export function getPlayerLevel(totalXp) {
  let remainingXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 1;

  while (remainingXp >= xpNeededForNextLevel(level)) {
    remainingXp -= xpNeededForNextLevel(level);
    level += 1;
  }

  return level;
}

function xpBeforeLevel(level) {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += xpNeededForNextLevel(currentLevel);
  }

  return total;
}

export function getPlayerXpProgress(totalXp, playerLevel) {
  const total = Math.max(0, Math.floor(Number(totalXp) || 0));
  const calculatedLevel = getPlayerLevel(total);
  const storedLevel = Math.max(1, Math.floor(Number(playerLevel) || 1));
  const level = storedLevel === calculatedLevel ? storedLevel : calculatedLevel;
  const needed = xpNeededForNextLevel(level);
  const current = Math.min(needed, Math.max(0, total - xpBeforeLevel(level)));

  return {
    level,
    currentXp: current,
    neededXp: needed,
    progressPercent: (current / needed) * 100,
  };
}

function getWeekKey(dateKey) {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;
  date.setDate(date.getDate() - (getIsoWeekday(date) - 1));
  return getLocalDateKey(date);
}

function eligibleLogs(habit, logs, todayKey) {
  return logs.filter((log) => (
    log.habitId === habit.id
    && log.completed === true
    && parseLocalDateKey(log.date)
    && log.date <= todayKey
    && (!habit.startDate || log.date >= habit.startDate)
  ));
}

export function calculateXpAwards(habits, logs, todayKey = getLocalDateKey()) {
  const awards = new Map(logs.map((log) => [log.id, 0]));

  habits.forEach((habit) => {
    const habitLogs = eligibleLogs(habit, logs, todayKey);

    if (habit.scheduleType === 'timesPerWeek') {
      const target = Math.min(7, Math.max(1, Number(habit.timesPerWeek) || 1));
      const logsByWeek = new Map();

      habitLogs.forEach((log) => {
        const weekKey = getWeekKey(log.date);
        if (!weekKey) return;
        const weekLogs = logsByWeek.get(weekKey) ?? [];
        weekLogs.push(log);
        logsByWeek.set(weekKey, weekLogs);
      });

      logsByWeek.forEach((weekLogs) => {
        weekLogs
          .sort((left, right) => (
            left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
          ))
          .slice(0, target)
          .forEach((log) => awards.set(log.id, XP_PER_COMPLETION));
      });
      return;
    }

    habitLogs.forEach((log) => {
      const date = parseLocalDateKey(log.date);
      if (date && isHabitPlannedOnDate(habit, log.date, getIsoWeekday(date))) {
        awards.set(log.id, XP_PER_COMPLETION);
      }
    });
  });

  return awards;
}

export function calculatePlayerProgress(habits, logs, todayKey = getLocalDateKey()) {
  const awards = calculateXpAwards(habits, logs, todayKey);
  const totalXp = [...awards.values()].reduce((total, award) => total + award, 0);

  return {
    awards,
    totalXp,
    playerLevel: getPlayerLevel(totalXp),
  };
}
