import { useNavigate } from 'react-router-dom';
import { workoutsById } from '@/data/workouts';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import type { WorkoutSessionDraft } from '@/types/workout';

interface ActiveWorkoutBarProps {
  draft: WorkoutSessionDraft;
}

export const ActiveWorkoutBar = ({ draft }: ActiveWorkoutBarProps) => {
  const navigate = useNavigate();
  const duration = useWorkoutDuration(draft.startedAt);
  const workout = workoutsById[draft.workoutId];

  return (
    <button
      type="button"
      onClick={() => navigate(`/workout/${draft.workoutId}`)}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-accent-400/25 bg-surface-800/95 px-4 py-3 text-left shadow-glow backdrop-blur"
    >
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-[0.2em] text-accent-300">{workout.name} em andamento</span>
        <span className="mt-1 block text-sm font-semibold text-zinc-100">Voltar ao treino</span>
      </span>
      <span className="shrink-0 text-lg font-bold tabular-nums text-accent-300">{duration}</span>
    </button>
  );
};
