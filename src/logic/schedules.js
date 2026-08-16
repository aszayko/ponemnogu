export const WEEK_DAYS = Object.freeze([
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
]);

export function normalizeSchedule({ scheduleType, daysOfWeek, timesPerWeek }) {
  if (scheduleType === 'daily') {
    return { scheduleType, daysOfWeek: [], timesPerWeek: null };
  }

  if (scheduleType === 'selectedDays') {
    const rawDays = Array.isArray(daysOfWeek) ? daysOfWeek : [];
    const normalizedDays = [...new Set(rawDays
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))]
      .sort((left, right) => left - right);

    if (!normalizedDays.length) {
      throw new Error('Выберите хотя бы один день недели.');
    }

    return { scheduleType, daysOfWeek: normalizedDays, timesPerWeek: null };
  }

  if (scheduleType === 'timesPerWeek') {
    const normalizedTimes = Number(timesPerWeek);

    if (!Number.isInteger(normalizedTimes) || normalizedTimes < 1 || normalizedTimes > 7) {
      throw new Error('Количество выполнений в неделю должно быть от 1 до 7.');
    }

    return { scheduleType, daysOfWeek: [], timesPerWeek: normalizedTimes };
  }

  throw new Error('Выберите расписание привычки.');
}

export function formatSchedule(habit) {
  if (habit.scheduleType === 'daily') return 'Каждый день';

  if (habit.scheduleType === 'selectedDays') {
    const labels = (habit.daysOfWeek ?? [])
      .map((day) => WEEK_DAYS.find(({ value }) => value === Number(day))?.short)
      .filter(Boolean);
    return labels.length ? labels.join(', ') : 'Дни не выбраны';
  }

  if (habit.scheduleType === 'timesPerWeek') {
    const times = Number(habit.timesPerWeek) || 0;
    const noun = times === 1 ? 'раз' : times >= 2 && times <= 4 ? 'раза' : 'раз';
    return `${times} ${noun} в неделю`;
  }

  return 'Расписание не задано';
}

export function normalizeGoal({ goalType, targetMinutes }) {
  if (goalType === 'check') {
    return { goalType, targetMinutes: null };
  }

  if (goalType === 'minutes') {
    const normalizedMinutes = Number(targetMinutes);

    if (!Number.isInteger(normalizedMinutes) || normalizedMinutes <= 0) {
      throw new Error('Цель в минутах должна быть больше нуля.');
    }

    return { goalType, targetMinutes: normalizedMinutes };
  }

  throw new Error('Выберите цель привычки.');
}

function minuteLabel(minutes) {
  const lastTwoDigits = minutes % 100;
  const lastDigit = minutes % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'минут';
  if (lastDigit === 1) return 'минута';
  if (lastDigit >= 2 && lastDigit <= 4) return 'минуты';
  return 'минут';
}

export function formatGoal(habit) {
  if (habit.goalType === 'minutes') {
    const minutes = Math.max(0, Number(habit.targetMinutes) || 0);
    return `${minutes} ${minuteLabel(minutes)}`;
  }

  return 'Просто выполнить';
}

export function isHabitPlannedOnDate(habit, dateKey, isoWeekday) {
  if (habit.startDate && dateKey < habit.startDate) return false;

  if (habit.scheduleType === 'daily' || habit.scheduleType === 'timesPerWeek') {
    return true;
  }

  if (habit.scheduleType === 'selectedDays') {
    return (habit.daysOfWeek ?? []).map(Number).includes(Number(isoWeekday));
  }

  return false;
}
