export const SKILL_LEVELS = Object.freeze([
  { level: 1, minMinutes: 0, title: 'Ну, попробуем' },
  { level: 2, minMinutes: 2 * 60, title: 'Что-то получается' },
  { level: 3, minMinutes: 5 * 60, title: 'Втягиваюсь' },
  { level: 4, minMinutes: 15 * 60, title: 'Уже не случайность' },
  { level: 5, minMinutes: 30 * 60, title: 'Знаю, что делаю' },
  { level: 6, minMinutes: 60 * 60, title: 'Вошёл во вкус' },
  { level: 7, minMinutes: 120 * 60, title: 'Серьёзно прокачался' },
  { level: 8, minMinutes: 250 * 60, title: 'Опасно хорош' },
  { level: 9, minMinutes: 500 * 60, title: 'Почти мастер' },
  { level: 10, minMinutes: 1000 * 60, title: 'Легенда' },
]);

function normalizeMinutes(totalMinutes) {
  const minutes = Number(totalMinutes);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
}

export function getSkillLevelProgress(totalMinutes) {
  const minutes = normalizeMinutes(totalMinutes);
  let currentIndex = 0;

  for (let index = SKILL_LEVELS.length - 1; index >= 0; index -= 1) {
    if (minutes >= SKILL_LEVELS[index].minMinutes) {
      currentIndex = index;
      break;
    }
  }

  const current = SKILL_LEVELS[currentIndex];
  const next = SKILL_LEVELS[currentIndex + 1] ?? null;

  if (!next) {
    return {
      ...current,
      totalMinutes: minutes,
      nextLevel: null,
      progressPercent: null,
      minutesToNextLevel: null,
    };
  }

  const levelRange = next.minMinutes - current.minMinutes;
  const minutesInLevel = minutes - current.minMinutes;

  return {
    ...current,
    totalMinutes: minutes,
    nextLevel: next.level,
    progressPercent: Math.min(100, Math.max(0, (minutesInLevel / levelRange) * 100)),
    minutesToNextLevel: Math.max(0, next.minMinutes - minutes),
  };
}

export function formatPracticeTime(totalMinutes) {
  const minutes = normalizeMinutes(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${remainder} мин`;
  if (!remainder) return `${hours} ч`;
  return `${hours} ч ${remainder} мин`;
}
