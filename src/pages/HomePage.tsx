import { workouts } from '@/data/workouts';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { getLastWorkout } from '@/utils/storage';
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutProgress } from '@/components/WorkoutProgress';

export const HomePage = () => {
  const { state } = useWorkoutStore();
  const lastWorkout = getLastWorkout(state.history, state.lastCompletedWorkoutId);

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-300/80">Full body 3x</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight">Treino rápido, claro e pronto para usar na academia.</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Registre cargas, repetições e acompanhe cada sessão sem depender de papel ou planilha.
        </p>
      </section>

      <WorkoutProgress draft={state.activeDraft} />

      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Último treino realizado</p>
        {lastWorkout ? (
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">{lastWorkout.workoutName}</h3>
              <p className="text-sm text-zinc-400">
                {new Date(lastWorkout.finishedAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(lastWorkout.finishedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span className="rounded-full bg-accent-500/15 px-3 py-2 text-sm font-medium text-accent-300">
              {lastWorkout.exercises.length} exercícios
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Você ainda não concluiu nenhum treino.</p>
        )}
      </section>

      <section className="space-y-4">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            lastSession={[...state.history].reverse().find((session) => session.workoutId === workout.id) ?? null}
          />
        ))}
      </section>
    </div>
  );
};
