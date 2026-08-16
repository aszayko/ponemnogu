import {
  getIsoWeekday,
  getLocalDateKey,
  parseLocalDateKey,
} from './dates.js';
import { isHabitPlannedOnDate } from './schedules.js';

export const HABIT_STAGES = Object.freeze([
  { min: 0, name: 'Пробую' },
  { min: 20, name: 'Приживается' },
  { min: 40, name: 'Поймал ритм' },
  { min: 60, name: 'Уже привычно' },
  { min: 75, name: 'Почти на автомате' },
  { min: 90, name: 'Часть жизни' },
]);

function clampStrength(value) {
  return Math.min(100, Math.max(0, value));
}

function completedDatesForHabit(habit, logs, todayKey) {
  return logs
    .filter((log) => (
      log.habitId === habit.id
      && log.completed === true
      && typeof log.date === 'string'
      && log.date <= todayKey
      && (!habit.startDate || log.date >= habit.startDate)
    ))
    .map((log) => log.date);
}

function calculateWeeklyStrength(habit, completedDates) {
  const target = Math.min(7, Math.max(1, Number(habit.timesPerWeek) || 1));
  const completionsByWeek = new Map();

  completedDates.forEach((dateKey) => {
    const date = parseLocalDateKey(dateKey);
    if (!date) return;
    date.setDate(date.getDate() - (getIsoWeekday(date) - 1));
    const weekKey = getLocalDateKey(date);
    completionsByWeek.set(weekKey, (completionsByWeek.get(weekKey) ?? 0) + 1);
  });

  const strength = [...completionsByWeek.values()]
    .reduce((total, completed) => total + Math.min(target, completed) * 2, 0);
  return clampStrength(strength);
}

export function calculateHabitStrength(habit, logs, todayKey = getLocalDateKey()) {
  if (!habit?.id || !parseLocalDateKey(todayKey)) return 0;

  const completedDates = completedDatesForHabit(habit, logs, todayKey);

  if (habit.scheduleType === 'timesPerWeek') {
    return calculateWeeklyStrength(habit, completedDates);
  }

  const completedPlannedDays = completedDates.filter((dateKey) => {
    const date = parseLocalDateKey(dateKey);
    return date && isHabitPlannedOnDate(habit, dateKey, getIsoWeekday(date));
  }).length;

  return clampStrength(completedPlannedDays * 2);
}

export function getHabitStage(habitStrength) {
  const numericStrength = Number(habitStrength);
  const strength = Number.isFinite(numericStrength)
    ? Math.min(100, Math.max(0, numericStrength))
    : 0;

  return HABIT_STAGES.findLast(({ min }) => strength >= min)?.name ?? HABIT_STAGES[0].name;
}
