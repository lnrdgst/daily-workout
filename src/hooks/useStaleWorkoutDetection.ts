import { useEffect, useRef, useState } from 'react';
import type { ActiveSession } from '@/types/workout';
import { getWorkoutProgress } from '@/utils/workoutProgress';
import { isStaleSession } from '@/utils/staleSession';

export type StaleWorkoutPrompt = { type: 'strength'; shouldRegister: boolean } | { type: 'cardio' };

const getSessionKey = (draft: ActiveSession) => `${draft.type === 'cardio' ? `cardio-${draft.modality}` : draft.workoutId}-${draft.startedAt}`;

export const useStaleWorkoutDetection = (activeDraft: ActiveSession | null) => {
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
      if (!isStaleSession(activeDraft.startedAt) || handledSessionRef.current === sessionKey) {
        return;
      }

      handledSessionRef.current = sessionKey;
      setPrompt(activeDraft.type === 'cardio' ? { type: 'cardio' } : { type: 'strength', shouldRegister: getWorkoutProgress(activeDraft).percentage >= 50 });
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
