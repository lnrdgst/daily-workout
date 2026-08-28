import { workoutsById } from '@/data/workouts';
import type {
  Exercise,
  ExerciseSessionState,
  ExerciseSetLog,
  Workout,
  WorkoutAppState,
  WorkoutId,
  RestTimerSessionState,
  WorkoutSessionDraft,
  WorkoutSessionHistory,
} from '@/types/workout';

const STORAGE_KEY = 'daily-workout-state';

export const defaultRestTimerState: RestTimerSessionState = {
  status: 'ready',
  selectedSeconds: 90,
  endAt: null,
};

const createSetLog = (): ExerciseSetLog => ({
  load: '',
  reps: '',
  completed: false,
});

const createExerciseState = (exercise: Exercise): ExerciseSessionState => ({
  exerciseId: exercise.id,
  sets: Array.from({ length: exercise.sets }, createSetLog),
});

export const createWorkoutDraft = (workout: Workout): WorkoutSessionDraft => ({
  workoutId: workout.id,
  startedAt: new Date().toISOString(),
  exercises: workout.exercises.map(createExerciseState),
});

const defaultState: WorkoutAppState = {
  lastCompletedWorkoutId: null,
  lastOpenedWorkoutId: null,
  activeDraft: null,
  restTimer: defaultRestTimerState,
  history: [],
};

const loadRestTimerState = (value: unknown): RestTimerSessionState => {
  if (!value || typeof value !== 'object') {
    return defaultRestTimerState;
  }

  const timer = value as Partial<RestTimerSessionState>;
  const selectedSeconds =
    timer.selectedSeconds === 60 || timer.selectedSeconds === 90 || timer.selectedSeconds === 120
      ? timer.selectedSeconds
      : defaultRestTimerState.selectedSeconds;
  const endAt = typeof timer.endAt === 'number' ? timer.endAt : null;
  const isRunning = timer.status === 'running' && endAt !== null;

  if (isRunning) {
    return { status: 'running', selectedSeconds, endAt };
  }

  return {
    status: timer.status === 'finished' ? 'finished' : 'ready',
    selectedSeconds,
    endAt: null,
  };
};

export const loadAppState = (): WorkoutAppState => {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as WorkoutAppState;
    return {
      ...defaultState,
      ...parsed,
      restTimer: parsed.activeDraft ? loadRestTimerState(parsed.restTimer) : defaultRestTimerState,
    };
  } catch {
    return defaultState;
  }
};

export const saveAppState = (state: WorkoutAppState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const buildHistoryEntry = (draft: WorkoutSessionDraft): WorkoutSessionHistory => {
  const workout = workoutsById[draft.workoutId];

  return {
    id: `${draft.workoutId}-${Date.now()}`,
    workoutId: draft.workoutId,
    workoutName: workout.name,
    startedAt: draft.startedAt,
    finishedAt: new Date().toISOString(),
    exercises: workout.exercises.map((exercise) => {
      const sessionExercise = draft.exercises.find((item) => item.exerciseId === exercise.id);
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: sessionExercise?.sets ?? Array.from({ length: exercise.sets }, createSetLog),
      };
    }),
  };
};

export const getPreviousExercisePerformance = (
  history: WorkoutSessionHistory[],
  exerciseId: string,
): ExerciseSetLog[] | null => {
  for (const session of [...history].reverse()) {
    const match = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
    if (match) {
      return match.sets;
    }
  }

  return null;
};

export const getLastWorkout = (history: WorkoutSessionHistory[], id: WorkoutId | null): WorkoutSessionHistory | null => {
  if (!id) {
    return null;
  }

  return [...history].reverse().find((session) => session.workoutId === id) ?? null;
};
