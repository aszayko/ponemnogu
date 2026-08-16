import { CircleUserRound, Home, LogOut, ListChecks } from 'lucide';
import { createAvatarPreview } from './avatar.js';
import { getPlayerXpProgress } from '../logic/playerXp.js';

const navigation = [
  { route: 'dashboard', label: 'Главная', icon: Home },
  { route: 'habits', label: 'Привычки', icon: ListChecks },
  { route: 'profile', label: 'Профиль', icon: CircleUserRound },
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

export function createSidebar({ profile, activeRoute = 'dashboard', onLogout }) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';
  const xp = getPlayerXpProgress(profile.totalXp, profile.playerLevel);
  const displayName = profile.displayName || 'Пользователь';

  sidebar.innerHTML = `
    <a class="sidebar-brand" href="#/dashboard" aria-label="Понемногу, главная">
      <img src="/assets/avatar/fx/brand_mark.png" alt="" />
      <span>Понемногу</span>
    </a>
    <nav class="sidebar-nav" aria-label="Навигация приложения">
      ${navigation.map((item) => `
        <a href="#/${item.route}" ${item.route === activeRoute ? 'aria-current="page"' : ''}>
          ${iconMarkup(item.icon, 'sidebar-nav__icon')}
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
    <section class="sidebar-player">
      <div class="sidebar-avatar" data-sidebar-avatar></div>
      <div class="sidebar-player__copy">
        <strong>${escapeHtml(displayName)}</strong>
        <span>Уровень ${xp.level}</span>
      </div>
      <div class="sidebar-xp">
        <div class="sidebar-xp__meta">
          <span>XP</span>
          <span>${xp.currentXp} / ${xp.neededXp}</span>
        </div>
        <div class="sidebar-xp__track" role="progressbar" aria-label="Прогресс уровня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(xp.progressPercent)}">
          <i style="--sidebar-xp: ${xp.progressPercent}%"></i>
        </div>
      </div>
    </section>
    <button class="sidebar-logout" type="button" data-sidebar-logout>
      ${iconMarkup(LogOut, 'sidebar-nav__icon')}
      <span>Выйти</span>
    </button>
  `;

  const preview = createAvatarPreview(profile.avatar ?? {});
  sidebar.querySelector('[data-sidebar-avatar]').append(preview.element);
  sidebar.querySelector('[data-sidebar-logout]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      const succeeded = await onLogout();
      if (succeeded === false) button.disabled = false;
    } catch {
      button.disabled = false;
    }
  });

  return sidebar;
}
