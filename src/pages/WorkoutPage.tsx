import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExerciseIcon } from '@/components/ExerciseIcon';
import { MainNavigation } from '@/components/MainNavigation';
import { RestTimer } from '@/components/RestTimer';
import { workoutsById } from '@/data/workouts';
import { getWorkoutDurationSeconds, useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';

type WorkoutSessionIndicatorProps = {
  duration: string;
};

const WorkoutSessionIndicator = ({ duration }: WorkoutSessionIndicatorProps) => (
  <div className="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-3 text-sm shadow-glow backdrop-blur-sm">
    <div className="min-w-0">
      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-accent-300/80">Treino em andamento</p>
      <p className="truncate text-sm text-zinc-300">Tempo total da sessão</p>
    </div>
    <p className="shrink-0 text-base font-semibold tabular-nums text-zinc-50">{duration}</p>
  </div>
);

export const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, startWorkout, updateSet, toggleSetCompleted, finishWorkout, discardDraft, getPreviousExerciseSets } = useWorkoutStore();
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isAccidentalFinishDialogOpen, setIsAccidentalFinishDialogOpen] = useState(false);

  const workoutId = id === 'A' || id === 'B' || id === 'C' ? id : null;
  const workout = workoutId ? workoutsById[workoutId] : null;
  const activeDraft = state.activeDraft?.workoutId === workoutId ? state.activeDraft : null;
  const duration = useWorkoutDuration(activeDraft?.startedAt);
  const hasIncompleteSets = activeDraft?.exercises.some((exercise) => exercise.sets.some((set) => !set.completed)) ?? false;
  const hasRecordedActivity =
    activeDraft?.exercises.some((exercise) =>
      exercise.sets.some((set) => set.completed || set.load.trim() !== '' || set.reps.trim() !== ''),
    ) ?? false;

  const handleFinishRequest = () => {
    if (!activeDraft) {
      return;
    }

    const isAccidentalSession = getWorkoutDurationSeconds(activeDraft.startedAt) < 60 && !hasRecordedActivity;
    if (isAccidentalSession) {
      setIsAccidentalFinishDialogOpen(true);
      return;
    }

    setIsFinishDialogOpen(true);
  };

  if (!workoutId || !workout) {
    return (
      <section className="panel p-5">
        <h2 className="text-xl font-bold">Treino não encontrado</h2>
        <Link to="/" className="mt-4 inline-flex text-accent-300">
          Voltar para a home
        </Link>
      </section>
    );
  }

  const isTraining = activeDraft !== null;

  return (
    <div className={`space-y-4 ${isTraining ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
      {isTraining && (
        <MainNavigation className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-surface-900/80 p-2 shadow-glow backdrop-blur" />
      )}
      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{workout.id}</p>
            <h2 className="mt-1 text-2xl font-bold">{workout.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">{workout.description}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-2 text-right">
            <p className="text-xs text-zinc-500">{isTraining ? 'Status' : 'Ficha'}</p>
            <p className="text-sm font-semibold tabular-nums">{isTraining ? 'Ativo' : 'Visualização'}</p>
          </div>
        </div>
      </section>

      {isTraining ? (
        <>
          <section className="sticky z-10" style={{ top: 'max(env(safe-area-inset-top), 0.5rem)' }}>
            <WorkoutSessionIndicator duration={duration} />
          </section>

          <RestTimer />

          <section className="space-y-4">
            {workout.exercises.map((exercise) => {
              const sessionState = activeDraft.exercises.find((item) => item.exerciseId === exercise.id);
              if (!sessionState) {
                return null;
              }

              return (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  sessionState={sessionState}
                  previousSets={getPreviousExerciseSets(exercise.id)}
                  onSetChange={(setIndex, patch) => updateSet(exercise.id, setIndex, patch)}
                  onToggleCompleted={(setIndex) => toggleSetCompleted(exercise.id, setIndex)}
                />
              );
            })}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleFinishRequest}
              className="touch-button bg-accent-500 text-base font-semibold text-white"
            >
              Finalizar
            </button>
            <button type="button" onClick={() => navigate('/')} className="touch-button bg-white/10 text-base text-zinc-100">
              Voltar
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="panel p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">Modo visualização</p>
            <p className="mt-2 text-sm text-zinc-400">Consulte sua ficha. Nenhuma sessão será criada até você iniciar o treino.</p>
            <button
              type="button"
              onClick={() => startWorkout(workoutId)}
              className="touch-button mt-5 w-full bg-accent-500 text-base font-semibold text-white"
            >
              Iniciar treino
            </button>
          </section>

          <section className="space-y-4">
            {workout.exercises.map((exercise) => (
              <article key={exercise.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ExerciseIcon icon={exercise.icon} />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{exercise.muscleGroup}</p>
                      <h3 className="mt-1 text-lg font-bold">{exercise.name}</h3>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white/5 px-3 py-2 text-right text-xs text-zinc-400">
                    <p>{exercise.sets} séries</p>
                    <p>
                      {exercise.repsMin}-{exercise.repsMax} reps
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <button type="button" onClick={() => navigate('/')} className="touch-button w-full bg-white/10 text-base text-zinc-100">
            Voltar para treinos
          </button>
        </>
      )}

      <ConfirmDialog
        open={isFinishDialogOpen}
        title="Finalizar treino?"
        description={
          hasIncompleteSets
            ? 'Existem séries não marcadas como concluídas. Deseja finalizar o treino mesmo assim?'
            : 'Confira se todas as séries e exercícios realizados foram registrados antes de finalizar.'
        }
        cancelLabel="Voltar ao treino"
        confirmLabel="Finalizar treino"
        onCancel={() => setIsFinishDialogOpen(false)}
        onConfirm={() => {
          finishWorkout();
          navigate('/history');
        }}
      />

      <ConfirmDialog
        open={isAccidentalFinishDialogOpen}
        title="Encerrar treino?"
        description="O tempo de treinamento foi muito curto e nenhuma série foi registrada. Este treino não será salvo no histórico. Deseja encerrar mesmo assim?"
        cancelLabel="Continuar treino"
        confirmLabel="Encerrar sem registrar"
        destructive
        onCancel={() => setIsAccidentalFinishDialogOpen(false)}
        onConfirm={() => {
          discardDraft();
          navigate('/');
        }}
      />
    </div>
  );
};
