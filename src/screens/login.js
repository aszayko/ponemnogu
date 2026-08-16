import {
  getAuthErrorMessage,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
} from '../firebase/auth.js';
import { createAuthScreen, setFormPending, setFormStatus } from './authScreen.js';

export function loginScreen() {
  const page = createAuthScreen({
    eyebrow: 'С возвращением',
    title: 'Войти',
    description: 'Привычки, которые приживаются. Прогресс, который видно.',
    content: `
      <form class="auth-form" novalidate>
        <label>
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" inputmode="email" required />
        </label>
        <label>
          <span>Пароль</span>
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <button class="auth-link auth-link--reset" type="button" data-reset-password>Забыли пароль?</button>
        <p class="form-status" data-form-status role="status" aria-live="polite"></p>
        <button class="button button--primary" type="submit">Войти</button>
        <div class="auth-divider"><span>или</span></div>
        <button class="button button--google" type="button" data-google-login>
          <span class="google-mark" aria-hidden="true">G</span>
          Продолжить с Google
        </button>
        <p class="auth-switch">Нет аккаунта? <a href="#/register">Зарегистрироваться</a></p>
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
      await loginWithEmail(data.get('email'), data.get('password'));
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

  form.querySelector('[data-reset-password]').addEventListener('click', async () => {
    setFormStatus(form, '');
    setFormPending(form, true);

    try {
      const email = new FormData(form).get('email');
      await resetPassword(email);
      setFormStatus(form, 'Письмо для сброса пароля отправлено.', 'success');
    } catch (error) {
      setFormStatus(form, getAuthErrorMessage(error));
    } finally {
      setFormPending(form, false);
    }
  });

  return page;
}
