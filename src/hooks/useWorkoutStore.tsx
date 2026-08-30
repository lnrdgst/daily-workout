import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { workoutsById } from '@/data/workouts';
import { useLocalStorageState } from './useLocalStorageState';
import {
  buildHistoryEntry,
  createWorkoutDraft,
  defaultRestTimerState,
  getPreviousExercisePerformance,
  loadAppState,
  saveAppState,
} from '@/utils/storage';
import { primeRestAlertSound, triggerRestFinishedAlerts } from '@/utils/restAlerts';
import { loadRestAlertSettings } from '@/utils/restAlertSettings';
import type { ExerciseSetLog, RestTimerSessionState, WorkoutAppState, WorkoutId, WorkoutSessionHistory } from '@/types/workout';

interface WorkoutStoreValue {
  state: WorkoutAppState;
  startWorkout: (workoutId: WorkoutId) => void;
  updateSet: (exerciseId: string, setIndex: number, patch: Partial<ExerciseSetLog>) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number) => void;
  startRestTimer: (seconds: RestTimerSessionState['selectedSeconds']) => void;
  stopRestTimer: () => void;
  selectRestTimerPreset: (seconds: RestTimerSessionState['selectedSeconds']) => void;
  finishWorkout: () => void;
  discardDraft: () => void;
  clearHistory: () => void;
  deleteHistoryEntry: (historyEntryId: string) => void;
  getPreviousExerciseSets: (exerciseId: string) => ExerciseSetLog[] | null;
}

const WorkoutStoreContext = createContext<WorkoutStoreValue | null>(null);

export const WorkoutStoreProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useLocalStorageState(loadAppState, saveAppState);
  const stateRef = useRef(state);
  const completedEndAtRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const { restTimer } = state;
    if (restTimer.status !== 'running' || restTimer.endAt === null) {
      return;
    }

    const checkTimer = () => {
      const timer = stateRef.current.restTimer;
      if (timer.status !== 'running' || timer.endAt === null || Date.now() < timer.endAt) {
        return;
      }
      if (completedEndAtRef.current === timer.endAt) {
        return;
      }

      completedEndAtRef.current = timer.endAt;
      setState((current) => {
        if (current.restTimer.status !== 'running' || current.restTimer.endAt !== timer.endAt) {
          return current;
        }

        return {
          ...current,
          restTimer: {
            ...current.restTimer,
            status: 'finished',
            endAt: null,
          },
        };
      });
      triggerRestFinishedAlerts(loadRestAlertSettings());
    };

    checkTimer();
    const timeoutId = window.setTimeout(checkTimer, Math.max(0, restTimer.endAt - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [setState, state]);

  const value = useMemo<WorkoutStoreValue>(() => {
    return {
      state,
      startWorkout: (workoutId) => {
        setState((current) => {
          const isResumingDraft = current.activeDraft?.workoutId === workoutId;
          const activeDraft = isResumingDraft ? current.activeDraft : createWorkoutDraft(workoutsById[workoutId], current.history);

          return {
            ...current,
            activeDraft,
            restTimer: isResumingDraft ? current.restTimer : defaultRestTimerState,
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
      startRestTimer: (seconds) => {
        completedEndAtRef.current = null;
        primeRestAlertSound();
        setState((current) => {
          if (!current.activeDraft) {
            return current;
          }

          return {
            ...current,
            restTimer: {
              status: 'running',
              selectedSeconds: seconds,
              endAt: Date.now() + seconds * 1000,
            },
          };
        });
      },
      stopRestTimer: () => {
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        setState((current) => ({
          ...current,
          restTimer: {
            ...current.restTimer,
            status: 'ready',
            endAt: null,
          },
        }));
      },
      selectRestTimerPreset: (seconds) => {
        setState((current) => {
          if (current.restTimer.status === 'running') {
            return current;
          }

          return {
            ...current,
            restTimer: {
              status: 'ready',
              selectedSeconds: seconds,
              endAt: null,
            },
          };
        });
      },
      finishWorkout: () => {
        if (!state.activeDraft) {
          return;
        }

        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        const entry = buildHistoryEntry(state.activeDraft);
        const nextState: WorkoutAppState = {
          ...state,
          lastCompletedWorkoutId: state.activeDraft.workoutId,
          activeDraft: null,
          restTimer: defaultRestTimerState,
          history: [...state.history, entry],
        };

        // Persist the completed session before the route changes.
        saveAppState(nextState);
        setState(nextState);
      },
      discardDraft: () => {
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        const nextState: WorkoutAppState = {
          ...state,
          activeDraft: null,
          restTimer: defaultRestTimerState,
        };

        saveAppState(nextState);
        setState(nextState);
      },
      clearHistory: () => {
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        setState((current) => ({
          ...current,
          activeDraft: null,
          restTimer: defaultRestTimerState,
          history: [],
          lastCompletedWorkoutId: null,
        }));
      },
      deleteHistoryEntry: (historyEntryId) => {
        const history = state.history.filter((entry) => entry.id !== historyEntryId);
        const latestEntry = history.reduce<WorkoutSessionHistory | null>(
          (latest, entry) => (!latest || entry.finishedAt > latest.finishedAt ? entry : latest),
          null,
        );
        const nextState: WorkoutAppState = {
          ...state,
          history,
          lastCompletedWorkoutId: latestEntry?.workoutId ?? null,
        };

        saveAppState(nextState);
        setState(nextState);
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
