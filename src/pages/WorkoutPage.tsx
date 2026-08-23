import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExerciseCard } from '@/components/ExerciseCard';
import { RestTimer } from '@/components/RestTimer';
import { workoutsById } from '@/data/workouts';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';

export const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, startWorkout, updateSet, toggleSetCompleted, finishWorkout, getPreviousExerciseSets } = useWorkoutStore();
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const initializedWorkoutIdRef = useRef<string | null>(null);

  const workoutId = id === 'A' || id === 'B' || id === 'C' ? id : null;
  const workout = workoutId ? workoutsById[workoutId] : null;
  const activeDraft = state.activeDraft?.workoutId === workoutId ? state.activeDraft : null;
  const duration = useWorkoutDuration(activeDraft?.startedAt);
  const hasIncompleteSets = activeDraft?.exercises.some((exercise) => exercise.sets.some((set) => !set.completed)) ?? false;

  useEffect(() => {
    if (!workoutId || !workout) {
      return;
    }

    if (state.activeDraft?.workoutId === workoutId) {
      initializedWorkoutIdRef.current = workoutId;
      return;
    }

    // A session may be finalized while this route is still mounted briefly.
    // Do not recreate it until the user intentionally opens this workout again.
    if (initializedWorkoutIdRef.current === workoutId) {
      return;
    }

    initializedWorkoutIdRef.current = workoutId;
    startWorkout(workoutId);
  }, [startWorkout, state.activeDraft, workout, workoutId]);

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

  return (
    <div className="space-y-4 pb-8">
      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{workout.id}</p>
            <h2 className="mt-1 text-2xl font-bold">{workout.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">{workout.description}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-2 text-right">
            <p className="text-xs text-zinc-500">Duração</p>
            <p className="text-sm font-semibold tabular-nums">{duration}</p>
          </div>
        </div>
      </section>

      <RestTimer />

      {activeDraft ? (
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
      ) : (
        <section className="panel p-5 text-sm text-zinc-400">Preparando o treino...</section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsFinishDialogOpen(true)}
          className="touch-button bg-accent-500 text-base font-semibold text-white"
        >
          Finalizar
        </button>
        <button type="button" onClick={() => navigate('/')} className="touch-button bg-white/10 text-base text-zinc-100">
          Voltar
        </button>
      </section>

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
    </div>
  );
};
