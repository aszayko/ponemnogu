import { getAuthErrorMessage, logout } from '../firebase/auth.js';
import { assetUrl } from '../utils/assetUrl.js';

const navigation = [
  ['login', 'Вход'],
  ['register', 'Регистрация'],
  ['onboarding', 'Онбординг'],
  ['dashboard', 'Главная'],
  ['habits', 'Привычки'],
  ['character', 'Персонаж'],
  ['profile', 'Профиль'],
];

export function createPlaceholderScreen(route, title, accent = 'lime') {
  const page = document.createElement('main');
  page.className = 'placeholder-page';
  page.innerHTML = `
    <nav class="route-nav" aria-label="Временная навигация">
      <a class="brand" href="#/dashboard" aria-label="Понемногу, главная">
        <img src="${assetUrl('assets/avatar/fx/brand_mark.png')}" alt="" />
        <span>Понемногу</span>
      </a>
      <div class="route-links">
        ${navigation.map(([path, label]) => `<a href="#/${path}" ${path === route ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
        <button class="route-logout" type="button">Выйти</button>
      </div>
    </nav>
    <section class="placeholder-card placeholder-card--${accent}">
      <p class="eyebrow">Этап 1 · Skeleton</p>
      <h1>${title}</h1>
      <p>Экран подготовлен. Функциональность появится на следующих этапах.</p>
      <code>#/${route}</code>
    </section>
  `;

  page.querySelector('.route-logout').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await logout();
    } catch (error) {
      button.disabled = false;
      button.textContent = getAuthErrorMessage(error);
    }
  });

  return page;
}
