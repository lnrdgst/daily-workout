import type { Exercise, ExerciseDefinition, WorkoutExercise } from '@/types/workout';

export const exerciseLibrary: ExerciseDefinition[] = [
  // Legacy composite identities remain resolvable for old persisted history only.
  { id: 'squat-or-hack', name: 'Agachamento ou Hack Squat', muscleGroup: 'Pernas', icon: 'squat' },
  { id: 'leg-curl-lying-or-seated', name: 'Mesa ou cadeira flexora', muscleGroup: 'Posterior', icon: 'leg-curl' },
  { id: 'triceps-french-or-rope', name: 'Tríceps francês ou corda', muscleGroup: 'Tríceps', icon: 'triceps' },
  { id: 'machine-row-or-t-bar', name: 'Remada máquina ou cavalinho', muscleGroup: 'Costas', icon: 'row' },
  { id: 'squat', name: 'Agachamento', muscleGroup: 'Pernas', icon: 'squat' },
  { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'Pernas', icon: 'squat' },
  { id: 'bench-press', name: 'Supino reto', muscleGroup: 'Peito', icon: 'bench' },
  { id: 'lat-pulldown', name: 'Puxada frontal', muscleGroup: 'Costas', icon: 'pulldown' },
  { id: 'lying-leg-curl', name: 'Mesa flexora', muscleGroup: 'Posterior', icon: 'leg-curl' },
  { id: 'seated-leg-curl', name: 'Cadeira flexora', muscleGroup: 'Posterior', icon: 'leg-curl' },
  { id: 'lateral-raise', name: 'Elevação lateral', muscleGroup: 'Ombros', icon: 'lateral-raise' },
  { id: 'barbell-curl', name: 'Rosca direta', muscleGroup: 'Bíceps', icon: 'curl' },
  { id: 'cable-pushdown', name: 'Tríceps na polia', muscleGroup: 'Tríceps', icon: 'triceps', compatibleExerciseIds: ['triceps-press'] },
  { id: 'triceps-press', name: 'Triceps Press', muscleGroup: 'Tríceps', icon: 'triceps', equipment: 'Máquina' },
  { id: 'leg-press', name: 'Leg press', muscleGroup: 'Pernas', icon: 'leg-press' },
  { id: 'stiff', name: 'Stiff', muscleGroup: 'Posterior', icon: 'deadlift' },
  { id: 'incline-dumbbell-press', name: 'Supino inclinado com halteres', muscleGroup: 'Peito', icon: 'bench' },
  { id: 'seated-row', name: 'Remada baixa', muscleGroup: 'Costas', icon: 'row' },
  { id: 'shoulder-press', name: 'Desenvolvimento', muscleGroup: 'Ombros', icon: 'shoulder-press' },
  { id: 'hammer-curl', name: 'Rosca martelo', muscleGroup: 'Bíceps', icon: 'curl' },
  { id: 'triceps-french', name: 'Tríceps francês', muscleGroup: 'Tríceps', icon: 'triceps' },
  { id: 'triceps-rope', name: 'Tríceps na corda', muscleGroup: 'Tríceps', icon: 'triceps' },
  { id: 'chest-press', name: 'Supino máquina', muscleGroup: 'Peito', icon: 'chest-press' },
  { id: 'machine-row', name: 'Remada máquina', muscleGroup: 'Costas', icon: 'row' },
  { id: 't-bar-row', name: 'Remada cavalinho', muscleGroup: 'Costas', icon: 'row' },
  { id: 'scott-curl', name: 'Rosca Scott', muscleGroup: 'Bíceps', icon: 'curl' },
];

export const exercisesById = Object.fromEntries(exerciseLibrary.map((exercise) => [exercise.id, exercise])) as Record<string, ExerciseDefinition>;

// Composite labels resolve only to their current composite definition. They are never
// assigned to an individual physical variation before a user can make that choice.
export const legacyExerciseIdAliases: Record<string, string> = {
  'squat-hack': 'squat-or-hack',
  'hack-squat-c': 'squat-or-hack',
  'leg-curl-a': 'leg-curl-lying-or-seated',
  'leg-curl-c': 'leg-curl-lying-or-seated',
  'lateral-raise-a': 'lateral-raise',
  'lateral-raise-c': 'lateral-raise',
  'cable-pushdown-a': 'cable-pushdown',
  'cable-pushdown-c': 'cable-pushdown',
  'triceps-french': 'triceps-french-or-rope',
  'machine-row': 'machine-row-or-t-bar',
};

export const resolveCanonicalExerciseId = (exerciseId: string): string => legacyExerciseIdAliases[exerciseId] ?? exerciseId;

export const getWorkoutExerciseView = (prescription: WorkoutExercise): Exercise => {
  const definition = exercisesById[prescription.prescribedExerciseId];
  if (!definition) throw new Error(`Exercício não encontrado: ${prescription.prescribedExerciseId}`);
  return { ...definition, ...prescription, name: prescription.label ?? definition.name };
};
