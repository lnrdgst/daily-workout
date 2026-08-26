import { Check } from 'lucide-react';
import type { Exercise, ExerciseSetLog, ExerciseSessionState } from '@/types/workout';
import { ExerciseIcon } from './ExerciseIcon';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: Exercise;
  sessionState: ExerciseSessionState;
  previousSets: ExerciseSetLog[] | null;
  onSetChange: (setIndex: number, patch: Partial<ExerciseSetLog>) => void;
  onToggleCompleted: (setIndex: number) => void;
}

export const ExerciseCard = ({
  exercise,
  sessionState,
  previousSets,
  onSetChange,
  onToggleCompleted,
}: ExerciseCardProps) => {
  const isCompleted = sessionState.sets.length > 0 && sessionState.sets.every((set) => set.completed);

  return (
    <article className={`panel p-4 transition-colors duration-200 ${isCompleted ? 'border-l-2 border-l-accent-500 bg-zinc-800/70' : ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ExerciseIcon icon={exercise.icon} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{exercise.muscleGroup}</p>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-accent-300">
                  <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                  Concluído
                </span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-bold">{exercise.name}</h3>
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 px-3 py-2 text-right text-xs text-zinc-400">
          <p>{exercise.sets} séries</p>
          <p>
            {exercise.repsMin}-{exercise.repsMax} reps
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sessionState.sets.map((set, index) => (
          <SetRow
            key={`${exercise.id}-${index}`}
            index={index}
            set={set}
            previousSet={previousSets?.[index]}
            onChange={(patch) => onSetChange(index, patch)}
            onToggleCompleted={() => onToggleCompleted(index)}
          />
        ))}
      </div>
    </article>
  );
};
