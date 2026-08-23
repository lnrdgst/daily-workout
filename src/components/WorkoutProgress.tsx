import type { WorkoutSessionDraft } from '@/types/workout';

interface WorkoutProgressProps {
  draft: WorkoutSessionDraft | null;
}

export const WorkoutProgress = ({ draft }: WorkoutProgressProps) => {
  if (!draft) {
    return (
      <div className="panel p-4">
        <p className="text-sm text-zinc-400">Nenhum treino em andamento.</p>
      </div>
    );
  }

  const totalSets = draft.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const completedSets = draft.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  const progress = totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Progresso</p>
          <p className="text-lg font-semibold">{completedSets} séries concluídas</p>
        </div>
        <p className="text-2xl font-bold text-accent-300">{progress}%</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
