import {
  Archive,
  BookOpen,
  Brain,
  CalendarPlus,
  Dumbbell,
  GraduationCap,
  Languages,
  Music,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide';
import { auth, getAuthErrorMessage, logout } from '../firebase/auth.js';
import { getLocalDateKey } from '../logic/dates.js';
import { formatPracticeTime, getSkillLevelProgress } from '../logic/skillLevels.js';
import { addManualSkillPractice } from '../services/logService.js';
import {
  archiveSkill,
  createSkill,
  getActiveSkills,
  updateSkill,
} from '../services/skillService.js';

const navigation = [
  ['dashboard', 'Главная'],
  ['habits', 'Привычки'],
  ['character', 'Персонаж'],
  ['profile', 'Профиль'],
];

const skillIconOptions = [
  { id: 'book-open', label: 'Чтение', icon: BookOpen },
  { id: 'languages', label: 'Языки', icon: Languages },
  { id: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { id: 'graduation-cap', label: 'Учёба', icon: GraduationCap },
  { id: 'music', label: 'Музыка', icon: Music },
  { id: 'palette', label: 'Творчество', icon: Palette },
  { id: 'brain', label: 'Развитие', icon: Brain },
  { id: 'sparkles', label: 'Другое', icon: Sparkles },
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
  const normalizedIconId = iconId === 'code-2' ? 'graduation-cap' : iconId;
  return skillIconOptions.find(({ id }) => id === normalizedIconId) ?? skillIconOptions[6];
}

function skillCardMarkup(skill) {
  const progress = getSkillLevelProgress(skill.totalMinutes);
  const icon = getIconOption(skill.icon);
  const progressMarkup = progress.nextLevel === null ? '' : `
    <div class="skill-progress">
      <div class="skill-progress__meta">
        <span>До уровня ${progress.nextLevel}</span>
        <span>${formatPracticeTime(progress.minutesToNextLevel)}</span>
      </div>
      <div class="skill-progress__track" role="progressbar" aria-label="Прогресс до уровня ${progress.nextLevel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.progressPercent)}">
        <i style="--skill-progress: ${progress.progressPercent}%"></i>
      </div>
    </div>
  `;

  return `
    <article class="skill-card">
      <div class="skill-card__topline">
        <span class="skill-card__icon">${iconMarkup(icon.icon, 'skill-icon')}</span>
        <div class="skill-card__actions">
          <button type="button" data-edit-skill="${skill.id}" aria-label="Редактировать навык ${escapeHtml(skill.name)}" title="Редактировать">
            ${iconMarkup(Pencil, 'skill-action-icon')}
          </button>
          <button type="button" data-archive-skill="${skill.id}" aria-label="Архивировать навык ${escapeHtml(skill.name)}" title="Архивировать">
            ${iconMarkup(Archive, 'skill-action-icon')}
          </button>
        </div>
      </div>
      <h2>${escapeHtml(skill.name)}</h2>
      <p class="skill-card__time">${formatPracticeTime(skill.totalMinutes)} практики</p>
      <div class="skill-card__level">
        <span>Уровень ${progress.level}</span>
        <strong>${progress.title}</strong>
      </div>
      ${progressMarkup}
    </article>
  `;
}

function iconPickerMarkup() {
  return skillIconOptions.map(({ id, label, icon }, index) => `
    <label class="skill-icon-option">
      <input type="radio" name="icon" value="${id}" ${index === 0 ? 'checked' : ''} />
      <span>${iconMarkup(icon, 'skill-picker-icon')}<small>${label}</small></span>
    </label>
  `).join('');
}

function screenMarkup() {
  return `
    <nav class="route-nav" aria-label="Навигация приложения">
      <a class="brand" href="#/dashboard" aria-label="Понемногу, главная">
        <img src="/assets/avatar/fx/brand_mark.png" alt="" />
        <span>Понемногу</span>
      </a>
      <div class="route-links">
        ${navigation.map(([path, label]) => `<a href="#/${path}" ${path === 'skills' ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
        <button class="route-logout" type="button" data-skills-logout>Выйти</button>
      </div>
    </nav>

    <section class="skills-shell">
      <header class="skills-header">
        <div>
          <p class="eyebrow">Реальная практика</p>
          <h1>Навыки</h1>
        </div>
        <div class="skills-header__actions">
          <button class="button skill-button--practice" type="button" data-add-practice>
            ${iconMarkup(CalendarPlus, 'button-icon')}
            Добавить практику
          </button>
          <button class="button button--primary" type="button" data-new-skill>
            ${iconMarkup(Plus, 'button-icon')}
            Новый навык
          </button>
        </div>
      </header>
      <p class="skills-status" data-skills-status role="status" aria-live="polite">Загружаем навыки…</p>
      <div data-skills-content></div>
    </section>

    <dialog class="skill-dialog" data-skill-dialog>
      <form class="skill-form" data-skill-form novalidate>
        <header class="skill-dialog__header">
          <h2 data-skill-dialog-title>Новый навык</h2>
          <button type="button" class="skill-dialog__close" data-close-skill-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'skill-action-icon')}
          </button>
        </header>
        <label class="skill-form__name">
          <span>Название</span>
          <input type="text" name="name" maxlength="60" autocomplete="off" placeholder="Например, французский" />
        </label>
        <fieldset>
          <legend>Иконка</legend>
          <div class="skill-icon-picker">${iconPickerMarkup()}</div>
        </fieldset>
        <p class="form-status" data-skill-form-status role="status" aria-live="polite"></p>
        <div class="skill-dialog__actions">
          <button class="button skill-button--secondary" type="button" data-close-skill-dialog>Отмена</button>
          <button class="button button--primary" type="submit" data-save-skill>Сохранить</button>
        </div>
      </form>
    </dialog>

    <dialog class="skill-dialog skill-dialog--confirm" data-archive-dialog>
      <section>
        <header class="skill-dialog__header">
          <h2>Архивировать навык?</h2>
          <button type="button" class="skill-dialog__close" data-close-archive-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'skill-action-icon')}
          </button>
        </header>
        <p>Навык <strong data-archive-skill-name></strong> исчезнет из основного списка, но его данные сохранятся.</p>
        <p class="form-status" data-archive-status role="status" aria-live="polite"></p>
        <div class="skill-dialog__actions">
          <button class="button skill-button--secondary" type="button" data-close-archive-dialog>Отмена</button>
          <button class="button skill-button--archive" type="button" data-confirm-archive>Архивировать</button>
        </div>
      </section>
    </dialog>

    <dialog class="skill-dialog skill-practice-dialog" data-practice-dialog>
      <form class="skill-form" data-practice-form novalidate>
        <header class="skill-dialog__header">
          <h2>Добавить практику</h2>
          <button type="button" class="skill-dialog__close" data-close-practice-dialog aria-label="Закрыть">
            ${iconMarkup(X, 'skill-action-icon')}
          </button>
        </header>
        <label class="skill-form__name">
          <span>Навык</span>
          <select name="skillId" data-practice-skill-select></select>
        </label>
        <label class="skill-form__name">
          <span>Дата</span>
          <input type="date" name="date" />
        </label>
        <label class="skill-form__name">
          <span>Количество минут</span>
          <input type="number" name="minutes" min="1" step="1" inputmode="numeric" placeholder="30" />
        </label>
        <p class="form-status" data-practice-status role="status" aria-live="polite"></p>
        <div class="skill-dialog__actions">
          <button class="button skill-button--secondary" type="button" data-close-practice-dialog>Отмена</button>
          <button class="button button--primary" type="submit" data-save-practice>Сохранить</button>
        </div>
      </form>
    </dialog>
  `;
}

export function skillsScreen() {
  const page = document.createElement('main');
  page.className = 'skills-page';
  page.innerHTML = screenMarkup();

  const content = page.querySelector('[data-skills-content]');
  const status = page.querySelector('[data-skills-status]');
  const editorDialog = page.querySelector('[data-skill-dialog]');
  const archiveDialog = page.querySelector('[data-archive-dialog]');
  const practiceDialog = page.querySelector('[data-practice-dialog]');
  const form = page.querySelector('[data-skill-form]');
  const practiceForm = page.querySelector('[data-practice-form]');
  const formStatus = page.querySelector('[data-skill-form-status]');
  const archiveStatus = page.querySelector('[data-archive-status]');
  const practiceStatus = page.querySelector('[data-practice-status]');
  let skills = [];
  let editingSkillId = null;
  let archivingSkillId = null;

  function setStatus(message, type = '') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function renderSkills() {
    if (!skills.length) {
      content.innerHTML = `
        <section class="skills-empty">
          ${iconMarkup(Brain, 'skills-empty__icon')}
          <h2>Навыков пока нет</h2>
          <p>Создайте первый навык, чтобы позже связывать с ним практику.</p>
          <button class="button button--primary" type="button" data-empty-new-skill>${iconMarkup(Plus, 'button-icon')} Новый навык</button>
        </section>
      `;
      content.querySelector('[data-empty-new-skill]').addEventListener('click', openCreateDialog);
      return;
    }

    content.innerHTML = `<div class="skills-grid">${skills.map(skillCardMarkup).join('')}</div>`;
    content.querySelectorAll('[data-edit-skill]').forEach((button) => {
      button.addEventListener('click', () => openEditDialog(button.dataset.editSkill));
    });
    content.querySelectorAll('[data-archive-skill]').forEach((button) => {
      button.addEventListener('click', () => openArchiveDialog(button.dataset.archiveSkill));
    });
  }

  function renderPracticeSkillOptions() {
    const select = page.querySelector('[data-practice-skill-select]');
    select.innerHTML = skills.length
      ? skills.map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.name)}</option>`).join('')
      : '<option value="">Сначала создайте навык</option>';
    page.querySelector('[data-add-practice]').disabled = !skills.length;
  }

  async function loadSkills() {
    setStatus('Загружаем навыки…');

    try {
      skills = await getActiveSkills(auth.currentUser);
      renderPracticeSkillOptions();
      setStatus('');
      renderSkills();
    } catch (error) {
      setStatus(getAuthErrorMessage(error), 'error');
      content.innerHTML = '';
    }
  }

  function openCreateDialog() {
    editingSkillId = null;
    form.reset();
    form.elements.icon.value = skillIconOptions[0].id;
    page.querySelector('[data-skill-dialog-title]').textContent = 'Новый навык';
    formStatus.textContent = '';
    editorDialog.showModal();
    form.elements.name.focus();
  }

  function openEditDialog(skillId) {
    const skill = skills.find(({ id }) => id === skillId);
    if (!skill) return;

    editingSkillId = skill.id;
    form.elements.name.value = skill.name;
    form.elements.icon.value = getIconOption(skill.icon).id;
    page.querySelector('[data-skill-dialog-title]').textContent = 'Редактировать навык';
    formStatus.textContent = '';
    editorDialog.showModal();
    form.elements.name.focus();
  }

  function openArchiveDialog(skillId) {
    const skill = skills.find(({ id }) => id === skillId);
    if (!skill) return;

    archivingSkillId = skill.id;
    page.querySelector('[data-archive-skill-name]').textContent = `«${skill.name}»`;
    archiveStatus.textContent = '';
    archiveDialog.showModal();
  }

  function openPracticeDialog() {
    if (!skills.length) return;

    practiceForm.reset();
    const today = getLocalDateKey();
    practiceForm.elements.date.value = today;
    practiceForm.elements.date.max = today;
    practiceStatus.textContent = '';
    practiceDialog.showModal();
    practiceForm.elements.minutes.focus();
  }

  page.querySelector('[data-new-skill]').addEventListener('click', openCreateDialog);
  page.querySelector('[data-add-practice]').addEventListener('click', openPracticeDialog);
  page.querySelectorAll('[data-close-skill-dialog]').forEach((button) => {
    button.addEventListener('click', () => editorDialog.close());
  });
  page.querySelectorAll('[data-close-archive-dialog]').forEach((button) => {
    button.addEventListener('click', () => archiveDialog.close());
  });
  page.querySelectorAll('[data-close-practice-dialog]').forEach((button) => {
    button.addEventListener('click', () => practiceDialog.close());
  });

  [editorDialog, archiveDialog, practiceDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveButton = page.querySelector('[data-save-skill]');
    const values = {
      name: form.elements.name.value,
      icon: form.elements.icon.value,
    };

    saveButton.disabled = true;
    formStatus.textContent = '';

    try {
      if (editingSkillId) {
        await updateSkill(auth.currentUser, editingSkillId, values);
      } else {
        await createSkill(auth.currentUser, values);
      }

      editorDialog.close();
      await loadSkills();
    } catch (error) {
      formStatus.textContent = getAuthErrorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  page.querySelector('[data-confirm-archive]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!archivingSkillId) return;

    button.disabled = true;
    archiveStatus.textContent = '';

    try {
      await archiveSkill(auth.currentUser, archivingSkillId);
      archiveDialog.close();
      await loadSkills();
    } catch (error) {
      archiveStatus.textContent = getAuthErrorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  practiceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveButton = page.querySelector('[data-save-practice]');
    saveButton.disabled = true;
    practiceStatus.textContent = '';

    try {
      await addManualSkillPractice(auth.currentUser, {
        skillId: practiceForm.elements.skillId.value,
        date: practiceForm.elements.date.value,
        minutes: practiceForm.elements.minutes.value,
      });
      practiceDialog.close();
      await loadSkills();
    } catch (error) {
      practiceStatus.textContent = getAuthErrorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  page.querySelector('[data-skills-logout]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await logout();
    } catch (error) {
      button.disabled = false;
      setStatus(getAuthErrorMessage(error), 'error');
    }
  });

  loadSkills();
  return page;
}
