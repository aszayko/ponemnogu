import {
  BookOpen,
  Check,
  CheckCircle2,
  Droplet,
  Dumbbell,
  GraduationCap,
  Heart,
  Languages,
  Moon,
} from 'lucide';
import { getHabitStage } from '../logic/habitStrength.js';
import { formatGoal, isHabitPlannedOnDate } from '../logic/schedules.js';
import { formatPracticeDuration, getHabitMinutesMap } from '../logic/trackerSummary.js';

const habitIcons = {
  'check-circle-2': CheckCircle2,
  'book-open': BookOpen,
  languages: Languages,
  'graduation-cap': GraduationCap,
  dumbbell: Dumbbell,
  heart: Heart,
  droplet: Droplet,
  moon: Moon,
};

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function iconMarkup(icon, className = '') {
  const nodes = icon.map(([tag, attributes]) => {
    const serializedAttributes = Object.entries(attributes)
      .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
      .join(' ');
    return `<${tag} ${serializedAttributes}></${tag}>`;
  }).join('');

  return `
    <svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${nodes}
    </svg>
  `;
}

function progressCellMarkup(habit, monthlyMinutes) {
  const numericStrength = Number(habit.habitStrength);
  const strength = Number.isFinite(numericStrength)
    ? Math.min(100, Math.max(0, numericStrength))
    : 0;
  const practice = habit.goalType === 'minutes'
    ? `<small>${formatPracticeDuration(monthlyMinutes)} за месяц</small>`
    : '';

  return `
    <div class="tracker-progress">
      <div class="tracker-progress__meta">
        <strong>${escapeHtml(getHabitStage(strength))}</strong>
        <span>${Math.round(strength)}%</span>
      </div>
      <div class="tracker-progress__bar" role="progressbar" aria-label="Сила привычки" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(strength)}">
        <i style="--habit-strength: ${strength}%"></i>
      </div>
      ${practice}
    </div>
  `;
}

function habitCellMarkup(habit, index) {
  const icon = habitIcons[habit.icon] ?? CheckCircle2;
  const accentClass = index % 2 === 0 ? 'tracker-habit__icon--lime' : 'tracker-habit__icon--purple';

  return `
    <div class="tracker-habit">
      <span class="tracker-habit__icon ${accentClass}">${iconMarkup(icon, 'tracker-habit-icon')}</span>
      <span class="tracker-habit__copy">
        <strong>${escapeHtml(habit.name)}</strong>
        <small>${escapeHtml(formatGoal(habit))}</small>
      </span>
    </div>
  `;
}

function dayButtonMarkup(habit, day, log, todayKey) {
  const beforeStart = Boolean(habit.startDate && day.dateKey < habit.startDate);
  const planned = isHabitPlannedOnDate(habit, day.dateKey, day.isoWeekday);
  const completed = Boolean(log?.completed);
  const future = day.dateKey > todayKey;
  const today = day.dateKey === todayKey;
  const actionable = !beforeStart && !future && (planned || completed);
  const state = beforeStart
    ? 'до создания привычки'
    : completed
    ? 'выполнено'
    : future
      ? 'будущая дата'
      : planned
        ? 'запланировано'
        : 'не запланировано';

  return `
    <div class="tracker-day-cell ${today ? 'is-today' : ''}">
      <span class="tracker-mobile-day-number" aria-hidden="true">${day.day}</span>
      <button
        class="tracker-check ${planned ? 'is-planned' : 'is-unplanned'} ${completed ? 'is-completed' : ''} ${future ? 'is-future' : ''} ${beforeStart ? 'is-before-start' : ''}"
        type="button"
        data-toggle-habit="${escapeHtml(habit.id)}"
        data-date="${day.dateKey}"
        aria-label="${escapeHtml(habit.name)}, ${day.day}: ${state}"
        aria-pressed="${completed}"
        ${actionable ? '' : 'disabled'}
      >
        ${completed ? iconMarkup(Check, 'tracker-check__icon') : '<i></i>'}
      </button>
    </div>
  `;
}

export function createMonthTracker({ habits, logs, days, todayKey, onToggle }) {
  const tracker = document.createElement('section');
  tracker.className = 'month-tracker';
  tracker.style.setProperty('--month-days', days.length);
  const logsById = new Map(logs.map((log) => [log.id, log]));
  const minutesByHabit = getHabitMinutesMap(habits, logs);

  const dayHeaders = days.map((day) => `
    <div class="tracker-day-heading ${day.dateKey === todayKey ? 'is-today' : ''}">
      <span>${weekdayLabels[day.isoWeekday - 1]}</span>
      <strong>${day.day}</strong>
    </div>
  `).join('');

  const rows = habits.map((habit, index) => {
    const dayCells = days.map((day) => {
      const log = logsById.get(`${habit.id}__${day.dateKey}`);
      return dayButtonMarkup(habit, day, log, todayKey);
    }).join('');

    return `
      <div class="tracker-row">
        ${habitCellMarkup(habit, index)}
        <div class="tracker-days">${dayCells}</div>
        ${progressCellMarkup(habit, minutesByHabit.get(habit.id) ?? 0)}
      </div>
    `;
  }).join('');

  tracker.innerHTML = `
    <div class="month-tracker__scroll" data-tracker-scroll>
      <div class="tracker-table">
        <div class="tracker-header">
          <div class="tracker-habit tracker-habit--heading">Привычка</div>
          <div class="tracker-days">${dayHeaders}</div>
          <div class="tracker-progress tracker-progress--heading">Прогресс</div>
        </div>
        ${rows}
      </div>
    </div>
  `;

  tracker.querySelectorAll('[data-toggle-habit]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.dataset.busy === 'true') return;

      const habit = habits.find(({ id }) => id === button.dataset.toggleHabit);
      const log = logsById.get(`${button.dataset.toggleHabit}__${button.dataset.date}`) ?? null;
      if (!habit) return;

      button.dataset.busy = 'true';
      button.disabled = true;

      try {
        await onToggle({ habit, date: button.dataset.date, log });
      } finally {
        button.dataset.busy = 'false';
        if (button.isConnected) button.disabled = false;
      }
    });
  });

  requestAnimationFrame(() => {
    if (window.matchMedia('(max-width: 600px)').matches) {
      tracker.querySelectorAll('.tracker-row .tracker-days').forEach((dayStrip) => {
        const todayCell = dayStrip.querySelector('.tracker-day-cell.is-today');
        if (!todayCell || dayStrip.scrollWidth <= dayStrip.clientWidth) return;

        dayStrip.scrollLeft = Math.max(
          0,
          todayCell.offsetLeft
            - dayStrip.offsetLeft
            - dayStrip.clientWidth / 2
            + todayCell.offsetWidth / 2,
        );
      });
      return;
    }

    const scrollArea = tracker.querySelector('[data-tracker-scroll]');
    const todayHeading = tracker.querySelector('.tracker-day-heading.is-today');
    if (!todayHeading || scrollArea.scrollWidth <= scrollArea.clientWidth) return;

    scrollArea.scrollLeft = Math.max(
      0,
      todayHeading.offsetLeft - scrollArea.clientWidth / 2 + todayHeading.offsetWidth / 2,
    );
  });

  return tracker;
}
