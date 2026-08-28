import { useEffect, useRef, useState } from 'react';
import type { WorkoutSessionDraft } from '@/types/workout';
import { getWorkoutProgress } from '@/utils/workoutProgress';

const STALE_WORKOUT_DURATION_MS = 2 * 60 * 60 * 1000;

export interface StaleWorkoutPrompt {
  shouldRegister: boolean;
}

const getSessionKey = (draft: WorkoutSessionDraft) => `${draft.workoutId}-${draft.startedAt}`;

export const useStaleWorkoutDetection = (activeDraft: WorkoutSessionDraft | null) => {
  const [prompt, setPrompt] = useState<StaleWorkoutPrompt | null>(null);
  const handledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeDraft) {
      handledSessionRef.current = null;
      setPrompt(null);
      return;
    }

    const sessionKey = getSessionKey(activeDraft);
    const checkForStaleWorkout = () => {
      const startedAt = new Date(activeDraft.startedAt).getTime();
      if (Number.isNaN(startedAt) || Date.now() - startedAt < STALE_WORKOUT_DURATION_MS || handledSessionRef.current === sessionKey) {
        return;
      }

      handledSessionRef.current = sessionKey;
      setPrompt({ shouldRegister: getWorkoutProgress(activeDraft).percentage >= 50 });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handledSessionRef.current = null;
        return;
      }

      if (document.visibilityState === 'visible') {
        checkForStaleWorkout();
      }
    };

    checkForStaleWorkout();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForStaleWorkout);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForStaleWorkout);
    };
  }, [activeDraft]);

  return {
    prompt,
    dismissPrompt: () => setPrompt(null),
  };
};
