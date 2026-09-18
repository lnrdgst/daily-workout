import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExerciseIcon } from '@/components/ExerciseIcon';
import { MainNavigation } from '@/components/MainNavigation';
import { RestTimer } from '@/components/RestTimer';
import { ViewBackButton } from '@/components/ViewBackButton';
import { workoutsById } from '@/data/workouts';
import { exercisesById, getWorkoutExerciseView } from '@/data/exercises';
import { useRestTimerSettings } from '@/hooks/useRestTimerSettings';
import { useWorkoutSessionSettings } from '@/hooks/useWorkoutSessionSettings';
import { getWorkoutDurationSeconds, useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { useWorkoutPreviewNavigation } from '@/hooks/useWorkoutPreviewNavigation';
import type { WorkoutProgressSummary } from '@/utils/workoutProgress';
import { getWorkoutProgress } from '@/utils/workoutProgress';
import { getSessionPath } from '@/utils/sessions';
import { getRelatedAutomaticRestId } from '@/utils/setCompletion';
import type { SetCompletionTarget } from '@/types/workout';

type WorkoutSessionIndicatorProps = {
  workoutId: string;
  duration: string;
  progress: WorkoutProgressSummary;
};

const WorkoutSessionIndicator = ({ workoutId, duration, progress }: WorkoutSessionIndicatorProps) => (
  <div className="rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-3 text-sm shadow-glow backdrop-blur-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate text-[0.65rem] uppercase tracking-[0.24em] text-accent-300/80">Treino {workoutId} em andamento</p>
      <p className="shrink-0 text-base font-semibold tabular-nums text-zinc-50">{duration}</p>
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-3">
      <p className="min-w-0 text-xs text-zinc-400">
        {progress.completedExercises} de {progress.totalExercises} exercícios concluídos
      </p>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-accent-300">{progress.percentage}%</p>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${progress.percentage}% concluído`}>
      <div className="h-full rounded-full bg-accent-500" style={{ width: `${progress.percentage}%` }} />
    </div>
  </div>
);

export const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    state,
    startWorkout,
    updateSet,
    toggleSetCompleted,
    undoSetCompleted,
    startRestTimer,
    finishWorkout,
    discardDraft,
    getPreviousExerciseSets,
    selectExerciseOption,
  } = useWorkoutStore();
  const backToWorkouts = useWorkoutPreviewNavigation(Boolean(state.activeDraft));
  const [restTimerSettings] = useRestTimerSettings();
  const [workoutSessionSettings] = useWorkoutSessionSettings();
  const [finishDialogOrigin, setFinishDialogOrigin] = useState<'manual' | 'automatic' | null>(null);
  const [isAccidentalFinishDialogOpen, setIsAccidentalFinishDialogOpen] = useState(false);
  const [undoTarget, setUndoTarget] = useState<{ target: SetCompletionTarget; restId: string | null } | null>(null);
  const [optionSlotId, setOptionSlotId] = useState<string | null>(null);

  const workoutId = id === 'A' || id === 'B' || id === 'C' ? id : null;
  const workout = workoutId ? workoutsById[workoutId] : null;
  const activeDraft = state.activeDraft?.type !== 'cardio' && state.activeDraft?.workoutId === workoutId ? state.activeDraft : null;
  const duration = useWorkoutDuration(activeDraft?.startedAt);
  const progress = activeDraft ? getWorkoutProgress(activeDraft) : null;
  const hasCompletedSet = activeDraft?.exercises.some((exercise) => exercise.sets.some((set) => set.completed)) ?? false;
  const canCancelRelatedRest = Boolean(undoTarget?.restId && getRelatedAutomaticRestId(state, undoTarget.target) === undoTarget.restId);
  const confirmUndo = (cancelRest: boolean) => {
    if (!undoTarget) return;
    undoSetCompleted(undoTarget.target, cancelRest ? undoTarget.restId ?? undefined : undefined);
    setUndoTarget(null);
  };

  const handleFinishRequest = () => {
    if (!activeDraft) {
      return;
    }

    const isAccidentalSession = getWorkoutDurationSeconds(activeDraft.startedAt) < 60 && !hasCompletedSet;
    if (isAccidentalSession) {
      setIsAccidentalFinishDialogOpen(true);
      return;
    }

    setFinishDialogOrigin('manual');
  };

  const handleSetCompletedToggle = (exerciseId: string, setIndex: number, isCurrentlyCompleted: boolean) => {
    if (!activeDraft) return;
    const target = { workoutId: activeDraft.workoutId, startedAt: activeDraft.startedAt, exerciseId, setIndex };
    if (isCurrentlyCompleted) {
      setUndoTarget({ target, restId: getRelatedAutomaticRestId(state, target) });
      return;
    }
    const willCompleteWorkout = activeDraft.exercises.every((exercise) => exercise.sets.every((set, currentIndex) =>
      (exercise.exerciseId === exerciseId && currentIndex === setIndex) || set.completed,
    ));

    toggleSetCompleted(exerciseId, setIndex);

    if (willCompleteWorkout) {
      setFinishDialogOrigin('automatic');
    } else if (workoutSessionSettings.autoStartRestTimer) {
      startRestTimer(restTimerSettings.defaultRestSeconds, target);
    }
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
      {!isTraining && <ViewBackButton onClick={backToWorkouts} />}
      {isTraining && (
        <MainNavigation className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-surface-900/80 p-2 shadow-glow backdrop-blur" />
      )}
      {!isTraining && (
        <section className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{workout.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">{workout.description}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-2 text-right">
              <p className="text-xs text-zinc-500">Ficha</p>
              <p className="text-sm font-semibold tabular-nums">Visualização</p>
            </div>
          </div>
        </section>
      )}

      {isTraining ? (
        <>
          <section className="sticky z-10" style={{ top: 'max(env(safe-area-inset-top), 0.5rem)' }}>
            <WorkoutSessionIndicator workoutId={activeDraft.workoutId} duration={duration} progress={progress!} />
          </section>

          <RestTimer />

          <section className="space-y-4">
            {workout.exercises.map((prescription) => {
              const exercise = getWorkoutExerciseView(prescription);
              const sessionState = activeDraft.exercises.find((item) => (item.slotId ?? item.exerciseId) === prescription.id);
              if (!sessionState) {
                return null;
              }

              const options = prescription.prescribedExerciseIds ?? [prescription.prescribedExerciseId];
              const canChoose = options.length > 1 && !sessionState.executedExerciseId;
              const canChange = options.length > 1 && !!sessionState.executedExerciseId && !sessionState.sets.some((set) => set.completed);
              const displayedExercise = sessionState.executedExerciseId ? { ...exercise, ...exercisesById[sessionState.executedExerciseId], id: prescription.id } : exercise;
              return (
                <div key={prescription.id} className="space-y-2">
                  {canChoose && <button type="button" onClick={() => setOptionSlotId(prescription.id)} className="touch-button w-full bg-accent-500 text-white">Escolher exercício</button>}
                  <ExerciseCard
                  exercise={displayedExercise}
                  sessionState={sessionState}
                  previousSets={getPreviousExerciseSets(sessionState.executedExerciseId ?? prescription.prescribedExerciseId)}
                  onSetChange={(setIndex, patch) => updateSet(sessionState.exerciseId, setIndex, patch)}
                  onToggleCompleted={(setIndex, isCurrentlyCompleted) =>
                    handleSetCompletedToggle(sessionState.exerciseId, setIndex, isCurrentlyCompleted)
                  }
                />
                  {canChange && <button type="button" onClick={() => setOptionSlotId(prescription.id)} className="w-full text-sm text-accent-300">Trocar exercício</button>}
                </div>
              );
            })}
          </section>

          <section>
            <button
              type="button"
              onClick={handleFinishRequest}
              className="touch-button w-full bg-accent-500 text-base font-semibold text-white"
            >
              Finalizar treino
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="panel p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">Modo visualização</p>
            <p className="mt-2 text-sm text-zinc-400">Consulte sua ficha. Nenhuma sessão será criada até você iniciar o treino.</p>
            {state.activeDraft?.type === 'cardio' ? (
              <Link to={getSessionPath(state.activeDraft)} className="touch-button mt-5 w-full bg-accent-500 text-white">
                Voltar à atividade em andamento
              </Link>
            ) : <button
              type="button"
              onClick={() => startWorkout(workoutId)}
              className="touch-button mt-5 w-full bg-accent-500 text-base font-semibold text-white"
            >
              Iniciar treino
            </button>}
          </section>

          <section className="space-y-4">
            {workout.exercises.map((prescription) => {
              const exercise = getWorkoutExerciseView(prescription);
              return <article key={prescription.id} className="panel p-4">
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
              </article>;
            })}
          </section>

        </>
      )}

      <ConfirmDialog
        open={optionSlotId !== null}
        title="Escolha o exercício"
        description="Este treino permite mais de uma opção para este exercício."
        cancelLabel="Cancelar"
        confirmLabel="Escolher"
        confirmDisabled
        onCancel={() => setOptionSlotId(null)}
        onConfirm={() => {}}
      >
        <div className="mt-4 grid gap-2">
          {optionSlotId && workout.exercises.find((item) => item.id === optionSlotId)?.prescribedExerciseIds?.map((optionId) => (
            <button key={optionId} type="button" onClick={() => { selectExerciseOption(optionSlotId, optionId); setOptionSlotId(null); }} className="touch-button bg-white/10 text-left text-zinc-100">
              {exercisesById[optionId].name}
            </button>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={undoTarget !== null}
        title="Desmarcar série?"
        description={`Esta série será marcada novamente como pendente.${canCancelRelatedRest ? ' O descanso atual foi iniciado automaticamente ao concluir esta série.' : ''}`}
        cancelLabel="Voltar"
        confirmLabel="Desmarcar série"
        onCancel={() => setUndoTarget(null)}
        onConfirm={() => confirmUndo(false)}
        additionalAction={canCancelRelatedRest ? { label: 'Desmarcar e cancelar descanso', onClick: () => confirmUndo(true) } : undefined}
      />

      <ConfirmDialog
        open={finishDialogOrigin !== null}
        title={finishDialogOrigin === 'automatic' ? 'Treino concluído' : 'Finalizar treino?'}
        description={
          finishDialogOrigin === 'automatic'
            ? 'Você finalizou todas as séries. Deseja encerrar o treino?'
            : progress?.percentage === 100
            ? 'Bom trabalho. Confirma a finalização deste treino?'
            : 'Ainda existem exercícios ou séries não concluídos. Deseja finalizar o treino mesmo assim?'
        }
        cancelLabel="Voltar ao treino"
        confirmLabel="Finalizar treino"
        onCancel={() => setFinishDialogOrigin(null)}
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
