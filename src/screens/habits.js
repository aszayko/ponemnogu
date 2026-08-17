import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Dumbbell,
  GraduationCap,
  Heart,
  History,
  Languages,
  Moon,
  Pencil,
  Plus,
  Target,
  X,
} from 'lucide';
import { createAppShell } from '../components/appShell.js';
import { auth, getAuthErrorMessage } from '../firebase/auth.js';
import { getHabitStage } from '../logic/habitStrength.js';
import {
  formatCalendarDate,
  formatMonthTitle,
  getMonthRange,
} from '../logic/dates.js';
import { formatGoal, formatSchedule, WEEK_DAYS } from '../logic/schedules.js';
import {
  archiveHabit,
  createHabit,
  getActiveHabits,
  updateHabit,
} from '../services/habitService.js';
import { getHabitLogsForRange } from '../services/logService.js';

const habitIconOptions = [
  { id: 'check-circle-2', label: 'Действие', icon: CheckCircle2 },
  { id: 'book-open', label: 'Чтение', icon: BookOpen },
  { id: 'languages', label: 'Языки', icon: Languages },
  { id: 'graduation-cap', label: 'Учёба', icon: GraduationCap },
  { id: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { id: 'heart', label: 'Здоровье', icon: Heart },
  { id: 'droplet', label: 'Вода', icon: Droplet },
  { id: 'moon', label: 'Сон', icon: Moon },
];

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

function getIconOption(iconId) {
  return habitIconOptions.find(({ id }) => id === iconId) ?? habitIconOptions[0];
}

function iconPickerMarkup() {
  return habitIconOptions.map(({ id, label, icon }, index) => `
    <label class="habit-icon-option">
      <input type="radio" name="icon" value="${id}" ${index === 0 ? 'checked' : ''} />
      <span>${iconMarkup(icon, 'habit-picker-icon')}<small>${label}</small></span>
    </label>
  `).join('');
}

function weekdayPickerMarkup() {
  return WEEK_DAYS.map(({ value, short, label }) => `
    <label class="habit-weekday">
      <input type="checkbox" name="daysOfWeek" value="${value}" />
      <span title="${label}">${short}</span>
    </label>
  `).join('');
}

function habitCardMarkup(habit) {
  const icon = getIconOption(habit.icon);

  return `
    <article class="habit-card">
      <div class="habit-card__topline">
        <span class="habit-card__icon">${iconMarkup(icon.icon, 'habit-icon')}</span>
        <div class="habit-card__actions">
          <button type="button" data-habit-history="${escapeHtml(habit.id)}" aria-label="История привычки ${escapeHtml(habit.name)}" title="История">
            ${iconMarkup(History, 'habit-action-icon')}
          </button>
          <button type="button" data-edit-habit="${escapeHtml(habit.id)}" aria-label="Редактировать привычку ${escapeHtml(habit.name)}" title="Редактировать">
            ${iconMarkup(Pencil, 'habit-action-icon')}
          </button>
          <button type="button" data-archive-habit="${escapeHtml(habit.id)}" aria-label="Архивировать привычку ${escapeHtml(habit.name)}" title="Архивировать">
            ${iconMarkup(Archive, 'habit-action-icon')}
          </button>
        </div>
      </div>
      <h2>${escapeHtml(habit.name)}</h2>
      <div class="habit-card__details">
        <div class="habit-card__detail">
          ${iconMarkup(CalendarDays, 'habit-detail-icon')}
          <span>${escapeHtml(formatSchedule(habit))}</span>
        </div>
        <div class="habit-card__detail">
          ${iconMarkup(Target, 'habit-detail-icon')}
          <span>${escapeHtml(formatGoal(habit))}</span>
        </div>
      </div>
      <div class="habit-card__stage">
        <span>Стадия</span>
        <strong>${escapeHtml(getHabitStage(habit.habitStrength))}</strong>
      </div>
    </article>
  `;
}

function screenMarkup() {
  return `
    <section class="habits-shell">
      <header class="habits-header">
        <div>
          <p class="eyebrow">Регулярные действия</p>
          <h1>Привычки</h1>
        </div>
        <button class="button button--habit" type="button" data-new-habit>
          ${iconMarkup(Plus, 'button-icon')}
          Новая привычка
        </button>
      </header>
      <p class="habits-status" data-habits-status role="status" aria-live="polite">Загружаем привычки…</p>
      <div data-habits-content></div>
    </section>

    <dialog class="habit-dialog" data-habit-dialog>
      <form class="habit-form" data-habit-form novalidate>
        <header class="habit-dialog__header">
          <h2 data-habit-dialog-title>Новая привычка</h2>
          <button type="button" class="habit-dialog__close" data-close-habit-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'habit-action-icon')}
          </button>
        </header>

        <div class="habit-form__body">
          <label class="habit-form__field">
            <span>Название</span>
            <input type="text" name="name" maxlength="80" autocomplete="off" placeholder="Например, читать перед сном" />
          </label>

          <fieldset>
            <legend>Иконка</legend>
            <div class="habit-icon-picker">${iconPickerMarkup()}</div>
          </fieldset>

          <fieldset>
            <legend>Расписание</legend>
            <div class="habit-choice-grid habit-choice-grid--schedule">
              <label class="habit-choice">
                <input type="radio" name="scheduleType" value="daily" checked />
                <span><strong>Каждый день</strong><small>Без выходных</small></span>
              </label>
              <label class="habit-choice">
                <input type="radio" name="scheduleType" value="selectedDays" />
                <span><strong>По дням</strong><small>Выбрать дни недели</small></span>
              </label>
              <label class="habit-choice">
                <input type="radio" name="scheduleType" value="timesPerWeek" />
                <span><strong>N раз в неделю</strong><small>В любые дни</small></span>
              </label>
            </div>
          </fieldset>

          <section class="habit-conditional" data-selected-days hidden>
            <p>Дни недели</p>
            <div class="habit-weekdays">${weekdayPickerMarkup()}</div>
          </section>

          <label class="habit-form__field habit-form__field--compact" data-times-per-week hidden>
            <span>Сколько раз в неделю</span>
            <input type="number" name="timesPerWeek" min="1" max="7" step="1" value="3" inputmode="numeric" />
          </label>

          <fieldset>
            <legend>Цель</legend>
            <div class="habit-choice-grid habit-choice-grid--goal">
              <label class="habit-choice">
                <input type="radio" name="goalType" value="check" checked />
                <span><strong>Просто выполнить</strong><small>Одна отметка</small></span>
              </label>
              <label class="habit-choice">
                <input type="radio" name="goalType" value="minutes" />
                <span><strong>N минут</strong><small>Цель по времени</small></span>
              </label>
            </div>
          </fieldset>

          <label class="habit-form__field habit-form__field--compact" data-target-minutes hidden>
            <span>Цель в минутах</span>
            <input type="number" name="targetMinutes" min="1" step="1" value="30" inputmode="numeric" />
          </label>
        </div>

        <footer class="habit-form__footer">
          <p class="form-status" data-habit-form-status role="status" aria-live="polite"></p>
          <div class="habit-dialog__actions">
            <button class="button habit-button--secondary" type="button" data-close-habit-dialog>Отмена</button>
            <button class="button button--habit" type="submit" data-save-habit>Сохранить</button>
          </div>
        </footer>
      </form>
    </dialog>

    <dialog class="habit-dialog habit-dialog--confirm" data-archive-dialog>
      <section>
        <header class="habit-dialog__header">
          <h2>Архивировать привычку?</h2>
          <button type="button" class="habit-dialog__close" data-close-archive-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'habit-action-icon')}
          </button>
        </header>
        <p>Привычка <strong data-archive-habit-name></strong> исчезнет из основного списка, но её данные сохранятся.</p>
        <p class="form-status" data-archive-status role="status" aria-live="polite"></p>
        <div class="habit-dialog__actions">
          <button class="button habit-button--secondary" type="button" data-close-archive-dialog>Отмена</button>
          <button class="button habit-button--archive" type="button" data-confirm-archive>Архивировать</button>
        </div>
      </section>
    </dialog>

    <dialog class="habit-dialog habit-history-dialog" data-history-dialog>
      <section>
        <header class="habit-dialog__header habit-history-dialog__header">
          <div>
            <p class="eyebrow">История привычки</p>
            <h2 data-history-habit-name></h2>
          </div>
          <button type="button" class="habit-dialog__close" data-close-history-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'habit-action-icon')}
          </button>
        </header>
        <div class="habit-history-month" aria-label="Выбор месяца">
          <button type="button" data-history-previous-month aria-label="Предыдущий месяц">
            ${iconMarkup(ChevronLeft, 'habit-history-control-icon')}
          </button>
          <strong data-history-month aria-live="polite"></strong>
          <button type="button" data-history-next-month aria-label="Следующий месяц">
            ${iconMarkup(ChevronRight, 'habit-history-control-icon')}
          </button>
        </div>
        <p class="form-status habit-history-status" data-history-status role="status" aria-live="polite"></p>
        <div class="habit-history-list" data-history-list></div>
      </section>
    </dialog>
  `;
}

export function habitsScreen() {
  const page = document.createElement('main');
  page.className = 'habits-page';
  page.innerHTML = screenMarkup();

  const content = page.querySelector('[data-habits-content]');
  const status = page.querySelector('[data-habits-status]');
  const editorDialog = page.querySelector('[data-habit-dialog]');
  const archiveDialog = page.querySelector('[data-archive-dialog]');
  const historyDialog = page.querySelector('[data-history-dialog]');
  const form = page.querySelector('[data-habit-form]');
  const formStatus = page.querySelector('[data-habit-form-status]');
  const archiveStatus = page.querySelector('[data-archive-status]');
  let habits = [];
  let editingHabitId = null;
  let archivingHabitId = null;
  let historyHabitId = null;
  let historyMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let historyLoadVersion = 0;

  function setStatus(message, type = '') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function renderHabits() {
    if (!habits.length) {
      content.innerHTML = `
        <section class="habits-empty">
          ${iconMarkup(CheckCircle2, 'habits-empty__icon')}
          <h2>Привычек пока нет</h2>
          <p>Создайте первое регулярное действие. Начнём понемногу.</p>
          <button class="button button--habit" type="button" data-empty-new-habit>${iconMarkup(Plus, 'button-icon')} Новая привычка</button>
        </section>
      `;
      content.querySelector('[data-empty-new-habit]').addEventListener('click', openCreateDialog);
      return;
    }

    content.innerHTML = `<div class="habits-grid">${habits.map(habitCardMarkup).join('')}</div>`;
    content.querySelectorAll('[data-edit-habit]').forEach((button) => {
      button.addEventListener('click', () => openEditDialog(button.dataset.editHabit));
    });
    content.querySelectorAll('[data-archive-habit]').forEach((button) => {
      button.addEventListener('click', () => openArchiveDialog(button.dataset.archiveHabit));
    });
    content.querySelectorAll('[data-habit-history]').forEach((button) => {
      button.addEventListener('click', () => openHistoryDialog(button.dataset.habitHistory));
    });
  }

  function syncConditionalFields() {
    const scheduleType = form.elements.scheduleType.value;
    const goalType = form.elements.goalType.value;
    page.querySelector('[data-selected-days]').hidden = scheduleType !== 'selectedDays';
    page.querySelector('[data-times-per-week]').hidden = scheduleType !== 'timesPerWeek';
    page.querySelector('[data-target-minutes]').hidden = goalType !== 'minutes';
  }

  async function loadData() {
    setStatus('Загружаем привычки…');

    try {
      habits = await getActiveHabits(auth.currentUser);
      setStatus('');
      renderHabits();
    } catch (error) {
      setStatus(getAuthErrorMessage(error), 'error');
      content.innerHTML = '';
    }
  }

  function openCreateDialog() {
    editingHabitId = null;
    form.reset();
    form.elements.icon.value = habitIconOptions[0].id;
    form.elements.scheduleType.value = 'daily';
    form.elements.goalType.value = 'check';
    page.querySelector('[data-habit-dialog-title]').textContent = 'Новая привычка';
    formStatus.textContent = '';
    syncConditionalFields();
    editorDialog.showModal();
    form.elements.name.focus();
  }

  function openEditDialog(habitId) {
    const habit = habits.find(({ id }) => id === habitId);
    if (!habit) return;

    editingHabitId = habit.id;
    form.reset();
    form.elements.name.value = habit.name;
    form.elements.icon.value = getIconOption(habit.icon).id;
    form.elements.scheduleType.value = habit.scheduleType;
    form.querySelectorAll('[name="daysOfWeek"]').forEach((input) => {
      input.checked = (habit.daysOfWeek ?? []).map(Number).includes(Number(input.value));
    });
    form.elements.timesPerWeek.value = habit.timesPerWeek ?? 3;
    form.elements.goalType.value = habit.goalType;
    form.elements.targetMinutes.value = habit.targetMinutes ?? 30;
    page.querySelector('[data-habit-dialog-title]').textContent = 'Редактировать привычку';
    formStatus.textContent = '';
    syncConditionalFields();
    editorDialog.showModal();
    form.elements.name.focus();
  }

  function openArchiveDialog(habitId) {
    const habit = habits.find(({ id }) => id === habitId);
    if (!habit) return;

    archivingHabitId = habit.id;
    page.querySelector('[data-archive-habit-name]').textContent = `«${habit.name}»`;
    archiveStatus.textContent = '';
    archiveDialog.showModal();
  }

  function renderHistoryEntries(logs) {
    const completedLogs = logs
      .filter((log) => log.habitId === historyHabitId && log.completed === true)
      .sort((left, right) => right.date.localeCompare(left.date));
    const historyList = page.querySelector('[data-history-list]');

    if (!completedLogs.length) {
      historyList.innerHTML = `
        <div class="habit-history-empty">
          ${iconMarkup(CalendarDays, 'habit-history-empty__icon')}
          <strong>В этом месяце записей нет</strong>
          <span>Выполненные дни появятся здесь.</span>
        </div>
      `;
      return;
    }

    historyList.innerHTML = completedLogs.map((log) => {
      const minutes = Number(log.actualMinutes);
      const meta = Number.isFinite(minutes) && minutes > 0
        ? `${formatCalendarDate(log.date)} · ${minutes} мин`
        : formatCalendarDate(log.date);
      const note = typeof log.note === 'string' ? log.note.trim() : '';

      return `
        <article class="habit-history-entry">
          <strong>${escapeHtml(meta)}</strong>
          ${note ? `<p>${escapeHtml(note)}</p>` : ''}
        </article>
      `;
    }).join('');
  }

  async function loadHistory() {
    if (!historyHabitId) return;

    const requestVersion = ++historyLoadVersion;
    const range = getMonthRange(historyMonth);
    page.querySelector('[data-history-month]').textContent = formatMonthTitle(historyMonth);
    page.querySelector('[data-history-status]').textContent = 'Загружаем историю…';
    page.querySelector('[data-history-list]').replaceChildren();

    try {
      const logs = await getHabitLogsForRange(auth.currentUser, range.startDate, range.endDate);
      if (requestVersion !== historyLoadVersion) return;
      page.querySelector('[data-history-status]').textContent = '';
      renderHistoryEntries(logs);
    } catch (error) {
      if (requestVersion !== historyLoadVersion) return;
      page.querySelector('[data-history-status]').textContent = getAuthErrorMessage(error);
    }
  }

  function openHistoryDialog(habitId) {
    const habit = habits.find(({ id }) => id === habitId);
    if (!habit) return;

    const now = new Date();
    historyHabitId = habit.id;
    historyMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    page.querySelector('[data-history-habit-name]').textContent = habit.name;
    historyDialog.showModal();
    loadHistory();
  }

  function changeHistoryMonth(offset) {
    historyMonth = new Date(
      historyMonth.getFullYear(),
      historyMonth.getMonth() + offset,
      1,
    );
    loadHistory();
  }

  page.querySelector('[data-new-habit]').addEventListener('click', openCreateDialog);
  form.querySelectorAll('[name="scheduleType"], [name="goalType"]').forEach((input) => {
    input.addEventListener('change', syncConditionalFields);
  });
  page.querySelectorAll('[data-close-habit-dialog]').forEach((button) => {
    button.addEventListener('click', () => editorDialog.close());
  });
  page.querySelectorAll('[data-close-archive-dialog]').forEach((button) => {
    button.addEventListener('click', () => archiveDialog.close());
  });
  page.querySelectorAll('[data-close-history-dialog]').forEach((button) => {
    button.addEventListener('click', () => historyDialog.close());
  });
  page.querySelector('[data-history-previous-month]').addEventListener('click', () => changeHistoryMonth(-1));
  page.querySelector('[data-history-next-month]').addEventListener('click', () => changeHistoryMonth(1));

  [editorDialog, archiveDialog, historyDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  historyDialog.addEventListener('close', () => {
    historyHabitId = null;
    historyLoadVersion += 1;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveButton = page.querySelector('[data-save-habit]');
    const values = {
      name: form.elements.name.value,
      icon: form.elements.icon.value,
      scheduleType: form.elements.scheduleType.value,
      daysOfWeek: [...form.querySelectorAll('[name="daysOfWeek"]:checked')].map(({ value }) => Number(value)),
      timesPerWeek: form.elements.timesPerWeek.value,
      goalType: form.elements.goalType.value,
      targetMinutes: form.elements.targetMinutes.value,
    };

    saveButton.disabled = true;
    formStatus.textContent = '';

    try {
      if (editingHabitId) {
        await updateHabit(auth.currentUser, editingHabitId, values);
      } else {
        await createHabit(auth.currentUser, values);
      }

      editorDialog.close();
      await loadData();
    } catch (error) {
      formStatus.textContent = getAuthErrorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  page.querySelector('[data-confirm-archive]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!archivingHabitId) return;

    button.disabled = true;
    archiveStatus.textContent = '';

    try {
      await archiveHabit(auth.currentUser, archivingHabitId);
      archiveDialog.close();
      await loadData();
    } catch (error) {
      archiveStatus.textContent = getAuthErrorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  syncConditionalFields();
  loadData();
  return createAppShell({
    activeRoute: 'habits',
    content: page,
    onError: (message) => setStatus(message, 'error'),
  }).element;
}
