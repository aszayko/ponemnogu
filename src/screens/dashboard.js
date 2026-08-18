import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  ListChecks,
  Minus,
  Plus,
  X,
} from 'lucide';
import { createMonthTracker } from '../components/monthTracker.js';
import { createSidebar } from '../components/sidebar.js';
import { createMobileCharacterHeader } from '../components/mobileCharacterHeader.js';
import { createToastController } from '../components/toast.js';
import {
  getAllDoneMessage,
  getLevelUpMessage,
  getOccasionalCompletionMessage,
  getStageTransitionMessage,
} from '../data/messages.js';
import { auth, getAuthErrorMessage, logout } from '../firebase/auth.js';
import { getUserDocument } from '../firebase/db.js';
import {
  formatCalendarDate,
  formatMonthTitle,
  getIsoWeekday,
  getLocalDateKey,
  getMonthDays,
  getMonthRange,
  parseLocalDateKey,
} from '../logic/dates.js';
import { getHabitStage } from '../logic/habitStrength.js';
import { getPlayerTitle } from '../logic/playerXp.js';
import { isHabitPlannedOnDate } from '../logic/schedules.js';
import { formatPracticeDuration, getTrackerSummary } from '../logic/trackerSummary.js';
import { getActiveHabits } from '../services/habitService.js';
import {
  getHabitLogsForRange,
  removeHabitCompletion,
  setHabitCompletion,
  synchronizeProgress,
  updateHabitCompletion,
} from '../services/logService.js';

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

function screenMarkup() {
  return `
    <div data-dashboard-sidebar></div>
    <section class="dashboard-main">
      <div data-mobile-character></div>
      <header class="dashboard-header">
        <div class="dashboard-heading">
          <p class="eyebrow">Трекер привычек</p>
          <h1 data-month-title></h1>
        </div>
        <div class="month-controls" aria-label="Выбор месяца">
          <button type="button" data-previous-month aria-label="Предыдущий месяц">
            ${iconMarkup(ChevronLeft, 'month-control-icon')}
          </button>
          <strong data-month-control-label aria-live="polite"></strong>
          <button type="button" data-next-month aria-label="Следующий месяц">
            ${iconMarkup(ChevronRight, 'month-control-icon')}
          </button>
        </div>
      </header>
      <p class="dashboard-status" data-dashboard-status role="status" aria-live="polite">Загружаем месяц…</p>
      <div data-dashboard-content></div>
      <div data-dashboard-summary></div>
    </section>

    <dialog class="practice-dialog" data-habit-minutes-dialog>
      <form class="practice-form" data-habit-minutes-form novalidate>
        <header class="practice-dialog__header">
          <div>
            <p class="eyebrow">Практика</p>
            <h2 data-practice-dialog-title>Сколько получилось?</h2>
          </div>
          <button type="button" class="practice-dialog__close" data-close-minutes-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'practice-action-icon')}
          </button>
        </header>
        <div class="practice-dialog__body">
          <p class="practice-dialog__context" data-minutes-context></p>
          <label class="practice-minutes-field" data-minutes-field>
            <span>Фактическое время</span>
            <span class="practice-stepper">
              <button type="button" data-adjust-minutes="-5" aria-label="Уменьшить на 5 минут">${iconMarkup(Minus, 'practice-stepper__icon')}</button>
              <span class="practice-minutes-input">
                <input type="number" name="minutes" min="1" step="1" inputmode="numeric" />
                <small>мин</small>
              </span>
              <button type="button" data-adjust-minutes="5" aria-label="Увеличить на 5 минут">${iconMarkup(Plus, 'practice-stepper__icon')}</button>
            </span>
          </label>
          <label class="practice-note-field">
            <span>Заметка — необязательно</span>
            <textarea name="note" rows="4" maxlength="1000" placeholder="Что хочется запомнить?"></textarea>
          </label>
          <p class="form-status" data-minutes-status role="status" aria-live="polite"></p>
        </div>
        <div class="practice-dialog__actions">
          <button class="button practice-button--remove" type="button" data-remove-completion hidden>Снять отметку</button>
          <button class="button practice-button--secondary" type="button" data-close-minutes-dialog>Отмена</button>
          <button class="button button--primary" type="submit" data-save-minutes>Сохранить</button>
        </div>
      </form>
    </dialog>
  `;
}

function hasDebugMessagesFlag() {
  const searchEnabled = new URLSearchParams(window.location.search).get('debugMessages') === '1';
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  return searchEnabled || new URLSearchParams(hashQuery).get('debugMessages') === '1';
}

