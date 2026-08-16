import { loginScreen } from './login.js';
import { registerScreen } from './register.js';
import { onboardingScreen } from './onboarding.js';
import { dashboardScreen } from './dashboard.js';
import { habitsScreen } from './habits.js';
import { skillsScreen } from './skills.js';
import { characterScreen } from './character.js';
import { profileScreen } from './profile.js';

export const screens = {
  login: loginScreen,
  register: registerScreen,
  onboarding: onboardingScreen,
  dashboard: dashboardScreen,
  habits: habitsScreen,
  skills: skillsScreen,
  character: characterScreen,
  profile: profileScreen,
};
