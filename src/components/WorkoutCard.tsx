import { Link } from 'react-router-dom';
import type { Workout, WorkoutSessionHistory } from '@/types/workout';

interface WorkoutCardProps {
  workout: Workout;
  lastSession: WorkoutSessionHistory | null;
}

export const WorkoutCard = ({ workout, lastSession }: WorkoutCardProps) => {
  return (
    <article className="panel p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-accent-300">{workout.id}</p>
          <h2 className="mt-1 text-xl font-bold">{workout.name}</h2>
          <p className="mt-2 text-sm text-zinc-400">{workout.description}</p>
        </div>
        <div className="rounded-2xl bg-white/5 px-3 py-2 text-right">
          <p className="text-xs text-zinc-400">Exercícios</p>
          <p className="text-lg font-bold">{workout.exercises.length}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
        {lastSession ? (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Última vez</p>
            <p className="mt-1 font-medium">{new Date(lastSession.finishedAt).toLocaleDateString('pt-BR')}</p>
          </>
        ) : (
          <p className="text-zinc-400">Ainda sem sessões registradas.</p>
        )}
      </div>

      <Link to={`/workout/${workout.id}`} className="touch-button w-full bg-accent-500 text-base font-semibold text-white">
        Visualizar treino
      </Link>
    </article>
  );
};
