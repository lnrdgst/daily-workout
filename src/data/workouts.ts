import type { Workout } from '@/types/workout';

export const workouts: Workout[] = [
  {
    id: 'A',
    name: 'Treino A',
    description: 'Base do full body com foco em agachamento, supino e puxada.',
    exercises: [
      { id: 'squat-hack', name: 'Agachamento ou Hack Squat', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Pernas', icon: 'squat' },
      { id: 'bench-press', name: 'Supino reto', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Peito', icon: 'bench' },
      { id: 'lat-pulldown', name: 'Puxada frontal', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Costas', icon: 'pulldown' },
      { id: 'leg-curl-a', name: 'Mesa ou cadeira flexora', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Posterior', icon: 'leg-curl' },
      { id: 'lateral-raise-a', name: 'Elevação lateral', sets: 3, repsMin: 12, repsMax: 15, muscleGroup: 'Ombros', icon: 'lateral-raise' },
      { id: 'barbell-curl', name: 'Rosca direta', sets: 3, repsMin: 10, repsMax: 12, muscleGroup: 'Bíceps', icon: 'curl' },
      { id: 'cable-pushdown-a', name: 'Tríceps na polia', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Tríceps', icon: 'triceps' },
    ],
  },
  {
    id: 'B',
    name: 'Treino B',
    description: 'Variação de membros inferiores e empurrar/puxar com halteres.',
    exercises: [
      { id: 'leg-press', name: 'Leg press', sets: 3, repsMin: 10, repsMax: 12, muscleGroup: 'Pernas', icon: 'leg-press' },
      { id: 'stiff', name: 'Stiff', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Posterior', icon: 'deadlift' },
      { id: 'incline-dumbbell-press', name: 'Supino inclinado com halteres', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Peito', icon: 'bench' },
      { id: 'seated-row', name: 'Remada baixa', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Costas', icon: 'row' },
      { id: 'shoulder-press', name: 'Desenvolvimento', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Ombros', icon: 'shoulder-press' },
      { id: 'hammer-curl', name: 'Rosca martelo', sets: 3, repsMin: 10, repsMax: 12, muscleGroup: 'Bíceps', icon: 'curl' },
      { id: 'triceps-french', name: 'Tríceps francês ou corda', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Tríceps', icon: 'triceps' },
    ],
  },
  {
    id: 'C',
    name: 'Treino C',
    description: 'Fechamento da semana com máquinas e estabilidade de volume.',
    exercises: [
      { id: 'hack-squat-c', name: 'Hack Squat ou agachamento', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Pernas', icon: 'squat' },
      { id: 'leg-curl-c', name: 'Cadeira ou mesa flexora', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Posterior', icon: 'leg-curl' },
      { id: 'chest-press', name: 'Supino máquina', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Peito', icon: 'chest-press' },
      { id: 'machine-row', name: 'Remada máquina ou cavalinho', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Costas', icon: 'row' },
      { id: 'lateral-raise-c', name: 'Elevação lateral', sets: 3, repsMin: 12, repsMax: 15, muscleGroup: 'Ombros', icon: 'lateral-raise' },
      { id: 'scott-curl', name: 'Rosca Scott', sets: 3, repsMin: 10, repsMax: 12, muscleGroup: 'Bíceps', icon: 'curl' },
      { id: 'cable-pushdown-c', name: 'Tríceps na polia', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Tríceps', icon: 'triceps' },
    ],
  },
];

export const workoutsById = Object.fromEntries(workouts.map((workout) => [workout.id, workout])) as Record<
  Workout['id'],
  Workout
>;
