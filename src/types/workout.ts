export type WorkoutId = 'A' | 'B' | 'C';

export type ExerciseIcon =
  | 'squat'
  | 'bench'
  | 'pulldown'
  | 'leg-curl'
  | 'lateral-raise'
  | 'curl'
  | 'triceps'
  | 'leg-press'
  | 'deadlift'
  | 'row'
  | 'shoulder-press'
  | 'chest-press';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: string;
  icon?: ExerciseIcon;
  image?: string;
  equipment?: string;
}

export interface WorkoutExercise {
  /** Stable prescription slot. This remains independent from the executed exercise. */
  id: string;
  prescribedExerciseId: string;
  /** Temporary prescription wording, used by current composite entries. */
  label?: string;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export type Exercise = ExerciseDefinition & WorkoutExercise;

export interface Workout {
  id: WorkoutId;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
}

export interface ExerciseSetLog {
  load: string;
  reps: string;
  completed: boolean;
}

export interface ExerciseSessionState {
  /** Legacy slot field retained for persisted drafts and rest-timer targets. */
  exerciseId: string;
  slotId?: string;
  prescribedExerciseId?: string;
  executedExerciseId?: string;
  prescribedExerciseName?: string;
  executedExerciseName?: string;
  muscleGroup?: string;
  sets: ExerciseSetLog[];
}

export interface WorkoutSessionDraft {
  type?: 'strength';
  workoutId: WorkoutId;
  startedAt: string;
  exercises: ExerciseSessionState[];
}

export type RestTimerStatus = 'ready' | 'running' | 'finished';

export interface SetCompletionTarget {
  workoutId: WorkoutId;
  startedAt: string;
  exerciseId: string;
  setIndex: number;
}

export interface AutomaticRestSource extends SetCompletionTarget {
  id: string;
}

export interface RestTimerSessionState {
  status: RestTimerStatus;
  selectedSeconds: 60 | 90 | 120;
  endAt: number | null;
  automaticSource?: AutomaticRestSource;
}

export interface WorkoutSessionHistory {
  type?: 'strength';
  id: string;
  workoutId: WorkoutId;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    prescribedExerciseId?: string;
    executedExerciseId?: string;
    prescribedExerciseName?: string;
    executedExerciseName?: string;
    sets: ExerciseSetLog[];
  }>;
}

export type CardioModality = 'stationary-bike' | 'spinning' | 'running' | 'walking' | 'outdoor-bike';

export interface CardioData {
  distanceKm?: number;
  averageSpeedKmH?: number;
  resistance?: number;
  notes?: string;
}

export interface CardioIntervals {
  targetCount: number;
  durationSeconds: number;
  completedCount: number;
}

export interface CardioSessionDraft extends CardioData {
  type: 'cardio';
  modality: CardioModality;
  startedAt: string;
  intervals?: CardioIntervals;
  intervalEndAt: number | null;
}

export interface CardioSessionHistory extends CardioData {
  completionSource?: 'normal' | 'stale-recovery';
  type: 'cardio';
  id: string;
  modality: CardioModality;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  intervals?: CardioIntervals;
}

// Missing type is the legacy strength format; no persisted migration is needed.
export type ActiveSession = WorkoutSessionDraft | CardioSessionDraft;
export type SessionHistory = WorkoutSessionHistory | CardioSessionHistory;

export interface WorkoutAppState {
  lastCompletedWorkoutId: WorkoutId | null;
  lastOpenedWorkoutId: WorkoutId | null;
  activeDraft: ActiveSession | null;
  restTimer: RestTimerSessionState;
  history: SessionHistory[];
}
