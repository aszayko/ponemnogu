import { createAvatarPreview } from './avatar.js';
import { getPlayerTitle, getPlayerXpProgress } from '../logic/playerXp.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function createMobileCharacterHeader(profile) {
  const character = document.createElement('section');
  const xp = getPlayerXpProgress(profile.totalXp, profile.playerLevel);
  const title = getPlayerTitle(xp.level, profile.avatar?.bodyType);
  const displayName = profile.displayName || 'Пользователь';

  character.className = 'mobile-character';
  character.setAttribute('aria-label', 'Персонаж и прогресс уровня');
  character.innerHTML = `
    <div class="mobile-character__avatar" data-mobile-character-avatar></div>
    <div class="mobile-character__info">
      <strong title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
      <span class="mobile-character__level">Уровень ${xp.level}</span>
      <span class="mobile-character__title">${escapeHtml(title)}</span>
      <div class="mobile-character__xp-meta">
        <span>XP</span>
        <span>${xp.currentXp} / ${xp.neededXp}</span>
      </div>
      <div class="mobile-character__xp-track" role="progressbar" aria-label="Прогресс уровня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(xp.progressPercent)}">
        <i style="--mobile-character-xp: ${xp.progressPercent}%"></i>
      </div>
    </div>
  `;

  const preview = createAvatarPreview(profile.avatar ?? {});
  character.querySelector('[data-mobile-character-avatar]').append(preview.element);
  return character;
}
