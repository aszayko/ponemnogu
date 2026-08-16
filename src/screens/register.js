import {
  getAuthErrorMessage,
  loginWithGoogle,
  registerWithEmail,
} from '../firebase/auth.js';
import { createAuthScreen, setFormPending, setFormStatus } from './authScreen.js';

export function registerScreen() {
  const page = createAuthScreen({
    eyebrow: 'Первый ход',
    title: 'Создать аккаунт',
    description: 'Сохранение прогресса начинается здесь.',
    content: `
      <form class="auth-form" novalidate>
        <label>
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" inputmode="email" required />
        </label>
        <label>
          <span>Пароль</span>
          <input type="password" name="password" autocomplete="new-password" minlength="6" required />
          <small>Минимум 6 символов</small>
        </label>
        <label>
          <span>Повторите пароль</span>
          <input type="password" name="passwordConfirmation" autocomplete="new-password" minlength="6" required />
        </label>
        <p class="form-status" data-form-status role="status" aria-live="polite"></p>
        <button class="button button--primary" type="submit">Зарегистрироваться</button>
        <div class="auth-divider"><span>или</span></div>
        <button class="button button--google" type="button" data-google-login>
          <span class="google-mark" aria-hidden="true">G</span>
          Продолжить с Google
        </button>
        <p class="auth-switch">Уже есть аккаунт? <a href="#/login">Войти</a></p>
      </form>
    `,
  });
  const form = page.querySelector('form');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormStatus(form, '');
    setFormPending(form, true);

    try {
      const data = new FormData(form);
      await registerWithEmail({
        email: data.get('email'),
        password: data.get('password'),
        passwordConfirmation: data.get('passwordConfirmation'),
      });
    } catch (error) {
      setFormStatus(form, getAuthErrorMessage(error));
    } finally {
      setFormPending(form, false);
    }
  });

  form.querySelector('[data-google-login]').addEventListener('click', async () => {
    setFormStatus(form, '');
    setFormPending(form, true);

    try {
      await loginWithGoogle();
    } catch (error) {
      setFormStatus(form, getAuthErrorMessage(error));
    } finally {
      setFormPending(form, false);
    }
  });

  return page;
}
