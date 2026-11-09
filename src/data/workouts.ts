import { legacyWorkouts } from '@/data/legacyWorkouts';
import type { Workout } from '@/types/workout';

export const workouts = legacyWorkouts;

export const workoutsById = Object.fromEntries(workouts.map((workout) => [workout.id, workout])) as Record<
  Workout['id'],
  Workout
>;
