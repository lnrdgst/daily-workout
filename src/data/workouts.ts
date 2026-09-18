import type { Workout } from '@/types/workout';

export const workouts: Workout[] = [
  {
    id: 'A',
    name: 'Treino A',
    description: 'Base do full body com foco em agachamento, supino e puxada.',
    exercises: [
      { id: 'squat-hack', prescribedExerciseId: 'squat-or-hack', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'bench-press', prescribedExerciseId: 'bench-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'lat-pulldown', prescribedExerciseId: 'lat-pulldown', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'leg-curl-a', prescribedExerciseId: 'leg-curl-lying-or-seated', sets: 3, repsMin: 10, repsMax: 15 },
      { id: 'lateral-raise-a', prescribedExerciseId: 'lateral-raise', sets: 3, repsMin: 12, repsMax: 15 },
      { id: 'barbell-curl', prescribedExerciseId: 'barbell-curl', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'cable-pushdown-a', prescribedExerciseId: 'cable-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  {
    id: 'B',
    name: 'Treino B',
    description: 'Variação de membros inferiores e empurrar/puxar com halteres.',
    exercises: [
      { id: 'leg-press', prescribedExerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'stiff', prescribedExerciseId: 'stiff', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'incline-dumbbell-press', prescribedExerciseId: 'incline-dumbbell-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'seated-row', prescribedExerciseId: 'seated-row', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'shoulder-press', prescribedExerciseId: 'shoulder-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'hammer-curl', prescribedExerciseId: 'hammer-curl', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'triceps-french', prescribedExerciseId: 'triceps-french-or-rope', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  {
    id: 'C',
    name: 'Treino C',
    description: 'Fechamento da semana com máquinas e estabilidade de volume.',
    exercises: [
      { id: 'hack-squat-c', prescribedExerciseId: 'squat-or-hack', label: 'Hack Squat ou agachamento', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'leg-curl-c', prescribedExerciseId: 'leg-curl-lying-or-seated', label: 'Cadeira ou mesa flexora', sets: 3, repsMin: 10, repsMax: 15 },
      { id: 'chest-press', prescribedExerciseId: 'chest-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'machine-row', prescribedExerciseId: 'machine-row-or-t-bar', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'lateral-raise-c', prescribedExerciseId: 'lateral-raise', sets: 3, repsMin: 12, repsMax: 15 },
      { id: 'scott-curl', prescribedExerciseId: 'scott-curl', sets: 3, repsMin: 10, repsMax: 12 },
      { id: 'cable-pushdown-c', prescribedExerciseId: 'cable-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
];

export const workoutsById = Object.fromEntries(workouts.map((workout) => [workout.id, workout])) as Record<
  Workout['id'],
  Workout
>;
