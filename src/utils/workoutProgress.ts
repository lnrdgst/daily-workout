import { workoutsById } from '@/data/workouts';
import type { WorkoutSessionDraft } from '@/types/workout';

export interface WorkoutProgressSummary {
  totalExercises: number;
  completedExercises: number;
  percentage: number;
}

export const getWorkoutProgress = (draft: WorkoutSessionDraft): WorkoutProgressSummary => {
  const totalExercises = workoutsById[draft.workoutId].exercises.length;
  const completedExercises = draft.exercises.filter(
    (exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.completed),
  ).length;

  return {
    totalExercises,
    completedExercises,
    percentage: totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100),
  };
};
