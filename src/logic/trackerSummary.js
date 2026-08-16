import { getLocalDateKey } from './dates.js';
import { isHabitPlannedOnDate } from './schedules.js';

function getWeekStartKey(date) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - (((date.getDay() + 6) % 7)));
  return getLocalDateKey(monday);
}

function completedLogDates(logs, habitId) {
  return new Set(logs
    .filter((log) => log.habitId === habitId && log.completed)
    .map((log) => log.date));
}

function habitCompletionCounts(habit, logs, days, todayKey) {
  const availableDays = days.filter((day) => day.dateKey <= todayKey);
  const completedDates = completedLogDates(logs, habit.id);

  if (habit.scheduleType === 'timesPerWeek') {
    const target = Math.min(7, Math.max(1, Number(habit.timesPerWeek) || 1));
    const weeks = new Map();

    availableDays.forEach((day) => {
      if (habit.startDate && day.dateKey < habit.startDate) return;
      const weekKey = getWeekStartKey(day.date);
      const week = weeks.get(weekKey) ?? { available: 0, completed: 0 };
      week.available += 1;
      if (completedDates.has(day.dateKey)) week.completed += 1;
      weeks.set(weekKey, week);
    });

    return [...weeks.values()].reduce((total, week) => ({
      planned: total.planned + Math.min(target, week.available),
      completed: total.completed + Math.min(target, week.completed),
    }), { planned: 0, completed: 0 });
  }

  return availableDays.reduce((total, day) => {
    if (!isHabitPlannedOnDate(habit, day.dateKey, day.isoWeekday)) return total;
    total.planned += 1;
    if (completedDates.has(day.dateKey)) total.completed += 1;
    return total;
  }, { planned: 0, completed: 0 });
}

export function getHabitMinutesMap(habits, logs) {
  const minuteHabitIds = new Set(habits
    .filter(({ goalType }) => goalType === 'minutes')
    .map(({ id }) => id));
  const minutesByHabit = new Map();

  logs.forEach((log) => {
    if (!log.completed || !minuteHabitIds.has(log.habitId)) return;
    const minutes = Number(log.actualMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    minutesByHabit.set(log.habitId, (minutesByHabit.get(log.habitId) ?? 0) + minutes);
  });

  return minutesByHabit;
}

export function getTrackerSummary({ habits, logs, days, todayKey }) {
  const counts = habits.reduce((total, habit) => {
    const habitCounts = habitCompletionCounts(habit, logs, days, todayKey);
    return {
      planned: total.planned + habitCounts.planned,
      completed: total.completed + habitCounts.completed,
    };
  }, { planned: 0, completed: 0 });
  const minutesByHabit = getHabitMinutesMap(habits, logs);
  const totalMinutes = [...minutesByHabit.values()].reduce((sum, minutes) => sum + minutes, 0);

  return {
    completionPercent: counts.planned
      ? Math.round((counts.completed / counts.planned) * 100)
      : 0,
    totalMinutes,
    activeHabitCount: habits.length,
  };
}

export function formatPracticeDuration(totalMinutes) {
  const minutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${remainder} мин`;
  if (!remainder) return `${hours} ч`;
  return `${hours} ч ${remainder} мин`;
}
