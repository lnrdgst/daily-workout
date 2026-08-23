import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { workoutsById } from '@/data/workouts';
import { useLocalStorageState } from './useLocalStorageState';
import {
  buildHistoryEntry,
  createWorkoutDraft,
  getPreviousExercisePerformance,
  loadAppState,
  saveAppState,
} from '@/utils/storage';
import type { ExerciseSetLog, WorkoutAppState, WorkoutId } from '@/types/workout';

interface WorkoutStoreValue {
  state: WorkoutAppState;
  startWorkout: (workoutId: WorkoutId) => void;
  updateSet: (exerciseId: string, setIndex: number, patch: Partial<ExerciseSetLog>) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number) => void;
  finishWorkout: () => void;
  discardDraft: () => void;
  clearHistory: () => void;
  getPreviousExerciseSets: (exerciseId: string) => ExerciseSetLog[] | null;
}

const WorkoutStoreContext = createContext<WorkoutStoreValue | null>(null);

export const WorkoutStoreProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useLocalStorageState(loadAppState, saveAppState);

  const value = useMemo<WorkoutStoreValue>(() => {
    return {
      state,
      startWorkout: (workoutId) => {
        setState((current) => {
          const activeDraft =
            current.activeDraft?.workoutId === workoutId
              ? current.activeDraft
              : createWorkoutDraft(workoutsById[workoutId]);

          return {
            ...current,
            activeDraft,
            lastOpenedWorkoutId: workoutId,
          };
        });
      },
      updateSet: (exerciseId, setIndex, patch) => {
        setState((current) => {
          if (!current.activeDraft) {
            return current;
          }

          return {
            ...current,
            activeDraft: {
              ...current.activeDraft,
              exercises: current.activeDraft.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((set, index) =>
                        index === setIndex
                          ? {
                              ...set,
                              ...patch,
                            }
                          : set,
                      ),
                    }
                  : exercise,
              ),
            },
          };
        });
      },
      toggleSetCompleted: (exerciseId, setIndex) => {
        setState((current) => {
          if (!current.activeDraft) {
            return current;
          }

          return {
            ...current,
            activeDraft: {
              ...current.activeDraft,
              exercises: current.activeDraft.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((set, index) =>
                        index === setIndex
                          ? {
                              ...set,
                              completed: !set.completed,
                            }
                          : set,
                      ),
                    }
                  : exercise,
              ),
            },
          };
        });
      },
      finishWorkout: () => {
        if (!state.activeDraft) {
          return;
        }

        const entry = buildHistoryEntry(state.activeDraft);
        const nextState: WorkoutAppState = {
          ...state,
          lastCompletedWorkoutId: state.activeDraft.workoutId,
          activeDraft: null,
          history: [...state.history, entry],
        };

        // Persist the completed session before the route changes.
        saveAppState(nextState);
        setState(nextState);
      },
      discardDraft: () => {
        setState((current) => ({
          ...current,
          activeDraft: null,
        }));
      },
      clearHistory: () => {
        setState((current) => ({
          ...current,
          activeDraft: null,
          history: [],
          lastCompletedWorkoutId: null,
        }));
      },
      getPreviousExerciseSets: (exerciseId) => getPreviousExercisePerformance(state.history, exerciseId),
    };
  }, [setState, state]);

  return <WorkoutStoreContext.Provider value={value}>{children}</WorkoutStoreContext.Provider>;
};

export const useWorkoutStore = () => {
  const context = useContext(WorkoutStoreContext);
  if (!context) {
    throw new Error('useWorkoutStore must be used within WorkoutStoreProvider');
  }

  return context;
};
