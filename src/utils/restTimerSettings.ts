export type RestDurationSeconds = 60 | 90 | 120;

export interface RestTimerSettings {
  defaultRestSeconds: RestDurationSeconds;
}

const STORAGE_KEY = 'daily-workout-rest-timer-settings';

export const defaultRestTimerSettings: RestTimerSettings = {
  defaultRestSeconds: 90,
};

export const loadRestTimerSettings = (): RestTimerSettings => {
  if (typeof window === 'undefined') {
    return defaultRestTimerSettings;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<RestTimerSettings>;
    return {
      defaultRestSeconds:
        parsed.defaultRestSeconds === 60 || parsed.defaultRestSeconds === 90 || parsed.defaultRestSeconds === 120
          ? parsed.defaultRestSeconds
          : defaultRestTimerSettings.defaultRestSeconds,
    };
  } catch {
    return defaultRestTimerSettings;
  }
};

export const saveRestTimerSettings = (settings: RestTimerSettings) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};
