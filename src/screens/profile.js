import {
  CalendarDays,
  LogOut,
  Mail,
  RefreshCw,
  UserRoundPen,
} from 'lucide';
import { createAppShell } from '../components/appShell.js';
import { createAvatarPreview } from '../components/avatar.js';
import {
  auth,
  getAuthErrorMessage,
  logout,
  resetPassword,
} from '../firebase/auth.js';
import { getUserDocument } from '../firebase/db.js';
import {
  getNextPlayerTitleLevel,
  getPlayerTitle,
  getPlayerXpProgress,
} from '../logic/playerXp.js';

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

function formatRegistrationDate(profile, firebaseUser) {
  const timestampDate = profile.createdAt?.toDate?.();
  const authDate = firebaseUser?.metadata?.creationTime
    ? new Date(firebaseUser.metadata.creationTime)
    : null;
  const date = timestampDate ?? authDate;

  if (!date || Number.isNaN(date.getTime())) return 'Не указана';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function profileMarkup(profile, firebaseUser) {
  const xp = getPlayerXpProgress(profile.totalXp, profile.playerLevel);
  const playerTitle = getPlayerTitle(xp.level, profile.avatar?.bodyType);
  const nextTitleLevel = getNextPlayerTitleLevel(xp.level);
  const name = profile.displayName || firebaseUser?.displayName || 'Пользователь';
  const email = profile.email || firebaseUser?.email || 'Email не указан';

  return `
    <header class="profile-header">
      <p class="eyebrow">Настройки аккаунта</p>
      <h1>Профиль</h1>
    </header>
    <div class="profile-grid">
      <section class="profile-character-card">
        <div class="profile-avatar" data-profile-avatar></div>
        <strong>${escapeHtml(name)}</strong>
        <span>Уровень ${xp.level}</span>
        <a class="button profile-button--primary" href="#/character">
          ${iconMarkup(UserRoundPen, 'profile-button__icon')}
          Редактировать персонажа
        </a>
      </section>
      <section class="profile-details-card">
        <div class="profile-detail">
          ${iconMarkup(Mail, 'profile-detail__icon')}
          <span><small>Email</small><strong>${escapeHtml(email)}</strong></span>
        </div>
        <div class="profile-detail">
          ${iconMarkup(CalendarDays, 'profile-detail__icon')}
          <span><small>Дата регистрации</small><strong>${escapeHtml(formatRegistrationDate(profile, firebaseUser))}</strong></span>
        </div>
        <div class="profile-xp">
          <div>
            <span class="profile-xp__identity">
              <strong>Уровень ${xp.level}</strong>
              <small>${escapeHtml(playerTitle)}</small>
            </span>
            <span>${xp.currentXp} / ${xp.neededXp} XP</span>
          </div>
          <div class="profile-xp__track" role="progressbar" aria-label="Прогресс уровня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(xp.progressPercent)}">
            <i style="--profile-xp: ${xp.progressPercent}%"></i>
          </div>
          ${nextTitleLevel ? `<p class="profile-xp__next-title">Следующее звание — на уровне ${nextTitleLevel}</p>` : ''}
        </div>
        <div class="profile-actions">
          <button class="button profile-button--secondary" type="button" data-profile-reset>
            ${iconMarkup(RefreshCw, 'profile-button__icon')}
            Сбросить пароль
          </button>
          <button class="button profile-button--logout" type="button" data-profile-logout>
            ${iconMarkup(LogOut, 'profile-button__icon')}
            Выйти
          </button>
        </div>
        <p class="profile-status" data-profile-action-status role="status" aria-live="polite"></p>
      </section>
    </div>
  `;
}

export function profileScreen() {
  const page = document.createElement('main');
  page.className = 'profile-page';
  page.innerHTML = '<p class="profile-loading" data-profile-loading>Загружаем профиль…</p>';
  const shell = createAppShell({
    activeRoute: 'profile',
    content: page,
    onError: (message) => {
      const loading = page.querySelector('[data-profile-loading]');
      if (loading) loading.textContent = message;
    },
  });

  async function loadProfile() {
    try {
      const profile = await getUserDocument(auth.currentUser);
      page.innerHTML = profileMarkup(profile, auth.currentUser);
      const preview = createAvatarPreview(profile.avatar ?? {});
      page.querySelector('[data-profile-avatar]').append(preview.element);

      const actionStatus = page.querySelector('[data-profile-action-status]');
      page.querySelector('[data-profile-reset]').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        actionStatus.textContent = '';

        try {
          await resetPassword(profile.email || auth.currentUser?.email || '');
          actionStatus.textContent = 'Письмо для сброса пароля отправлено.';
          actionStatus.dataset.type = 'success';
        } catch (error) {
          actionStatus.textContent = getAuthErrorMessage(error);
          actionStatus.dataset.type = 'error';
        } finally {
          button.disabled = false;
        }
      });

      page.querySelector('[data-profile-logout]').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        actionStatus.textContent = '';

        try {
          await logout();
        } catch (error) {
          button.disabled = false;
          actionStatus.textContent = getAuthErrorMessage(error);
          actionStatus.dataset.type = 'error';
        }
      });
    } catch (error) {
      page.innerHTML = `<p class="profile-loading" data-profile-loading>${escapeHtml(getAuthErrorMessage(error))}</p>`;
    }
  }

  loadProfile();
  return shell.element;
}
