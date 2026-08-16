import { createRouter } from './router/router.js';
import { screens } from './screens/index.js';
import { getAuthErrorMessage, observeAuthState } from './firebase/auth.js';
import { ensureUserDocument } from './firebase/db.js';

const authRoutes = new Set(['login', 'register']);
const protectedRoutes = new Set([
  'onboarding',
  'dashboard',
  'habits',
  'skills',
  'character',
  'profile',
]);

export function startApp(root) {
  const router = createRouter({ root, routes: screens, fallback: 'dashboard' });
  let authState = { user: null, profile: null };
  let routerStarted = false;

  root.innerHTML = `
    <main class="auth-loading" aria-live="polite">
      <img src="/assets/avatar/fx/brand_mark.png" alt="" />
      <p>Проверяем сохранение…</p>
    </main>
  `;

  router.setRouteResolver((requestedRoute) => {
    if (!authState.user) {
      return protectedRoutes.has(requestedRoute) ? 'login' : requestedRoute;
    }

    if (!authState.profile?.onboardingCompleted) {
      return 'onboarding';
    }

    if (authRoutes.has(requestedRoute) || requestedRoute === 'onboarding') {
      return 'dashboard';
    }

    return requestedRoute;
  });

  window.addEventListener('ponemnogu:profile-updated', (event) => {
    const onboardingStatusChanged =
      authState.profile?.onboardingCompleted !== event.detail.onboardingCompleted;
    authState.profile = { ...authState.profile, ...event.detail };

    if (onboardingStatusChanged && routerStarted) {
      router.refresh();
    }
  });

  observeAuthState(
    async (user) => {
      try {
        authState = {
          user,
          profile: user ? await ensureUserDocument(user) : null,
        };

        if (!routerStarted) {
          routerStarted = true;
          router.start();
        } else {
          router.refresh();
        }
      } catch (error) {
        root.innerHTML = `
          <main class="auth-loading auth-loading--error">
            <p>${getAuthErrorMessage(error)}</p>
          </main>
        `;
      }
    },
    (error) => {
      root.innerHTML = `
        <main class="auth-loading auth-loading--error">
          <p>${getAuthErrorMessage(error)}</p>
        </main>
      `;
    },
  );
}
