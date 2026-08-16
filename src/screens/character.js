import { createAppShell } from '../components/appShell.js';
import { createAvatarEditor } from './avatarEditor.js';

export function characterScreen() {
  const editor = createAvatarEditor({ isOnboarding: false });
  return createAppShell({ activeRoute: 'profile', content: editor }).element;
}
