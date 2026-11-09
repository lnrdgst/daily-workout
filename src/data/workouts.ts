import { workoutOrder, type Workout, type WorkoutId } from '@/types/workout';

export const workoutsById: Record<WorkoutId, Workout> = {
  A: {
    id: 'A', planVersion: 'ABCDE', name: 'Treino A', description: 'Costas e bíceps',
    exercises: [
      { id: 'a-lat-pulldown', prescribedExerciseId: 'lat-pulldown', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'a-seated-row', prescribedExerciseId: 'seated-row', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'a-barbell-curl', prescribedExerciseId: 'barbell-curl', sets: 3, repsMin: 10, repsMax: 12 },
    ],
  },
  B: {
    id: 'B', planVersion: 'ABCDE', name: 'Treino B', description: 'Peito, ombros e tríceps',
    exercises: [
      { id: 'b-bench-press', prescribedExerciseId: 'bench-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'b-lateral-raise', prescribedExerciseId: 'lateral-raise', sets: 3, repsMin: 12, repsMax: 15 },
      { id: 'b-cable-pushdown', prescribedExerciseId: 'cable-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  C: {
    id: 'C', planVersion: 'ABCDE', name: 'Treino C', description: 'Pernas completas',
    exercises: [
      { id: 'c-squat', prescribedExerciseId: 'squat', prescribedExerciseIds: ['squat', 'hack-squat'], sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'c-stiff', prescribedExerciseId: 'stiff', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'c-standing-calf-raise', prescribedExerciseId: 'standing-calf-raise', sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  D: {
    id: 'D', planVersion: 'ABCDE', name: 'Treino D', description: 'Superiores',
    exercises: [
      { id: 'd-incline-dumbbell-press', prescribedExerciseId: 'incline-dumbbell-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-machine-row', prescribedExerciseId: 'machine-row', prescribedExerciseIds: ['machine-row', 't-bar-row'], sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-shoulder-press', prescribedExerciseId: 'shoulder-press', sets: 3, repsMin: 8, repsMax: 12 },
    ],
  },
  E: {
    id: 'E', planVersion: 'ABCDE', name: 'Treino E', description: 'Pernas e abdômen',
    exercises: [
      { id: 'e-leg-press', prescribedExerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'e-leg-curl', prescribedExerciseId: 'lying-leg-curl', prescribedExerciseIds: ['lying-leg-curl', 'seated-leg-curl'], sets: 3, repsMin: 10, repsMax: 15 },
      { id: 'e-crunch', prescribedExerciseId: 'crunch', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
};

export const workouts = workoutOrder.map((id) => workoutsById[id]);
