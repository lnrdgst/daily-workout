import { workoutsById } from '@/data/workouts';
import type { WorkoutSessionDraft } from '@/types/workout';

interface WorkoutProgressProps {
  draft: WorkoutSessionDraft;
}

export const WorkoutProgress = ({ draft }: WorkoutProgressProps) => {
  const workout = workoutsById[draft.workoutId];
  const totalExercises = workout.exercises.length;
  const completedExercises = draft.exercises.filter(
    (exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.completed),
  ).length;
  const progress = totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Progresso · {workout.name}</p>
          <p className="text-lg font-semibold">
            {completedExercises} de {totalExercises} exercícios concluídos
          </p>
        </div>
        <p className="text-2xl font-bold text-accent-300">{progress}%</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
