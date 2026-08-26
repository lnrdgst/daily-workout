export interface RestAlertSettings {
  sound: boolean;
  vibration: boolean;
  notifications: boolean;
}

const STORAGE_KEY = 'daily-workout-rest-alert-settings';

export const defaultRestAlertSettings: RestAlertSettings = {
  sound: true,
  vibration: true,
  notifications: false,
};

export const loadRestAlertSettings = (): RestAlertSettings => {
  if (typeof window === 'undefined') {
    return defaultRestAlertSettings;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<RestAlertSettings>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : defaultRestAlertSettings.sound,
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : defaultRestAlertSettings.vibration,
      notifications: typeof parsed.notifications === 'boolean' ? parsed.notifications : defaultRestAlertSettings.notifications,
    };
  } catch {
    return defaultRestAlertSettings;
  }
};

export const saveRestAlertSettings = (settings: RestAlertSettings) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};
