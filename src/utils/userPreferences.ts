export interface UserPreferences {
  displayName: string;
}

const STORAGE_KEY = 'daily-workout-user-preferences';

export const defaultUserPreferences: UserPreferences = {
  displayName: '',
};

export const loadUserPreferences = (): UserPreferences => {
  if (typeof window === 'undefined') {
    return defaultUserPreferences;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<UserPreferences>;
    return {
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '',
    };
  } catch {
    return defaultUserPreferences;
  }
};

export const saveUserPreferences = (preferences: UserPreferences) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ displayName: preferences.displayName.trim() }));
  }
};
