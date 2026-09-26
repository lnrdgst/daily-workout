import type { ExerciseSetLog, SetValueSource } from '@/types/workout';

type ManualSetPatch = Pick<ExerciseSetLog, 'load' | 'reps'>;

export const applyManualSetChange = (
  sets: ExerciseSetLog[],
  setIndex: number,
  patch: Partial<ExerciseSetLog>,
  shouldFillFollowingSets = true,
): ExerciseSetLog[] => {
  const propagatedPatch: Partial<ManualSetPatch> = {};
  if (patch.load !== undefined) propagatedPatch.load = patch.load;
  if (patch.reps !== undefined) propagatedPatch.reps = patch.reps;

  const sourceFor = (set: ExerciseSetLog, field: 'load' | 'reps'): SetValueSource => {
    const source = set[`${field}Source`];
    // Old persisted drafts do not have provenance. Treat a populated field as
    // user-owned so rehydration remains conservative; blanks are still safe.
    return source ?? (set[field].trim() === '' ? 'empty' : 'manual');
  };

  return sets.map((set, index) => {
    if (index === setIndex) {
      return {
        ...set,
        ...patch,
        ...(patch.load !== undefined ? { loadSource: 'manual' as const } : {}),
        ...(patch.reps !== undefined ? { repsSource: 'manual' as const } : {}),
      };
    }
    if (index > setIndex && !set.completed && shouldFillFollowingSets) {
      const canFillLoad = propagatedPatch.load !== undefined && ['empty', 'prescription', 'autofilled'].includes(sourceFor(set, 'load'));
      const canFillReps = propagatedPatch.reps !== undefined && ['empty', 'prescription', 'autofilled'].includes(sourceFor(set, 'reps'));
      return {
        ...set,
        ...(canFillLoad ? { load: propagatedPatch.load, loadSource: 'autofilled' as const } : {}),
        ...(canFillReps ? { reps: propagatedPatch.reps, repsSource: 'autofilled' as const } : {}),
      };
    }
    return set;
  });
};
