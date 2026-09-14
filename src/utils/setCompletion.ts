import type { SetCompletionTarget, WorkoutAppState } from '@/types/workout';

const sameTarget = (first: SetCompletionTarget, second: SetCompletionTarget) =>
  first.workoutId === second.workoutId && first.startedAt === second.startedAt &&
  first.exerciseId === second.exerciseId && first.setIndex === second.setIndex;

export const getRelatedAutomaticRestId = (state: WorkoutAppState, target: SetCompletionTarget, now = Date.now()): string | null => {
  const { activeDraft, restTimer } = state;
  if (!activeDraft || activeDraft.type === 'cardio' || activeDraft.workoutId !== target.workoutId || activeDraft.startedAt !== target.startedAt) return null;
  const set = activeDraft.exercises.find((exercise) => exercise.exerciseId === target.exerciseId)?.sets[target.setIndex];
  return set?.completed && restTimer.status === 'running' && restTimer.endAt !== null && restTimer.endAt > now &&
    restTimer.automaticSource && sameTarget(restTimer.automaticSource, target) ? restTimer.automaticSource.id : null;
};

export const undoCompletedSet = (
  state: WorkoutAppState, target: SetCompletionTarget, cancelRestId?: string, now = Date.now(),
): WorkoutAppState => {
  const draft = state.activeDraft;
  if (!draft || draft.type === 'cardio' || draft.workoutId !== target.workoutId || draft.startedAt !== target.startedAt) return state;
  const set = draft.exercises.find((exercise) => exercise.exerciseId === target.exerciseId)?.sets[target.setIndex];
  if (!set?.completed) return state;

  const cancelRest = cancelRestId !== undefined && getRelatedAutomaticRestId(state, target, now) === cancelRestId;
  const belongsToSet = state.restTimer.automaticSource && sameTarget(state.restTimer.automaticSource, target);
  return {
    ...state,
    activeDraft: {
      ...draft,
      exercises: draft.exercises.map((exercise) => exercise.exerciseId === target.exerciseId ? {
        ...exercise, sets: exercise.sets.map((item, index) => index === target.setIndex ? { ...item, completed: false } : item),
      } : exercise),
    },
    restTimer: belongsToSet ? {
      ...state.restTimer,
      // Undo retires this completion's ownership, even when the countdown is kept.
      automaticSource: undefined,
      ...(cancelRest ? { status: 'ready' as const, endAt: null } : {}),
    } : state.restTimer,
  };
};
