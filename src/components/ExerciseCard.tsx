import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Exercise, ExerciseSetLog, ExerciseSessionState } from '@/types/workout';
import { ExerciseIcon } from './ExerciseIcon';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: Exercise;
  sessionState: ExerciseSessionState;
  previousSets: ExerciseSetLog[] | null;
  onSetChange: (setIndex: number, patch: Partial<ExerciseSetLog>) => void;
  onToggleCompleted: (setIndex: number, isCurrentlyCompleted: boolean) => void;
}

const AUTO_COLLAPSE_DELAY_MS = 550;

export const ExerciseCard = ({
  exercise,
  sessionState,
  previousSets,
  onSetChange,
  onToggleCompleted,
}: ExerciseCardProps) => {
  const completedSets = sessionState.sets.filter((set) => set.completed).length;
  const isCompleted = sessionState.sets.length > 0 && completedSets === sessionState.sets.length;
  const [isExpanded, setIsExpanded] = useState(() => !isCompleted);
  const wasCompletedRef = useRef(isCompleted);
  const detailsId = `exercise-details-${exercise.id}`;

  useEffect(() => {
    const wasCompleted = wasCompletedRef.current;
    wasCompletedRef.current = isCompleted;

    if (!isCompleted) {
      setIsExpanded(true);
      return;
    }

    if (!wasCompleted) {
      const collapseTimeout = window.setTimeout(() => setIsExpanded(false), AUTO_COLLAPSE_DELAY_MS);
      return () => window.clearTimeout(collapseTimeout);
    }
  }, [isCompleted]);

  const headerContent = (
    <>
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
      <div className="flex shrink-0 items-center gap-2">
        <div className="rounded-2xl bg-white/5 px-3 py-2 text-right text-xs text-zinc-400">
          <p>{isCompleted ? `${completedSets}/${sessionState.sets.length} séries` : `${exercise.sets} séries`}</p>
          <p>{isCompleted ? 'Concluído' : `${exercise.repsMin}-${exercise.repsMax} reps`}</p>
        </div>
        {isCompleted && (isExpanded ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />)}
      </div>
    </>
  );

  return (
    <article className={`panel p-4 transition-colors duration-200 motion-reduce:transition-none ${isCompleted ? 'border-l-2 border-l-accent-500 bg-zinc-800/70' : ''}`}>
      {isCompleted ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className={`flex w-full items-start justify-between gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 ${
            isExpanded ? 'mb-4' : ''
          }`}
        >
          {headerContent}
        </button>
      ) : (
        <div className="mb-4 flex items-start justify-between gap-3">{headerContent}</div>
      )}

      <div
        id={detailsId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3">
            {sessionState.sets.map((set, index) => (
              <SetRow
                key={`${exercise.id}-${index}`}
                index={index}
                set={set}
                previousSet={previousSets?.[index]}
                onChange={(patch) => onSetChange(index, patch)}
                onToggleCompleted={() => onToggleCompleted(index, set.completed)}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};