export function dashboardScreen() {
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const debugMessages = hasDebugMessagesFlag();
  let selectedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let profile = null;
  let pendingCompletion = null;
  let loadVersion = 0;
  let progressInitialization = null;

  const page = document.createElement('main');
  page.className = 'dashboard-page';
  page.innerHTML = screenMarkup();
  const toast = createToastController();
  page.append(toast.element);

  const sidebarMount = page.querySelector('[data-dashboard-sidebar]');
  const mobileCharacterMount = page.querySelector('[data-mobile-character]');
  const monthTitle = page.querySelector('[data-month-title]');
  const content = page.querySelector('[data-dashboard-content]');
  const summaryMount = page.querySelector('[data-dashboard-summary]');
  const status = page.querySelector('[data-dashboard-status]');
  const minutesDialog = page.querySelector('[data-habit-minutes-dialog]');
  const minutesForm = page.querySelector('[data-habit-minutes-form]');
  const minutesStatus = page.querySelector('[data-minutes-status]');

  function setStatus(message, type = '') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function renderSidebar() {
    if (!profile) return;

    mobileCharacterMount.replaceChildren(createMobileCharacterHeader(profile));
    sidebarMount.replaceChildren(createSidebar({
      profile,
      activeRoute: 'dashboard',
      async onLogout() {
        try {
          await logout();
          return true;
        } catch (error) {
          setStatus(getAuthErrorMessage(error), 'error');
          return false;
        }
      },
    }));
  }

  function renderSummary(summary) {
    summaryMount.innerHTML = `
      <section class="dashboard-summary" aria-label="Сводка за месяц">
        <div class="dashboard-summary__item">
          <span class="dashboard-summary__icon dashboard-summary__icon--lime">${iconMarkup(CircleCheckBig, 'dashboard-summary-icon')}</span>
          <span class="dashboard-summary__copy"><strong>${summary.completionPercent}%</strong><small>выполнено</small></span>
        </div>
        <div class="dashboard-summary__item">
          <span class="dashboard-summary__icon dashboard-summary__icon--purple">${iconMarkup(Clock3, 'dashboard-summary-icon')}</span>
          <span class="dashboard-summary__copy"><strong>${formatPracticeDuration(summary.totalMinutes)}</strong><small>практики за месяц</small></span>
        </div>
        <div class="dashboard-summary__item">
          <span class="dashboard-summary__icon dashboard-summary__icon--lime">${iconMarkup(ListChecks, 'dashboard-summary-icon')}</span>
          <span class="dashboard-summary__copy"><strong>${summary.activeHabitCount}</strong><small>активных привычек</small></span>
        </div>
      </section>
    `;
  }

  function openCompletionDialog(habit, date, log = null) {
    pendingCompletion = {
      habit,
      date,
      log,
      previousLevel: Number(profile?.playerLevel) || 1,
    };
    minutesForm.reset();
    const isEditing = Boolean(log);
    const hasMinutes = habit.goalType === 'minutes';
    page.querySelector('[data-practice-dialog-title]').textContent = isEditing
      ? 'Редактировать отметку'
      : 'Сколько получилось?';
    page.querySelector('[data-minutes-field]').hidden = !hasMinutes;
    page.querySelector('[data-remove-completion]').hidden = !isEditing;
    minutesForm.elements.minutes.value = log?.actualMinutes ?? habit.targetMinutes ?? 1;
    minutesForm.elements.note.value = log?.note ?? '';
    page.querySelector('[data-minutes-context]').textContent = `${habit.name} · ${formatCalendarDate(date)}`;
    minutesStatus.textContent = '';
    minutesDialog.showModal();
    (hasMinutes ? minutesForm.elements.minutes : minutesForm.elements.note).focus();
  }

  function weekRangeFor(dateKey) {
    const date = parseLocalDateKey(dateKey);
    if (!date) return null;
    date.setDate(date.getDate() - (getIsoWeekday(date) - 1));
    const start = getLocalDateKey(date);
    date.setDate(date.getDate() + 6);
    return { start, end: getLocalDateKey(date) };
  }

  function allScheduledHabitsDoneToday(habits, logs) {
    const completedIds = new Set(logs
      .filter((log) => log.completed && log.date === todayKey)
      .map((log) => log.habitId));
    const weekRange = weekRangeFor(todayKey);
    let hasScheduledHabit = false;

    const allDone = habits.every((habit) => {
      if (habit.startDate && habit.startDate > todayKey) return true;

      if (habit.scheduleType === 'timesPerWeek') {
        hasScheduledHabit = true;
        const target = Math.min(7, Math.max(1, Number(habit.timesPerWeek) || 1));
        const weeklyCompletions = logs.filter((log) => (
          log.completed
          && log.habitId === habit.id
          && weekRange
          && log.date >= weekRange.start
          && log.date <= weekRange.end
        )).length;
        return weeklyCompletions >= target;
      }

      const today = parseLocalDateKey(todayKey);
      if (!today || !isHabitPlannedOnDate(habit, todayKey, getIsoWeekday(today))) return true;
      hasScheduledHabit = true;
      return completedIds.has(habit.id);
    });

    return hasScheduledHabit && allDone;
  }

  function createSparkles(className) {
    const sparkles = document.createElement('span');
    sparkles.className = className;
    sparkles.setAttribute('aria-hidden', 'true');
    sparkles.append(...Array.from({ length: 4 }, () => document.createElement('i')));
    return sparkles;
  }

  function playGameFeel(context, updatedHabit, reaction) {
    const reactionElements = [];
    const temporaryElements = [];
    const rewardedButton = [...content.querySelectorAll('[data-toggle-habit]')].find((button) => (
      button.dataset.toggleHabit === context.habit.id
      && button.dataset.date === context.date
    ));

    if (rewardedButton) {
      const dayCell = rewardedButton.closest('.tracker-day-cell');
      const row = rewardedButton.closest('.tracker-row');
      const xp = document.createElement('span');
      xp.className = 'tracker-xp-pop';
      xp.setAttribute('aria-hidden', 'true');
      xp.textContent = '+10 XP';
      const sparkles = createSparkles('completion-sparkles');

      rewardedButton.classList.add('is-rewarded');
      dayCell.dataset.reaction = reaction;
      dayCell.append(xp, sparkles);
      reactionElements.push(rewardedButton, dayCell);
      temporaryElements.push(xp, sparkles);

      if (row) {
        const strengthFill = row.querySelector('.tracker-progress__bar i');
        const previousStrength = Math.min(100, Math.max(0, Number(context.habit.habitStrength) || 0));
        const nextStrength = Math.min(100, Math.max(0, Number(updatedHabit?.habitStrength) || 0));
        row.classList.add('is-rewarding');
        row.dataset.reaction = reaction;
        reactionElements.push(row);

        if (strengthFill && previousStrength !== nextStrength) {
          strengthFill.style.setProperty('--habit-strength', `${previousStrength}%`);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              strengthFill.style.setProperty('--habit-strength', `${nextStrength}%`);
            });
          });
        }
      }
    }

    page.querySelectorAll('.sidebar-player, .mobile-character').forEach((characterCard) => {
      const sparkles = createSparkles('avatar-reaction-sparkles');
      characterCard.classList.add('is-reacting');
      characterCard.dataset.reaction = reaction;
      characterCard.append(sparkles);
      reactionElements.push(characterCard);
      temporaryElements.push(sparkles);
    });

    window.setTimeout(() => {
      reactionElements.forEach((element) => {
        element.classList.remove('is-rewarded', 'is-rewarding', 'is-reacting');
        delete element.dataset.reaction;
      });
      temporaryElements.forEach((element) => element.remove());
    }, 1200);
  }

  function showCompletionFeedback(context, snapshot) {
    if (!snapshot) return;

    const updatedHabit = snapshot.habits.find(({ id }) => id === context.habit.id);
    const previousStage = getHabitStage(context.habit.habitStrength);
    const nextStage = getHabitStage(updatedHabit?.habitStrength);
    const nextLevel = Number(snapshot.profile?.playerLevel) || 1;
    let message = null;
    let tone = 'purple';
    let reaction = 'completion';
    const bodyType = snapshot.profile?.avatar?.bodyType;

    if (nextLevel > context.previousLevel) {
      const previousTitle = getPlayerTitle(context.previousLevel, bodyType);
      const nextTitle = getPlayerTitle(nextLevel, bodyType);
      message = previousTitle === nextTitle
        ? getLevelUpMessage(bodyType)
        : `НОВОЕ ЗВАНИЕ\n${nextTitle}`;
      reaction = 'levelUp';
    } else if (nextStage !== previousStage) {
      message = getStageTransitionMessage(
        previousStage,
        nextStage,
        bodyType,
      );
      reaction = 'stageChange';
    } else if (
      context.date === todayKey
      && allScheduledHabitsDoneToday(snapshot.habits, snapshot.logs)
    ) {
      message = getAllDoneMessage(bodyType);
      tone = 'lime';
    } else {
      message = getOccasionalCompletionMessage({ force: debugMessages, bodyType });
      tone = 'lime';
    }

    playGameFeel(context, updatedHabit, reaction);
    toast.show(message, tone);
  }

  async function handleToggle({ habit, date, log }) {
    setStatus('');

    try {
      if (log) {
        openCompletionDialog(habit, date, log);
        return;
      }

      if (habit.goalType === 'minutes') {
        openCompletionDialog(habit, date);
        return;
      }

      const completionContext = {
        habit,
        date,
        previousLevel: Number(profile?.playerLevel) || 1,
      };
      await setHabitCompletion(auth.currentUser, habit, date);
      const snapshot = await loadMonth({ refreshProfile: true });
      showCompletionFeedback(completionContext, snapshot);
    } catch (error) {
      setStatus(getAuthErrorMessage(error), 'error');
    }
  }

  async function loadMonth({ refreshProfile = false } = {}) {
    const requestVersion = ++loadVersion;
    const days = getMonthDays(selectedMonth);
    const monthRange = getMonthRange(selectedMonth);
    const formattedMonth = formatMonthTitle(selectedMonth);
    monthTitle.textContent = formattedMonth;
    page.querySelector('[data-month-control-label]').textContent = formattedMonth;
    setStatus('Загружаем месяц…');

    try {
      if (!progressInitialization) {
        progressInitialization = synchronizeProgress(auth.currentUser).catch((error) => {
          progressInitialization = null;
          throw error;
        });
      }
      await progressInitialization;
      if (requestVersion !== loadVersion) return;

      const requests = [
        getActiveHabits(auth.currentUser),
        getHabitLogsForRange(auth.currentUser, monthRange.startDate, monthRange.endDate),
      ];

      if (!profile || refreshProfile) requests.push(getUserDocument(auth.currentUser));
      const [habits, logs, loadedProfile] = await Promise.all(requests);
      if (requestVersion !== loadVersion) return;

      if (loadedProfile) {
        profile = loadedProfile;
        renderSidebar();
      }

      setStatus('');
      content.replaceChildren();
      renderSummary(getTrackerSummary({ habits, logs, days, todayKey }));
      const snapshot = { habits, logs, profile };

      if (!habits.length) {
        content.innerHTML = `
          <section class="dashboard-empty">
            ${iconMarkup(CalendarCheck, 'dashboard-empty__icon')}
            <h2>Пока нечего отмечать</h2>
            <p>Создайте первую привычку — она появится в календаре.</p>
            <a class="button button--primary" href="#/habits">Создать привычку</a>
          </section>
        `;
        return snapshot;
      }

      content.append(createMonthTracker({
        habits,
        logs,
        days,
        todayKey,
        onToggle: handleToggle,
      }));
      return snapshot;
    } catch (error) {
      if (requestVersion !== loadVersion) return;
      setStatus(getAuthErrorMessage(error), 'error');
      content.replaceChildren();
      summaryMount.replaceChildren();
      return null;
    }
  }

  function changeMonth(offset) {
    selectedMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + offset,
      1,
    );
    loadMonth();
  }

  page.querySelector('[data-previous-month]').addEventListener('click', () => changeMonth(-1));
  page.querySelector('[data-next-month]').addEventListener('click', () => changeMonth(1));

  page.querySelectorAll('[data-close-minutes-dialog]').forEach((button) => {
    button.addEventListener('click', () => minutesDialog.close());
  });

  minutesDialog.addEventListener('close', () => {
    pendingCompletion = null;
  });

  minutesDialog.addEventListener('click', (event) => {
    if (event.target === minutesDialog) minutesDialog.close();
  });

  page.querySelectorAll('[data-adjust-minutes]').forEach((button) => {
    button.addEventListener('click', () => {
      const minutes = Number(minutesForm.elements.minutes.value) || 0;
      minutesForm.elements.minutes.value = Math.max(1, minutes + Number(button.dataset.adjustMinutes));
    });
  });

  page.querySelector('[data-remove-completion]').addEventListener('click', async (event) => {
    if (!pendingCompletion?.log) return;

    const completion = pendingCompletion;
    const button = event.currentTarget;
    button.disabled = true;
    minutesStatus.textContent = '';

    try {
      await removeHabitCompletion(auth.currentUser, completion.habit, completion.date);
      minutesDialog.close();
      await loadMonth({ refreshProfile: true });
    } catch (error) {
      minutesStatus.textContent = getAuthErrorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  minutesForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingCompletion) return;

    const completion = pendingCompletion;
    const saveButton = page.querySelector('[data-save-minutes]');
    saveButton.disabled = true;
    minutesStatus.textContent = '';

    try {
      if (completion.log) {
        await updateHabitCompletion(auth.currentUser, completion.habit, completion.date, {
          actualMinutes: minutesForm.elements.minutes.value,
          note: minutesForm.elements.note.value,
        });
      } else {
        await setHabitCompletion(
          auth.currentUser,
          completion.habit,
          completion.date,
          minutesForm.elements.minutes.value,
          minutesForm.elements.note.value,
        );
      }
      minutesDialog.close();
      const snapshot = await loadMonth({ refreshProfile: true });
      if (!completion.log) showCompletionFeedback(completion, snapshot);
    } catch (error) {
      minutesStatus.textContent = getAuthErrorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  loadMonth();
  return page;
}
