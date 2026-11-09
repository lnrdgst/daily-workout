import { workoutOrder, type WorkoutId, type SessionHistory, type StrengthPlanVersion } from '@/types/workout';
import { isStrengthHistory } from '@/utils/sessions';

const legacySequence: readonly WorkoutId[] = ['A', 'B', 'C'];

export interface WorkoutSequenceProgress {
  completedSequences: number;
  currentStep: number;
}

export const getWorkoutSequenceProgress = (history: SessionHistory[], planVersion?: StrengthPlanVersion): WorkoutSequenceProgress => {
  const sequence = planVersion === 'ABCDE' ? workoutOrder : legacySequence;
  const orderedHistory = history.filter(isStrengthHistory)
    .filter((session) => session.planVersion === planVersion)
    .sort((first, second) => new Date(first.finishedAt).getTime() - new Date(second.finishedAt).getTime());
  let completedSequences = 0;
  let currentStep = 0;

  for (const session of orderedHistory) {
    if (session.workoutId !== sequence[currentStep]) {
      continue;
    }

    currentStep += 1;
    if (currentStep === sequence.length) {
      completedSequences += 1;
      currentStep = 0;
    }
  }

  return { completedSequences, currentStep };
};
