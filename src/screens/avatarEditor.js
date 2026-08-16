import { auth, getAuthErrorMessage, logout } from '../firebase/auth.js';
import { getUserDocument, saveAvatarProfile } from '../firebase/db.js';
import { createAvatarPreview } from '../components/avatar.js';
import { getDefaultHairStyle, getHairStylesForBodyType, hairStyles } from '../data/avatarConfig.js';
import {
  eyeColors,
  getColorOption,
  getHoodieColorOption,
  hairColors,
  hoodieColors,
} from '../data/colors.js';
import { assetUrl } from '../utils/assetUrl.js';

const steps = [
  { id: 'name', title: 'Как тебя называть?' },
  { id: 'bodyType', title: 'Выбери персонажа' },
  { id: 'hairStyle', title: 'Выбери причёску' },
  { id: 'hairColor', title: 'Цвет волос' },
  { id: 'eyeColor', title: 'Цвет глаз' },
  { id: 'hoodieColor', title: 'Цвет худи' },
  { id: 'confirmation', title: 'Всё готово' },
];

const defaultState = {
  displayName: '',
  avatar: {
    bodyType: 'female',
    skinTone: 'default',
    hairStyle: 'hair_01_short_neat',
    hairColor: 'darkBrown',
    eyeColor: 'green',
    hoodieColor: 'purple',
  },
};

function optionButton(field, value, label, content) {
  return `
    <button class="avatar-option" type="button" data-field="${field}" data-value="${value}" aria-pressed="false">
      ${content}
      <span>${label}</span>
    </button>
  `;
}

function colorOptions(field, options) {
  return options.map(({ id, label, swatch }) => optionButton(
    field,
    id,
    label,
    `<i class="color-swatch" style="--swatch: ${swatch}" aria-hidden="true"></i>`,
  )).join('');
}

function hairOptionButton({ id, label, src }) {
  return `
    <button class="avatar-option avatar-option--hair" type="button" data-field="hairStyle" data-value="${id}" aria-label="${label}" title="${label}" aria-pressed="false">
      <img src="${src}" alt="" />
    </button>
  `;
}

