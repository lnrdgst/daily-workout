import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { loadWorkoutSessionSettings, saveWorkoutSessionSettings } from '@/utils/workoutSessionSettings';
import type { WorkoutSessionSettings } from '@/utils/workoutSessionSettings';

type WorkoutSessionSettingsContextValue = readonly [WorkoutSessionSettings, Dispatch<SetStateAction<WorkoutSessionSettings>>];

const WorkoutSessionSettingsContext = createContext<WorkoutSessionSettingsContextValue | null>(null);

export const WorkoutSessionSettingsProvider = ({ children }: { children: ReactNode }) => {
  const value = useLocalStorageState(loadWorkoutSessionSettings, saveWorkoutSessionSettings);

  return <WorkoutSessionSettingsContext.Provider value={value}>{children}</WorkoutSessionSettingsContext.Provider>;
};

export const useWorkoutSessionSettings = () => {
  const value = useContext(WorkoutSessionSettingsContext);
  if (!value) {
    throw new Error('useWorkoutSessionSettings must be used within WorkoutSessionSettingsProvider');
  }

  return value;
};
