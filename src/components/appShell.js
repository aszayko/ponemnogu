import { auth, getAuthErrorMessage, logout } from '../firebase/auth.js';
import { getUserDocument } from '../firebase/db.js';
import { createSidebar } from './sidebar.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function createAppShell({ activeRoute, content, onError = () => {} }) {
  const element = document.createElement('div');
  const sidebarMount = document.createElement('div');
  element.className = 'dashboard-page app-shell-page';
  content.classList.add('app-shell-main');
  element.append(sidebarMount, content);

  async function refreshSidebar(profile = null) {
    try {
      const currentProfile = profile ?? await getUserDocument(auth.currentUser);
      sidebarMount.replaceChildren(createSidebar({
        profile: currentProfile,
        activeRoute,
        async onLogout() {
          try {
            await logout();
            return true;
          } catch (error) {
            onError(getAuthErrorMessage(error));
            return false;
          }
        },
      }));
      return currentProfile;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      sidebarMount.innerHTML = `<aside class="app-sidebar app-sidebar--error"><p>${escapeHtml(message)}</p></aside>`;
      onError(message);
      return null;
    }
  }

  refreshSidebar();
  return { element, refreshSidebar };
}
