import { workoutsById } from '@/data/workouts';
import { exercisesById, getWorkoutExerciseView, resolveCanonicalExerciseId } from '@/data/exercises';
import { isStrengthHistory } from '@/utils/sessions';
import type {
  ExerciseSessionState,
  ExerciseSetLog,
  Workout,
  WorkoutAppState,
  WorkoutId,
  RestTimerSessionState,
  WorkoutSessionDraft,
  WorkoutSessionHistory,
  SessionHistory,
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
  loadSource: 'empty',
  repsSource: 'empty',
});

const normalizeSetValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const hasRecordedSetData = (set: ExerciseSetLog): boolean =>
  normalizeSetValue(set.load).trim() !== '' || normalizeSetValue(set.reps).trim() !== '';

const cloneSetLog = (prescribedMinimumReps: number, set?: ExerciseSetLog): ExerciseSetLog => ({
  load: normalizeSetValue(set?.load),
  reps: set ? normalizeSetValue(set.reps) : String(prescribedMinimumReps),
  completed: false,
  loadSource: set?.load?.trim() ? 'history' : 'empty',
  repsSource: set?.reps?.trim() ? 'history' : set ? 'empty' : 'prescription',
});

export const createExerciseSets = (
  prescription: Workout['exercises'][number],
  previousSets: ExerciseSetLog[] | null = null,
): ExerciseSetLog[] => Array.from(
  { length: prescription.sets },
  (_, index) => cloneSetLog(prescription.repsMin, previousSets?.[index]),
);

const createExerciseState = (prescription: Workout['exercises'][number], previousSets: ExerciseSetLog[] | null = null): ExerciseSessionState => {
  const exercise = getWorkoutExerciseView(prescription);
  const options = prescription.prescribedExerciseIds ?? [prescription.prescribedExerciseId];
  const hasOptions = options.length > 1;
  return {
    // exerciseId remains the stable slot identifier for legacy drafts and rest timers.
    exerciseId: prescription.id,
    slotId: prescription.id,
    prescribedExerciseIds: options,
    ...(hasOptions ? {} : { prescribedExerciseId: prescription.prescribedExerciseId, executedExerciseId: prescription.prescribedExerciseId }),
    prescribedExerciseName: exercise.name,
    ...(hasOptions ? {} : { executedExerciseName: exercise.name }),
    muscleGroup: exercise.muscleGroup,
    sets: createExerciseSets(prescription, previousSets),
  };
};

export const createWorkoutDraft = (workout: Workout, history: SessionHistory[] = []): WorkoutSessionDraft => ({
  type: 'strength',
  workoutId: workout.id,
  startedAt: new Date().toISOString(),
  exercises: workout.exercises.map((exercise) => createExerciseState(exercise, (exercise.prescribedExerciseIds?.length ?? 1) > 1 ? null : getPreviousExercisePerformance(history, exercise.prescribedExerciseId))),
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
    const source = timer.automaticSource;
    const automaticSource = source && typeof source.id === 'string' &&
      (source.workoutId === 'A' || source.workoutId === 'B' || source.workoutId === 'C') &&
      typeof source.startedAt === 'string' && typeof source.exerciseId === 'string' &&
      Number.isInteger(source.setIndex) && source.setIndex >= 0 ? source : undefined;
    return { status: 'running', selectedSeconds, endAt, ...(automaticSource ? { automaticSource } : {}) };
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
      restTimer: parsed.activeDraft && parsed.activeDraft.type !== 'cardio' ? loadRestTimerState(parsed.restTimer) : defaultRestTimerState,
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
    type: 'strength',
    id: `${draft.workoutId}-${Date.now()}`,
    workoutId: draft.workoutId,
    workoutName: workout.name,
    startedAt: draft.startedAt,
    finishedAt: new Date().toISOString(),
    exercises: workout.exercises.map((prescription) => {
      const exercise = getWorkoutExerciseView(prescription);
      const sessionExercise = draft.exercises.find((item) => (item.slotId ?? item.exerciseId) === prescription.id);
      const prescribedExerciseId = sessionExercise?.prescribedExerciseId ?? prescription.prescribedExerciseId;
      const executedExerciseId = sessionExercise?.executedExerciseId ?? (sessionExercise?.prescribedExerciseIds && sessionExercise.prescribedExerciseIds.length > 1
        ? resolveCanonicalExerciseId(prescription.id) : prescribedExerciseId);
      const prescribedExerciseName = sessionExercise?.prescribedExerciseName ?? exercise.name;
      const executedExerciseName = sessionExercise?.executedExerciseName ?? prescribedExerciseName;
      return {
        // Keep the legacy field while making the executed canonical identity explicit.
        exerciseId: executedExerciseId,
        exerciseName: executedExerciseName,
        muscleGroup: sessionExercise?.muscleGroup ?? exercise.muscleGroup,
        prescribedExerciseId,
        executedExerciseId,
        prescribedExerciseName,
        executedExerciseName,
        sets: (sessionExercise?.sets ?? Array.from({ length: prescription.sets }, createSetLog)).map(({ load, reps, completed }) => ({ load, reps, completed })),
      };
    }),
  };
};

export const getPreviousExercisePerformance = (
  history: SessionHistory[],
  exerciseId: string,
): ExerciseSetLog[] | null => {
  // Current callers pass a canonical ID. Keep accepting old slot IDs for legacy
  // callers, but never reinterpret a known canonical ID through a legacy alias.
  const requestedExerciseId = exercisesById[exerciseId] ? exerciseId : resolveCanonicalExerciseId(exerciseId);
  for (const session of [...history].reverse()) {
    if (!isStrengthHistory(session)) continue;
    const match = session.exercises.find((exercise) =>
      // An explicit executed ID identifies a canonical physical exercise. Only
      // records without it are legacy slots/composites and need alias resolution.
      (exercise.executedExerciseId ?? resolveCanonicalExerciseId(exercise.exerciseId)) === requestedExerciseId,
    );
    if (match && match.sets.some(hasRecordedSetData)) {
      return match.sets;
    }
  }

  return null;
};

export const getLastWorkout = (history: SessionHistory[], id: WorkoutId | null): WorkoutSessionHistory | null => {
  if (!id) {
    return null;
  }

  return [...history].reverse().filter(isStrengthHistory).find((session) => session.workoutId === id) ?? null;
};
