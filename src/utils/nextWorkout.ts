import type { SessionHistory } from '@/types/workout';
import { getLatestSession, isStrengthHistory } from '@/utils/sessions';

export const getNextStrengthWorkout = <T extends { id: string }>(history: SessionHistory[], workouts: readonly T[]): T | null => {
  if (!workouts.length) return null;
  const latestStrength = getLatestSession(history.filter(isStrengthHistory));
  const lastIndex = latestStrength && isStrengthHistory(latestStrength)
    ? workouts.findIndex((workout) => workout.id === latestStrength.workoutId)
    : -1;
  return workouts[(lastIndex + 1) % workouts.length];
};
