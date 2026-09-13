import type { WorkoutId, SessionHistory } from '@/types/workout';
import { isStrengthHistory } from '@/utils/sessions';

const sequence: WorkoutId[] = ['A', 'B', 'C'];

export interface WorkoutSequenceProgress {
  completedSequences: number;
  currentStep: 0 | 1 | 2;
}

export const getWorkoutSequenceProgress = (history: SessionHistory[]): WorkoutSequenceProgress => {
  const orderedHistory = history.filter(isStrengthHistory).sort((first, second) => new Date(first.finishedAt).getTime() - new Date(second.finishedAt).getTime());
  let completedSequences = 0;
  let currentStep: 0 | 1 | 2 = 0;

  for (const session of orderedHistory) {
    if (session.workoutId !== sequence[currentStep]) {
      continue;
    }

    if (currentStep === 2) {
      completedSequences += 1;
      currentStep = 0;
      continue;
    }

    currentStep = (currentStep + 1) as 1 | 2;
  }

  return { completedSequences, currentStep };
};