function editorMarkup(isOnboarding) {
  return `
    ${isOnboarding ? `
      <header class="avatar-editor__header">
        <a class="auth-brand" href="#/onboarding" aria-label="Понемногу">
          <img src="${assetUrl('assets/avatar/fx/brand_mark.png')}" alt="" />
          <span>Понемногу</span>
        </a>
        <button class="route-logout" type="button" data-avatar-logout>Выйти</button>
      </header>
    ` : ''}
    <div class="avatar-editor__layout">
      <section class="avatar-showcase" aria-label="Предпросмотр персонажа">
        <div data-avatar-preview></div>
        <div class="avatar-caption">
          <strong data-avatar-name>Твой персонаж</strong>
        </div>
      </section>
      <section class="avatar-wizard">
        <div class="wizard-progress" aria-label="Прогресс настройки">
          ${steps.map((step, index) => `<i data-progress-step="${index}" title="${step.title}"></i>`).join('')}
        </div>
        <p class="wizard-count" data-step-count></p>
        <form class="avatar-form" novalidate>
          <section class="wizard-step" data-step="name">
            <h1>${steps[0].title}</h1>
            <label class="avatar-name-field">
              <span>Имя</span>
              <input type="text" name="displayName" maxlength="40" autocomplete="name" placeholder="Например, Аня" />
            </label>
          </section>
          <section class="wizard-step" data-step="bodyType" hidden>
            <h1>${steps[1].title}</h1>
            <div class="avatar-options avatar-options--gender">
              ${optionButton('bodyType', 'male', 'Мужской', '<b aria-hidden="true">М</b>')}
              ${optionButton('bodyType', 'female', 'Женский', '<b aria-hidden="true">Ж</b>')}
            </div>
          </section>
          <section class="wizard-step" data-step="hairStyle" hidden>
            <h1>${steps[2].title}</h1>
            <div class="avatar-options avatar-options--hair">
              ${hairStyles.map(hairOptionButton).join('')}
            </div>
          </section>
          <section class="wizard-step" data-step="hairColor" hidden>
            <h1>${steps[3].title}</h1>
            <div class="avatar-options avatar-options--colors">${colorOptions('hairColor', hairColors)}</div>
          </section>
          <section class="wizard-step" data-step="eyeColor" hidden>
            <h1>${steps[4].title}</h1>
            <div class="avatar-options avatar-options--colors avatar-options--eyes">${colorOptions('eyeColor', eyeColors)}</div>
          </section>
          <section class="wizard-step" data-step="hoodieColor" hidden>
            <h1>${steps[5].title}</h1>
            <div class="avatar-options avatar-options--colors avatar-options--hoodie">${colorOptions('hoodieColor', hoodieColors)}</div>
          </section>
          <section class="wizard-step" data-step="confirmation" hidden>
            <h1>${steps[6].title}</h1>
            <dl class="avatar-summary">
              <div><dt>Имя</dt><dd data-summary-name></dd></div>
              <div><dt>Персонаж</dt><dd data-summary-body></dd></div>
              <div><dt>Причёска</dt><dd data-summary-hair></dd></div>
              <div><dt>Волосы</dt><dd data-summary-hair-color></dd></div>
              <div><dt>Глаза</dt><dd data-summary-eye-color></dd></div>
              <div><dt>Худи</dt><dd data-summary-hoodie-color></dd></div>
            </dl>
          </section>
          <p class="form-status avatar-form__status" data-form-status role="status" aria-live="polite"></p>
          <div class="wizard-actions">
            <button class="button button--secondary" type="button" data-back>Назад</button>
            <button class="button button--primary" type="button" data-next>Дальше</button>
            <button class="button button--primary" type="submit" data-save hidden>Готово</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

export function createAvatarEditor({ isOnboarding }) {
  const page = document.createElement('main');
  page.className = 'avatar-editor';
  page.innerHTML = editorMarkup(isOnboarding);

  const state = structuredClone(defaultState);
  const form = page.querySelector('form');
  const nameInput = form.elements.displayName;
  const status = page.querySelector('[data-form-status]');
  const previewMount = page.querySelector('[data-avatar-preview]');
  const preview = createAvatarPreview(state.avatar);
  let currentStep = 0;
  let hasUserInteracted = false;
  previewMount.replaceChildren(preview.element);

  function normalizeHairStyle() {
    const availableStyles = getHairStylesForBodyType(state.avatar.bodyType);
    if (!availableStyles.some(({ id }) => id === state.avatar.hairStyle)) {
      state.avatar.hairStyle = getDefaultHairStyle(state.avatar.bodyType);
    }
  }

  function normalizeHoodieColor() {
    state.avatar.hoodieColor = getHoodieColorOption(state.avatar.hoodieColor).id;
  }

  function setStatus(message, type = 'error') {
    status.textContent = message;
    status.dataset.type = message ? type : '';
  }

  function updateSummary() {
    page.querySelector('[data-summary-name]').textContent = state.displayName || '—';
    page.querySelector('[data-summary-body]').textContent = state.avatar.bodyType === 'male' ? 'Мужской' : 'Женский';
    page.querySelector('[data-summary-hair]').textContent = hairStyles.find(({ id }) => id === state.avatar.hairStyle)?.label ?? '—';
    page.querySelector('[data-summary-hair-color]').textContent = getColorOption(hairColors, state.avatar.hairColor).label;
    page.querySelector('[data-summary-eye-color]').textContent = getColorOption(eyeColors, state.avatar.eyeColor).label;
    page.querySelector('[data-summary-hoodie-color]').textContent = getHoodieColorOption(state.avatar.hoodieColor).label;
  }

  function syncControls() {
    normalizeHairStyle();
    normalizeHoodieColor();
    nameInput.value = state.displayName;
    page.querySelector('[data-avatar-name]').textContent = state.displayName || 'Твой персонаж';
    page.querySelectorAll('[data-field]').forEach((button) => {
      if (button.dataset.field === 'hairStyle') {
        button.hidden = !getHairStylesForBodyType(state.avatar.bodyType)
          .some(({ id }) => id === button.dataset.value);
      }
      const selected = state.avatar[button.dataset.field] === button.dataset.value;
      button.setAttribute('aria-pressed', String(selected));
    });
    page.querySelectorAll('[data-field="hairStyle"] img').forEach((image) => {
      image.style.filter = getColorOption(hairColors, state.avatar.hairColor).filter;
    });
    preview.update(state.avatar);
    updateSummary();
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    page.querySelectorAll('[data-step]').forEach((panel) => {
      panel.hidden = panel.dataset.step !== steps[currentStep].id;
    });
    page.querySelectorAll('[data-progress-step]').forEach((marker, markerIndex) => {
      marker.dataset.state = markerIndex < currentStep ? 'complete' : markerIndex === currentStep ? 'current' : '';
    });
    page.querySelector('[data-step-count]').textContent = `Шаг ${currentStep + 1} из ${steps.length}`;
    page.querySelector('[data-back]').hidden = currentStep === 0;
    page.querySelector('[data-next]').hidden = currentStep === steps.length - 1;
    page.querySelector('[data-save]').hidden = currentStep !== steps.length - 1;
    setStatus('');
    updateSummary();
  }

  function validateCurrentStep() {
    if (steps[currentStep].id !== 'name') return true;
    state.displayName = nameInput.value.trim();

    if (!state.displayName) {
      setStatus('Введите имя персонажа.');
      nameInput.focus();
      return false;
    }

    return true;
  }

  nameInput.addEventListener('input', () => {
    hasUserInteracted = true;
    state.displayName = nameInput.value;
    page.querySelector('[data-avatar-name]').textContent = nameInput.value.trim() || 'Твой персонаж';
  });

  page.querySelectorAll('[data-field]').forEach((button) => {
    button.addEventListener('click', () => {
      hasUserInteracted = true;
      state.avatar[button.dataset.field] = button.dataset.value;
      syncControls();
    });
  });

  page.querySelector('[data-next]').addEventListener('click', () => {
    if (validateCurrentStep()) showStep(currentStep + 1);
  });
  page.querySelector('[data-back]').addEventListener('click', () => showStep(currentStep - 1));

  const logoutButton = page.querySelector('[data-avatar-logout]');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await logout();
      } catch (error) {
        setStatus(getAuthErrorMessage(error));
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.displayName = nameInput.value.trim();
    if (!state.displayName) {
      showStep(0);
      setStatus('Введите имя персонажа.');
      return;
    }

    const saveButton = page.querySelector('[data-save]');
    if (!auth.currentUser) {
      setStatus('Сессия завершилась. Войдите снова.');
      return;
    }
    saveButton.disabled = true;
    setStatus('Сохраняем персонажа…', 'success');

    try {
      const savedProfile = await saveAvatarProfile(auth.currentUser, state);
      window.dispatchEvent(new CustomEvent('ponemnogu:profile-updated', { detail: savedProfile }));

      if (isOnboarding) {
        window.location.hash = '#/dashboard';
      } else {
        setStatus('Изменения сохранены.', 'success');
        saveButton.disabled = false;
      }
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
      saveButton.disabled = false;
    }
  });

  async function loadProfile() {
    try {
      if (!auth.currentUser) return;
      const profile = await getUserDocument(auth.currentUser);
      if (hasUserInteracted) return;
      state.displayName = profile.displayName ?? auth.currentUser.displayName ?? '';
      state.avatar = {
        ...defaultState.avatar,
        ...Object.fromEntries(
          Object.entries(profile.avatar ?? {}).filter(([, value]) => value !== null),
        ),
        skinTone: 'default',
      };
      syncControls();
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
    }
  }

  syncControls();
  showStep(0);
  loadProfile();
  return page;
}
