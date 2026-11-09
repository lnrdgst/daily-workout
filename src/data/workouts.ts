import { workoutOrder, type Workout, type WorkoutId } from '@/types/workout';

export const workoutsById: Record<WorkoutId, Workout> = {
  A: {
    id: 'A', planVersion: 'ABCDE', name: 'Treino A', description: 'Costas e bíceps',
    exercises: [
      { id: 'a-lat-pulldown', prescribedExerciseId: 'lat-pulldown', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'a-seated-row', prescribedExerciseId: 'seated-row', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'a-machine-row', prescribedExerciseId: 'machine-row', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'a-barbell-curl', prescribedExerciseId: 'barbell-curl', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'a-hammer-curl', prescribedExerciseId: 'hammer-curl', sets: 3, repsMin: 10, repsMax: 12 },
    ],
  },
  B: {
    id: 'B', planVersion: 'ABCDE', name: 'Treino B', description: 'Peito, ombros e tríceps',
    exercises: [
      { id: 'b-bench-press', prescribedExerciseId: 'bench-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'b-incline-dumbbell-press', prescribedExerciseId: 'incline-dumbbell-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'b-lateral-raise', prescribedExerciseId: 'lateral-raise', sets: 3, repsMin: 12, repsMax: 15 },
      { id: 'b-shoulder-press', prescribedExerciseId: 'shoulder-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'b-cable-pushdown', prescribedExerciseId: 'cable-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  C: {
    id: 'C', planVersion: 'ABCDE', name: 'Treino C', description: 'Pernas completas',
    exercises: [
      { id: 'c-squat', prescribedExerciseId: 'squat', prescribedExerciseIds: ['squat', 'hack-squat'], sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'c-stiff', prescribedExerciseId: 'stiff', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'c-lying-leg-curl', prescribedExerciseId: 'lying-leg-curl', sets: 3, repsMin: 10, repsMax: 15 },
      { id: 'c-leg-press', prescribedExerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'c-standing-calf-raise', prescribedExerciseId: 'standing-calf-raise', sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  D: {
    id: 'D', planVersion: 'ABCDE', name: 'Treino D', description: 'Superiores',
    exercises: [
      { id: 'd-chest-press', prescribedExerciseId: 'chest-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-machine-row', prescribedExerciseId: 't-bar-row', prescribedExerciseIds: ['t-bar-row', 'machine-row'], sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-lat-pulldown', prescribedExerciseId: 'lat-pulldown', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-scott-curl', prescribedExerciseId: 'scott-curl', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'd-triceps-french', prescribedExerciseId: 'triceps-french', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  E: {
    id: 'E', planVersion: 'ABCDE', name: 'Treino E', description: 'Pernas e abdômen',
    exercises: [
      { id: 'e-leg-press', prescribedExerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'e-leg-curl', prescribedExerciseId: 'seated-leg-curl', prescribedExerciseIds: ['seated-leg-curl', 'lying-leg-curl'], sets: 3, repsMin: 10, repsMax: 15 },
      { id: 'e-stiff', prescribedExerciseId: 'stiff', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'e-standing-calf-raise', prescribedExerciseId: 'standing-calf-raise', sets: 3, repsMin: 12, repsMax: 15 },
      { id: 'e-crunch', prescribedExerciseId: 'crunch', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
};

export const workouts = workoutOrder.map((id) => workoutsById[id]);
