export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getHabitLogId(habitId, dateKey) {
  return `${habitId}__${dateKey}`;
}

export function parseLocalDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey ?? ''));
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getIsoWeekday(date) {
  return ((date.getDay() + 6) % 7) + 1;
}

export function getMonthDays(date = new Date()) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayDate = new Date(year, monthIndex, index + 1);
    return {
      day: index + 1,
      date: dayDate,
      dateKey: getLocalDateKey(dayDate),
      isoWeekday: getIsoWeekday(dayDate),
    };
  });
}

export function getMonthRange(date = new Date()) {
  const days = getMonthDays(date);
  return {
    startDate: days[0].dateKey,
    endDate: days.at(-1).dateKey,
  };
}

export function formatMonthTitle(date = new Date()) {
  const title = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function formatCalendarDate(dateKey) {
  const date = parseLocalDateKey(dateKey);
  if (!date) return dateKey;

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function validatePastOrTodayDate(dateKey) {
  const normalizedDateKey = String(dateKey ?? '');
  const date = parseLocalDateKey(normalizedDateKey);

  if (!date) {
    throw new Error('Выберите корректную дату.');
  }

  if (normalizedDateKey > getLocalDateKey()) {
    throw new Error('Нельзя добавить практику на будущую дату.');
  }

  return normalizedDateKey;
}
