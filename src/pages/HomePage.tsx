import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { workouts } from '@/data/workouts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { getLatestSession, getSessionName, getSessionPath } from '@/utils/sessions';
import { isSameLocalDay } from '@/utils/localDate';
import { formatLastWorkoutTiming } from '@/utils/workoutTiming';
import { getWorkoutSequenceProgress } from '@/utils/workoutSequence';
import { WorkoutSelector } from '@/components/WorkoutSelector';
import { getNextStrengthWorkout } from '@/utils/nextWorkout';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { WorkoutProgress } from '@/components/WorkoutProgress';

export const HomePage = () => {
  const { state } = useWorkoutStore();
  const [userPreferences] = useUserPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const selectorButtonRef = useRef<HTMLButtonElement>(null);
  const reopenWorkoutPicker = location.state?.reopenWorkoutPicker === true;
  const hasActiveSession = Boolean(state.activeDraft);
  const [selectorOpen, setSelectorOpen] = useState(() => reopenWorkoutPicker && !hasActiveSession);
  const [, refreshClock] = useState(0);

  useEffect(() => {
    let timeout: number;
    const scheduleMidnight = () => {
      const current = new Date();
      const midnight = new Date(current);
      midnight.setHours(24, 0, 0, 0);
      timeout = window.setTimeout(updateClock, midnight.getTime() - current.getTime());
    };
    const updateClock = () => {
      window.clearTimeout(timeout);
      refreshClock((version) => version + 1);
      scheduleMidnight();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') updateClock(); };
    scheduleMidnight();
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', updateClock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!reopenWorkoutPicker) return;
    setSelectorOpen(!hasActiveSession);
    navigate(location.pathname + location.search + location.hash, {
      replace: true,
      state: { ...location.state, reopenWorkoutPicker: false },
    });
  }, [reopenWorkoutPicker, hasActiveSession, location, navigate]);
  const duration = useWorkoutDuration(state.activeDraft?.startedAt);
  const nextWorkout = getNextStrengthWorkout(state.history, workouts);
  const lastWorkout = getLatestSession(state.history);
  const sequenceProgress = getWorkoutSequenceProgress(state.history);
  const sequenceSteps = ['A', 'B', 'C'] as const;
  const now = new Date();
  const trainedToday = state.history.some((session) => isSameLocalDay(new Date(session.finishedAt), now));
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const displayName = userPreferences.displayName.trim();
  const greetingLabel = displayName ? `${greeting}, ${displayName}` : greeting;
  const welcomeTitle = state.activeDraft
    ? state.activeDraft.type === 'cardio'
      ? `${getSessionName(state.activeDraft)} em andamento.`
      : `Seu ${getSessionName(state.activeDraft)} está em andamento.`
    : trainedToday
      ? 'Treino de hoje concluído.'
      : 'Pronto para o próximo treino?';
  const showLastWorkout = !state.activeDraft && lastWorkout !== null;

  return (
    <>
      <div className="space-y-5">
        <section className={`panel overflow-hidden p-5 ${!state.activeDraft && trainedToday ? 'border-l-2 border-l-accent-500/70' : ''}`}>
          <p className="break-words text-xs uppercase tracking-[0.3em] text-accent-300/80">{greetingLabel}</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">{welcomeTitle}</h2>
          {showLastWorkout ? (
            <div className="mt-3">
              {!trainedToday && <p className="mb-1 text-xs text-zinc-500">Seu último treino concluído</p>}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h3 className="min-w-0 break-words text-lg font-bold">{lastWorkout.workoutName}</h3>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-300">
                  <Check size={14} aria-hidden="true" />
                  Concluído
                </span>
              </div>
              <p className="text-sm text-zinc-400">
                {formatLastWorkoutTiming(lastWorkout.startedAt, lastWorkout.finishedAt, now)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Registre suas cargas, repetições e acompanhe sua evolução a cada sessão.</p>
          )}
        </section>

        {state.activeDraft ? (
          <section className="panel space-y-4 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">
              {state.activeDraft.type === 'cardio' ? 'Atividade em andamento' : 'Treino em andamento'}
            </p>
            <h3 className="break-words text-2xl font-bold">{getSessionName(state.activeDraft)}</h3>
            {state.activeDraft.type === 'cardio'
              ? <p className="text-zinc-400">Tempo de atividade: {duration}</p>
              : <WorkoutProgress draft={state.activeDraft} />}
            <Link to={getSessionPath(state.activeDraft)} className="touch-button w-full bg-accent-500 text-zinc-950">Continuar treino</Link>
          </section>
        ) : (
          <>
            {nextWorkout && (
              <section className="panel space-y-3 border-accent-500/30 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-300">Próximo treino de musculação</p>
                <h3 className="break-words text-2xl font-bold">{nextWorkout.name}</h3>
                <p className="text-sm text-zinc-400">{nextWorkout.exercises.length} {nextWorkout.exercises.length === 1 ? 'exercício' : 'exercícios'}</p>
                <Link to={`/workout/${nextWorkout.id}`} state={{ origin: 'home-next-workout' }} className="touch-button w-full bg-accent-500 text-zinc-950">Ver treino {nextWorkout.id}</Link>
              </section>
            )}
            <button ref={selectorButtonRef} type="button" onClick={() => setSelectorOpen(true)} aria-haspopup="dialog"
              className="touch-button w-full border border-accent-500 bg-white/5 text-accent-500">Fazer outro treino</button>
          </>
        )}

        <section className="panel p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Sequência ABC</p>
          <p className="mt-2 text-sm text-zinc-400">Complete os treinos A, B e C em ordem para concluir uma sequência. Não importa o intervalo entre os dias.</p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold" aria-label={`Progresso atual da sequência: ${sequenceProgress.currentStep} de 3 etapas concluídas`}>
            {sequenceSteps.map((step, index) => {
              const isComplete = index < sequenceProgress.currentStep;

              return (
                <div key={step} className="contents">
                  <span className={`inline-flex min-w-10 items-center justify-center rounded-xl px-2 py-1.5 ${isComplete ? 'bg-accent-500/15 text-accent-300' : 'bg-white/5 text-zinc-400'}`}>
                    {step} {isComplete ? '✓' : '○'}
                  </span>
                  {index < sequenceSteps.length - 1 && <span className="text-zinc-600">→</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-zinc-300">
            {sequenceProgress.completedSequences} sequência{sequenceProgress.completedSequences === 1 ? '' : 's'} concluída{sequenceProgress.completedSequences === 1 ? '' : 's'}
          </p>
        </section>

      </div>
      {!state.activeDraft && selectorOpen && <WorkoutSelector returnFocusRef={selectorButtonRef} onClose={() => setSelectorOpen(false)} />}
    </>
  );
};
