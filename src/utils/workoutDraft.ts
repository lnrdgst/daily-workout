import { exercisesById, resolveCanonicalExerciseId } from '@/data/exercises';
import { legacyWorkoutsById } from '@/data/legacyWorkouts';
import type { Exercise, ExerciseSessionState, WorkoutSessionDraft } from '@/types/workout';

export const getDraftWorkoutName = (draft: WorkoutSessionDraft): string =>
  draft.workoutName ?? legacyWorkoutsById[draft.workoutId]?.name ?? `Treino ${draft.workoutId}`;

export const getDraftExercisePrescription = (draft: WorkoutSessionDraft, entry: ExerciseSessionState): Exercise => {
  const id = entry.slotId ?? entry.exerciseId;
  // Drafts saved before prescriptions were snapshotted only need the original ABC metadata.
  const legacy = entry.prescription ? undefined : legacyWorkoutsById[draft.workoutId]?.exercises.find((exercise) => exercise.id === id);
  const prescribedExerciseId = entry.prescribedExerciseId ?? legacy?.prescribedExerciseId ?? resolveCanonicalExerciseId(id);
  const definition = exercisesById[prescribedExerciseId];

  return {
    ...definition,
    id,
    prescribedExerciseId,
    prescribedExerciseIds: entry.prescribedExerciseIds ?? legacy?.prescribedExerciseIds,
    name: entry.prescribedExerciseName ?? legacy?.label ?? definition?.name ?? id,
    muscleGroup: entry.muscleGroup ?? definition?.muscleGroup ?? 'Musculação',
    sets: entry.sets.length,
    repsMin: entry.prescription?.repsMin ?? legacy?.repsMin ?? 0,
    repsMax: entry.prescription?.repsMax ?? legacy?.repsMax ?? 0,
    compatibleExerciseIds: entry.prescription?.compatibleExerciseIds ?? definition?.compatibleExerciseIds ?? [],
  };
};
