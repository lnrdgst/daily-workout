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

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscleGroup: string;
  icon?: ExerciseIcon;
  image?: string;
}

export interface Workout {
  id: WorkoutId;
  name: string;
  description: string;
  exercises: Exercise[];
}

export interface ExerciseSetLog {
  load: string;
  reps: string;
  completed: boolean;
}

export interface ExerciseSessionState {
  exerciseId: string;
  sets: ExerciseSetLog[];
}

export interface WorkoutSessionDraft {
  workoutId: WorkoutId;
  startedAt: string;
  exercises: ExerciseSessionState[];
}

export type RestTimerStatus = 'ready' | 'running' | 'finished';

export interface RestTimerSessionState {
  status: RestTimerStatus;
  selectedSeconds: 60 | 90 | 120;
  endAt: number | null;
}

export interface WorkoutSessionHistory {
  id: string;
  workoutId: WorkoutId;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: ExerciseSetLog[];
  }>;
}

export interface WorkoutAppState {
  lastCompletedWorkoutId: WorkoutId | null;
  lastOpenedWorkoutId: WorkoutId | null;
  activeDraft: WorkoutSessionDraft | null;
  restTimer: RestTimerSessionState;
  history: WorkoutSessionHistory[];
}
