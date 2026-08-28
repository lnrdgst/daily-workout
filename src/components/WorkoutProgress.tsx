import { workoutsById } from '@/data/workouts';
import type { WorkoutSessionDraft } from '@/types/workout';
import { getWorkoutProgress } from '@/utils/workoutProgress';

interface WorkoutProgressProps {
  draft: WorkoutSessionDraft;
}

export const WorkoutProgress = ({ draft }: WorkoutProgressProps) => {
  const workout = workoutsById[draft.workoutId];
  const { totalExercises, completedExercises, percentage } = getWorkoutProgress(draft);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Progresso · {workout.name}</p>
          <p className="text-lg font-semibold">
            {completedExercises} de {totalExercises} exercícios concluídos
          </p>
        </div>
        <p className="text-2xl font-bold text-accent-300">{percentage}%</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};
