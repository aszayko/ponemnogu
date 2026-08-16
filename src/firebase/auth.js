import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { firebaseApp } from './config.js';
import { ensureUserDocument } from './db.js';

export const auth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function validateEmail(email) {
  const normalizedEmail = email.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalizedEmail) {
    throw new Error('Введите email.');
  }

  if (!emailPattern.test(normalizedEmail)) {
    throw new Error('Введите корректный email.');
  }

  return normalizedEmail;
}

export function validateRegistration({ email, password, passwordConfirmation }) {
  const normalizedEmail = validateEmail(email);

  if (!password) {
    throw new Error('Введите пароль.');
  }

  if (password.length < 6) {
    throw new Error('Пароль должен содержать не менее 6 символов.');
  }

  if (password !== passwordConfirmation) {
    throw new Error('Пароли не совпадают.');
  }

  return { email: normalizedEmail, password };
}

export function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Аккаунт с таким email уже существует.',
    'auth/invalid-email': 'Введите корректный email.',
    'auth/invalid-credential': 'Неверный email или пароль.',
    'auth/invalid-login-credentials': 'Неверный email или пароль.',
    'auth/user-not-found': 'Неверный email или пароль.',
    'auth/wrong-password': 'Неверный email или пароль.',
    'auth/missing-password': 'Введите пароль.',
    'auth/weak-password': 'Пароль слишком простой. Используйте не менее 6 символов.',
    'auth/user-disabled': 'Этот аккаунт отключён.',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
    'auth/network-request-failed': 'Не удалось подключиться к сети. Проверьте интернет.',
    'auth/popup-closed-by-user': 'Окно входа Google было закрыто.',
    'auth/popup-blocked': 'Браузер заблокировал окно входа Google. Разрешите всплывающие окна.',
    'auth/cancelled-popup-request': 'Вход через Google был отменён.',
    'auth/account-exists-with-different-credential': 'Аккаунт с таким email уже создан другим способом входа.',
    'auth/operation-not-allowed': 'Этот способ входа не включён в настройках Firebase.',
    'auth/configuration-not-found': 'Способ входа не настроен в Firebase.',
    'auth/unauthorized-domain': 'Этот домен не разрешён в настройках Firebase Authentication.',
    'auth/invalid-api-key': 'Проверьте настройки Firebase в .env.local.',
    'auth/internal-error': 'Firebase временно недоступен. Попробуйте ещё раз.',
    'permission-denied': 'Нет доступа к данным пользователя. Проверьте правила Firestore.',
    unavailable: 'Firestore временно недоступен. Попробуйте ещё раз.',
  };

  if (!error?.code && error?.message) {
    return error.message;
  }

  return messages[error?.code] ?? 'Что-то пошло не так. Попробуйте ещё раз.';
}

export async function registerWithEmail(formData) {
  const credentials = validateRegistration(formData);
  const result = await createUserWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password,
  );
  await ensureUserDocument(result.user);
  return result.user;
}

export async function loginWithEmail(email, password) {
  const normalizedEmail = validateEmail(email);

  if (!password) {
    throw new Error('Введите пароль.');
  }

  const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  await ensureUserDocument(result.user);
  return result.user;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(result.user);
  return result.user;
}

export async function resetPassword(email) {
  const normalizedEmail = validateEmail(email);
  await sendPasswordResetEmail(auth, normalizedEmail);
}

export function observeAuthState(onChange, onError) {
  return onAuthStateChanged(auth, onChange, onError);
}

export function logout() {
  return signOut(auth);
}
