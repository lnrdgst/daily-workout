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
import { primeRestAlertSound, triggerRestFinishedAlerts, triggerIntervalFinishedAlerts } from '@/utils/restAlerts';
import { buildCardioHistoryEntry, configureIntervals, createCardioDraft, isShortCardioSession, markInterval, removeIntervals, settleInterval, startInterval, undoInterval } from '@/utils/cardioSession';
import { isStrengthHistory } from '@/utils/sessions';
import { undoCompletedSet } from '@/utils/setCompletion';
import { loadRestAlertSettings } from '@/utils/restAlertSettings';
import { buildRecoveredCardioHistoryEntry } from '@/utils/cardioRecovery';
import type { CardioRecoveryInput } from '@/utils/cardioRecovery';
import type { CardioData, CardioModality, CardioSessionDraft, ExerciseSetLog, RestTimerSessionState, SetCompletionTarget, WorkoutAppState, WorkoutId, WorkoutSessionHistory } from '@/types/workout';

interface WorkoutStoreValue {
  state: WorkoutAppState;
  startWorkout: (workoutId: WorkoutId) => void;
  startCardio: (modality: CardioModality) => void;
  updateCardio: (patch: Partial<CardioData>) => void;
  configureCardioIntervals: (targetCount: number, durationSeconds: number) => void;
  startCardioInterval: () => void;
  markCardioInterval: () => void;
  undoCardioInterval: () => void;
  cancelCardioInterval: () => void;
  removeCardioIntervals: () => void;
  updateSet: (exerciseId: string, setIndex: number, patch: Partial<ExerciseSetLog>) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number) => void;
  startRestTimer: (seconds: RestTimerSessionState['selectedSeconds'], automaticTarget?: SetCompletionTarget) => void;
  undoSetCompleted: (target: SetCompletionTarget, cancelRestId?: string) => void;
  stopRestTimer: () => void;
  selectRestTimerPreset: (seconds: RestTimerSessionState['selectedSeconds']) => void;
  finishWorkout: (recovery?: CardioRecoveryInput) => boolean;
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
  const completedIntervalRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // The provider survives route changes. Persist completion before alerting so
  // refresh/focus/visibility events cannot count or alert the same interval twice.
  useEffect(() => {
    const draft = state.activeDraft;
    if (draft?.type !== 'cardio' || draft.intervalEndAt === null) return;
    const checkInterval = () => {
      const current = stateRef.current;
      if (current.activeDraft?.type !== 'cardio') return;
      const activeDraft = settleInterval(current.activeDraft);
      if (activeDraft === current.activeDraft) return;
      const intervalKey = `${current.activeDraft.startedAt}-${current.activeDraft.intervalEndAt}`;
      const next = { ...current, activeDraft };
      saveAppState(next);
      stateRef.current = next;
      setState(next);
      if (completedIntervalRef.current !== intervalKey) {
        completedIntervalRef.current = intervalKey;
        triggerIntervalFinishedAlerts(loadRestAlertSettings());
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkInterval();
    };
    checkInterval();
    const timeout = window.setTimeout(checkInterval, Math.max(0, draft.intervalEndAt - Date.now()));
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkInterval);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkInterval);
    };
  }, [setState, state.activeDraft]);

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
              automaticSource: undefined,
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
    const changeCardio = (update: (draft: CardioSessionDraft) => CardioSessionDraft) => {
      const current = stateRef.current;
      if (current.activeDraft?.type !== 'cardio') return;
      const activeDraft = update(current.activeDraft);
      if (activeDraft === current.activeDraft) return;
      const next = { ...current, activeDraft };
      saveAppState(next);
      stateRef.current = next;
      setState(next);
    };
    return {
      state,
      startCardio: (modality) => {
        const current = stateRef.current;
        if (current.activeDraft) return;
        const next = { ...current, activeDraft: createCardioDraft(modality), restTimer: defaultRestTimerState };
        saveAppState(next);
        stateRef.current = next;
        setState(next);
      },
      updateCardio: (patch) => changeCardio((draft) => ({ ...draft, ...patch })),
      configureCardioIntervals: (targetCount, durationSeconds) => changeCardio((draft) => configureIntervals(draft, targetCount, durationSeconds)),
      startCardioInterval: () => {
        primeRestAlertSound();
        changeCardio((draft) => {
          const next = startInterval(draft);
          if (next !== draft) completedIntervalRef.current = null;
          return next;
        });
      },
      markCardioInterval: () => changeCardio(markInterval),
      undoCardioInterval: () => changeCardio(undoInterval),
      cancelCardioInterval: () => changeCardio((draft) => ({ ...draft, intervalEndAt: null })),
      removeCardioIntervals: () => changeCardio(removeIntervals),
      startWorkout: (workoutId) => {
        setState((current) => {
          if (current.activeDraft?.type === 'cardio') return current;
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
          if (!current.activeDraft || current.activeDraft.type === 'cardio') {
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
          if (!current.activeDraft || current.activeDraft.type === 'cardio') {
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
      undoSetCompleted: (target, cancelRestId) => {
        const current = stateRef.current;
        const next = undoCompletedSet(current, target, cancelRestId);
        if (next === current) return;
        if (current.restTimer.endAt !== null && next.restTimer.endAt === null) completedEndAtRef.current = current.restTimer.endAt;
        saveAppState(next);
        stateRef.current = next;
        setState(next);
      },
      startRestTimer: (seconds, automaticTarget) => {
        completedEndAtRef.current = null;
        primeRestAlertSound();
        const automaticSource = automaticTarget ? { ...automaticTarget, id: crypto.randomUUID() } : undefined;
        setState((current) => {
          if (!current.activeDraft || current.activeDraft.type === 'cardio') {
            return current;
          }

          if (automaticSource && (current.activeDraft.workoutId !== automaticSource.workoutId ||
            current.activeDraft.startedAt !== automaticSource.startedAt ||
            !current.activeDraft.exercises.find((exercise) => exercise.exerciseId === automaticSource.exerciseId)?.sets[automaticSource.setIndex]?.completed)) return current;

          return {
            ...current,
            restTimer: {
              status: 'running',
              selectedSeconds: seconds,
              endAt: Date.now() + seconds * 1000,
              ...(automaticSource ? { automaticSource } : {}),
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
            automaticSource: undefined,
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
      finishWorkout: (recovery) => {
        const current = stateRef.current;
        if (!current.activeDraft) {
          return false;
        }

        if (recovery && current.activeDraft.type !== 'cardio') return false;
        const recoveredEntry = recovery && current.activeDraft.type === 'cardio'
          ? buildRecoveredCardioHistoryEntry(current.activeDraft, recovery) : null;
        if (recovery && !recoveredEntry) return false;
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        const now = Date.now();
        const entry = recoveredEntry ?? (current.activeDraft.type === 'cardio'
          ? (isShortCardioSession(current.activeDraft, now) ? null : buildCardioHistoryEntry(current.activeDraft, now))
          : buildHistoryEntry(current.activeDraft));
        const nextState: WorkoutAppState = {
          ...current,
          lastCompletedWorkoutId: current.activeDraft.type === 'cardio' ? current.lastCompletedWorkoutId : current.activeDraft.workoutId,
          activeDraft: null,
          restTimer: defaultRestTimerState,
          history: entry ? [...current.history, entry] : current.history,
        };

        // Persist the completed session before the route changes.
        saveAppState(nextState);
        stateRef.current = nextState;
        setState(nextState);
        return true;
      },
      discardDraft: () => {
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        const nextState: WorkoutAppState = {
          ...stateRef.current,
          activeDraft: null,
          restTimer: defaultRestTimerState,
        };

        saveAppState(nextState);
        stateRef.current = nextState;
        setState(nextState);
      },
      clearHistory: () => {
        completedEndAtRef.current = stateRef.current.restTimer.endAt;
        const nextState: WorkoutAppState = {
          ...stateRef.current,
          activeDraft: null,
          restTimer: defaultRestTimerState,
          history: [],
          lastCompletedWorkoutId: null,
        };
        saveAppState(nextState);
        stateRef.current = nextState;
        setState(nextState);
      },
      deleteHistoryEntry: (historyEntryId) => {
        const current = stateRef.current;
        const history = current.history.filter((entry) => entry.id !== historyEntryId);
        const latestEntry = history.filter(isStrengthHistory).reduce<WorkoutSessionHistory | null>(
          (latest, entry) => (!latest || entry.finishedAt > latest.finishedAt ? entry : latest),
          null,
        );
        const nextState: WorkoutAppState = {
          ...current,
          history,
          lastCompletedWorkoutId: latestEntry?.workoutId ?? null,
        };

        saveAppState(nextState);
        stateRef.current = nextState;
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
