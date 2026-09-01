export interface WorkoutSessionSettings {
  keepScreenAwake: boolean;
  autoStartRestTimer: boolean;
}

const STORAGE_KEY = 'daily-workout-session-settings';

export const defaultWorkoutSessionSettings: WorkoutSessionSettings = {
  keepScreenAwake: true,
  autoStartRestTimer: true,
};

export const loadWorkoutSessionSettings = (): WorkoutSessionSettings => {
  if (typeof window === 'undefined') {
    return defaultWorkoutSessionSettings;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<WorkoutSessionSettings>;
    return {
      keepScreenAwake:
        typeof parsed.keepScreenAwake === 'boolean' ? parsed.keepScreenAwake : defaultWorkoutSessionSettings.keepScreenAwake,
      autoStartRestTimer:
        typeof parsed.autoStartRestTimer === 'boolean'
          ? parsed.autoStartRestTimer
          : defaultWorkoutSessionSettings.autoStartRestTimer,
    };
  } catch {
    return defaultWorkoutSessionSettings;
  }
};

export const saveWorkoutSessionSettings = (settings: WorkoutSessionSettings) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};
