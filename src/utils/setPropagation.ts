import type { ExerciseSetLog } from '@/types/workout';

type ManualSetPatch = Pick<ExerciseSetLog, 'load' | 'reps'>;

export const applyManualSetChange = (
  sets: ExerciseSetLog[],
  setIndex: number,
  patch: Partial<ExerciseSetLog>,
): ExerciseSetLog[] => {
  const propagatedPatch: Partial<ManualSetPatch> = {};
  if (patch.load !== undefined) propagatedPatch.load = patch.load;
  if (patch.reps !== undefined) propagatedPatch.reps = patch.reps;

  return sets.map((set, index) => {
    if (index === setIndex) return { ...set, ...patch };
    if (index > setIndex && !set.completed) return { ...set, ...propagatedPatch };
    return set;
  });
};
